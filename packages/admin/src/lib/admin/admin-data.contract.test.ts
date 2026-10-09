import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	ADMIN_PAGE_SIZE,
	AdminError,
	MemoryAdminData,
	RayfinAdminData,
	type AdminData,
	type AdminResources,
	type RayfinDataClient
} from "@vpaa/data";
import { createProductSeed } from "./test/identities.js";
import { cascadeFixtureResources } from "./test/cascade-fixtures.js";

export const contractResources: AdminResources = {
	Product: {
		name: "Product",
		slug: "products",
		fields: [
			{ name: "id", type: "string", nullable: false, readOnly: true, generated: true, primaryKey: true },
			{ name: "name", type: "string", nullable: false, readOnly: false, generated: false },
			{ name: "description", type: "text", nullable: true, readOnly: false, generated: false },
			{ name: "priceInCents", type: "integer", nullable: false, readOnly: false, generated: false }
		]
	},
	AdminUser: {
		name: "AdminUser",
		slug: "admin-users",
		fields: [
			{ name: "id", type: "string", nullable: false, readOnly: true, generated: true, primaryKey: true },
			{ name: "email", type: "string", nullable: false, readOnly: false, generated: false }
		]
	}
};

export function defineAdminDataContract(name: string, factory: () => AdminData) {
	describe(`AdminData contract: ${name}`, () => {
		let data: AdminData;

		beforeEach(() => {
			data = factory();
		});

		it("creates and retrieves a record (D1)", async () => {
			const created = await data.create("Product", { name: "A", priceInCents: 100 });
			const got = await data.get("Product", created.id);
			expect(got).toMatchObject({ id: created.id, name: "A", priceInCents: 100 });
		});

		it("updates without losing unchanged values (D2)", async () => {
			const created = await data.create("Product", {
				name: "A",
				description: "keep",
				priceInCents: 100
			});
			const updated = await data.update("Product", created.id, { name: "B" });
			expect(updated).toMatchObject({ name: "B", description: "keep", priceInCents: 100 });
		});

		it("deletes a record and returns null for missing (D3, D4)", async () => {
			const created = await data.create("Product", { name: "A", priceInCents: 100 });
			await data.remove("Product", created.id);
			expect(await data.get("Product", created.id)).toBeNull();
			expect(await data.get("Product", "missing")).toBeNull();
		});

		it("sorts one scalar column both directions (D5)", async () => {
			await data.create("Product", { id: "1", name: "B", priceInCents: 2 });
			await data.create("Product", { id: "2", name: "A", priceInCents: 1 });
			const asc = await data.list("Product", { sort: { field: "name", direction: "asc" } });
			const desc = await data.list("Product", { sort: { field: "name", direction: "desc" } });
			expect(asc.items.map((i) => i.name)).toEqual(["A", "B"]);
			expect(desc.items.map((i) => i.name)).toEqual(["B", "A"]);
		});

		it("paginates 25 records with stable next/previous cursors (D6)", async () => {
			for (const row of createProductSeed(30)) {
				await data.create("Product", row);
			}
			const first = await data.list("Product", {
				limit: ADMIN_PAGE_SIZE,
				sort: { field: "id", direction: "asc" }
			});
			expect(first.items).toHaveLength(25);
			expect(first.hasNextPage).toBe(true);
			const second = await data.list("Product", {
				limit: ADMIN_PAGE_SIZE,
				cursor: first.endCursor,
				sort: { field: "id", direction: "asc" }
			});
			expect(second.items).toHaveLength(5);
			const firstIds = new Set(first.items.map((item) => item.id));
			for (const item of second.items) expect(firstIds.has(item.id)).toBe(false);
			const back = await data.list("Product", {
				limit: ADMIN_PAGE_SIZE,
				sort: { field: "id", direction: "asc" }
			});
			expect(back.items.map((item) => item.id)).toEqual(first.items.map((item) => item.id));
		});

		it("rejects a missing pagination cursor instead of rewinding (H1)", async () => {
			for (const row of createProductSeed(30)) {
				await data.create("Product", row);
			}
			await expect(
				data.list("Product", {
					limit: ADMIN_PAGE_SIZE,
					cursor: "missing-cursor",
					sort: { field: "id", direction: "asc" }
				})
			).rejects.toMatchObject({ kind: "not_found" });
		});

		it("generates missing UUID primary keys (D9)", async () => {
			const created = await data.create("Product", { name: "X", priceInCents: 1 });
			expect(created.id).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
			);
		});

		it("forbids AdminUser mutations through the data layer (H3)", async () => {
			await expect(data.create("AdminUser", { email: "x@example.edu" })).rejects.toMatchObject({
				kind: "forbidden"
			});
			await expect(data.list("AdminUser")).rejects.toMatchObject({ kind: "forbidden" });
			await expect(data.get("AdminUser", "x")).rejects.toMatchObject({ kind: "forbidden" });
			await expect(data.update("AdminUser", "x", { email: "y@example.edu" })).rejects.toMatchObject({
				kind: "forbidden"
			});
			await expect(data.remove("AdminUser", "x")).rejects.toMatchObject({ kind: "forbidden" });
		});
	});
}

defineAdminDataContract("MemoryAdminData", () => new MemoryAdminData({ resources: contractResources }));

describe("MemoryAdminData extras", () => {
	it("resets state between tests and returns forbidden (D7, D8)", async () => {
		const data = new MemoryAdminData({
			resources: contractResources,
			seed: { Product: createProductSeed(2) },
			forbiddenResources: ["Product"]
		});
		await expect(data.list("Product")).rejects.toMatchObject({ kind: "forbidden" });
		const open = new MemoryAdminData({
			resources: contractResources,
			seed: { Product: createProductSeed(2) }
		});
		expect((await open.list("Product")).items).toHaveLength(2);
		open.reset();
		expect((await open.list("Product")).items).toHaveLength(0);
	});

	it("rejects unknown seed resources", () => {
		expect(
			() =>
				new MemoryAdminData({
					resources: contractResources,
					seed: { Prodcut: createProductSeed(1) } as never
				})
		).toThrow(AdminError);
	});

	it("normalizes numeric seed ids for cursor equality and validates required fields", async () => {
		const data = new MemoryAdminData({
			resources: contractResources,
			seed: {
				Product: [{ id: 1 as unknown as string, name: "A", priceInCents: 1 }]
			}
		});
		const page = await data.list("Product", { limit: 1, sort: { field: "id", direction: "asc" } });
		expect(page.endCursor).toBe("1");
		const next = await data.list("Product", {
			limit: 1,
			cursor: page.endCursor,
			sort: { field: "id", direction: "asc" }
		});
		expect(next.items).toHaveLength(0);
		await expect(data.create("Product", { priceInCents: 1 })).rejects.toMatchObject({
			kind: "validation",
			fields: { name: "name is required" }
		});
		await expect(data.update("Product", "missing", { name: "X" })).rejects.toMatchObject({
			kind: "not_found"
		});
	});

	it("clamps invalid list limits", async () => {
		const data = new MemoryAdminData({
			resources: contractResources,
			seed: { Product: createProductSeed(5) }
		});
		const zero = await data.list("Product", { limit: 0 });
		expect(zero.items).toHaveLength(1);
		const huge = await data.list("Product", { limit: 1000 });
		expect(huge.items).toHaveLength(5);
	});

	it("seeds and gets natural-key and composite-key records by recordId", async () => {
		const resources: AdminResources = {
			Rail: {
				name: "Rail",
				slug: "rails",
				fields: [
					{ name: "rail_id", type: "string", nullable: false, readOnly: false, generated: false, primaryKey: true },
					{ name: "name", type: "string", nullable: false, readOnly: false, generated: false },
					{ name: "display_order", type: "integer", nullable: false, readOnly: false, generated: false }
				]
			},
			Recommendation: {
				name: "Recommendation",
				slug: "recommendations",
				fields: [
					{ name: "aau_id", type: "string", nullable: false, readOnly: false, generated: false, primaryKey: true },
					{ name: "award_id", type: "string", nullable: false, readOnly: false, generated: false, primaryKey: true },
					{ name: "rail_id", type: "string", nullable: false, readOnly: false, generated: false, primaryKey: true },
					{ name: "rank", type: "integer", nullable: false, readOnly: false, generated: false }
				]
			}
		};
		const data = new MemoryAdminData({
			resources,
			seed: {
				Rail: [{ rail_id: "rail-1", name: "Top Picks", display_order: 1 } as never]
			}
		});
		expect(await data.get("Rail", "rail-1")).toMatchObject({
			id: "rail-1",
			rail_id: "rail-1",
			name: "Top Picks"
		});
		const created = await data.create("Recommendation", {
			aau_id: "109449",
			award_id: "sloan",
			rail_id: "rail-1",
			rank: 1
		});
		const recommendationId = ["109449", "sloan", "rail-1"].join("\u001f");
		expect(created.id).toBe(recommendationId);
		expect(await data.get("Recommendation", recommendationId)).toMatchObject({
			id: recommendationId,
			aau_id: "109449",
			award_id: "sloan",
			rail_id: "rail-1",
			rank: 1
		});
	});
});

function matchesEqFilter(item: Record<string, unknown>, filter?: Record<string, unknown>): boolean {
	if (!filter) return true;
	for (const [key, spec] of Object.entries(filter)) {
		if (!spec || typeof spec !== "object" || !("eq" in spec)) continue;
		if (String(item[key] ?? "") !== String((spec as { eq: unknown }).eq)) return false;
	}
	return true;
}

function createInMemoryRayfinClient(resources: AdminResources): RayfinDataClient {
	const store = new Map<string, Map<string, Record<string, unknown>>>();
	for (const name of Object.keys(resources)) store.set(name, new Map());

	function entityClient(resource: string) {
		const bucket = () => store.get(resource)!;
		return {
			select(fields: string[]) {
				const chain = (
					filter?: Record<string, unknown>,
					order?: Record<string, "asc" | "desc">
				) => ({
					where(next: Record<string, unknown>) {
						return chain(next, order);
					},
					orderBy(next: Record<string, "asc" | "desc">) {
						return chain(filter, next);
					},
					first(n: number) {
						const run = async (cursor?: string) => {
							let items = [...bucket().values()].filter((item) => matchesEqFilter(item, filter));
							if (order) {
								const [[field, direction]] = Object.entries(order);
								items = items.sort((a, b) => {
									const av = a[field!];
									const bv = b[field!];
									if (av === bv) return String(a.id).localeCompare(String(b.id));
									if ((av as never) < (bv as never)) return direction === "asc" ? -1 : 1;
									return direction === "asc" ? 1 : -1;
								});
							}
							let start = 0;
							if (cursor) {
								const idx = items.findIndex((item) => String(item.id) === cursor);
								if (idx < 0) throw new Error("invalid cursor");
								start = idx + 1;
							}
							const page = items.slice(start, start + n);
							const projected = page.map((item) => {
								const copy: Record<string, unknown> = {};
								for (const field of fields) {
									if (field in item) copy[field] = item[field];
								}
								if (!("id" in copy) && "id" in item) copy.id = item.id;
								return copy;
							});
							return {
								items: projected,
								hasNextPage: start + n < items.length,
								endCursor: page.length ? String(page[page.length - 1]!.id) : undefined
							};
						};
						return {
							after: (cursor: string) => ({
								executePaginated: () => run(cursor),
								execute: async () => (await run(cursor)).items
							}),
							executePaginated: () => run(),
							execute: async () => (await run()).items
						};
					}
				});
				return chain();
			},
			findById: async (id: string) => {
				const row = bucket().get(id);
				return row ? { ...row } : null;
			},
			create: async (values: Record<string, unknown>) => {
				const id = typeof values.id === "string" && values.id ? values.id : crypto.randomUUID();
				const record = { ...values, id };
				bucket().set(id, record);
				return { ...record };
			},
			update: async (where: { id: string }, values: Record<string, unknown>) => {
				const existing = bucket().get(where.id);
				if (!existing) throw new Error("not found");
				const next = { ...existing, ...values, id: where.id };
				bucket().set(where.id, next);
				return { ...next };
			},
			delete: async (where: { id: string }) => {
				if (!bucket().has(where.id)) throw new Error("not found");
				bucket().delete(where.id);
			}
		};
	}

	const data: RayfinDataClient["data"] = {};
	for (const name of Object.keys(resources)) {
		if (name === "AdminUser") continue;
		data[name] = entityClient(name);
	}
	return { data };
}

defineAdminDataContract(
	"RayfinAdminData in-memory client",
	() => new RayfinAdminData(createInMemoryRayfinClient(contractResources), contractResources)
);

describe("RayfinAdminData SDK dispatch", () => {
	function stubSelect(rows: Record<string, unknown>[] = []) {
		const execute = vi.fn(async () => rows);
		const executePaginated = vi.fn(async () => ({ items: rows, hasNextPage: false }));
		const tail = {
			where: vi.fn(() => tail),
			orderBy: vi.fn(() => tail),
			first: vi.fn(() => tail),
			after: vi.fn(() => tail),
			execute,
			executePaginated
		};
		return { select: vi.fn(() => tail), tail };
	}

	it("calls update/delete with where objects and maps GraphQL errors", async () => {
		const update = vi.fn(async (_where: { id: string }, values: Record<string, unknown>) => ({
			id: "1",
			...values
		}));
		const del = vi.fn(async (_where: { id: string }) => undefined);
		const findById = vi.fn(async (id: string) => ({ id, name: "N" }));
		const create = vi.fn(async (values: Record<string, unknown>) => ({ id: "1", ...values }));
		const { select } = stubSelect([{ id: "1", name: "N" }]);

		const client: RayfinDataClient = {
			data: {
				Product: { select, findById, create, update, delete: del }
			}
		};
		const data = new RayfinAdminData(client, contractResources);
		await data.update("Product", "1", { name: "N" });
		expect(update).toHaveBeenCalledWith({ id: "1" }, { name: "N" });
		expect(findById).not.toHaveBeenCalled();
		await data.remove("Product", "1");
		expect(del).toHaveBeenCalledWith({ id: "1" });
		expect(findById).not.toHaveBeenCalled();

		const failing: RayfinDataClient = {
			data: {
				Product: {
					select,
					findById,
					create: async () => {
						throw new Error("GraphQL errors: permission denied");
					},
					update,
					delete: del
				}
			}
		};
		const guarded = new RayfinAdminData(failing, contractResources);
		await expect(guarded.create("Product", { name: "X" })).rejects.toMatchObject({ kind: "forbidden" });
		await expect(
			new RayfinAdminData(
				{
					data: {
						Product: {
							select,
							findById,
							create: async () => {
								throw new Error("GraphQL errors: unauthorized");
							},
							update,
							delete: del
						}
					}
				},
				contractResources
			).create("Product", { name: "X" })
		).rejects.toMatchObject({ kind: "unauthorized", status: 401 });
		await expect(
			new RayfinAdminData(
				{
					data: {
						Product: {
							select,
							findById,
							create: async () => {
								throw new Error("GraphQL errors: internal failure");
							},
							update,
							delete: del
						}
					}
				},
				contractResources
			).create("Product", { name: "X" })
		).rejects.toMatchObject({ kind: "unexpected" });
	});

	it("maps unauthorized distinctly from forbidden", async () => {
		const findById = vi.fn(async () => null);
		const create = vi.fn(async (values: Record<string, unknown>) => ({ id: "1", ...values }));
		const update = vi.fn(async () => ({ id: "1" }));
		const del = vi.fn(async () => undefined);
		const { select } = stubSelect();
		const base = { select, findById, create, update, delete: del };

		await expect(
			new RayfinAdminData(
				{
					data: {
						Product: {
							...base,
							create: async () => {
								throw new Error("unauthorized");
							}
						}
					}
				},
				contractResources
			).create("Product", { name: "X" })
		).rejects.toMatchObject({ kind: "unauthorized" });

		await expect(
			new RayfinAdminData(
				{
					data: {
						Product: {
							...base,
							create: async () => {
								throw new Error("permission denied");
							}
						}
					}
				},
				contractResources
			).create("Product", { name: "X" })
		).rejects.toMatchObject({ kind: "forbidden" });
	});

	it("clamps list limit before first()", async () => {
		const executePaginated = vi.fn(async () => ({ items: [], hasNextPage: false }));
		const after = vi.fn(() => ({ executePaginated }));
		const first = vi.fn(() => ({ after, executePaginated }));
		const orderBy = vi.fn(() => ({ first }));
		const select = vi.fn(() => ({ orderBy }));
		const data = new RayfinAdminData(
			{
				data: {
					Product: {
						select,
						findById: async () => null,
						create: async (values) => ({ id: "1", ...values }),
						update: async (_where, values) => ({ id: "1", ...values }),
						delete: async () => undefined
					}
				}
			},
			contractResources
		);
		await data.list("Product", { limit: 1000 });
		expect(first).toHaveBeenCalledWith(25);
		await data.list("Product", { limit: 0 });
		expect(first).toHaveBeenCalledWith(1);
	});

	it("projects only visible admin list fields and excludes embeddings", async () => {
		const executePaginated = vi.fn(async () => ({ items: [], hasNextPage: false }));
		const after = vi.fn(() => ({ executePaginated }));
		const first = vi.fn(() => ({ after, executePaginated }));
		const orderBy = vi.fn(() => ({ first }));
		const select = vi.fn(() => ({ orderBy }));
		const resources: AdminResources = {
			Award: {
				name: "Award",
				slug: "awards",
				fields: [
					{ name: "award_id", type: "string", nullable: false, readOnly: false, generated: false, primaryKey: true },
					{ name: "name", type: "string", nullable: false, readOnly: false, generated: false },
					{ name: "prestige", type: "string", nullable: false, readOnly: false, generated: false },
					{ name: "description", type: "text", nullable: true, readOnly: false, generated: false },
					{
						name: "embedding",
						type: "text",
						nullable: false,
						readOnly: true,
						generated: false,
						internal: true
					}
				]
			}
		};
		const data = new RayfinAdminData(
			{
				data: {
					Award: {
						select,
						findById: async () => null,
						create: async (values) => ({ id: "1", ...values }),
						update: async (_where, values) => ({ id: "1", ...values }),
						delete: async () => undefined
					}
				}
			},
			resources
		);
		await data.list("Award");
		expect(select).toHaveBeenCalledWith(["award_id", "name", "prestige"]);
		expect((select.mock.calls[0] as unknown as [string[]] | undefined)?.[0]).not.toContain("embedding");
	});

	it("loads cascade children with a filtered projection instead of listing the table", async () => {
		const selectCalls: Array<{ fields: string[]; where?: Record<string, unknown>; first?: number }> = [];
		const orderBy = vi.fn();
		function entity(rows: Record<string, unknown>[] = []) {
			return {
				select(fields: string[]) {
					const state: { fields: string[]; where?: Record<string, unknown>; first?: number } = { fields };
					const tail = {
						where(filter: Record<string, unknown>) {
							state.where = filter;
							return tail;
						},
						orderBy: (...args: unknown[]) => {
							orderBy(...args);
							return tail;
						},
						first(n: number) {
							state.first = n;
							selectCalls.push({ ...state });
							const page = {
								items: rows.filter((row) => {
									const filter = state.where;
									if (!filter) return true;
									return matchesEqFilter(row, filter);
								}),
								hasNextPage: false
							};
							return {
								after: () => ({
									executePaginated: async () => page,
									execute: async () => page.items
								}),
								executePaginated: async () => page,
								execute: async () => page.items
							};
						}
					};
					return tail;
				},
				findById: async (id: string) => rows.find((row) => String(row.id) === id) ?? null,
				create: async (values: Record<string, unknown>) => ({ id: "1", ...values }),
				update: async (_where: { id: string }, values: Record<string, unknown>) => ({
					id: "1",
					...values
				}),
				delete: async () => undefined
			};
		}
		const data = new RayfinAdminData(
			{
				data: {
					Faculty: entity([{ id: "fac-1", name: "Ada" }]),
					SabbaticalCredit: entity([
						{ id: "sc-1", facultyId: "fac-1", sharedWithFacultyId: null, year: 2024 },
						{ id: "sc-other", facultyId: "fac-2", sharedWithFacultyId: null, year: 2024 }
					]),
					ResearchGrant: entity([{ id: "rg-other", facultyId: "fac-2", title: "Other" }]),
					Department: entity(),
					CourseSection: entity(),
					Enrollment: entity(),
					DiamondRoot: entity(),
					DiamondLeft: entity(),
					DiamondRight: entity(),
					DiamondLeaf: entity(),
					Org: entity(),
					Team: entity(),
					TeamLink: entity()
				}
			},
			cascadeFixtureResources
		);
		const impact = await data.inspectRemove("Faculty", "fac-1");
		expect(impact.canDelete).toBe(true);
		expect(impact.cascading).toEqual([
			{
				resource: "SabbaticalCredit",
				foreignKey: "facultyId",
				policy: "cascade",
				count: 1,
				sampleIds: ["sc-1"]
			}
		]);
		expect(orderBy).not.toHaveBeenCalled();
		expect(selectCalls.some((call) => call.fields.includes("embedding"))).toBe(false);
		expect(selectCalls).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					fields: expect.arrayContaining(["id", "facultyId", "sharedWithFacultyId"]),
					where: { facultyId: { eq: "fac-1" } },
					first: 200
				}),
				expect.objectContaining({
					fields: expect.arrayContaining(["id", "facultyId"]),
					where: { facultyId: { eq: "fac-1" } },
					first: 200
				})
			])
		);
		for (const call of selectCalls.filter((entry) => entry.where && "facultyId" in (entry.where ?? {}))) {
			expect(call.fields).not.toContain("year");
			expect(call.fields).not.toContain("title");
			expect(call.fields).not.toContain("name");
		}
	});

	it("cascades exclusive related rows through filtered GraphQL reads", async () => {
		const data = new RayfinAdminData(
			createInMemoryRayfinClient(cascadeFixtureResources),
			cascadeFixtureResources
		);
		await data.create("Faculty", { id: "fac-1", name: "Ada" });
		await data.create("Faculty", { id: "fac-2", name: "Grace" });
		await data.create("SabbaticalCredit", { id: "sc-1", facultyId: "fac-1", year: 2024 });
		await data.create("SabbaticalCredit", { id: "sc-other", facultyId: "fac-2", year: 2024 });
		await data.remove("Faculty", "fac-1");
		expect(await data.get("Faculty", "fac-1")).toBeNull();
		expect(await data.get("SabbaticalCredit", "sc-1")).toBeNull();
		expect(await data.get("SabbaticalCredit", "sc-other")).toMatchObject({ facultyId: "fac-2" });
	});

	it("loads natural-key and composite-key details with a filtered select, not findById", async () => {
		const onboarding = {
			name: "OnboardingState",
			slug: "onboarding-states",
			fields: [
				{ name: "aau_id", type: "string" as const, nullable: false, readOnly: false, generated: false, primaryKey: true },
				{ name: "current_step", type: "string" as const, nullable: false, readOnly: false, generated: false },
				{ name: "completed", type: "boolean" as const, nullable: false, readOnly: false, generated: false }
			]
		};
		const topic = {
			name: "OnboardingTopic",
			slug: "onboarding-topics",
			fields: [
				{ name: "aau_id", type: "string" as const, nullable: false, readOnly: false, generated: false, primaryKey: true },
				{ name: "topic", type: "string" as const, nullable: false, readOnly: false, generated: false, primaryKey: true },
				{ name: "display_order", type: "integer" as const, nullable: false, readOnly: false, generated: false }
			]
		};
		const event = {
			name: "FacultyActivityEvent",
			slug: "faculty-activity-events",
			fields: [
				{ name: "event_id", type: "string" as const, nullable: false, readOnly: false, generated: false, primaryKey: true },
				{ name: "aau_id", type: "string" as const, nullable: false, readOnly: false, generated: false },
				{ name: "event_type", type: "string" as const, nullable: false, readOnly: false, generated: false },
				{ name: "created_at", type: "datetime" as const, nullable: false, readOnly: true, generated: false }
			]
		};
		const rail = {
			name: "Rail",
			slug: "rails",
			fields: [
				{ name: "rail_id", type: "string" as const, nullable: false, readOnly: false, generated: false, primaryKey: true },
				{ name: "name", type: "string" as const, nullable: false, readOnly: false, generated: false }
			]
		};
		const recommendation = {
			name: "Recommendation",
			slug: "recommendations",
			fields: [
				{ name: "aau_id", type: "string" as const, nullable: false, readOnly: false, generated: false, primaryKey: true },
				{ name: "award_id", type: "string" as const, nullable: false, readOnly: false, generated: false, primaryKey: true },
				{ name: "rail_id", type: "string" as const, nullable: false, readOnly: false, generated: false, primaryKey: true },
				{ name: "rank", type: "integer" as const, nullable: false, readOnly: false, generated: false }
			]
		};
		const awardWin = {
			name: "AwardWin",
			slug: "award-wins",
			fields: [
				{ name: "aau_id", type: "string" as const, nullable: false, readOnly: false, generated: false, primaryKey: true },
				{ name: "award_id", type: "string" as const, nullable: false, readOnly: false, generated: false, primaryKey: true },
				{ name: "received_year", type: "integer" as const, nullable: false, readOnly: false, generated: false }
			]
		};
		const rows = {
			OnboardingState: [
				{
					id: "rayfin-state",
					aau_id: "109449",
					current_step: "welcome",
					completed: false
				}
			],
			OnboardingTopic: [
				{
					id: "rayfin-topic",
					aau_id: "109449",
					topic: "Quantum Physics",
					display_order: 1
				}
			],
			FacultyActivityEvent: [
				{
					id: "rayfin-event",
					event_id: "evt-1",
					aau_id: "109449",
					event_type: "search",
					created_at: "2026-08-20T00:29:55.398Z"
				}
			],
			Rail: [
				{
					id: "rayfin-rail",
					rail_id: "rail-1",
					name: "Top Picks"
				}
			],
			Recommendation: [
				{
					id: "rayfin-rec",
					aau_id: "109449",
					award_id: "sloan",
					rail_id: "rail-1",
					rank: 1
				}
			],
			AwardWin: [
				{
					id: "rayfin-win",
					aau_id: "109449",
					award_id: "sloan",
					received_year: 2019
				}
			]
		};
		const selectCalls: Array<{ resource: string; fields: string[]; where?: Record<string, unknown> }> = [];
		const findById = vi.fn(async () => {
			throw new Error("invalid uuid");
		});
		function entity(name: keyof typeof rows) {
			return {
				select(fields: string[]) {
					const state: { fields: string[]; where?: Record<string, unknown> } = { fields };
					const tail = {
						where(filter: Record<string, unknown>) {
							state.where = filter;
							return tail;
						},
						orderBy: () => tail,
						first: () => tail,
						execute: async () => {
							selectCalls.push({ resource: name, ...state });
							return rows[name].filter((row) => matchesEqFilter(row, state.where));
						},
						executePaginated: async () => ({
							items: rows[name].filter((row) => matchesEqFilter(row, state.where)),
							hasNextPage: false
						})
					};
					return tail;
				},
				findById,
				create: async (values: Record<string, unknown>) => values,
				update: async () => ({}),
				delete: async () => undefined
			};
		}
		const data = new RayfinAdminData(
			{
				data: {
					OnboardingState: entity("OnboardingState"),
					OnboardingTopic: entity("OnboardingTopic"),
					FacultyActivityEvent: entity("FacultyActivityEvent"),
					Rail: entity("Rail"),
					Recommendation: entity("Recommendation"),
					AwardWin: entity("AwardWin")
				}
			},
			{
				OnboardingState: onboarding,
				OnboardingTopic: topic,
				FacultyActivityEvent: event,
				Rail: rail,
				Recommendation: recommendation,
				AwardWin: awardWin
			}
		);

		const state = await data.get("OnboardingState", "109449");
		expect(findById).not.toHaveBeenCalled();
		expect(state).toMatchObject({
			id: "109449",
			aau_id: "109449",
			current_step: "welcome",
			completed: false
		});
		expect(selectCalls).toContainEqual(
			expect.objectContaining({
				resource: "OnboardingState",
				where: { aau_id: { eq: "109449" } }
			})
		);

		const topicId = ["109449", "Quantum Physics"].join("\u001f");
		const topicRow = await data.get("OnboardingTopic", topicId);
		expect(topicRow).toMatchObject({
			id: topicId,
			aau_id: "109449",
			topic: "Quantum Physics",
			display_order: 1
		});

		const activity = await data.get("FacultyActivityEvent", "evt-1");
		expect(activity).toMatchObject({
			id: "evt-1",
			event_id: "evt-1",
			aau_id: "109449",
			event_type: "search"
		});

		expect(await data.get("Rail", "rail-1")).toMatchObject({ id: "rail-1", rail_id: "rail-1", name: "Top Picks" });
		expect(selectCalls).toContainEqual(
			expect.objectContaining({
				resource: "Rail",
				where: { rail_id: { eq: "rail-1" } }
			})
		);

		const recommendationId = ["109449", "sloan", "rail-1"].join("\u001f");
		expect(await data.get("Recommendation", recommendationId)).toMatchObject({
			id: recommendationId,
			aau_id: "109449",
			award_id: "sloan",
			rail_id: "rail-1",
			rank: 1
		});
		expect(selectCalls).toContainEqual(
			expect.objectContaining({
				resource: "Recommendation",
				where: {
					aau_id: { eq: "109449" },
					award_id: { eq: "sloan" },
					rail_id: { eq: "rail-1" }
				}
			})
		);

		const winId = ["109449", "sloan"].join("\u001f");
		expect(await data.get("AwardWin", winId)).toMatchObject({
			id: winId,
			aau_id: "109449",
			award_id: "sloan",
			received_year: 2019
		});
		expect(selectCalls).toContainEqual(
			expect.objectContaining({
				resource: "AwardWin",
				where: { aau_id: { eq: "109449" }, award_id: { eq: "sloan" } }
			})
		);
		expect(findById).not.toHaveBeenCalled();
	});

	it("updates and deletes natural-key records using the Rayfin system id", async () => {
		const onboarding = {
			name: "OnboardingState",
			slug: "onboarding-states",
			fields: [
				{ name: "aau_id", type: "string" as const, nullable: false, readOnly: false, generated: false, primaryKey: true },
				{ name: "current_step", type: "string" as const, nullable: false, readOnly: false, generated: false }
			]
		};
		const topic = {
			name: "OnboardingTopic",
			slug: "onboarding-topics",
			fields: [
				{ name: "aau_id", type: "string" as const, nullable: false, readOnly: false, generated: false, primaryKey: true },
				{ name: "topic", type: "string" as const, nullable: false, readOnly: false, generated: false, primaryKey: true },
				{ name: "display_order", type: "integer" as const, nullable: false, readOnly: false, generated: false }
			]
		};
		const rows = {
			OnboardingState: [
				{ id: "rayfin-state-uuid", aau_id: "109449", current_step: "welcome" }
			],
			OnboardingTopic: [
				{ id: "rayfin-topic-uuid", aau_id: "109449", topic: "Quantum Physics", display_order: 1 }
			]
		};
		const update = vi.fn(async (where: { id: string }, values: Record<string, unknown>) => ({
			...rows.OnboardingState[0],
			...values
		}));
		const del = vi.fn(async (_where: { id: string }) => undefined);
		function entity(name: keyof typeof rows) {
			return {
				select(fields: string[]) {
					const state: { fields: string[]; where?: Record<string, unknown> } = { fields };
					const tail = {
						where(filter: Record<string, unknown>) {
							state.where = filter;
							return tail;
						},
						orderBy: () => tail,
						first: () => tail,
						execute: async () => rows[name].filter((row) => matchesEqFilter(row, state.where)),
						executePaginated: async () => ({
							items: rows[name].filter((row) => matchesEqFilter(row, state.where)),
							hasNextPage: false
						})
					};
					return tail;
				},
				findById: vi.fn(async () => {
					throw new Error("invalid uuid");
				}),
				create: async (values: Record<string, unknown>) => values,
				update,
				delete: del
			};
		}
		const data = new RayfinAdminData(
			{
				data: {
					OnboardingState: entity("OnboardingState"),
					OnboardingTopic: entity("OnboardingTopic")
				}
			},
			{ OnboardingState: onboarding, OnboardingTopic: topic }
		);

		await data.update("OnboardingState", "109449", { current_step: "1" });
		expect(update).toHaveBeenCalledWith({ id: "rayfin-state-uuid" }, { current_step: "1" });

		const topicId = ["109449", "Quantum Physics"].join("\u001f");
		await data.remove("OnboardingTopic", topicId);
		expect(del).toHaveBeenCalledWith({ id: "rayfin-topic-uuid" });
	});
});

import { describe, expect, it, vi } from "vitest";
import { primaryKeyName, recordId, withRecordId } from "./conventions.js";
import { RayfinAdminData, type RayfinDataClient } from "./rayfin-admin-data.js";
import type { AdminResource, AdminResources } from "./types.js";

const faculty: AdminResource = {
	name: "Faculty",
	slug: "faculties",
	fields: [
		{ name: "aau_id", type: "string", nullable: false, readOnly: false, generated: false, primaryKey: true },
		{ name: "first_name", type: "string", nullable: false, readOnly: false, generated: false },
		{ name: "last_name", type: "string", nullable: false, readOnly: false, generated: false }
	]
};

const award: AdminResource = {
	name: "Award",
	slug: "awards",
	fields: [
		{ name: "award_id", type: "string", nullable: false, readOnly: false, generated: false, primaryKey: true },
		{ name: "name", type: "string", nullable: false, readOnly: false, generated: false }
	]
};

const product: AdminResource = {
	name: "Product",
	slug: "products",
	fields: [
		{ name: "id", type: "string", nullable: false, readOnly: true, generated: true, primaryKey: true },
		{ name: "name", type: "string", nullable: false, readOnly: false, generated: false }
	]
};

describe("admin record identity", () => {
	it("uses the unique natural key for Faculty and Award", () => {
		expect(primaryKeyName(faculty)).toBe("aau_id");
		expect(primaryKeyName(award)).toBe("award_id");
		expect(recordId(faculty, { aau_id: "aau-1", first_name: "Jane" })).toBe("aau-1");
		expect(recordId(award, { award_id: "aw-9", name: "MacArthur" })).toBe("aw-9");
		expect(withRecordId(faculty, { aau_id: "aau-1", first_name: "Jane" })).toMatchObject({
			id: "aau-1",
			aau_id: "aau-1",
			first_name: "Jane"
		});
	});

	it("keeps id-primary-key resources unchanged", () => {
		expect(primaryKeyName(product)).toBe("id");
		expect(recordId(product, { id: "p-1", name: "Widget" })).toBe("p-1");
		expect(withRecordId(product, { id: "p-1", name: "Widget" })).toEqual({ id: "p-1", name: "Widget" });
	});

	it("gives Faculty rows without an id field unique non-empty keys", () => {
		const rows = [
			{ aau_id: "aau-jane", first_name: "Jane", last_name: "Doe" },
			{ aau_id: "aau-pat", first_name: "Pat", last_name: "Lee" }
		];
		const ids = rows.map((row) => recordId(faculty, row));
		expect(ids).toEqual(["aau-jane", "aau-pat"]);
		expect(ids.every((id) => id.length > 0)).toBe(true);
		expect(new Set(ids).size).toBe(rows.length);
	});

	it("encodes composite topic keys instead of colliding on a missing id", () => {
		const topic: AdminResource = {
			name: "OnboardingTopic",
			slug: "onboarding-topics",
			fields: [
				{ name: "aau_id", type: "string", nullable: false, readOnly: false, generated: false, primaryKey: true },
				{ name: "topic", type: "string", nullable: false, readOnly: false, generated: false, primaryKey: true }
			]
		};
		expect(recordId(topic, { aau_id: "109449", topic: "Quantum Physics" })).toBe("109449\u001fQuantum Physics");
		expect(recordId(topic, { aau_id: "109449", topic: "Optics" })).toBe("109449\u001fOptics");
	});
});

describe("RayfinAdminData list identity", () => {
	it("synthesizes unique item.id from aau_id so keyed each blocks do not collide", async () => {
		const rows = [
			{ aau_id: "aau-jane", first_name: "Jane", last_name: "Doe" },
			{ aau_id: "aau-pat", first_name: "Pat", last_name: "Lee" }
		];
		const executePaginated = vi.fn(async () => ({ items: rows.map((row) => ({ ...row })), hasNextPage: false }));
		const client: RayfinDataClient = {
			data: {
				Faculty: {
					select: () => ({
						orderBy: () => ({
							first: () => ({
								after: () => ({ executePaginated }),
								executePaginated
							})
						})
					}),
					findById: async () => null,
					create: async (values) => values as never,
					update: async (_where, values) => values as never,
					delete: async () => undefined
				}
			}
		};
		const resources: AdminResources = { Faculty: faculty };
		const data = new RayfinAdminData(client, resources);
		const listed = await data.list("Faculty");
		expect(listed.items.map((item) => item.id)).toEqual(["aau-jane", "aau-pat"]);
		expect(listed.items.every((item) => item.id)).toBe(true);
		expect(new Set(listed.items.map((item) => item.id)).size).toBe(2);
		expect(listed.items[0]).not.toHaveProperty("id", undefined);
	});
});

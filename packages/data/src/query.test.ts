import { describe, expect, it } from "vitest";
import { AppDataError, isAppDataTestMode } from "./query.js";
import { createRemoteTableClient, handleTableRpc } from "./remote-table.js";
import type { TableClient } from "./query.js";

describe("AppDataError", () => {
	it("maps kinds to HTTP status codes", () => {
		expect(new AppDataError("validation", "bad").status).toBe(400);
		expect(new AppDataError("not_found", "missing").status).toBe(404);
		expect(new AppDataError("conflict", "dup").status).toBe(409);
		expect(new AppDataError("unexpected", "boom").status).toBe(500);
	});
});

describe("isAppDataTestMode", () => {
	it("reads explicit env flags and does not assume FAME", () => {
		expect(isAppDataTestMode({})).toBe(false);
		expect(isAppDataTestMode({ PUBLIC_ADMIN_TEST_MODE: "true" })).toBe(true);
		expect(isAppDataTestMode({ PUBLIC_APP_DATA_TEST_MODE: "true" })).toBe(true);
		expect(isAppDataTestMode({ PUBLIC_APP_DATA_TEST_MODE: "false" })).toBe(false);
	});
});

describe("handleTableRpc + createRemoteTableClient", () => {
	it("round-trips table CRUD through a memory table", async () => {
		const rows = new Map<string, { id: string; name: string }>();
		const memory: TableClient<{ id: string; name: string }> = {
			async findById(id) {
				return rows.get(String(id.id)) ?? null;
			},
			async create(values) {
				rows.set(values.id, values);
				return values;
			},
			async update(where, values) {
				const current = rows.get(String(where.id));
				if (!current) throw new AppDataError("not_found", "missing", 404);
				const next = { ...current, ...values };
				rows.set(current.id, next);
				return next;
			},
			async remove(where) {
				rows.delete(String(where.id));
			},
			select() {
				return {
					where() {
						return this;
					},
					orderBy() {
						return this;
					},
					first() {
						return this;
					},
					execute: async () => [...rows.values()]
				};
			},
			async upsert(values) {
				rows.set(values.id, values);
				return values;
			}
		};

		const created = await handleTableRpc({ item: memory as never }, {
			op: "table.create",
			payload: { table: "item", values: { id: "1", name: "Ada" } }
		});
		expect(created).toEqual({ id: "1", name: "Ada" });

		const calls: Array<{ op: string; payload: unknown }> = [];
		const rpc = async (op: string, payload: unknown = {}) => {
			calls.push({ op, payload });
			return handleTableRpc({ item: memory as never }, { op, payload: payload as Record<string, unknown> });
		};
		const remote = createRemoteTableClient<{ id: string; name: string }>("item", rpc);
		await expect(remote.findById({ id: "1" })).resolves.toEqual({ id: "1", name: "Ada" });
		expect(calls[0]?.op).toBe("table.findById");
	});
});

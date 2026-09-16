import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { createSqliteTableClient } from "./sqlite-table.js";

describe("createSqliteTableClient", () => {
	it("supports generic CRUD without app table names", async () => {
		const db = new Database(":memory:");
		db.exec(`CREATE TABLE widget (
			widget_id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			tags TEXT NOT NULL,
			active INTEGER NOT NULL
		)`);
		const table = createSqliteTableClient<{
			widget_id: string;
			name: string;
			tags: string[];
			active: boolean;
		}>(db, "widget", {
			primaryKeys: ["widget_id"],
			codec: { jsonFields: ["tags"], boolFields: ["active"] }
		});

		const created = await table.create({
			widget_id: "w1",
			name: "Bolt",
			tags: ["metal"],
			active: true
		});
		expect(created).toEqual({
			widget_id: "w1",
			name: "Bolt",
			tags: ["metal"],
			active: true
		});

		const found = await table
			.select()
			.where({ name: { contains: "ol" } })
			.first(5)
			.execute();
		expect(found).toHaveLength(1);

		await table.update({ widget_id: "w1" }, { active: false });
		await expect(table.findById({ widget_id: "w1" })).resolves.toMatchObject({ active: false });
	});
});

import { describe, expect, it } from "vitest";
import {
	clearQueryCache,
	querySemanticModel,
	readSemanticModelTable
} from "./query-semantic-model.js";
import {
	createRecordingClient,
	queryError,
	successTable
} from "./test/fake-semantic-client.js";

describe("readSemanticModelTable call shape", () => {
	it("queries the passed alias with EVALUATE and a quoted table name", async () => {
		const client = createRecordingClient((alias, dax) => {
			if (alias !== "default" || dax !== "EVALUATE 'Sales'") {
				return queryError(`unexpected ${alias} ${dax}`);
			}
			return successTable([{ name: "Sales[Amount]", dataType: "Int64" }], [[42]]);
		});
		const result = await readSemanticModelTable("default", "Sales", { client });
		expect(client.calls).toEqual([
			{ type: "semanticModel", alias: "default" },
			{ type: "query", alias: "default", dax: "EVALUATE 'Sales'", options: undefined }
		]);
		expect(result.status).toBe("success");
		if (result.status !== "success") return;
		expect(result.table.columnNames()).toEqual(["Amount"]);
		expect(result.table.objects()).toEqual([{ Amount: 42 }]);
	});

	it("quotes table names that contain spaces", async () => {
		const client = createRecordingClient((alias, dax) => {
			if (dax !== "EVALUATE 'Sales Order'") return queryError(`unexpected dax ${dax}`);
			return successTable([{ name: "Sales Order[Id]" }], [["so-1"]]);
		});
		const result = await readSemanticModelTable("default", "Sales Order", { client });
		expect(client.calls.some((call) => call.type === "query" && call.dax === "EVALUATE 'Sales Order'")).toBe(
			true
		);
		expect(result.status).toBe("success");
		if (result.status !== "success") return;
		expect(result.table.columnNames()).toEqual(["Id"]);
		expect(result.table.objects()).toEqual([{ Id: "so-1" }]);
	});

	it("escapes single quotes in table names", async () => {
		const client = createRecordingClient((_alias, dax) => {
			if (dax !== "EVALUATE 'O''Brien'") return queryError(`unexpected dax ${dax}`);
			return successTable([{ name: "O'Brien[N]" }], [[1]]);
		});
		await readSemanticModelTable("hr", "O'Brien", { client });
		expect(client.calls).toEqual([
			{ type: "semanticModel", alias: "hr" },
			{ type: "query", alias: "hr", dax: "EVALUATE 'O''Brien'", options: undefined }
		]);
	});

	it("forwards bypassCache and does not leak client into query options", async () => {
		const client = createRecordingClient(() =>
			successTable([{ name: "Sales[Amount]" }], [[1]])
		);
		await readSemanticModelTable("sales", "Sales", { client, bypassCache: true });
		const queryCall = client.calls.find((call) => call.type === "query");
		expect(queryCall).toEqual({
			type: "query",
			alias: "sales",
			dax: "EVALUATE 'Sales'",
			options: { bypassCache: true }
		});
		expect(queryCall).not.toHaveProperty("client");
		expect(JSON.stringify(queryCall)).not.toContain("client");
	});
});

describe("readSemanticModelTable result mapping", () => {
	it("unqualifies Table[Column] names and keeps cell values", async () => {
		const cachedAt = new Date("2024-01-15T10:30:00.000Z");
		const client = createRecordingClient(() =>
			successTable(
				[
					{ name: "Faculty[Faculty ID]", dataType: "Int64" },
					{ name: "Faculty[Name]", dataType: "String" }
				],
				[
					[7, "Ada"],
					[8, "Grace"]
				],
				{ fromCache: true, cachedAt }
			)
		);
		const result = await readSemanticModelTable("default", "Faculty", { client });
		expect(result).toMatchObject({ status: "success", fromCache: true, cachedAt });
		if (result.status !== "success") return;
		expect(result.table.columnNames()).toEqual(["Faculty ID", "Name"]);
		expect(result.table.objects()).toEqual([
			{ "Faculty ID": 7, Name: "Ada" },
			{ "Faculty ID": 8, Name: "Grace" }
		]);
	});

	it("unqualifies columns from other tables via the bracket form", async () => {
		const client = createRecordingClient(() =>
			successTable(
				[
					{ name: "Faculty[Name]" },
					{ name: "Department[Name]" }
				],
				[["Ada", "Math"]]
			)
		);
		const result = await readSemanticModelTable("default", "Faculty", { client });
		if (result.status !== "success") throw new Error("expected success");
		expect(result.table.columnNames()).toEqual(["Name", "Name_2"]);
		expect(result.table.objects()).toEqual([{ Name: "Ada", Name_2: "Math" }]);
	});

	it("surfaces query errors without throwing or fabricating a table", async () => {
		const error = { category: "query" as const, message: "Syntax error at position 18" };
		const client = createRecordingClient(() => ({ status: "error", error, fromCache: false }));
		const result = await readSemanticModelTable("default", "Missing", { client });
		expect(result).toEqual({ status: "error", error, fromCache: false });
		expect(result).not.toHaveProperty("table");
	});
});

describe("querySemanticModel", () => {
	it("passes custom DAX through unchanged", async () => {
		const dax = "EVALUATE INFO.VIEW.TABLES()";
		const client = createRecordingClient((alias, received) => {
			if (alias !== "analytics" || received !== dax) return queryError(`unexpected ${alias} ${received}`);
			return successTable([{ name: "[Name]" }], [["Faculty"]]);
		});
		const result = await querySemanticModel("analytics", dax, { client });
		expect(client.calls).toEqual([
			{ type: "semanticModel", alias: "analytics" },
			{ type: "query", alias: "analytics", dax, options: undefined }
		]);
		expect(result.status).toBe("success");
		if (result.status !== "success") return;
		expect(result.table.columns[0]?.name).toBe("[Name]");
		expect(result.table.rows).toEqual([["Faculty"]]);
		expect(result.table).not.toHaveProperty("objects");
		expect(typeof (result.table as { objects?: unknown }).objects).not.toBe("function");
	});
});

describe("clearQueryCache", () => {
	it("clears one model when an alias is passed", () => {
		const client = createRecordingClient(() => queryError("query should not run"));
		clearQueryCache("sales", { client });
		expect(client.calls).toEqual([
			{ type: "semanticModel", alias: "sales" },
			{ type: "clearModelCache", alias: "sales" }
		]);
	});

	it("clears the whole client when no alias is passed", () => {
		const client = createRecordingClient(() => queryError("query should not run"));
		clearQueryCache(undefined, { client });
		expect(client.calls).toEqual([{ type: "clearAll" }]);
	});
});

describe("injected client anti-tautology", () => {
	it("queries the injected client, not a different fake", async () => {
		const unused = createRecordingClient(() =>
			successTable([{ name: "Unused[Col]" }], [["nope"]])
		);
		const used = createRecordingClient((alias, dax) => {
			if (alias !== "inventory" || dax !== "EVALUATE 'Stock'") {
				return queryError(`unexpected ${alias} ${dax}`);
			}
			return successTable([{ name: "Stock[Sku]" }], [["A1"]]);
		});
		const result = await readSemanticModelTable("inventory", "Stock", { client: used });
		expect(unused.calls).toEqual([]);
		expect(used.calls).toEqual([
			{ type: "semanticModel", alias: "inventory" },
			{ type: "query", alias: "inventory", dax: "EVALUATE 'Stock'", options: undefined }
		]);
		expect(result.status).toBe("success");
		if (result.status !== "success") return;
		expect(result.table.objects()).toEqual([{ Sku: "A1" }]);
	});
});

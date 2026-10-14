import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { addSqlDatabase, enableSqlDatabase, parseArgs } from "./add-sql-database.mjs";
import { copyTemplate, substitutions } from "./create-app.mjs";

test("parseArgs reads a slug", () => {
	assert.deepEqual(parseArgs(["faculty-activity"]), { slug: "faculty-activity" });
	assert.throws(() => parseArgs([]), /Usage/);
	assert.throws(() => parseArgs(["faculty-activity", "--extra"]), /Usage/);
});

test("enableSqlDatabase turns data on from the template", async () => {
	const tmp = await mkdtemp(path.join(os.tmpdir(), "vpaa-add-sql-"));
	try {
		const dest = path.join(tmp, "app");
		await copyTemplate(dest, substitutions("faculty-activity"));
		const first = await enableSqlDatabase(dest);
		assert.equal(first, true);
		const yml = await readFile(path.join(dest, "rayfin", "rayfin.yml"), "utf8");
		assert.match(yml, /data:\s*\r?\n\s+enabled:\s*true/);
		assert.match(yml, /dialect:\s*mssql/);
		assert.match(yml, /allowIntrospection:\s*false/);
		const second = await enableSqlDatabase(dest);
		assert.equal(second, false);
	} finally {
		await rm(tmp, { recursive: true, force: true });
	}
});

test("addSqlDatabase rejects a missing app", async () => {
	const tmp = await mkdtemp(path.join(os.tmpdir(), "vpaa-add-sql-missing-"));
	try {
		await mkdir(path.join(tmp, "apps"), { recursive: true });
		await assert.rejects(() => addSqlDatabase("missing-app", { root: tmp }), /No app/);
	} finally {
		await rm(tmp, { recursive: true, force: true });
	}
});

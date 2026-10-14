import { mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { filterDevArgs, parseArgs, startApp } from "./start-app.mjs";

const USAGE = /Usage: pnpm start-app/;

test("parseArgs reads a slug", () => {
	assert.deepEqual(parseArgs(["my-app"]), { slug: "my-app" });
	assert.deepEqual(parseArgs(["@vpaa/my-app"]), { slug: "my-app" });
	assert.deepEqual(parseArgs(["apps/my-app"]), { slug: "my-app" });
	assert.throws(() => parseArgs([]), USAGE);
	assert.throws(() => parseArgs(["my-app", "--extra"]), USAGE);
});

test("filterDevArgs starts only that app", () => {
	assert.deepEqual(filterDevArgs("my-app"), ["--filter", "@vpaa/my-app", "dev"]);
});

test("startApp runs pnpm filter dev from the repo root", async () => {
	const tmp = await mkdtemp(path.join(os.tmpdir(), "vpaa-start-app-"));
	const slug = "faculty-activity";
	const appDir = path.join(tmp, "apps", slug);
	await mkdir(path.join(appDir, "rayfin"), { recursive: true });
	await writeFile(path.join(appDir, "rayfin", "rayfin.yml"), "id: faculty-activity\n", "utf8");
	const calls = [];
	try {
		const result = await startApp({
			slug,
			repoRoot: tmp,
			run: async (command, args, cwd) => {
				calls.push({ command, args, cwd });
			}
		});
		assert.equal(result.slug, slug);
		assert.deepEqual(calls, [
			{ command: "pnpm", args: ["--filter", "@vpaa/faculty-activity", "dev"], cwd: tmp }
		]);
	} finally {
		await rm(tmp, { recursive: true, force: true });
	}
});

test("startApp rejects a missing app", async () => {
	const tmp = await mkdtemp(path.join(os.tmpdir(), "vpaa-start-app-missing-"));
	try {
		await mkdir(path.join(tmp, "apps"), { recursive: true });
		await assert.rejects(() => startApp({ slug: "missing-app", repoRoot: tmp }), /No app/);
	} finally {
		await rm(tmp, { recursive: true, force: true });
	}
});

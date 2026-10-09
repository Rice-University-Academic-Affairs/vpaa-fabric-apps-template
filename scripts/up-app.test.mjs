import { mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
	normalizeSlug,
	parseArgs,
	rayfinUpArgs,
	resolveAppDir,
	upApp,
	workspaceFromNameFile
} from "./up-app.mjs";

const USAGE = /Usage: pnpm up-app/;

async function withApp(fn, options = {}) {
	const tmp = await mkdtemp(path.join(os.tmpdir(), "vpaa-up-app-"));
	const slug = options.slug ?? "faculty-activity";
	const appDir = path.join(tmp, "apps", slug);
	await mkdir(path.join(appDir, "rayfin"), { recursive: true });
	await writeFile(path.join(appDir, "rayfin", "rayfin.yml"), "id: faculty-activity\n", "utf8");
	if (options.workspaceName) {
		await writeFile(path.join(appDir, "rayfin", "workspace-name"), `${options.workspaceName}\n`, "utf8");
	}
	try {
		return await fn({ tmp, slug, appDir });
	} finally {
		await rm(tmp, { recursive: true, force: true });
	}
}

const emptyFlags = {
	dryRun: false,
	status: false,
	itemName: null,
	capacityId: null,
	excludeServices: null
};

test("parseArgs reads slug and optional --workspace", () => {
	assert.deepEqual(parseArgs(["undergrad-attrition-app"]), {
		slug: "undergrad-attrition-app",
		workspace: null,
		...emptyFlags
	});
	assert.deepEqual(parseArgs(["undergrad-attrition-app", "--workspace", "EDBI_Fabric_Prod_SAWS_Collaborative_Workspace"]), {
		slug: "undergrad-attrition-app",
		workspace: "EDBI_Fabric_Prod_SAWS_Collaborative_Workspace",
		...emptyFlags
	});
	assert.deepEqual(parseArgs(["--workspace", "EDBI_Fabric_Prod_VPAA_Workspace", "fame"]), {
		slug: "fame",
		workspace: "EDBI_Fabric_Prod_VPAA_Workspace",
		...emptyFlags
	});
});

test("parseArgs reads Rayfin 1.36 deploy flags", () => {
	assert.deepEqual(
		parseArgs(["fame", "--dry-run", "--exclude-services", "functions", "--capacity-id", "cap-1"]),
		{
			slug: "fame",
			workspace: null,
			dryRun: true,
			status: false,
			itemName: null,
			capacityId: "cap-1",
			excludeServices: "functions"
		}
	);
	assert.deepEqual(parseArgs(["fame", "--status", "--item-name", "FAME"]), {
		slug: "fame",
		workspace: null,
		dryRun: false,
		status: true,
		itemName: "FAME",
		capacityId: null,
		excludeServices: null
	});
});

test("parseArgs accepts @vpaa/ and apps/ prefixes", () => {
	assert.equal(parseArgs(["@vpaa/undergrad-attrition-app"]).slug, "undergrad-attrition-app");
	assert.equal(parseArgs(["apps/fame"]).slug, "fame");
	assert.equal(normalizeSlug("apps\\fame"), "fame");
});

test("parseArgs rejects missing slug, unknown flags, and --workspace without a value", () => {
	assert.throws(() => parseArgs([]), USAGE);
	assert.throws(() => parseArgs(["fame", "extra"]), USAGE);
	assert.throws(() => parseArgs(["fame", "--yes"]), USAGE);
	assert.throws(() => parseArgs(["fame", "--workspace"]), USAGE);
	assert.throws(() => parseArgs(["Fame"]), /Invalid slug/);
});

test("workspaceFromNameFile reads the portal workspace name", async () => {
	await withApp(async ({ appDir }) => {
		assert.equal(
			await workspaceFromNameFile(appDir),
			"EDBI_Fabric_Prod_SAWS_Collaborative_Workspace"
		);
	}, { workspaceName: "EDBI_Fabric_Prod_SAWS_Collaborative_Workspace" });
	await withApp(async ({ appDir }) => {
		assert.equal(await workspaceFromNameFile(appDir), null);
	});
});

test("resolveAppDir requires apps/<slug>/rayfin/rayfin.yml", async () => {
	await withApp(async ({ tmp, slug, appDir }) => {
		const resolved = await resolveAppDir(slug, tmp);
		assert.equal(resolved.slug, slug);
		assert.equal(resolved.appDir, appDir);
		await assert.rejects(resolveAppDir("missing-app", tmp), /No app at apps\/missing-app/);
	});
});

test("upApp runs rayfin up from the app directory and never logs in", async () => {
	await withApp(async ({ tmp, slug, appDir }) => {
		const calls = [];
		const result = await upApp({
			slug,
			repoRoot: tmp,
			run: async (command, args, cwd) => {
				calls.push({ command, args, cwd });
			}
		});
		assert.equal(result.workspace, "EDBI_Fabric_Prod_SAWS_Collaborative_Workspace");
		assert.equal(calls.length, 1);
		assert.equal(calls[0].command, "pnpm");
		assert.equal(calls[0].cwd, appDir);
		assert.deepEqual(
			calls[0].args,
			rayfinUpArgs("EDBI_Fabric_Prod_SAWS_Collaborative_Workspace")
		);
		assert.equal(calls[0].args.includes("login"), false);
		assert.deepEqual(calls[0].args.slice(0, 3), ["exec", "rayfin", "up"]);
	}, { workspaceName: "EDBI_Fabric_Prod_SAWS_Collaborative_Workspace" });
});

test("upApp dry-run and status do not persist workspace-name", async () => {
	await withApp(async ({ tmp, slug, appDir }) => {
		const calls = [];
		await upApp({
			slug,
			workspace: "EDBI_Fabric_Prod_SAWS_Collaborative_Workspace",
			dryRun: true,
			repoRoot: tmp,
			run: async (command, args, cwd) => {
				calls.push({ command, args, cwd });
			}
		});
		assert.ok(calls[0].args.includes("--dry-run"));
		assert.equal(await workspaceFromNameFile(appDir), null);

		calls.length = 0;
		await upApp({
			slug,
			workspace: "EDBI_Fabric_Prod_SAWS_Collaborative_Workspace",
			status: true,
			repoRoot: tmp,
			run: async (command, args, cwd) => {
				calls.push({ command, args, cwd });
			}
		});
		assert.deepEqual(calls[0].args.slice(0, 4), ["exec", "rayfin", "up", "status"]);
		assert.equal(await workspaceFromNameFile(appDir), null);
	});
});

test("upApp prefers --workspace, persists it, and does not use deployments.json active", async () => {
	await withApp(async ({ tmp, slug, appDir }) => {
		const calls = [];
		await upApp({
			slug,
			workspace: "EDBI_Fabric_Prod_SAWS_Collaborative_Workspace",
			repoRoot: tmp,
			run: async (command, args, cwd) => {
				calls.push({ command, args, cwd });
			}
		});
		assert.equal(calls[0].cwd, appDir);
		assert.equal(calls[0].args[4], "EDBI_Fabric_Prod_SAWS_Collaborative_Workspace");
		assert.equal(
			await workspaceFromNameFile(appDir),
			"EDBI_Fabric_Prod_SAWS_Collaborative_Workspace"
		);

		calls.length = 0;
		const again = await upApp({
			slug,
			repoRoot: tmp,
			run: async (command, args, cwd) => {
				calls.push({ command, args, cwd });
			}
		});
		assert.equal(again.workspace, "EDBI_Fabric_Prod_SAWS_Collaborative_Workspace");
		assert.equal(calls[0].args[4], "EDBI_Fabric_Prod_SAWS_Collaborative_Workspace");
	});
	await withApp(async ({ tmp, slug }) => {
		await writeFile(
			path.join(tmp, "apps", slug, "rayfin", ".deployments.json"),
			JSON.stringify({ active: "edbi-fabric-prod-saws-collaborative-workspace" }),
			"utf8"
		);
		await assert.rejects(
			upApp({
				slug,
				repoRoot: tmp,
				run: async () => {
					throw new Error("should not run");
				}
			}),
			/First deploy of faculty-activity needs --workspace/
		);
	});
});

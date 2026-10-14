import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
	applyBlankScaffold,
	applyFunctionsScaffold,
	assertSlug,
	copyTemplate,
	displayNameFromSlug,
	parseArgs,
	substitutions
} from "./create-app.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredScripts = [
	"dev",
	"dev:frontend",
	"dev:rayfin",
	"check",
	"test",
	"test:smoke",
	"test:e2e",
	"admin:generate",
	"build:fabric"
];
const agentsHeadings = ["## Dev", "## Test (unit)", "## Smoke", "## E2E", "## Check", "## Generate"];
const semanticQueryDocs = [
	path.join(repoRoot, ".agents", "skills", "vpaa-create-app", "SKILL.md"),
	path.join(repoRoot, ".agents", "skills", "vpaa-register-semantic-model", "SKILL.md"),
	path.join(repoRoot, "packages", "semantic", "AGENTS.md")
];

function fencedBlocks(text) {
	return [...text.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map((match) => match[1]);
}

function assertNoObjectsOnQuerySemanticModel(text, file) {
	for (const block of fencedBlocks(text)) {
		if (block.includes("querySemanticModel") && /\.objects\s*\(/.test(block)) {
			assert.fail(`${file} calls .objects() on a querySemanticModel result`);
		}
	}
}
async function walkFiles(dir) {
	const files = [];
	const entries = await readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		const next = path.join(dir, entry.name);
		if (entry.isDirectory()) files.push(...(await walkFiles(next)));
		else files.push(next);
	}
	return files;
}

test("assertSlug rejects reserved and invalid names", () => {
	assert.throws(() => assertSlug("ui"), /reserved/);
	assert.throws(() => assertSlug("admin"), /reserved/);
	assert.throws(() => assertSlug("data"), /reserved/);
	assert.throws(() => assertSlug("auth"), /reserved/);
	assert.throws(() => assertSlug("types"), /reserved/);
	assert.throws(() => assertSlug("config"), /reserved/);
	assert.throws(() => assertSlug("Fame"), /Invalid slug/);
	assert.throws(() => assertSlug("1app"), /Invalid slug/);
	assert.throws(() => assertSlug(), /Usage/);
	assertSlug("faculty-activity");
});

test("parseArgs reads slug and --fabric", () => {
	assert.deepEqual(parseArgs(["faculty-activity"]), {
		slug: "faculty-activity",
		fabric: false,
		functions: false,
		blank: false
	});
	assert.deepEqual(parseArgs(["faculty-activity", "--fabric"]), {
		slug: "faculty-activity",
		fabric: true,
		functions: false,
		blank: false
	});
	assert.deepEqual(parseArgs(["--fabric", "faculty-activity"]), {
		slug: "faculty-activity",
		fabric: true,
		functions: false,
		blank: false
	});
});

test("parseArgs reads --functions", () => {
	assert.deepEqual(parseArgs(["faculty-activity", "--functions"]), {
		slug: "faculty-activity",
		fabric: false,
		functions: true,
		blank: false
	});
});

test("parseArgs rejects semantic attach flags", () => {
	assert.throws(
		() => parseArgs(["faculty-activity", "--semantic"]),
		/add-semantic-model/
	);
	assert.throws(
		() => parseArgs(["faculty-activity", "--from-url", "https://example.com"]),
		/add-semantic-model/
	);
});

test("copyTemplate substitutes tokens without writing into apps/", async () => {
	const tmp = await mkdtemp(path.join(os.tmpdir(), "vpaa-new-app-"));
	try {
		const dest = path.join(tmp, "app");
		const vars = substitutions("faculty-activity");
		assert.equal(displayNameFromSlug("faculty-activity"), "Faculty Activity");
		await copyTemplate(dest, vars);
		await assert.rejects(copyTemplate(dest, vars), /overwrite/);
		const pkg = JSON.parse(await readFile(path.join(dest, "package.json"), "utf8"));
		assert.equal(pkg.name, "@vpaa/faculty-activity");
		for (const script of requiredScripts) {
			assert.equal(typeof pkg.scripts[script], "string", script);
		}
		assert.match(pkg.scripts["test:smoke"], /playwright\.smoke\.config\.ts/);
		const agents = await readFile(path.join(dest, "AGENTS.md"), "utf8");
		for (const heading of agentsHeadings) {
			assert.match(agents, new RegExp(heading.replace(/[()]/g, "\\$&")));
		}
		assert.doesNotMatch(agents, /\{\{/);
		const yml = await readFile(path.join(dest, "rayfin", "rayfin.yml"), "utf8");
		assert.match(yml, /buildCommand: npm run build:fabric/);
		assert.match(yml, /id: faculty-activity/);
		assert.match(yml, /data:\s*\r?\n\s+enabled:\s*false/);
		assert.doesNotMatch(yml, /dialect:\s*mssql/);
		assert.match(yml, /assetAccess:\s*protected/);
		assert.match(yml, /externalEntraExchange:\s*true/);
		assert.match(yml, /functions:\s*\r?\n\s+enabled:\s*false/);
		assert.doesNotMatch(yml, /tangy-coast/);
		const smokeSpec = await readFile(path.join(dest, "e2e", "smoke.spec.ts"), "utf8");
		assert.match(smokeSpec, /goto\("\/admin"\)/);
		assert.match(smokeSpec, /Admin Users/);
		assert.doesNotMatch(smokeSpec, /Products/);
		assert.doesNotMatch(smokeSpec, /Product 001/);
		const schema = await readFile(path.join(dest, "rayfin", "data", "schema.ts"), "utf8");
		assert.match(schema, /domain\/entities\.generated/);
		assert.doesNotMatch(schema, /Note/);
		const schemaTest = await readFile(path.join(dest, "src", "lib", "schema.test.ts"), "utf8");
		assert.match(schemaTest, /adminResources/);
		assert.doesNotMatch(schemaTest, /rayfin\/data/);
		await readFile(path.join(dest, "scripts", "fabric-app-data.mjs"), "utf8");
		const smoke = await readFile(path.join(dest, "playwright.smoke.config.ts"), "utf8");
		assert.match(smoke, /webServer:\s*\{/);
		assert.doesNotMatch(smoke, /webServer:\s*\[/);
		assert.doesNotMatch(smoke, /5174/);
		const leftover = /\{\{(slug|packageName|displayName)\}\}/;
		const files = await walkFiles(dest);
		for (const file of files) {
			assert.doesNotMatch(path.relative(dest, file), leftover);
			const text = await readFile(file, "utf8");
			assert.doesNotMatch(text, leftover, file);
		}
		const adminLayout = await readFile(path.join(dest, "src", "routes", "admin", "+layout.svelte"), "utf8");
		assert.match(adminLayout, /import\s*\{[^}]*setAdminContext[^}]*\}\s*from\s*["']@vpaa\/admin["']/);
		assert.doesNotMatch(adminLayout, /\bcreateContext\b/);
		const chrome = await readFile(path.join(dest, "src", "lib", "chrome.ts"), "utf8");
		assert.match(chrome, /productShell = true/);
		const home = await readFile(path.join(dest, "src", "routes", "+page.svelte"), "utf8");
		assert.match(home, /PageHeader/);
	} finally {
		await rm(tmp, { recursive: true, force: true });
	}
});

test("parseArgs reads --blank", () => {
	assert.deepEqual(parseArgs(["faculty-activity", "--blank"]), {
		slug: "faculty-activity",
		fabric: false,
		functions: false,
		blank: true
	});
});

test("applyBlankScaffold drops the product shell and home chrome", async () => {
	const tmp = await mkdtemp(path.join(os.tmpdir(), "vpaa-new-app-"));
	try {
		const dest = path.join(tmp, "app");
		await copyTemplate(dest, substitutions("faculty-activity"));
		await applyBlankScaffold(dest);
		const chrome = await readFile(path.join(dest, "src", "lib", "chrome.ts"), "utf8");
		assert.match(chrome, /productShell = false/);
		const home = await readFile(path.join(dest, "src", "routes", "+page.svelte"), "utf8");
		assert.doesNotMatch(home, /PageHeader/);
		assert.match(home, /data-app-ready/);
		const smoke = await readFile(path.join(dest, "e2e", "smoke.spec.ts"), "utf8");
		assert.match(smoke, /loads admin/);
		assert.doesNotMatch(smoke, /displayName/);
	} finally {
		await rm(tmp, { recursive: true, force: true });
	}
});

test("applyFunctionsScaffold enables application-auth functions", async () => {
	const tmp = await mkdtemp(path.join(os.tmpdir(), "vpaa-new-app-"));
	try {
		const dest = path.join(tmp, "app");
		await copyTemplate(dest, substitutions("faculty-activity"));
		await applyFunctionsScaffold(dest);
		const yml = await readFile(path.join(dest, "rayfin", "rayfin.yml"), "utf8");
		assert.match(yml, /functions:\s*\r?\n\s+enabled:\s*true/);
		assert.match(yml, /auth:\s*\r?\n\s+type:\s*application/);
		assert.match(yml, /path:\s*rayfin\/functions/);
		const pkg = JSON.parse(await readFile(path.join(dest, "package.json"), "utf8"));
		assert.equal(pkg.devDependencies["@microsoft/rayfin-local-dev"], "catalog:");
	} finally {
		await rm(tmp, { recursive: true, force: true });
	}
});

test("semantic query docs do not call objects() on querySemanticModel results", async () => {
	for (const file of semanticQueryDocs) {
		const text = await readFile(file, "utf8");
		assert.match(text, /querySemanticModel/);
		assert.match(text, /result\.table\.columns/);
		assert.match(text, /result\.table\.rows/);
		assert.match(text, /do not call `?\.objects\(\)`|Never call `?\.objects\(\)`/i);
		assertNoObjectsOnQuerySemanticModel(text, file);
	}
});

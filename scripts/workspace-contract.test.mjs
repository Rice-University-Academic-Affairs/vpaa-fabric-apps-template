import { readdirSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const agentsHeadings = ["## Dev", "## Test (unit)", "## Smoke", "## E2E", "## Check", "## Generate"];
const depcruiseRules = [
	"no-packages-to-apps",
	"types-is-leaf",
	"config-is-leaf",
	"data-dag",
	"auth-dag",
	"no-deep-data-imports",
	"no-deep-auth-imports",
	"no-deep-types-imports",
	"no-deep-semantic-imports",
	"semantic-is-leaf",
	"no-relative-from-apps-to-packages"
];

const appDirs = readdirSync(path.join(repoRoot, "apps"), { withFileTypes: true })
	.filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
	.map((entry) => `apps/${entry.name}`)
	.sort();

const packageDirs = [
	...appDirs.map((dir) => [dir, { test: true, smoke: true, e2e: true }]),
	["packages/admin", { test: true, smoke: true, e2e: true }],
	["packages/data", { test: true, smoke: false, e2e: false }],
	["packages/auth", { test: true, smoke: false, e2e: false }],
	["packages/semantic", { test: true, smoke: false, e2e: false }],
	["packages/types", { test: false, smoke: false, e2e: false }],
	["packages/config", { test: true, smoke: false, e2e: false }],
	["templates/rayfin-app", { test: true, smoke: true, e2e: true }]
];

function functionsManifests() {
	const manifests = ["templates/rayfin-app/rayfin/functions/package.json"];
	for (const dir of appDirs) {
		const relative = `${dir}/rayfin/functions/package.json`;
		try {
			readFileSync(path.join(repoRoot, relative), "utf8");
			manifests.push(relative);
		} catch {
			continue;
		}
	}
	return manifests;
}

const packageManifests = [
	...appDirs.map((dir) => `${dir}/package.json`),
	"packages/admin/package.json",
	"packages/data/package.json",
	"packages/auth/package.json",
	"packages/semantic/package.json",
	"packages/types/package.json",
	"packages/config/package.json",
	"templates/rayfin-app/package.json",
	...functionsManifests()
];

async function readJson(relative) {
	return JSON.parse(await readFile(path.join(repoRoot, relative), "utf8"));
}

async function readText(relative) {
	return readFile(path.join(repoRoot, relative), "utf8");
}

function catalogNames(yaml) {
	const names = [];
	let inCatalog = false;
	for (const line of yaml.split(/\r?\n/)) {
		if (line.trimEnd() === "catalog:") {
			inCatalog = true;
			continue;
		}
		if (!inCatalog) continue;
		if (line.length > 0 && !/^\s/.test(line)) break;
		const match = line.match(/^\s+(?:"([^"]+)"|'([^']+)'|([^:#]+)):\s/);
		if (match) names.push((match[1] ?? match[2] ?? match[3]).trim());
	}
	return names;
}

function depEntries(pkg) {
	return Object.entries({
		...pkg.dependencies,
		...pkg.devDependencies,
		...pkg.optionalDependencies
	});
}

test("root scripts keep the unit/smoke/e2e/check contract", async () => {
	const pkg = await readJson("package.json");
	assert.equal(pkg.scripts.dev, "node scripts/list-apps.mjs");
	assert.equal(pkg.scripts.test, "pnpm -r --if-present test && node --test scripts/create-app.test.mjs scripts/register-semantic-model.test.mjs scripts/up-app.test.mjs scripts/workspace-contract.test.mjs");
	assert.equal(
		pkg.scripts["test:smoke"],
		"pnpm --filter @vpaa/admin test:smoke && pnpm --sequential --filter \"./apps/*\" test:smoke"
	);
	assert.equal(
		pkg.scripts["test:e2e"],
		"pnpm --filter @vpaa/admin test:e2e && pnpm --sequential --filter \"./apps/*\" test:e2e"
	);
	assert.equal(pkg.scripts.check, "pnpm -r --if-present check");
	assert.match(pkg.scripts["check:deps"], /depcruise/);
	assert.match(pkg.scripts.knip, /knip/);
	assert.equal(pkg.scripts["new-app"], "node scripts/create-app.mjs");
	assert.equal(pkg.scripts["register-semantic-model"], "node scripts/register-semantic-model.mjs");
	assert.equal(pkg.scripts["up-app"], "node scripts/up-app.mjs");
});

test("pnpm workspace does not exclude apps", async () => {
	const yaml = await readText("pnpm-workspace.yaml");
	assert.match(yaml, /^\s*- "apps\/\*"\s*$/m);
	assert.doesNotMatch(yaml, /^\s*- "!apps\//m);
});

test("gitignore does not hide apps/ by unanchored slug", async () => {
	const gitignore = await readText(".gitignore");
	for (const dir of appDirs) {
		const slug = dir.slice("apps/".length);
		assert.doesNotMatch(
			gitignore,
			new RegExp(`^${slug}/\\s*$`, "m"),
			`unanchored ${slug}/ would hide ${dir}`
		);
	}
});

test("AGENTS.md treats every apps/ directory as first class", async () => {
	const text = await readText("AGENTS.md");
	assert.match(text, /Every directory under `apps\/` is a first-class workspace app/);
	assert.match(text, /pnpm up-app <slug>/);
	assert.match(text, /Never `npx rayfin`/);
});

test("workspace packages expose the scripts their AGENTS.md advertise", async () => {
	for (const [dir, expected] of packageDirs) {
		const pkg = await readJson(path.join(dir, "package.json"));
		assert.equal(typeof pkg.scripts.check, "string", `${dir} check`);
		if (expected.test) assert.equal(typeof pkg.scripts.test, "string", `${dir} test`);
		else assert.equal(pkg.scripts.test, undefined, `${dir} test`);
		if (expected.smoke) {
			assert.match(pkg.scripts["test:smoke"], /playwright\.smoke\.config\.ts/, `${dir} test:smoke`);
		} else {
			assert.equal(pkg.scripts["test:smoke"], undefined, `${dir} test:smoke`);
		}
		if (expected.e2e) assert.equal(typeof pkg.scripts["test:e2e"], "string", `${dir} test:e2e`);
		else assert.equal(pkg.scripts["test:e2e"], undefined, `${dir} test:e2e`);
	}
});

test("cataloged packages are consumed as catalog:", async () => {
	const names = catalogNames(await readText("pnpm-workspace.yaml"));
	assert.ok(names.includes("typescript"));
	assert.ok(names.includes("vitest"));
	assert.ok(names.includes("@playwright/test"));
	const used = new Set();
	const manifests = packageManifests;
	for (const manifest of manifests) {
		const pkg = await readJson(manifest);
		for (const [name, version] of depEntries(pkg)) {
			if (!names.includes(name)) continue;
			assert.equal(version, "catalog:", `${manifest} ${name}`);
			used.add(name);
		}
	}
	for (const name of names) {
		assert.ok(used.has(name), `catalog entry ${name} is unused`);
	}
});

test("workspace packages depend on each other with workspace:*", async () => {
	const manifests = packageManifests;
	for (const manifest of manifests) {
		const pkg = await readJson(manifest);
		for (const [name, version] of depEntries(pkg)) {
			if (!name.startsWith("@vpaa/")) continue;
			assert.equal(version, "workspace:*", `${manifest} ${name}`);
		}
	}
});

test("Playwright smoke configs start one Vite server", async () => {
	const files = [
		...appDirs.map((dir) => `${dir}/playwright.smoke.config.ts`),
		"packages/admin/playwright.smoke.config.ts",
		"templates/rayfin-app/playwright.smoke.config.ts"
	];
	for (const file of files) {
		const source = await readText(file);
		assert.match(source, /webServer:\s*\{/, file);
		assert.doesNotMatch(source, /webServer:\s*\[/, file);
		assert.match(source, /5173/, file);
		assert.doesNotMatch(source, /5174/, file);
	}
	const templateE2e = await readText("templates/rayfin-app/playwright.config.ts");
	assert.match(templateE2e, /webServer:\s*\{/);
	assert.doesNotMatch(templateE2e, /webServer:\s*\[/);
	assert.match(templateE2e, /5173/);
	assert.doesNotMatch(templateE2e, /5174/);
});

test("AGENTS.md files share the script-contract headings", async () => {
	const files = [
		"AGENTS.md",
		...appDirs.map((dir) => `${dir}/AGENTS.md`),
		"packages/admin/AGENTS.md",
		"packages/data/AGENTS.md",
		"packages/auth/AGENTS.md",
		"packages/semantic/AGENTS.md",
		"packages/types/AGENTS.md",
		"packages/config/AGENTS.md",
		"templates/rayfin-app/AGENTS.md"
	];
	for (const file of files) {
		const text = await readText(file);
		for (const heading of agentsHeadings) {
			assert.ok(text.includes(heading), `${file} ${heading}`);
		}
	}
});

test("dependency-cruiser keeps the extract DAG rules", async () => {
	const source = await readText(".dependency-cruiser.cjs");
	for (const name of depcruiseRules) {
		assert.match(source, new RegExp(`name: "${name}"`));
	}
});

test("rayfin.yml declares 1.36 hosting and auth keys", async () => {
	const files = [
		...appDirs.map((dir) => `${dir}/rayfin/rayfin.yml`),
		"templates/rayfin-app/rayfin/rayfin.yml"
	];
	for (const file of files) {
		const yml = await readText(file);
		assert.match(yml, /assetAccess:\s*protected/, file);
		assert.match(yml, /externalEntraExchange:\s*true/, file);
		assert.doesNotMatch(yml, /anonymousAccess/, file);
		assert.doesNotMatch(yml, /services\.connectors\.enabled|connectors:\s*\r?\n\s+enabled:/, file);
	}
});

test("knip does not ignore @vpaa/config in apps", async () => {
	const knip = await readJson("knip.json");
	const ignored = knip.workspaces["apps/*"]?.ignoreDependencies ?? [];
	assert.ok(!ignored.includes("@vpaa/config"));
});

const skipDirNames = new Set(["node_modules", ".svelte-kit", "dist", ".git", "coverage", "e2e"]);
const sourceFileExt = new Set([".ts", ".js", ".mjs", ".svelte"]);
const adminPanelNames = ["ResourceListPanel", "CreateRecordPanel", "EditRecordPanel"];
const adminContextFns = ["getAdminContext", "setAdminContext"];
const appAndTemplateRoots = ["apps", "templates"];

function walkSourceFiles(dir, out = []) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name.startsWith(".")) continue;
		const next = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (skipDirNames.has(entry.name)) continue;
			walkSourceFiles(next, out);
			continue;
		}
		if (/\.(test|spec)\.(ts|js|mjs)$/.test(entry.name)) continue;
		if (!sourceFileExt.has(path.extname(entry.name))) continue;
		out.push(next);
	}
	return out;
}

function namedImportsFrom(source, names) {
	const found = [];
	const importRe = /import\s+(type\s+)?([\s\S]*?)\s+from\s+["']([^"']+)["']/g;
	for (const match of source.matchAll(importRe)) {
		if (match[1]) continue;
		const clause = match[2] ?? "";
		const from = match[3] ?? "";
		for (const name of names) {
			if (new RegExp(`(?:^|[{\\s,])${name}(?:\\s|,|})`).test(clause)) {
				found.push({ name, from });
			}
		}
	}
	return found;
}

test("apps and templates share @vpaa/admin admin context with ResourceListPanel", () => {
	const files = [];
	for (const root of appAndTemplateRoots) {
		walkSourceFiles(path.join(repoRoot, root), files);
	}

	const layoutsByTree = new Map();
	for (const file of files) {
		const source = readFileSync(file, "utf8");
		const rel = path.relative(repoRoot, file);
		const posix = rel.replaceAll("\\", "/");

		if (/(^|\/)admin\//.test(posix)) {
			assert.doesNotMatch(
				source,
				/\bcreateContext\s*[<(]/,
				`${rel} must not call Svelte createContext; admin context lives in @vpaa/admin`
			);
		}

		for (const { name, from } of namedImportsFrom(source, adminContextFns)) {
			assert.equal(
				from,
				"@vpaa/admin",
				`${rel} imports ${name} from ${from}; use @vpaa/admin so ResourceListPanel can read the same context`
			);
		}

		const panelFromUi = namedImportsFrom(source, adminPanelNames).some((row) =>
			row.from.startsWith("@vpaa/admin")
		);
		if (panelFromUi) {
			const gets = namedImportsFrom(source, ["getAdminContext"]);
			assert.ok(
				gets.some((row) => row.from === "@vpaa/admin"),
				`${rel} imports an @vpaa/admin admin panel and must import getAdminContext from @vpaa/admin`
			);
		}

		if (rel.replaceAll("\\", "/").endsWith("src/routes/admin/+layout.svelte")) {
			const sets = namedImportsFrom(source, ["setAdminContext"]);
			assert.ok(
				sets.some((row) => row.from === "@vpaa/admin"),
				`${rel} must setAdminContext from @vpaa/admin`
			);
			layoutsByTree.set(rel, source);
		}
	}

	assert.ok(layoutsByTree.size > 0, "expected at least one app/template admin layout");
});

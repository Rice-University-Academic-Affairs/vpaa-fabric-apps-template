import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templateDir = path.join(repoRoot, "templates", "rayfin-app");
const reserved = new Set(["ui", "admin", "data", "auth", "types", "config"]);
const USAGE = "Usage: pnpm new-app <slug> [--fabric] [--functions] [--blank]";
const BOOL_FLAGS = new Set(["fabric", "functions", "blank"]);

export function parseArgs(argv) {
	const flags = new Set();
	const positionals = [];
	for (const arg of argv) {
		if (arg.startsWith("--")) {
			const name = arg.slice(2);
			if (name === "semantic" || name === "from-url" || name === "alias") {
				throw new Error(
					`Use pnpm add-semantic-model <slug> "<url>" after creating the app.`
				);
			}
			if (!BOOL_FLAGS.has(name)) {
				throw new Error(USAGE);
			}
			flags.add(name);
			continue;
		}
		positionals.push(arg);
	}
	return {
		slug: positionals[0],
		fabric: flags.has("fabric"),
		functions: flags.has("functions"),
		blank: flags.has("blank")
	};
}

export function assertSlug(slug) {
	if (!slug || typeof slug !== "string") {
		throw new Error(USAGE);
	}
	if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(slug)) {
		throw new Error(`Invalid slug "${slug}". Use kebab-case (e.g. faculty-activity).`);
	}
	if (reserved.has(slug)) {
		throw new Error(`Slug "${slug}" is reserved.`);
	}
}

export function displayNameFromSlug(slug) {
	return slug
		.split("-")
		.map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
		.join(" ");
}

export function substitutions(slug) {
	return {
		"{{slug}}": slug,
		"{{packageName}}": `@vpaa/${slug}`,
		"{{displayName}}": displayNameFromSlug(slug)
	};
}

function applySubs(text, vars) {
	let next = text;
	for (const [token, value] of Object.entries(vars)) {
		next = next.split(token).join(value);
	}
	return next;
}

export async function copyTemplate(destDir, vars) {
	async function walk(src, dest) {
		await mkdir(dest, { recursive: true });
		const entries = await readdir(src, { withFileTypes: true });
		for (const entry of entries) {
			const from = path.join(src, entry.name);
			const to = path.join(dest, applySubs(entry.name, vars));
			if (entry.isDirectory()) {
				await walk(from, to);
			} else {
				const raw = await readFile(from, "utf8");
				await writeFile(to, applySubs(raw, vars), "utf8");
			}
		}
	}
	const destStat = await stat(destDir).catch(() => null);
	if (destStat) {
		throw new Error(`Refusing to overwrite existing directory ${destDir}`);
	}
	await walk(templateDir, destDir);
}

function run(command, args, cwd) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, { cwd, stdio: "inherit", shell: true });
		child.on("exit", (code) => {
			if (code === 0) resolve();
			else reject(new Error(`${command} ${args.join(" ")} exited ${code}`));
		});
		child.on("error", reject);
	});
}

export async function patchRayfinBuildCommand(appDir) {
	const ymlPath = path.join(appDir, "rayfin", "rayfin.yml");
	let yml = await readFile(ymlPath, "utf8");
	yml = yml.replace(/buildCommand:\s*.+/g, "buildCommand: npm run build:fabric");
	await writeFile(ymlPath, yml, "utf8");
}

export async function applyBlankScaffold(appDir) {
	await writeFile(
		path.join(appDir, "src", "lib", "chrome.ts"),
		"export const productShell = false;\n"
	);
	await writeFile(path.join(appDir, "src", "routes", "+page.svelte"), "<div data-app-ready></div>\n");
	await writeFile(
		path.join(appDir, "e2e", "smoke.spec.ts"),
		`import { expect, test } from "@playwright/test";

test.describe("App smoke", () => {
	test("loads admin", async ({ page }) => {
		await page.goto("/admin", { waitUntil: "networkidle" });
		await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();
		await page.getByRole("link", { name: "Admin Users", exact: true }).click();
		await expect(page).toHaveURL(/\\/admin\\/admin-users$/);
		await expect(page.getByRole("heading", { name: "Admin Users" })).toBeVisible();
	});
});
`
	);
}

export async function applyFunctionsScaffold(appDir) {
	const ymlPath = path.join(appDir, "rayfin", "rayfin.yml");
	let yml = await readFile(ymlPath, "utf8");
	yml = yml.replace(
		/functions:\r?\n    enabled: false/,
		"functions:\n    enabled: true\n    path: rayfin/functions\n    buildCommand: npm run build\n    auth:\n      type: application"
	);
	await writeFile(ymlPath, yml, "utf8");

	const pkgPath = path.join(appDir, "package.json");
	const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
	pkg.devDependencies = {
		...pkg.devDependencies,
		"@microsoft/rayfin-local-dev": "catalog:"
	};
	await writeFile(pkgPath, `${JSON.stringify(pkg, null, "\t")}\n`, "utf8");
}

export async function createApp(slug, options = {}) {
	assertSlug(slug);
	const destDir = path.join(repoRoot, "apps", slug);
	const vars = substitutions(slug);
	await copyTemplate(destDir, vars);
	if (options.functions) {
		await applyFunctionsScaffold(destDir);
	}
	if (options.blank) {
		await applyBlankScaffold(destDir);
	}
	if (options.fabric) {
		try {
			await run(
				"pnpm",
				[
					"exec",
					"rayfin",
					"init",
					".",
					"--project-name",
					slug,
					"--services",
					"db",
					"--auth-methods",
					"fabric",
					"--static-hosting",
					"--dialect",
					"mssql"
				],
				destDir
			);
		} catch (error) {
			console.warn(error instanceof Error ? error.message : error);
			console.warn("Continuing without Fabric bind. App still boots in PUBLIC_ADMIN_TEST_MODE.");
		}
		await patchRayfinBuildCommand(destDir);
	}
	if (!options.skipInstall) {
		await run("pnpm", ["install"], repoRoot);
		await run("pnpm", ["--filter", vars["{{packageName}}"], "admin:generate"], repoRoot);
	}
	return destDir;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
	const { slug, fabric, functions, blank } = parseArgs(process.argv.slice(2));
	await createApp(slug, { fabric, functions, blank });
	console.log(`Created apps/${slug}. Next: pnpm start-app ${slug}`);
}

import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { parseFabricPortalUrl, writeFabricYaml } from "./register-semantic-model.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templateDir = path.join(repoRoot, "templates", "rayfin-app");
const reserved = new Set(["ui", "admin", "data", "auth", "types", "config"]);

export function parseArgs(argv) {
	const flags = new Set();
	const values = {};
	const positionals = [];
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg.startsWith("--")) {
			const name = arg.slice(2);
			if (name === "from-url" || name === "alias") {
				const value = argv[++i];
				if (!value || value.startsWith("--")) {
					throw new Error(
						`Usage: pnpm new-app <slug> [--fabric | --semantic] [--functions] [--blank] [--from-url <url>]`
					);
				}
				values[name] = value;
				continue;
			}
			flags.add(name);
			continue;
		}
		positionals.push(arg);
	}
	const fromUrl = values["from-url"] ?? null;
	const semantic = flags.has("semantic") || Boolean(fromUrl);
	if (flags.has("fabric") && semantic) {
		throw new Error(
			"Usage: pnpm new-app <slug> [--fabric | --semantic] [--functions] [--blank] (--fabric and --semantic are mutually exclusive)"
		);
	}
	return {
		slug: positionals[0],
		fabric: flags.has("fabric"),
		semantic,
		functions: flags.has("functions"),
		blank: flags.has("blank"),
		fromUrl,
		alias: values.alias ?? "default"
	};
}

export function assertSlug(slug) {
	if (!slug || typeof slug !== "string") {
		throw new Error("Usage: pnpm new-app <slug> [--fabric | --semantic] [--functions] [--blank] [--from-url <url>]");
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

export async function applySemanticScaffold(appDir) {
	const ymlPath = path.join(appDir, "rayfin", "rayfin.yml");
	let yml = await readFile(ymlPath, "utf8");
	yml = yml.replace(/data:\r?\n    enabled: true\r?\n    dialect: mssql/, "data:\n    enabled: false");
	await writeFile(ymlPath, yml, "utf8");

	const pkgPath = path.join(appDir, "package.json");
	const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
	pkg.scripts["build:fabric"] =
		"node scripts/fabric-app-data.mjs generate -o src/fabric.generated.ts && svelte-kit sync && vite build";
	pkg.dependencies = {
		...pkg.dependencies,
		"@microsoft/fabric-app-data": "catalog:",
		"@microsoft/fabric-app-data-embed-client": "catalog:",
		"@microsoft/fabric-app-data-proxy": "catalog:",
		"@vpaa/semantic": "workspace:*",
		arquero: "catalog:"
	};
	pkg.devDependencies = {
		"@microsoft/fabric-app-data-cli": "catalog:",
		"@microsoft/fabric-app-data-cli-proxy": "catalog:",
		...pkg.devDependencies
	};
	await writeFile(pkgPath, `${JSON.stringify(pkg, null, "\t")}\n`, "utf8");
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
	if (options.semantic || options.fromUrl) {
		await applySemanticScaffold(destDir);
	}
	if (options.functions) {
		await applyFunctionsScaffold(destDir);
	}
	if (options.blank) {
		await applyBlankScaffold(destDir);
	}
	if (options.fromUrl) {
		await writeFabricYaml(destDir, {
			...parseFabricPortalUrl(options.fromUrl),
			alias: options.alias ?? "default"
		});
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
	const { slug, fabric, semantic, functions, blank, fromUrl, alias } = parseArgs(
		process.argv.slice(2)
	);
	await createApp(slug, { fabric, semantic, functions, blank, fromUrl, alias });
	console.log(`Created apps/${slug}. Next: pnpm --filter @vpaa/${slug} dev`);
}

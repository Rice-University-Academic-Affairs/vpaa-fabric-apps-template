import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const USAGE = 'Usage: pnpm up-app <slug> [--workspace "<name>"]';
const WORKSPACE_NAME_FILE = "workspace-name";

export function parseArgs(argv) {
	const values = {};
	const positionals = [];
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg.startsWith("--")) {
			const name = arg.slice(2);
			if (name === "workspace") {
				const value = argv[++i];
				if (!value || value.startsWith("--")) {
					throw new Error(USAGE);
				}
				values.workspace = value;
				continue;
			}
			throw new Error(USAGE);
		}
		positionals.push(arg);
	}
	if (positionals.length !== 1) {
		throw new Error(USAGE);
	}
	return {
		slug: normalizeSlug(positionals[0]),
		workspace: values.workspace ?? null
	};
}

export function normalizeSlug(input) {
	if (!input || typeof input !== "string") {
		throw new Error(USAGE);
	}
	let slug = input.trim().replaceAll("\\", "/");
	if (slug.startsWith("@vpaa/")) slug = slug.slice("@vpaa/".length);
	if (slug.startsWith("apps/")) slug = slug.slice("apps/".length);
	slug = slug.replace(/\/+$/, "");
	if (!slug || slug.includes("/")) {
		throw new Error(USAGE);
	}
	if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(slug)) {
		throw new Error(`Invalid slug "${input}". Use kebab-case (e.g. undergrad-attrition-app).`);
	}
	return slug;
}

export async function resolveAppDir(slug, root = repoRoot) {
	const normalized = normalizeSlug(slug);
	const appDir = path.join(root, "apps", normalized);
	const dirStat = await stat(appDir).catch(() => null);
	if (!dirStat?.isDirectory()) {
		throw new Error(`No app at apps/${normalized}`);
	}
	const ymlStat = await stat(path.join(appDir, "rayfin", "rayfin.yml")).catch(() => null);
	if (!ymlStat) {
		throw new Error(`apps/${normalized} is not a Rayfin app (missing rayfin/rayfin.yml)`);
	}
	return { slug: normalized, appDir };
}

export function workspaceNamePath(appDir) {
	return path.join(appDir, "rayfin", WORKSPACE_NAME_FILE);
}

export async function workspaceFromNameFile(appDir) {
	let raw;
	try {
		raw = await readFile(workspaceNamePath(appDir), "utf8");
	} catch (error) {
		if (error && error.code === "ENOENT") return null;
		throw error;
	}
	const name = raw.trim();
	return name.length > 0 ? name : null;
}

export async function writeWorkspaceName(appDir, workspace) {
	await writeFile(workspaceNamePath(appDir), `${workspace}\n`, "utf8");
}

export function rayfinUpArgs(workspace) {
	return ["exec", "rayfin", "up", "--workspace", workspace, "--yes", "--encryption-fallback-enabled"];
}

function run(command, args, cwd) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd,
			stdio: "inherit",
			shell: process.platform === "win32"
		});
		child.on("exit", (code) => {
			if (code === 0) resolve();
			else reject(new Error(`${command} ${args.join(" ")} exited ${code}`));
		});
		child.on("error", reject);
	});
}

export async function upApp(options) {
	const root = options.repoRoot ?? repoRoot;
	const exec = options.run ?? run;
	const { slug, appDir } = await resolveAppDir(options.slug, root);
	const flagged = typeof options.workspace === "string" ? options.workspace.trim() : "";
	const workspace = flagged || (await workspaceFromNameFile(appDir));
	if (!workspace) {
		throw new Error(`First deploy of ${slug} needs --workspace "<Fabric workspace name>"`);
	}
	const args = rayfinUpArgs(workspace);
	await exec("pnpm", args, appDir);
	await writeWorkspaceName(appDir, workspace);
	return { slug, appDir, workspace, args };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
	const { slug, workspace } = parseArgs(process.argv.slice(2));
	const result = await upApp({ slug, workspace });
	console.log(`Deployed apps/${result.slug} to ${result.workspace}`);
}

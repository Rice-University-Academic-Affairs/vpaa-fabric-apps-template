import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const USAGE =
	'Usage: pnpm up-app <slug> [--workspace "<name>"] [--dry-run] [--status] [--item-name <name>] [--capacity-id <id>] [--exclude-services <name>]';
const WORKSPACE_NAME_FILE = "workspace-name";
const VALUE_FLAGS = new Set(["workspace", "item-name", "capacity-id", "exclude-services"]);
const BOOL_FLAGS = new Set(["dry-run", "status"]);

export function parseArgs(argv) {
	const values = {};
	const flags = new Set();
	const positionals = [];
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg.startsWith("--")) {
			const name = arg.slice(2);
			if (VALUE_FLAGS.has(name)) {
				const value = argv[++i];
				if (!value || value.startsWith("--")) {
					throw new Error(USAGE);
				}
				values[name] = value;
				continue;
			}
			if (BOOL_FLAGS.has(name)) {
				flags.add(name);
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
		workspace: values.workspace ?? null,
		dryRun: flags.has("dry-run"),
		status: flags.has("status"),
		itemName: values["item-name"] ?? null,
		capacityId: values["capacity-id"] ?? null,
		excludeServices: values["exclude-services"] ?? null
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

export function rayfinUpArgs(workspace, extras = {}) {
	const args = ["exec", "rayfin", "up"];
	if (extras.status) {
		args.push("status", "--workspace", workspace, "--encryption-fallback-enabled");
		return args;
	}
	args.push("--workspace", workspace, "--yes", "--encryption-fallback-enabled");
	if (extras.dryRun) args.push("--dry-run");
	if (extras.itemName) args.push("--item-name", extras.itemName);
	if (extras.capacityId) args.push("--capacity-id", extras.capacityId);
	if (extras.excludeServices) args.push("--exclude-services", extras.excludeServices);
	return args;
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
	const extras = {
		dryRun: Boolean(options.dryRun),
		status: Boolean(options.status),
		itemName: options.itemName ?? null,
		capacityId: options.capacityId ?? null,
		excludeServices: options.excludeServices ?? null
	};
	const args = rayfinUpArgs(workspace, extras);
	await exec("pnpm", args, appDir);
	if (!extras.dryRun && !extras.status) {
		await writeWorkspaceName(appDir, workspace);
	}
	return { slug, appDir, workspace, args };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
	const parsed = parseArgs(process.argv.slice(2));
	const result = await upApp(parsed);
	if (parsed.status) {
		console.log(`Status for apps/${result.slug} in ${result.workspace}`);
	} else if (parsed.dryRun) {
		console.log(`Dry-run for apps/${result.slug} in ${result.workspace}`);
	} else {
		console.log(`Deployed apps/${result.slug} to ${result.workspace}`);
	}
}

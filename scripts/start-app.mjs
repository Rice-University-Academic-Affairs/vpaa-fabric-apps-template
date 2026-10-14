import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { normalizeSlug, resolveAppDir } from "./up-app.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const USAGE = "Usage: pnpm start-app <slug>";

export function parseArgs(argv) {
	const positionals = [];
	for (const arg of argv) {
		if (arg.startsWith("--")) {
			throw new Error(USAGE);
		}
		positionals.push(arg);
	}
	if (positionals.length !== 1) {
		throw new Error(USAGE);
	}
	return { slug: normalizeSlug(positionals[0]) };
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

export function filterDevArgs(slug) {
	return ["--filter", `@vpaa/${slug}`, "dev"];
}

export async function startApp(options) {
	const root = options.repoRoot ?? repoRoot;
	const exec = options.run ?? run;
	const { slug } = await resolveAppDir(options.slug, root);
	const args = filterDevArgs(slug);
	await exec("pnpm", args, root);
	return { slug, args };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
	const parsed = parseArgs(process.argv.slice(2));
	await startApp(parsed);
}

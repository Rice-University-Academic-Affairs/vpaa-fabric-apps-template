import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveAppDir } from "./up-app.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const USAGE = "Usage: pnpm add-sql-database <slug>";
const DATA_ON = `  data:
    enabled: true
    dialect: mssql
    allowIntrospection: false`;

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
	return { slug: positionals[0] };
}

export function isSqlDataEnabled(yml) {
	return /data:\r?\n    enabled:\s*true\r?\n    dialect:\s*mssql/.test(yml);
}

export function enableSqlDataInYml(yml) {
	if (isSqlDataEnabled(yml)) {
		return { yml, changed: false };
	}
	const next = yml.replace(
		/data:\r?\n    enabled:\s*false(?:\r?\n    dialect:\s*\w+)?(?:\r?\n    allowIntrospection:\s*\w+)?/,
		DATA_ON
	);
	if (next === yml) {
		throw new Error("Could not enable SQL data in rayfin.yml");
	}
	return { yml: next, changed: true };
}

export async function enableSqlDatabase(appDir) {
	const ymlPath = path.join(appDir, "rayfin", "rayfin.yml");
	const yml = await readFile(ymlPath, "utf8");
	const result = enableSqlDataInYml(yml);
	if (result.changed) {
		await writeFile(ymlPath, result.yml, "utf8");
	}
	return result.changed;
}

export async function addSqlDatabase(slug, options = {}) {
	const { slug: normalized, appDir } = await resolveAppDir(slug, options.root ?? repoRoot);
	const changed = await enableSqlDatabase(appDir);
	return { slug: normalized, appDir, changed };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
	const { slug } = parseArgs(process.argv.slice(2));
	const { slug: normalized, changed } = await addSqlDatabase(slug);
	if (changed) {
		console.log(`Enabled a Fabric SQL database on apps/${normalized}.`);
	} else {
		console.log(`apps/${normalized} already has a Fabric SQL database.`);
	}
	console.log(
		`Next: add a table under apps/${normalized}/rayfin/data/domain/.`
	);
}

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { resolveAppDir } from "./up-app.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const USAGE = 'Usage: pnpm add-semantic-model <slug> "<url>" [--alias <name>]';
const FABRIC_GENERATE = "node scripts/fabric-app-data.mjs generate -o src/fabric.generated.ts";
const SEMANTIC_HELPER = `import { readSemanticModelTable as readTable } from "@vpaa/semantic";

export async function readSemanticModelTable(tableName: string) {
	try {
		const { fabricConfig } = await import("../fabric.generated.js");
		return await readTable(tableName, { config: fabricConfig });
	} catch {
		return [];
	}
}
`;

const FABRIC_SEGMENT_TO_TYPE = {
	semanticmodels: "semanticModel",
	modeling: "semanticModel",
	datasets: "semanticModel",
	lakehouses: "lakehouse",
	warehouses: "warehouse"
};

const ONELAKE_SEGMENT_TO_TYPE = {
	dataset: "semanticModel",
	lakehouse: "lakehouse",
	warehouse: "warehouse"
};

export function parseFabricPortalUrl(url) {
	const cleanUrl = String(url ?? "")
		.replace(/["%\s]+$/g, "")
		.replace(/%22$/gi, "");
	let parsed;
	try {
		parsed = new URL(cleanUrl);
	} catch {
		throw new Error(`Invalid URL: "${url}"`);
	}
	const segments = parsed.pathname.split("/").filter(Boolean);
	const detailsIndex = segments.indexOf("details");
	if (detailsIndex !== -1 && detailsIndex + 3 < segments.length) {
		const workspaceId = segments[detailsIndex + 1];
		const typeSegment = segments[detailsIndex + 2];
		const itemId = segments[detailsIndex + 3];
		const itemType = ONELAKE_SEGMENT_TO_TYPE[typeSegment.toLowerCase()];
		if (itemType && workspaceId && itemId) {
			return requireSemanticModel({ workspaceId, itemId, itemType });
		}
	}
	const groupsIndex = segments.indexOf("groups");
	if (groupsIndex !== -1 && groupsIndex + 3 < segments.length) {
		const workspaceId = segments[groupsIndex + 1];
		const typeSegment = segments[groupsIndex + 2];
		const itemId = segments[groupsIndex + 3];
		const itemType = FABRIC_SEGMENT_TO_TYPE[typeSegment.toLowerCase()];
		if (itemType && workspaceId && itemId) {
			return requireSemanticModel({ workspaceId, itemId, itemType });
		}
	}
	throw new Error(
		`Could not extract workspace/item IDs from URL: "${url}"
Supported formats:
  - https://app.fabric.microsoft.com/groups/{wsId}/semanticmodels/{itemId}
  - https://app.fabric.microsoft.com/groups/{wsId}/modeling/{itemId}
  - https://msit.powerbi.com/onelake/details/{wsId}/dataset/{itemId}/...`
	);
}

function requireSemanticModel(ref) {
	if (ref.itemType !== "semanticModel") {
		throw new Error(`URL is a ${ref.itemType}, not a semantic model`);
	}
	return ref;
}

export async function writeFabricYaml(appDir, options) {
	const alias = options.alias ?? "default";
	const profile = options.profile ?? "dev";
	const yaml = `activeProfile: ${profile}
profiles:
  ${profile}:
    semanticModels:
      ${alias}:
        workspaceId: ${options.workspaceId}
        itemId: ${options.itemId}
`;
	const yamlPath = path.join(appDir, "fabric.yaml");
	await writeFile(yamlPath, yaml, "utf8");
	await mkdir(path.join(appDir, "src"), { recursive: true });
	await writeFile(
		path.join(appDir, "src", "fabric.generated.ts"),
		`// fabric.generated.ts — AUTO-GENERATED from fabric.yaml (profile: ${profile}). Do not edit.

export const fabricConfig = {
  semanticModels: {
    '${alias}': {
      workspaceId: '${options.workspaceId}',
      itemId: '${options.itemId}',
    },
  },
} as const;
`,
		"utf8"
	);
	return yamlPath;
}

export function parseArgs(argv) {
	const values = {};
	const positionals = [];
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg.startsWith("--")) {
			const name = arg.slice(2);
			if (name === "alias") {
				const value = argv[++i];
				if (!value || value.startsWith("--")) {
					throw new Error(USAGE);
				}
				values[name] = value;
				continue;
			}
			throw new Error(USAGE);
		}
		positionals.push(arg);
	}
	if (positionals.length !== 2) {
		throw new Error(USAGE);
	}
	return {
		slug: positionals[0],
		fromUrl: positionals[1],
		alias: values.alias ?? "default"
	};
}

function chainScript(existing, extra) {
	if (!existing) return extra;
	if (existing.includes("fabric:generate") || existing.includes("fabric-app-data.mjs")) {
		return existing;
	}
	return `${existing} && ${extra}`;
}

export async function applySemanticDeps(appDir) {
	const pkgPath = path.join(appDir, "package.json");
	const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
	pkg.scripts["fabric:generate"] = FABRIC_GENERATE;
	pkg.scripts.predev = chainScript(pkg.scripts.predev, "npm run fabric:generate");
	pkg.scripts.prebuild = chainScript(pkg.scripts.prebuild, "npm run fabric:generate");
	if (
		pkg.scripts["build:fabric"] &&
		!pkg.scripts["build:fabric"].includes("fabric:generate") &&
		!pkg.scripts["build:fabric"].includes("fabric-app-data.mjs")
	) {
		pkg.scripts["build:fabric"] = `npm run fabric:generate && ${pkg.scripts["build:fabric"]}`;
	}
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
	await writeSemanticHelper(appDir);
}

async function writeSemanticHelper(appDir) {
	const helperPath = path.join(appDir, "src", "lib", "semantic.ts");
	try {
		await readFile(helperPath);
		return;
	} catch {
		await mkdir(path.join(appDir, "src", "lib"), { recursive: true });
		await writeFile(helperPath, SEMANTIC_HELPER, "utf8");
	}
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

export async function addSemanticModel(slug, options) {
	const { slug: normalized, appDir } = await resolveAppDir(slug, options.root ?? repoRoot);
	const parsed = parseFabricPortalUrl(options.fromUrl);
	await applySemanticDeps(appDir);
	const yamlPath = await writeFabricYaml(appDir, {
		...parsed,
		alias: options.alias ?? "default"
	});
	if (!options.skipInstall) {
		await run("pnpm", ["install"], options.root ?? repoRoot);
	}
	return { slug: normalized, appDir, yamlPath, parsed };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
	const { slug, fromUrl, alias } = parseArgs(process.argv.slice(2));
	const { slug: normalized, yamlPath, parsed } = await addSemanticModel(slug, { fromUrl, alias });
	console.log(`Attached semantic model to apps/${normalized}: ${yamlPath} (${parsed.workspaceId} / ${parsed.itemId})`);
}

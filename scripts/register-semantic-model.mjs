import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

function parseCli(argv) {
	let fromUrl;
	let appDir = process.cwd();
	let alias = "default";
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--from-url") {
			fromUrl = argv[++i];
			if (!fromUrl || fromUrl.startsWith("--")) {
				throw new Error("Usage: node scripts/register-semantic-model.mjs --from-url <url> [--app <dir>] [--alias <name>]");
			}
			continue;
		}
		if (arg === "--app") {
			appDir = argv[++i];
			continue;
		}
		if (arg === "--alias") {
			alias = argv[++i] ?? alias;
		}
	}
	if (!fromUrl) {
		throw new Error("Usage: node scripts/register-semantic-model.mjs --from-url <url> [--app <dir>] [--alias <name>]");
	}
	return { fromUrl, appDir, alias };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
	const { fromUrl, appDir, alias } = parseCli(process.argv.slice(2));
	const parsed = parseFabricPortalUrl(fromUrl);
	const yamlPath = await writeFabricYaml(appDir, { ...parsed, alias });
	console.log(`Wrote ${yamlPath} (${parsed.workspaceId} / ${parsed.itemId})`);
}

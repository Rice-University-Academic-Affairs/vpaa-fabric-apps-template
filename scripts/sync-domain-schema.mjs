import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const GENERATED = "entities.generated.ts";

export function entityNameFromSource(fileName, source) {
	const match = String(source).match(/export class (\w+)/);
	if (match) return match[1];
	return path.basename(fileName, ".ts");
}

export function formatDomainEntities(entities) {
	if (entities.length === 0) {
		return `export const domainEntities = [] as const;

export type DomainSchema = Record<string, never>;
`;
	}
	const imports = entities
		.map(({ className, fileBase }) => `import { ${className} } from "./${fileBase}.js";`)
		.join("\n");
	const names = entities.map(({ className }) => className);
	const typeBody = names.map((name) => `\t${name}: ${name};`).join("\n");
	return `${imports}

export const domainEntities = [${names.join(", ")}] as const;

export type DomainSchema = {
${typeBody}
};
`;
}

export async function syncDomainEntities(appDir) {
	const domainDir = path.join(appDir, "rayfin", "data", "domain");
	await mkdir(domainDir, { recursive: true });
	const files = (await readdir(domainDir))
		.filter((name) => name.endsWith(".ts") && name !== GENERATED)
		.sort();
	const entities = [];
	for (const fileName of files) {
		const source = await readFile(path.join(domainDir, fileName), "utf8");
		entities.push({
			className: entityNameFromSource(fileName, source),
			fileBase: path.basename(fileName, ".ts")
		});
	}
	const generated = formatDomainEntities(entities);
	await writeFile(path.join(domainDir, GENERATED), generated, "utf8");
	return { entities, generated };
}

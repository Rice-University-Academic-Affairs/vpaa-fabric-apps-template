import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appsRoot = path.join(repoRoot, "apps");
const apps = readdirSync(appsRoot, { withFileTypes: true })
	.filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
	.map((entry) => {
		const dir = path.join(appsRoot, entry.name);
		const pkg = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8"));
		return { slug: entry.name, name: pkg.name };
	})
	.sort((a, b) => a.slug.localeCompare(b.slug));

console.error("Every directory under apps/ is a first-class workspace app. Pick one:");
if (apps.length === 0) {
	console.error("  (none yet — run `pnpm new-app <slug>` to create your first app)");
}
for (const app of apps) {
	console.error(`  pnpm --filter ${app.name} dev`);
}
console.error("  pnpm --filter @vpaa/ui dev");
process.exit(1);

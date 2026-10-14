import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appsRoot = path.join(repoRoot, "apps");
const apps = readdirSync(appsRoot, { withFileTypes: true })
	.filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
	.map((entry) => ({ slug: entry.name }))
	.sort((a, b) => a.slug.localeCompare(b.slug));

console.error("Every directory under apps/ is a first-class workspace app. Pick one:");
if (apps.length === 0) {
	console.error("  (none yet — run `pnpm new-app <slug>` to create your first app)");
}
for (const app of apps) {
	console.error(`  pnpm start-app ${app.slug}`);
}
console.error("  pnpm --filter @vpaa/admin dev");
process.exit(1);

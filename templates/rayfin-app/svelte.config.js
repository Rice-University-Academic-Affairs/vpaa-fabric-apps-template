import adapter from "@sveltejs/adapter-static";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSvelteKitUiAliases } from "@vpaa/config/vite";

const fromDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			fallback: "index.html",
			strict: false
		}),
		alias: createSvelteKitUiAliases(fromDir)
	},
	compilerOptions: {
		runes: ({ filename }) =>
			filename.split(/[/\\]/).includes("node_modules") ? undefined : true
	}
};

export default config;

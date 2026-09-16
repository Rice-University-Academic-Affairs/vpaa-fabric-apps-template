import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vite";
import { createUiWorkspaceAliases, workspaceFsAllow } from "@vpaa/config/vite";

const fromDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	resolve: {
		alias: createUiWorkspaceAliases(fromDir)
	},
	ssr: {
		noExternal: [/^@vpaa\//]
	},
	server: {
		fs: {
			allow: workspaceFsAllow(fromDir)
		}
	},
	envPrefix: ["VITE_", "PUBLIC_"]
});

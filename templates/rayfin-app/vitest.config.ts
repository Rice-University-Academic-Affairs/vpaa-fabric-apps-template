import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";
import { createUiWorkspaceAliases } from "@vpaa/config/vite";

const fromDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	resolve: {
		conditions: ["browser"],
		alias: createUiWorkspaceAliases(fromDir)
	},
	ssr: {
		noExternal: [/^@vpaa\//]
	},
	test: {
		env: {
			PUBLIC_ADMIN_TEST_MODE: "true"
		},
		include: ["src/**/*.{test,spec}.{js,ts}"],
		environment: "jsdom",
		setupFiles: ["src/test/setup.ts"]
	}
});

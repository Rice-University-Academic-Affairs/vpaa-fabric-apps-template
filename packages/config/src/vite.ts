import path from "node:path";

export type ViteAlias = { find: string; replacement: string };

function uiLibFromAppRoot(fromDir: string): string {
	return path.resolve(fromDir, "../../packages/admin/src/lib");
}

export function createUiWorkspaceAliases(fromDir: string): ViteAlias[] {
	const uiLib = uiLibFromAppRoot(fromDir);
	return [
		{ find: "$lib/admin/components", replacement: path.join(uiLib, "admin", "components") },
		{ find: "$lib/components", replacement: path.join(uiLib, "components") },
		{ find: "$lib/ai-chat", replacement: path.join(uiLib, "ai-chat") },
		{ find: "$lib/hooks", replacement: path.join(uiLib, "hooks") },
		{ find: "$lib/styles", replacement: path.join(uiLib, "styles") },
		{ find: "$lib/types", replacement: path.join(uiLib, "types") },
		{ find: "$lib/utils.js", replacement: path.join(uiLib, "utils.ts") },
		{ find: "$lib/utils", replacement: path.join(uiLib, "utils.ts") }
	];
}

export function createSvelteKitUiAliases(fromDir: string): Record<string, string> {
	const uiLib = uiLibFromAppRoot(fromDir);
	return {
		"$lib/admin/components": path.join(uiLib, "admin", "components"),
		"$lib/components": path.join(uiLib, "components"),
		"$lib/ai-chat": path.join(uiLib, "ai-chat"),
		"$lib/hooks": path.join(uiLib, "hooks"),
		"$lib/styles": path.join(uiLib, "styles"),
		"$lib/types": path.join(uiLib, "types"),
		"$lib/utils": path.join(uiLib, "utils.ts")
	};
}

export function workspaceFsAllow(fromDir: string): string[] {
	return [path.resolve(fromDir, "../..")];
}

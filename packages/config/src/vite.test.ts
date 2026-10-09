import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { createSvelteKitUiAliases, createUiWorkspaceAliases, workspaceFsAllow } from "./vite.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const fromDir = path.join(repoRoot, "apps", "example-app");
const uiLib = path.join(repoRoot, "packages", "admin", "src", "lib");

test("createUiWorkspaceAliases resolves from an app root to packages/admin", () => {
	const aliases = createUiWorkspaceAliases(fromDir);
	const components = aliases.find((alias) => alias.find === "$lib/components");
	assert.ok(components);
	assert.equal(components.replacement, path.join(uiLib, "components"));
	const utils = aliases.find((alias) => alias.find === "$lib/utils");
	assert.ok(utils);
	assert.equal(utils.replacement, path.join(uiLib, "utils.ts"));
});

test("createSvelteKitUiAliases and workspaceFsAllow share the same app-root assumption", () => {
	const aliases = createSvelteKitUiAliases(fromDir);
	assert.equal(aliases["$lib/components"], path.join(uiLib, "components"));
	assert.equal(path.resolve(workspaceFsAllow(fromDir)[0] ?? ""), path.resolve(repoRoot));
});

---
name: vpaa-register-semantic-model
description: Register a Fabric or Power BI semantic model on a VPAA app. Use when connecting an app to a semantic model, writing fabric.yaml workspace/item IDs from a portal URL, or generating fabric.generated.ts.
---

# Register a semantic model

Do not copy a second Rayfin/Fabric auth stack. Runtime auth is `@vpaa/auth` (`loadAppAuth`). Queries go through `@vpaa/semantic`.

Writing `fabric.yaml` only needs the semantic model portal URL. Do not run `az login`, `rayfin login`, `fabric-app-data init`, or `fabric-app-data add` for this. `pnpm exec rayfin login --encryption-fallback-enabled` is only if **deploy** (`pnpm up-app`) fails as logged-out. Runtime DAX runs as the **Fabric portal user**. App users need Fabric permission on the semantic model item, not only the Fabric app.

Do not use `pnpm exec fabric-app-data`. On this Windows/pnpm layout that CLI is a no-op.

1. Confirm target `apps/<slug>`. If the app does not exist, use `vpaa-create-app` with `pnpm new-app <slug> --semantic --from-url "<url>"` (that writes `fabric.yaml` in the same step). If the user also gave a Fabric workspace name, that skill’s deploy step (`pnpm up-app <slug> --workspace "<name>"`, never `npx rayfin`) is still required after this yaml is written. Refuse to wire this into `@vpaa/ui` or package internals. If the app exists but was not scaffolded with `--semantic`, run that path’s equivalent (no SQL, `@vpaa/semantic` + fabric-app-data deps, generate hooked into `build:fabric`) before continuing.
2. Ask for the Fabric portal URL of the semantic model if missing. Supported paths include `/groups/{workspaceId}/modeling/{itemId}`, `/groups/{workspaceId}/semanticmodels/{itemId}`, and OneLake `/details/{workspaceId}/dataset/{itemId}`. Then from the repo root:

```sh
pnpm register-semantic-model --from-url "<Fabric URL of the semantic model>" --app apps/<slug>
```

Use `--alias <name>` when the user names one (default is `default`).

That writes `apps/<slug>/fabric.yaml` and `apps/<slug>/src/fabric.generated.ts` from the URL. No Azure or Rayfin login.

3. `build:fabric` must already run `node scripts/fabric-app-data.mjs generate -o src/fabric.generated.ts` before the Vite build (this is what `pnpm new-app --semantic` writes). Gitignore `src/fabric.generated.ts`.
4. Query only after `loadAppAuth` reports authenticated. Skip DAX when `isAdminTestMode()` so local smoke does not hit Fabric.

`readSemanticModelTable` returns Arquero (`result.table.objects()`). `querySemanticModel` returns a raw Fabric `QueryTable` (`result.table.columns`, `result.table.rows`). Never call `.objects()` on a `querySemanticModel` result — that throws `TypeError: table.objects is not a function` and the Fabric embed shows a 500.

```ts
import { loadAppAuth } from "@vpaa/auth";
import { isAdminTestMode } from "@vpaa/data";
import { fabricConfig } from "./fabric.generated.js";
import { getFabricClient, querySemanticModel } from "@vpaa/semantic";

export const load = async () => {
	if (isAdminTestMode()) return { rows: [] };
	const auth = await loadAppAuth();
	if (!auth.authenticated) return { rows: [] };
	getFabricClient(fabricConfig);
	const result = await querySemanticModel("default", "EVALUATE { 1 }");
	if (result.status === "error") return { rows: [] };
	return { rows: result.table.rows };
};
```

Do not call `bootstrapAuth` from a new service file. Do not import `@vpaa/semantic` internals.

5. Remind the user to share the semantic model with the same people who open the Fabric app.
6. Schema discovery and DAX authoring: `packages/semantic/.agents/skills/`.

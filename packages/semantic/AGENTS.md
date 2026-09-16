# @vpaa/semantic

Fabric semantic-model DAX queries via the embed proxy. Not a Fabric deployable.

Use this when an app has no Rayfin SQL backend and needs to read a Power BI / Fabric semantic model. Auth still comes from `@vpaa/auth` (`loadAppAuth`). This package never bootstraps Fabric login.

## When to use this vs `@vpaa/data`

- `@vpaa/data` — Rayfin GraphQL / MSSQL tables.
- `@vpaa/semantic` — DAX against a registered semantic model through the Fabric iframe proxy.

Apps can use both. Semantic-model queries only work inside the Fabric portal embed flow after `loadAppAuth` reports authenticated.

## Two authentications

- **Developer CLI:** `pnpm up-app <slug>` deploys. `pnpm exec rayfin login` (use `--encryption-fallback-enabled` when the OS keychain is unavailable) is only if that fails as logged-out. It is not needed to write `fabric.yaml`. It does not impersonate end users at runtime.
- **Runtime:** DAX runs as the Fabric portal user. App users must have Fabric permission on the **semantic model item**, not only on the Fabric app.

## Dev

n/a — library package.

## Test (unit)

```sh
pnpm --filter @vpaa/semantic test
pnpm --filter @vpaa/semantic... test
```

## Smoke

n/a — this package has no browser.

## E2E

n/a — this package has no browser.

## Check

```sh
pnpm --filter @vpaa/semantic check
pnpm check:deps
```

## Generate

From the app that owns `fabric.yaml`:

```sh
node scripts/fabric-app-data.mjs generate -o src/fabric.generated.ts
```

## Register a semantic model

From the repo root after the app exists. No Azure or Rayfin login:

```sh
pnpm register-semantic-model --from-url "<Fabric URL of the semantic model>" --app apps/<slug>
```

Optional `--alias <name>` (default `default`). That writes `fabric.yaml` and `src/fabric.generated.ts` from the URL.

New apps can do the same at scaffold: `pnpm new-app <slug> --semantic --from-url "<url>"`.

Add `@vpaa/semantic` (`workspace:*`) and cataloged `@microsoft/fabric-app-data*` / `arquero` dependencies to that app. Keep `fabric.yaml` in the app. Gitignore `src/fabric.generated.ts`. Run generate before `build:fabric`.

Use the `vpaa-register-semantic-model` skill to walk this for a client app.

## Query

```ts
import { fabricConfig } from "./fabric.generated.js";
import { getFabricClient, readSemanticModelTable } from "@vpaa/semantic";

getFabricClient(fabricConfig);
const result = await readSemanticModelTable("default", "Sales");
if (result.status === "error") {
	return { preview: [] };
}
const rows = result.table.objects();
```

`readSemanticModelTable` runs `EVALUATE <table>` and returns an Arquero `ColumnTable` on success (`result.table.objects()`). Pass the plain table name. Queries never throw — check `result.status`. Custom DAX: `querySemanticModel(alias, dax)` returns a raw Fabric `QueryTable` (`result.table.columns`, `result.table.rows`). Do not call `.objects()` on that table.

DAX authoring, schema discovery, CLI, and SDK details live in `.agents/skills/`.

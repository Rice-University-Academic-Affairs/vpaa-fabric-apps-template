# @vpaa/semantic

Fabric semantic-model DAX queries via the embed proxy. Not a Fabric deployable.

Use this when an app needs to read a Power BI / Fabric semantic model. Auth still comes from `@vpaa/auth` (`loadAppAuth`). This package never bootstraps Fabric login.

## When to use this vs `@vpaa/data`

- `@vpaa/data` — Rayfin GraphQL / MSSQL tables.
- `@vpaa/semantic` — DAX against a registered semantic model through the Fabric iframe proxy.

Apps can use both. Semantic-model queries only work inside the Fabric portal embed flow after `loadAppAuth` reports authenticated.

## Two authentications

- **Developer CLI:** `pnpm up-app <slug>` deploys. `pnpm exec rayfin login` (use `--encryption-fallback-enabled` when the OS keychain is unavailable) is only if that fails as logged-out. It is not needed to write `fabric.yaml`. It does not impersonate end users at runtime.
- **Runtime:** DAX runs as the Fabric portal user. App users must have Fabric permission on the **semantic model item**, not only on the Fabric app. Share that item; a 403 on `dataAccessRoles` is a permission miss, not an empty search.

Optional Rayfin 1.36 path: declare a `fabric-semanticmodel` connector (`auth.type: delegated`, `operations: [{ name: executeQuery }]`) and query from a Function. Keep the embed proxy for in-iframe DAX. Variant measure columns need Rayfin/SDK 1.36.1+.

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

`pnpm add-semantic-model` writes `fabric.yaml` and `src/fabric.generated.ts`, and hooks generate into `predev` and `build:fabric`. From the app that already owns `fabric.yaml`:

```sh
pnpm --filter @vpaa/<slug> fabric:generate
```

## Register a semantic model

From the repo root after the app exists. No Azure or Rayfin login. Leaves a SQL database on the app if one is already enabled.

```sh
pnpm add-semantic-model <slug> "<Fabric URL of the semantic model>"
```

Optional `--alias <name>` (default `default`). That writes `fabric.yaml` and `src/fabric.generated.ts` from the URL, adds `@vpaa/semantic` plus cataloged `@microsoft/fabric-app-data*` / `arquero` dependencies, and writes `src/lib/semantic.ts`.

Keep `fabric.yaml` in the app. Gitignore `src/fabric.generated.ts`. Pages import `$lib/semantic.js`, not the generated file. `fabric.generated.ts` is gitignored IDs regenerated from `fabric.yaml` on `predev` / `build:fabric`; the helper loads it so callers do not.

Use the `vpaa-register-semantic-model` skill to walk this for a client app.

## Query

```ts
import { readSemanticModelTable } from "$lib/semantic.js";

const rows = await readSemanticModelTable("Sales");
```

`readSemanticModelTable` runs `EVALUATE <table>` and returns row objects. Pass the plain table name. A missing client, a failed query, or a missing generated config returns `[]`. Custom DAX: `querySemanticModel(alias, dax)` returns a raw Fabric `QueryTable` (`result.table.columns`, `result.table.rows`). Do not call `.objects()` on that table.

DAX authoring, schema discovery, CLI, and SDK details live in `.agents/skills/` at the repository root.

---
name: vpaa-create-app
description: Scaffolds a new VPAA Fabric/Rayfin app in apps/ using pnpm new-app, then deploys with rayfin up when a workspace is given. Use when the user wants a new Rayfin app, Fabric app, or workspace application.
---

# Create a VPAA Rayfin app

Do not run `npm create @microsoft/rayfin` into `apps/`. Never `npx rayfin`. Deploy with `pnpm up-app <slug>` from the repo root (see `vpaa-up-app`).

Collect if missing: kebab-case slug; semantic-model portal URL when there is no SQL; Fabric workspace **name** (the string in the portal, not only the GUID) when they want it published. `rayfin up --workspace` takes that name.

1. Ask for a kebab-case slug if missing. Refuse existing `apps/<slug>` or package names. If the user asked to recreate an existing slug, delete `apps/<slug>` first, then continue.
2. From the repo root:

- SQL / Rayfin GraphQL: `pnpm new-app <slug>`
- Semantic model, no Rayfin SQL: `pnpm new-app <slug> --semantic`
- Semantic model with `fabric.yaml` from a portal URL: `pnpm new-app <slug> --semantic --from-url "<Fabric URL>"`

`--from-url` implies `--semantic`. `--fabric` and `--semantic` are mutually exclusive. `--fabric` runs `rayfin init --services db` (MSSQL). Do not use `--fabric` when the user wants no SQL. Do not run `az login` or `fabric-app-data add` to fill `fabric.yaml`; `--from-url` writes workspace and item IDs from the URL.

3. Confirm `apps/<slug>` has the script contract (`dev`, `check`, `test`, `test:smoke`, `test:e2e`), `AGENTS.md` with the Dev/Test/Smoke/E2E/Check/Generate headings, a single-server `playwright.smoke.config.ts` on 5173, `@vpaa/*` workspace deps, `adapter-static`, and `rayfin.yml` with `buildCommand: npm run build:fabric`. Do not add the slug to `.gitignore` or negate it in `pnpm-workspace.yaml`; every app under `apps/` is first class. For `--semantic`, also confirm `services.data.enabled: false`, `@vpaa/semantic`, and `build:fabric` runs `node scripts/fabric-app-data.mjs generate`. For `--from-url`, also confirm `fabric.yaml` has the workspace and item IDs from that URL.
4. Add any product UI the user asked for (home page, queries, tests). Then run `pnpm --filter @vpaa/<slug> test` and `pnpm --filter @vpaa/<slug> test:smoke`. For semantic DAX loaders: `readSemanticModelTable` returns Arquero (`result.table.objects()`). `querySemanticModel` returns a raw Fabric `QueryTable` (`result.table.columns`, `result.table.rows`). Never call `.objects()` on a `querySemanticModel` result — that throws `TypeError: table.objects is not a function` and the Fabric embed shows a 500.
5. If the user gave a Fabric workspace name, publish it. Do not only print the `up` command. From the repo root:

```sh
pnpm up-app <slug> --workspace "<workspace name>"
```

Skip `rayfin login` unless `up-app` fails as logged-out; then from `apps/<slug>` run `pnpm exec rayfin login --encryption-fallback-enabled` and retry `pnpm up-app`. `--encryption-fallback-enabled` is expected when the OS keychain is unavailable. Paste the portal URL from the CLI output into the reply. DAX only runs in that Fabric embed, not on the static hosting URL.

SQL apps only, if also binding GraphQL at init time (logged in, workspace id):

```sh
pnpm exec rayfin init . --project-name <slug> --services db --auth-methods fabric --static-hosting --dialect mssql --workspace-id <id>
```

Then re-assert `staticHosting.buildCommand` is `npm run build:fabric` if init overwrote it. Semantic-only apps skip that init. If `fabric.yaml` was not written at scaffold time, register with `vpaa-register-semantic-model` before `up`.

If no workspace was given, skip deploy and say so.

The app must boot in `PUBLIC_ADMIN_TEST_MODE` without a Fabric login.

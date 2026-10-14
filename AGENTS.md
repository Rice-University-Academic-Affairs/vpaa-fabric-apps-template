# VPAA Fabric Apps

pnpm workspace. Shared platform lives under `packages/`. Deployable Fabric apps live under `apps/`. Every directory under `apps/` is a first-class workspace app: include it in `pnpm test`, `pnpm test:smoke`, `pnpm test:e2e`, and `pnpm check`. Do not gitignore an app slug, negate it in `pnpm-workspace.yaml`, or skip it to make the suite pass.

Default verify loop is **unit**, then **smoke**. Do not run full Playwright unless asked.

Allowed package DAG: `@vpaa/types` ← `@vpaa/data` ← `@vpaa/auth`; `@vpaa/semantic` and `@vpaa/config` are leaves; `@vpaa/admin` may import types, data, and auth; apps may import all packages. Packages never import apps. Import public `@vpaa/*` entries only. Shared versions use pnpm `catalog:`. Workspace packages use `workspace:*`.

Admin data plane lives in `@vpaa/data`; identity and membership in `@vpaa/auth`; admin UI in `@vpaa/admin`. The `@vpaa/admin` host (`src/routes`, `rayfin/`) holds only what is needed to boot and drive that UI in a browser. It is not a Fabric deployable.

After `pnpm install`, run `pnpm exec playwright install --with-deps chromium` and `pnpm -r --if-present admin:generate`. Re-run those only when the lockfile or Playwright deps change. New logic goes in Vitest. Playwright covers wiring (nav, drawers, seed, env). Do not copy platform admin e2e into product apps.

## Dev

```sh
pnpm dev
pnpm --filter @vpaa/admin dev
```

`pnpm dev` lists every app under `apps/` and exits. Start one with `pnpm start-app <slug>`.

## Test (unit)

```sh
pnpm test
pnpm --filter @vpaa/data... test
pnpm --filter @vpaa/semantic test
```

## Smoke

```sh
pnpm test:smoke
```

Runs `@vpaa/admin` once, then each app under `apps/` sequentially (they share Vite 5173).

## E2E

```sh
pnpm test:e2e
```

`@vpaa/admin` e2e is platform admin plus portal coverage. Product apps run only their own specs, sequentially.

## Check

```sh
pnpm check
pnpm check:deps
pnpm knip
```

## Generate

```sh
pnpm -r --if-present admin:generate
pnpm new-app <slug>
pnpm start-app <slug>
pnpm add-sql-database <slug>
pnpm add-semantic-model <slug> "<Fabric URL>"
pnpm up-app <slug>
pnpm up-app <slug> "<name>"
pnpm up-app <slug> --dry-run
pnpm new-app <slug> --functions
pnpm new-app <slug> --blank
```

New Fabric apps: `.agents/skills/vpaa-create-app`. Deploy/update with `pnpm up-app <slug>` from the repo root (`.agents/skills/vpaa-up-app`; optional `--status`, `--exclude-services`). The optional workspace argument is the Fabric portal workspace name; omit it to reuse `apps/<slug>/rayfin/workspace-name`. Do not use `.deployments.json` `active` as the workspace name. First publish needs that name. Dry-run with `pnpm up-app <slug> --dry-run` before a live deploy. After a substantive `apps/` change that needs live Fabric review, run `up-app` when verify is green; do not wait to be asked. Skip tests-only, docs-only, and package-only work that is not a Fabric app. `@vpaa/admin` is not deployable. Never `npx rayfin`. Never run `rayfin up` from the repository root. Skip `rayfin login` unless `up-app` fails as logged-out. Paste the portal URL from the CLI. Do not run `az login` or `fabric-app-data query`. Rayfin packages are catalog-pinned to **1.36.2**. `dev` is test-mode Vite; `dev:rayfin` runs `rayfin dev`. Functions stay off in the template until `--functions`. Do not ship `useProxy` on `RayfinClient`. The owner admin email is `RAYFIN_PUBLIC_OWNER_ADMIN_EMAIL` in `rayfin/.env`; `rayfin env` projects it to `VITE_RAYFIN_OWNER_ADMIN_EMAIL`.

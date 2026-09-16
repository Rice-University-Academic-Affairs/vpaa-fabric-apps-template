# VPAA Fabric Apps

pnpm workspace. Shared platform lives under `packages/`. Deployable Fabric apps live under `apps/`. Every directory under `apps/` is a first-class workspace app: include it in `pnpm test`, `pnpm test:smoke`, `pnpm test:e2e`, and `pnpm check`. Do not gitignore an app slug, negate it in `pnpm-workspace.yaml`, or skip it to make the suite pass.

Default verify loop is **unit**, then **smoke**. Do not run full Playwright unless asked.

Allowed package DAG: `@vpaa/types` ← `@vpaa/data` ← `@vpaa/auth`; `@vpaa/semantic` and `@vpaa/config` are leaves; `@vpaa/ui` may import types, data, and auth; apps may import all packages. Packages never import apps. Import public `@vpaa/*` entries only.

Admin data plane lives in `@vpaa/data`; identity and membership in `@vpaa/auth`; admin UI in `@vpaa/ui`. The `@vpaa/ui` host (`src/routes`, `rayfin/`) holds only what is needed to boot and drive that UI in a browser. It is not a Fabric deployable.

Cloud Agent install is [`.cursor/environment.json`](.cursor/environment.json). Do not re-run it unless the lockfile or Playwright deps changed.

## Dev

```sh
pnpm dev
pnpm --filter @vpaa/ui dev
```

`pnpm dev` lists every app under `apps/` and exits. Start one with `pnpm --filter @vpaa/<slug> dev`.

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

Runs `@vpaa/ui` once, then each app under `apps/` sequentially (they share Vite 5173).

## E2E

```sh
pnpm test:e2e
```

`@vpaa/ui` e2e is platform admin plus portal coverage. Product apps run only their own specs, sequentially.

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
pnpm new-app <slug> --semantic --from-url "<Fabric URL>"
pnpm register-semantic-model --from-url "<url>" --app apps/<slug>
pnpm up-app <slug>
pnpm up-app <slug> --workspace "<name>"
```

New Fabric apps: `.cursor/skills/vpaa-create-app`. Deploy/update with `pnpm up-app <slug>` from the repo root (`.cursor/skills/vpaa-up-app`). `--workspace` is the Fabric portal workspace name; omit it to reuse `apps/<slug>/rayfin/workspace-name`. First publish needs `--workspace`. After a substantive `apps/` change that needs live Fabric review, run `up-app` when verify is green; do not wait to be asked. Never `npx rayfin`. Never run `rayfin up` from the repository root. Skip `rayfin login` unless `up-app` fails as logged-out. Paste the portal URL from the CLI. Do not run `az login` or `fabric-app-data query`.

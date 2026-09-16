# VPAA Fabric Apps Template

Clone this repository and create Fabric apps the same way the source monorepo does. Shared platform packages live under `packages/`. Deployable apps live under `apps/` after you scaffold them. Every directory under `apps/` is a first-class workspace app: include it in install, test, smoke, e2e, and check. Do not gitignore an app slug, negate it in `pnpm-workspace.yaml`, or skip it to make the suite pass.

This template ships with an empty `apps/` directory. Run `pnpm new-app <slug>` to create the first one.

## Structure

- `apps/` — Fabric deployables you create with `pnpm new-app`
- `templates/rayfin-app` — scaffold copied into `apps/<slug>`
- `packages/ui` — shared Svelte components, admin surfaces, AI chat, and the fixture host (`@vpaa/ui`)
- `packages/data` — generic query/ORM primitives and admin data access (`@vpaa/data`)
- `packages/auth` — Fabric/Rayfin auth helpers and generic access primitives (`@vpaa/auth`)
- `packages/semantic` — Fabric semantic-model DAX queries (`@vpaa/semantic`)
- `packages/types` — cross-package TypeScript types (`@vpaa/types`)
- `packages/config` — shared TypeScript configuration and Vite UI aliases (`@vpaa/config`)

New product work starts in the app that needs it. Move it into a shared package after a second app needs it, or when it is clearly platform (design system, ORM foundation, authentication).

Admin data plane lives in `@vpaa/data`; identity and membership in `@vpaa/auth`; admin UI in `@vpaa/ui`. The `@vpaa/ui` host (`src/routes`, `rayfin/`) holds only what is needed to boot and drive that UI in a browser. It is not a Fabric deployable.

## Prerequisites

- Node.js 24+
- pnpm 10.34.5 (`corepack enable` then `corepack prepare pnpm@10.34.5 --activate`)

## Install

```sh
pnpm install
```

## Create an app

```sh
pnpm new-app <slug>
pnpm new-app <slug> --semantic
pnpm new-app <slug> --semantic --from-url "<Fabric URL>"
```

That copies the Rayfin app template into `apps/<slug>`. `--semantic` disables Rayfin SQL and wires `@vpaa/semantic`. `--from-url` writes `fabric.yaml` workspace and item IDs from the semantic model portal URL (no Azure login). For an existing app: `pnpm register-semantic-model --from-url "<url>" --app apps/<slug>`.

## Run

From the repository root, `pnpm dev` lists every app under `apps/` and exits. Start one:

```sh
pnpm --filter @vpaa/<slug> dev
pnpm --filter @vpaa/ui dev
```

The UI fixture host is platform UI, not a Fabric deployable.

## Build, check, and test

```sh
pnpm build
pnpm check
pnpm check:deps
pnpm knip
pnpm test
pnpm test:smoke
pnpm test:e2e
```

`pnpm test` is unit tests only. `pnpm test:smoke` runs `@vpaa/ui` once, then each app under `apps/` sequentially (they share Vite 5173). Full Playwright is `pnpm test:e2e`, also sequential across apps. `@vpaa/ui` e2e covers platform admin and portal components once; product apps run only their own specs.

## Fabric deployment

Each app's static hosting is configured in `apps/<slug>/rayfin/rayfin.yml`. `buildCommand` is `npm run build:fabric` and `folder` is `build`.

```sh
pnpm up-app <slug>
pnpm up-app <slug> --workspace "<Fabric workspace name>"
```

That runs `rayfin up` with working directory `apps/<slug>` so `buildCommand` still resolves. First publish needs `--workspace`. Updates reuse `apps/<slug>/rayfin/workspace-name` (the portal name, not `.deployments.json` `active`). Never `npx rayfin`. See `.cursor/skills/vpaa-up-app`.

Do not commit secrets.

## How a future app consumes shared packages

`pnpm new-app` already adds these workspace dependencies. If you add them by hand:

```json
{
  "dependencies": {
    "@vpaa/ui": "workspace:*",
    "@vpaa/data": "workspace:*",
    "@vpaa/auth": "workspace:*",
    "@vpaa/types": "workspace:*",
    "@vpaa/config": "workspace:*"
  }
}
```

Import from package entry points (`@vpaa/ui`, `@vpaa/data`, `@vpaa/auth`, `@vpaa/types`), not package internals.

Semantic-model queries are optional: add `@vpaa/semantic` (`workspace:*`) and follow `packages/semantic/AGENTS.md` or the `vpaa-register-semantic-model` skill.

# VPAA Fabric Apps Template

A pnpm workspace for Microsoft Fabric apps. Shared platform code lives in `packages/`. Each app you create lives in `apps/<slug>` and is a first-class workspace app: include it in install, test, smoke, e2e, and check. Do not gitignore an app slug, negate it in `pnpm-workspace.yaml`, or skip it to make the suite pass.

This clone starts with an empty `apps/` directory. After `pnpm install`, create one with `pnpm new-app <slug>`.

## First run

You need **Node.js 24+**. Then, from the repo root:

```sh
corepack enable
corepack prepare pnpm@10.34.5 --activate
pnpm install
pnpm new-app my-app
pnpm --filter @vpaa/my-app dev
```

That last command starts the app at [http://localhost:5173](http://localhost:5173). It runs in admin test mode, so you do not need a Fabric login to click around locally.

`pnpm --filter` is how this repo talks to one workspace package. The package name is `@vpaa/<slug>` — same slug you passed to `new-app`.

`pnpm dev` from the root only **lists** apps and exits. It does not start a server.

## Create an app

`<slug>` is kebab-case, like `faculty-activity` or `my-app`. It becomes the folder `apps/<slug>` and the package `@vpaa/<slug>`.

```sh
pnpm new-app <slug>
pnpm new-app <slug> --semantic
pnpm new-app <slug> --semantic --from-url "<Fabric URL>"
pnpm new-app <slug> --blank
```

- Default: Rayfin SQL / GraphQL app, copied from `templates/rayfin-app`, with AppShell on every page.
- `--semantic`: no Rayfin SQL; wires `@vpaa/semantic` for DAX against a Fabric semantic model.
- `--from-url`: same as `--semantic`, and writes `fabric.yaml` from the semantic model’s Fabric portal URL. No Azure login.
- `--blank`: product pages omit AppShell; `/admin` still uses it.

To attach a semantic model to an app that already exists:

```sh
pnpm register-semantic-model --from-url "<url>" --app apps/<slug>
```

## Layout

| Path | What it is |
| --- | --- |
| `apps/` | Fabric apps you create with `pnpm new-app` |
| `templates/rayfin-app` | Files copied into each new app |
| `packages/admin` (`@vpaa/admin`) | Shared Svelte UI, admin screens, AI chat, and a local fixture host |
| `packages/data` (`@vpaa/data`) | Admin data access and query helpers |
| `packages/auth` (`@vpaa/auth`) | Fabric / Rayfin auth and membership |
| `packages/semantic` (`@vpaa/semantic`) | DAX queries against a registered semantic model |
| `packages/types` (`@vpaa/types`) | Shared TypeScript types |
| `packages/config` (`@vpaa/config`) | Shared TypeScript and Vite aliases |

New product work starts in the app that needs it. Move it into a shared package after a second app needs it, or when it is clearly platform (design system, ORM foundation, authentication).

Admin data plane lives in `@vpaa/data`; identity and membership in `@vpaa/auth`; admin UI in `@vpaa/admin`. The `@vpaa/admin` host (`src/routes`, `rayfin/`) holds only what is needed to boot and drive that UI in a browser. It is not a Fabric deployable. Run it with `pnpm --filter @vpaa/admin dev`.

## Test and check

Default verify is **unit**, then **smoke**. Do not run full Playwright unless you mean to.

```sh
pnpm test
pnpm test:smoke
pnpm check
pnpm check:deps
pnpm knip
```

| Command | What it does |
| --- | --- |
| `pnpm test` | Unit tests only |
| `pnpm test:smoke` | `@vpaa/admin` once, then each app under `apps/` one after another (they share Vite 5173) |
| `pnpm test:e2e` | Full Playwright, also sequential. `@vpaa/admin` covers platform admin and portal once; product apps run only their own specs |
| `pnpm check` | Typecheck every package |
| `pnpm check:deps` | Enforces the package import DAG |
| `pnpm knip` | Unused exports / deps |

One app:

```sh
pnpm --filter @vpaa/<slug> test
pnpm --filter @vpaa/<slug> test:smoke
```

## Publish to Fabric

Run these from the **repo root**. Never `npx rayfin`. Never run `rayfin up` from the repository root. See `.cursor/skills/vpaa-up-app`.

```sh
pnpm up-app <slug> --dry-run
pnpm up-app <slug> --workspace "<Fabric workspace name>"
pnpm up-app <slug>
```

`--workspace` is the name shown in the Fabric portal, not a GUID and not `.deployments.json` `active`. First publish needs `--workspace`. Later publishes reuse `apps/<slug>/rayfin/workspace-name`. Run `--dry-run` before a live deploy.

Static hosting is `apps/<slug>/rayfin/rayfin.yml`: `buildCommand` is `npm run build:fabric`, `folder` is `build`, `assetAccess` is `protected`, and `services.auth.fabric.externalEntraExchange` is `true`. `@microsoft/rayfin-*` packages are catalog-pinned to 1.36.2. Backend Functions stay off until `pnpm new-app <slug> --functions`.

The owner admin email belongs in `apps/<slug>/rayfin/.env` as `RAYFIN_PUBLIC_OWNER_ADMIN_EMAIL`. `rayfin env` copies it to `.env.local` as `VITE_RAYFIN_OWNER_ADMIN_EMAIL`. Do not put it only in `.env.local`; that file is regenerated.

Skip `rayfin login` unless `up-app` fails as logged-out. Do not commit secrets. Run `pnpm up-app` from the OS that installed `node_modules`.

## Shared packages

`pnpm new-app` already adds these. If you add them by hand:

```json
{
  "dependencies": {
    "@vpaa/admin": "workspace:*",
    "@vpaa/data": "workspace:*",
    "@vpaa/auth": "workspace:*",
    "@vpaa/types": "workspace:*",
    "@vpaa/config": "workspace:*"
  }
}
```

Import from package entry points (`@vpaa/admin`, `@vpaa/data`, `@vpaa/auth`, `@vpaa/types`), not package internals.

Semantic-model queries are optional: add `@vpaa/semantic` (`workspace:*`) and follow `packages/semantic/AGENTS.md` or the `vpaa-register-semantic-model` skill.

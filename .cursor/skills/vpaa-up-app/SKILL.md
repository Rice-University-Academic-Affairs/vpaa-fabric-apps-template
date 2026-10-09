---
name: vpaa-up-app
description: Deploy or update a VPAA Fabric/Rayfin app with pnpm up-app. Use when the user asks to rayfin up, publish, deploy, or update an app, and after finishing a substantive apps/ change that needs live Fabric review.
---

# Deploy a VPAA Rayfin app

Rayfin 1.36.2 CLI contract: https://rayfin.ai/docs/reference/changelog

From the repo root. Never `npx rayfin`. Never run `rayfin up` from the repository root (`buildCommand` is `npm run build:fabric` and only resolves in `apps/<slug>`). `pnpm up-app` cds there.

- Update: `pnpm up-app <slug>`
- First publish or retarget: `pnpm up-app <slug> --workspace "<Fabric workspace name>"`
- Validate without changing Fabric: `pnpm up-app <slug> --dry-run`
- Print hosting URL / status: `pnpm up-app <slug> --status`
- Optional: `--item-name <name>`, `--capacity-id <id>`, `--exclude-services functions`

`--workspace` is the portal workspace **name**, not the GUID and not the kebab key in `.deployments.json`. Omitting it reuses `apps/<slug>/rayfin/workspace-name`. If that file is missing, require `--workspace`. A successful (non-dry-run, non-status) up writes that file. `@vpaa/admin` is not a Fabric deployable.

Keep `rayfin/.deployments.json` (gitignored). It binds `fabricItemId` + `hostingUrl`. Deleting it can move the host. `rayfin up` rewrites `rayfin.yml` allowed hosts. After auth or `assetAccess` changes, run a full `pnpm up-app <slug>` — not `up staticapp deploy` or `up functions deploy` alone, which skip remote auth migration.

Auth/hosting keys required in `rayfin/rayfin.yml`: `services.staticHosting.assetAccess: protected`, `services.auth.fabric.externalEntraExchange: true`. If Functions are enabled, `services.functions.auth.type: application` is required.

Do not wrap `rayfin login` in every deploy. If `up-app` fails as logged-out, from `apps/<slug>`:

```sh
pnpm exec rayfin login --encryption-fallback-enabled
```

Then retry `pnpm up-app`. `--encryption-fallback-enabled` is expected when the OS keychain is unavailable.

After a substantive change in `apps/` that the user needs to review in Fabric, run `pnpm up-app --dry-run` then `pnpm up-app <slug>` when verify is green. Do not wait to be asked. Skip tests-only, docs-only, and non-deployable packages (`@vpaa/admin`). If Functions are unavailable in the tenant, retry with `--exclude-services functions` after a full up failed only on the functions phase.

Do not run `az login` or `fabric-app-data query`. Paste the portal URL from the CLI output. DAX only runs in that Fabric embed, not on the static hosting URL.

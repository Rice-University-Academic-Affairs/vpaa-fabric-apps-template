---
name: vpaa-up-app
description: Deploy or update a VPAA Fabric/Rayfin app with pnpm up-app. Use when the user asks to rayfin up, publish, deploy, or update an app, and after finishing a substantive apps/ change that needs live Fabric review.
---

# Deploy a VPAA Rayfin app

From the repo root. Never `npx rayfin`. Never run `rayfin up` from the repository root (`buildCommand` is `npm run build:fabric` and only resolves in `apps/<slug>`). `pnpm up-app` cds there.

- Update: `pnpm up-app <slug>`
- First publish or retarget: `pnpm up-app <slug> --workspace "<Fabric workspace name>"`

`--workspace` is the portal workspace **name**, not the GUID and not the kebab key in `.deployments.json`. Omitting it reuses `apps/<slug>/rayfin/workspace-name`. If that file is missing, require `--workspace`. A successful up writes that file. `@vpaa/ui` is not a Fabric deployable.

Do not wrap `rayfin login` in every deploy. If `up-app` fails as logged-out, from `apps/<slug>`:

```sh
pnpm exec rayfin login --encryption-fallback-enabled
```

Then retry `pnpm up-app`. `--encryption-fallback-enabled` is expected when the OS keychain is unavailable.

After a substantive change in `apps/` that the user needs to review in Fabric, run `pnpm up-app <slug>` when verify is green. Do not wait to be asked. Skip tests-only, docs-only, and non-deployable packages (`@vpaa/ui`).

Do not run `az login` or `fabric-app-data query`. Paste the portal URL from the CLI output. DAX only runs in that Fabric embed, not on the static hosting URL.

---
name: vpaa-test
description: Chooses unit, smoke, or full e2e for the VPAA pnpm workspace. Use when running tests, verifying a change, or when the user mentions smoke, e2e, Playwright, or Vitest.
---

# VPAA tests

Run the smallest layer that covers the change. Commands are from the repository root. Every directory under `apps/` is a first-class app: never skip it in a full-repo run.

1. Touched `packages/data` or `packages/auth` (or their tests) → `pnpm --filter <pkg>... test`
2. Touched other packages without routes → `pnpm --filter @vpaa/<pkg> test`
3. Touched a product app's `src/lib` without routes → `pnpm --filter @vpaa/<app> test`
4. Touched routes, layouts, or e2e helpers → that package's `pnpm --filter @vpaa/<pkg> test:smoke`
5. User asked for full e2e or CI-style Playwright → `pnpm test:e2e` or `pnpm --filter @vpaa/<pkg> test:e2e`

Never start full Playwright as the first verify. `test` is unit only. `test:smoke` is one Vite server per package; root smoke runs `@vpaa/admin` then each `apps/` app sequentially because they share port 5173. `@vpaa/admin` e2e is the platform admin and portal suite; product apps only smoke their own product specs.

Before a live Fabric deploy, run `pnpm up-app <slug> --dry-run`. Expected Rayfin deprecation noise in Node tests can be silenced with `RAYFIN_NO_DEPRECATION=1`; browser apps use `setDeprecationsSilenced` only after reviewing warnings. Do not treat `manifest.json` 404 or Fabric portal `unload` policy violations as app failures.

# {{packageName}}

Fabric deployable scaffolded with `pnpm new-app`.

## Dev

```sh
pnpm --filter {{packageName}} dev
```

## Test (unit)

```sh
pnpm --filter {{packageName}} test
```

## Smoke

```sh
pnpm --filter {{packageName}} test:smoke
```

## E2E

```sh
pnpm --filter {{packageName}} test:e2e
```

## Check

```sh
pnpm --filter {{packageName}} check
pnpm check:deps
```

## Generate

```sh
pnpm --filter {{packageName}} admin:generate
pnpm up-app {{slug}} --dry-run
pnpm up-app {{slug}}
```

`dev` is `PUBLIC_ADMIN_TEST_MODE` Vite. `dev:frontend` is the Vite process `rayfin dev` starts. `dev:rayfin` runs `rayfin dev`. Functions stay disabled until `pnpm new-app <slug> --functions`. Set the owner admin email as `RAYFIN_PUBLIC_OWNER_ADMIN_EMAIL` in `rayfin/.env`. `rayfin env` projects it to `VITE_RAYFIN_OWNER_ADMIN_EMAIL`.

`tsconfig.json` extends `./.svelte-kit/tsconfig.json`, which `svelte-kit sync` generates in a real app. The template itself is not a workspace member, so that file is not present here.

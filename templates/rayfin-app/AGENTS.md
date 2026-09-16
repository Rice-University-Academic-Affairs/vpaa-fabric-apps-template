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
pnpm up-app {{slug}}
```

`tsconfig.json` extends `./.svelte-kit/tsconfig.json`, which `svelte-kit sync` generates in a real app. The template itself is not a workspace member, so that file is not present here.

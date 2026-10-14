---
name: fabric-cli
description: >
  How to use fabric-app-data CLI to manage Fabric data source connections.
  Maintain workspace/item IDs in a fabric.yaml file with profiles,
  add connections by ID or Fabric portal URL, and generate TypeScript
  config for use with @microsoft/fabric-app-data.
---

# Fabric CLI — Connection Management

Run these commands from `apps/<slug>` (the directory with `fabric.yaml`). Use `node scripts/fabric-app-data.mjs`, not `pnpm exec fabric-app-data` (that is a no-op on this Windows/pnpm layout) and not `npx`. Do not reimplement Rayfin or Fabric embed auth — apps use `@vpaa/auth` (`loadAppAuth`) and `@vpaa/semantic` (`getFabricClient`, `readSemanticModelTable`).

To write semantic-model workspace and item IDs from a portal URL, do not use `init`/`add`. From the repo root, with no Azure login:

```sh
pnpm add-semantic-model <slug> "<Fabric URL of the semantic model>"
```

That writes `fabric.yaml`, `src/fabric.generated.ts`, and `src/lib/semantic.ts`. Pages import `$lib/semantic.js`. Use `generate` from this skill only when regenerating TypeScript from an existing yaml, and `query` only if Azure CLI is available (this repo does not require `az login`).

## Overview

The `fabric-app-data` CLI manages Fabric data source connections in a
`fabric.yaml` file. It supports multiple profiles (dev, staging,
production) and generates TypeScript config that the `@microsoft/fabric-app-data`
consumes at runtime.

## Workflow

```sh
node scripts/fabric-app-data.mjs init                     # 1. Create fabric.yaml
node scripts/fabric-app-data.mjs add sales --from-url "https://app.fabric.microsoft.com/..."
                                     # 2. Add connections
node scripts/fabric-app-data.mjs generate -o src/fabric.generated.ts
                                     # 3. Generate TypeScript config
```

Then in your app:
```typescript
import { readSemanticModelTable } from "$lib/semantic.js";

const rows = await readSemanticModelTable("Sales");
```

## Config discovery

All commands except `init` walk **up** the directory tree from the
current working directory until they find a `fabric.yaml`. This means
you can run the CLI from any subdirectory of your project (e.g. from
`src/queries/` or a nested package) and it will pick up the project's
root `fabric.yaml` automatically.

`init` is the exception — it always writes `fabric.yaml` to the
current working directory, so run it from the project root.

## Commands

### `node scripts/fabric-app-data.mjs init`

Create a new `fabric.yaml` in the current directory.

```sh
node scripts/fabric-app-data.mjs init                    # default "dev" profile
node scripts/fabric-app-data.mjs init -p production      # custom profile name
node scripts/fabric-app-data.mjs init --force            # overwrite existing
```

### `node scripts/fabric-app-data.mjs add`

Add a connection to a profile. Two modes:

**From Fabric portal URL (preferred):**
```sh
node scripts/fabric-app-data.mjs add <alias> --from-url "<Fabric portal URL>"
```

**Explicit IDs:**
```sh
node scripts/fabric-app-data.mjs add semanticModel <alias> -w <workspaceId> -i <itemId>
```

**Important:** Use exactly these flag names. The short flags are `-w` and `-i`. The long flags are `--workspace` and `--item`. Do NOT use `--workspace-id` or `--item-id` — those do not exist.

The URL parser extracts workspace ID, item ID, and type automatically.
Supported URL segments: `semanticmodels`, `modeling`, `lakehouses`,
`warehouses`. `"me"` is accepted as workspace ID for My Workspace items.

Options:
- `-p, --profile <name>` — target profile (defaults to active)

### `node scripts/fabric-app-data.mjs remove <alias>`

Remove a connection by alias.

```sh
node scripts/fabric-app-data.mjs remove sales
node scripts/fabric-app-data.mjs remove sales -p staging
```

### `node scripts/fabric-app-data.mjs list`

List all connections in a profile.

```sh
node scripts/fabric-app-data.mjs list
node scripts/fabric-app-data.mjs list -p production
```

### `node scripts/fabric-app-data.mjs use <profile>`

Switch the active profile and auto-regenerate the config file.

```sh
node scripts/fabric-app-data.mjs use production
node scripts/fabric-app-data.mjs use staging -o src/config/fabric.generated.ts
```

### `node scripts/fabric-app-data.mjs generate`

Generate `fabric.generated.ts` from the active profile.

```sh
node scripts/fabric-app-data.mjs generate
node scripts/fabric-app-data.mjs generate -o src/fabric.generated.ts
node scripts/fabric-app-data.mjs generate -p production
```

### `node scripts/fabric-app-data.mjs query`

Execute a DAX query against a semantic model using the same SDK pipeline as the running app. Aliases: `execute`, `exec`.

```sh
node scripts/fabric-app-data.mjs query <alias> --query '<DAX>'
node scripts/fabric-app-data.mjs query <alias> --file src/queries/revenue.dax
node scripts/fabric-app-data.mjs query semanticModel <alias> --query '<DAX>'  # explicit source type
node scripts/fabric-app-data.mjs query <alias> --query '<DAX>' --limit 50     # return at most 50 rows
node scripts/fabric-app-data.mjs query <alias> --query '<DAX>' --profile staging
```

Options:
- `-q, --query <query>` — inline DAX query text
- `-f, --file <path>` — path to a `.dax` file (alternative to `--query`)
- `-l, --limit <rows>` — maximum rows to return (default: 1000, max: 1000)
- `-p, --profile <name>` — profile name (defaults to activeProfile)

**Result trimming:** By default, results are capped at 1000 rows to keep output manageable. When the result is trimmed, the JSON output includes a `_cliWarning` field indicating how many rows were returned out of the total. This is a CLI-only limitation — the full dataset is available in the running app. If more rows are needed, refine the DAX query with filters or aggregations instead.

## fabric.yaml Structure

```yaml
activeProfile: dev
profiles:
  dev:
    semanticModels:
      sales:
        workspaceId: "00c98f7c-..."
        itemId: "03f2dc11-..."
      myModel:
        workspaceId: "me"
        itemId: "c078a68d-..."
  production:
    semanticModels:
      sales:
        workspaceId: "aabbccdd-..."
        itemId: "11223344-..."
```

## Generated Output

`fabric.generated.ts` exports a plain config object:

```typescript
// fabric.generated.ts — AUTO-GENERATED from fabric.yaml (profile: dev). Do not edit.

export const fabricConfig = {
  semanticModels: {
    sales: {
      workspaceId: '00c98f7c-...',
      itemId: '03f2dc11-...',
    },
  },
} as const;
```

Add `fabric.generated.ts` to `.gitignore` — regenerate from `fabric.yaml`
as needed.

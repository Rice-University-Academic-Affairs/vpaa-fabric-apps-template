# @vpaa/ui

Shared Svelte components, admin surfaces, AI chat, and the fixture host at `/`. Not a Fabric deployable.

Admin data plane lives in `@vpaa/data`; identity and membership in `@vpaa/auth`; admin UI in `@vpaa/ui`. The `@vpaa/ui` host (`src/routes`, `rayfin/`) holds only what is needed to boot and drive that UI in a browser.

## Dev

```sh
pnpm --filter @vpaa/ui dev
```

## Test (unit)

```sh
pnpm --filter @vpaa/ui test
```

## Smoke

```sh
pnpm --filter @vpaa/ui test:smoke
```

## E2E

```sh
pnpm --filter @vpaa/ui test:e2e
```

Platform admin, table, shell, and chat coverage runs here once. Product apps do not re-run it.

## Check

```sh
pnpm --filter @vpaa/ui check
pnpm check:deps
```

## Generate

```sh
pnpm --filter @vpaa/ui admin:generate
```

## Svelte MCP

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if the code was written to files in their project.

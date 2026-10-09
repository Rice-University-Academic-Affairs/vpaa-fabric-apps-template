# @vpaa/admin

Shared Svelte components, admin surfaces, AI chat, and the fixture host at `/`. Not a Fabric deployable.

Admin data plane lives in `@vpaa/data`; identity and membership in `@vpaa/auth`; admin UI in `@vpaa/admin`. The `@vpaa/admin` host (`src/routes`, `rayfin/`) holds only what is needed to boot and drive that UI in a browser.

## Dev

```sh
pnpm --filter @vpaa/admin dev
```

## Test (unit)

```sh
pnpm --filter @vpaa/admin test
```

## Smoke

```sh
pnpm --filter @vpaa/admin test:smoke
```

## E2E

```sh
pnpm --filter @vpaa/admin test:e2e
```

Platform admin, shell, and chat coverage runs here once. Product apps do not re-run it.

## Check

```sh
pnpm --filter @vpaa/admin check
pnpm check:deps
```

## Generate

```sh
pnpm --filter @vpaa/admin admin:generate
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

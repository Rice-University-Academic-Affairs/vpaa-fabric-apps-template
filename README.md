# VPAA Fabric Apps Template

This template is a **monorepo**: one folder designed to hold all of your team's Fabric Apps, alongside the shared tools those apps depend upon. You *could* create a fresh copy of this template for each app, but that either duplicates the shared tools across many folders or forces you to consider more compex strategies for keeping the tools in sync.

Microsoft's Fabric App documentation uses the React web development framework, but this template uses Svelte and SvelteKit instead. Compared with React, Svelte is quicker to learn, simpler to reason about, and broadly more pleasant for folks without heaps of web development experience.

If you haven't seen Svelte before, no worries! You're the intended audience for this template. Work through a few lessons in the official [Svelte tutorial](https://svelte.dev/tutorial/svelte/welcome-to-svelte) to get going. You do not need the whole course. Open the tutorial's menu and do the first four tutorials underneath **Basic Svelte** -- **Introduction**, **Reactivity**, **Props**, and **Logic**. Then, do the first three tutorials underneath **Basic SvelteKit** -- **Introduction**, **Routing**, and **Loading data**.

## Getting Started with GitHub

1. Open this [template's repository](https://github.com/Rice-University-Academic-Affairs/vpaa-fabric-apps-template) on GitHub.
2. Click **Use this template**, then **Create a new repository**.
3. Under **Owner**, choose your personal or organizational GitHub. Name the repository whatever you want your team's monorepo to be called (for example `my-team-apps`), and click **Create repository**.
4. On your new repository's page, click the green **Code** button, make sure the **HTTPS** tab is selected, and click the copy icon next to the URL.
5. In a terminal, go to the folder where you keep your projects, then run `git clone` followed by the URL you copied:

```sh
git clone <the url you copied>
```

## Getting Started with GitLab, Bitbucket, or another host

1. Create an empty repository on your version control host, named whatever you want your team's monorepo to be called (for example `my-team-apps`). Do not add a README or other files. Note the repository's URL.
2. Open this [template's repository](https://github.com/Rice-University-Academic-Affairs/vpaa-fabric-apps-template) on GitHub, click the green **Code** button, then click **Download ZIP**.
3. Unzip it into your projects folder and rename the unzipped folder to match your repository (for example `my-team-apps`).
4. In a terminal, go into that folder and run the following, replacing the URL with the one you copied in step 1:

```sh
git init
git add .
git commit -m "Initial commit"
git remote add origin <the repository URL you noted earlier>
git push -u origin HEAD
```

## Installations

Fabric Apps require **Node.js** -- a Javascript runtime for building web applications. The apps themselves are written in **TypeScript** -- a particular dialect of JavaScript. 

First, install **nvm** -- a tool that simplifies Node.js installation:

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.5/install.sh | bash
```

Then, install version 24 of Node.js:

```sh
nvm install 24
```

Finally, in the folder you cloned, install this template's dependencies:

```sh
corepack enable
corepack prepare pnpm@10.34.5 --activate
pnpm install
```

## Creating your first app

Pick a short name with dashes, e.g., `my-app`, and use that same name in every command below. The following command scaffolds your app, placing all of its code in a new subfolder in the `apps/` folder.

```sh
pnpm new-app my-app
```

Next, run following command to start a local version of the app:

```sh
pnpm start-app my-app
```

Open [http://localhost:5173](http://localhost:5173). You should see an empty app.

## Connecting your app to data

The app can read data that already lives in Fabric, manage its own data in a Fabric SQL database, or both.

### Read from a Fabric semantic model

Fabric semantic models are the easiest way to give your app read access to Fabric data. To attach a Fabric semantic model to your app, first open the semantic model object inside of Fabric. Copy the semantic model's url, and run the following command: 

```sh
pnpm add-semantic-model my-app "https://app.fabric.microsoft.com/..."
```

With the semantic model attached, putting its rows on the home page is two steps: fetch the data, then display it.

First, create `apps/my-app/src/routes/+page.ts` to fetch the rows. SvelteKit runs this file before the page renders. Put your a table name from your semantic model in place of `Sales`.

```ts
import { readSemanticModelTable } from "$lib/semantic.js";

export const load = async () => {
	const rows = await readSemanticModelTable("Sales");
	return { rows };
};
```

`rows` is a list of records. Each record's keys are the column names from that table.

Then replace `apps/my-app/src/routes/+page.svelte` so the page can display those rows. SvelteKit passes the result of `load` in as `data`. This example prints `Name` and `Amount` -- change those to column names from your table.

```svelte
<script lang="ts">
	let { data } = $props();
</script>

<table>
	<thead>
		<tr>
			<th>Name</th>
			<th>Amount</th>
		</tr>
	</thead>
	<tbody>
		{#each data.rows as row (row.Name)}
			<tr>
				<td>{row.Name}</td>
				<td>{row.Amount}</td>
			</tr>
		{/each}
	</tbody>
</table>
```

### Create a Fabric SQL database

The following command tells Fabric that your application needs a SQL database. After you publish your app to Fabric (details below), Fabric will create the database and your specified tables.

```sh
pnpm add-sql-database my-app
```

The rest of this section provides an example of creating a **Note** table with two required fields, `id` and `title`. 

For each table, you need to create a **table file** to describe its columns. One file per table, under `apps/my-app/rayfin/data/domain/`. `id` is a required field. For our example **Note** table, we'll add this table file: `apps/my-app/rayfin/data/domain/Note.ts`:

```ts
import { authenticated, entity, text, uuid } from "@microsoft/rayfin-core";

@entity()
@authenticated("*")
export class Note {
	@uuid()
	id!: string;

	@text({ max: 200 })
	title!: string;
}
```

Those `@uuid()` and `@text()` marks are column types from Rayfin. Other types and options are in the [Rayfin modeling docs](https://rayfin.ai/docs/data/modeling) (`@microsoft/rayfin-core`).

With the **Note** table described, we can now set up our home page to fetch and display rows from the Note table. 
Following Svelte conventions, we'll create a new file, `apps/my-app/src/routes/+page.ts`, to fetch the data for our home page:

```ts
import { getRayfinClient } from "$lib/rayfin/client.js";

export const load = async () => {
	try {
		const notes = await getRayfinClient().data.Note.select(["id", "title"]).execute();
		return { notes };
	} catch {
		return { notes: [] };
	}
};
```

Then we'll create `apps/my-app/src/routes/+page.svelte` to receive and display that data.

```svelte
<script lang="ts">
	let { data } = $props();
</script>

<table>
	<thead>
		<tr>
			<th>Title</th>
		</tr>
	</thead>
	<tbody>
		{#each data.notes as note (note.id)}
			<tr>
				<td>{note.title}</td>
			</tr>
		{/each}
	</tbody>
</table>
```

## The Admin page

Every app using this template includes an **Admin** page built by VPAA. After you publish an app that has a SQL database, this page lists your tables so you can browse, add, and edit rows with a simple UI. You can change the admin page to suit your needs; it lives in `apps/my-app/src/routes/admin/`.

This template automatically creates an **AdminUser** table to support that page. That table is the list of people who can open Admin -- their email address, when they were added, and whether they can add other admins. You do not write this table; it is already in the app. Your own tables (like the Note example) show up next to it after you publish.

The **Admin** page requires an application owner -- an original admin who can create other admins. You should make yourself the application owner. In `apps/my-app/rayfin/.env`, set the `RAYFIN_PUBLIC_OWNER_ADMIN_EMAIL` variable to your NetID email address:

```
RAYFIN_PUBLIC_OWNER_ADMIN_EMAIL=your-netid@rice.edu
```

After you publish and open the app in Fabric, you get an **Admin** link in the navbar. From there you can manage the tables and add other Rice accounts as admins. Everyone else can still open the app; they just do not see Admin until someone on the list adds them.

## Publish to Fabric

Publishing makes your app live. Fabric hosts the app, creates any SQL database you added, and wires up authentication, security, and other essentials.

You publish into a specific Fabric workspace. You need at least the **Contributor** role in that workspace (**Member** and **Admin** also work). Use the workspace name exactly as it appears in the Fabric portal:

```sh
pnpm up-app my-app "Fabric workspace name"
```

The next time you publish this app, you can omit the workspace name. The first publish saves the workspace name to `apps/my-app/rayfin/workspace-name`, and future `up-app` commands will use that workspace name.

```sh
pnpm up-app my-app
```

# VPAA Fabric Apps Template


## Set up once

Install nvm, then Node 24:

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.5/install.sh | bash
nvm install 24
```

Open a terminal in this folder and run:

```sh
corepack enable
corepack prepare pnpm@10.34.5 --activate
pnpm install
```

## Create your app

Pick a short name with dashes, like `my-app`, and use that same name in every command below. This makes the folder `apps/my-app`. It starts as a page with a title and no data.

```sh
pnpm new-app my-app
pnpm start-app my-app
```

That last command starts the app on your computer. Open [http://localhost:5173](http://localhost:5173). You should see the empty app.

## Give your app data

The app can read data that already lives in Fabric, keep its own data, or both. The page will be empty on your computer. Real rows appear after you publish and open the app in Fabric.

### Read from a Fabric semantic model

Use this when the numbers already live in a Power BI / Fabric model. Copy the model's address from the Fabric portal (open the model, then copy the URL). The app reads that model with the permissions of whoever opens it.

```sh
pnpm add-semantic-model my-app "https://app.fabric.microsoft.com/..."
```

Then show those rows on the home page. Create `apps/my-app/src/routes/+page.ts`. Put your table's name in place of `Sales`.

```ts
import { readSemanticModelTable } from "$lib/semantic.js";

export const load = async () => {
	const rows = await readSemanticModelTable("Sales");
	return { rows };
};
```

`rows` is a list of records. Each record's keys are the column names from that table. Replace `apps/my-app/src/routes/+page.svelte` with a table that prints the columns you care about. This example uses `Name` and `Amount` — change those to columns from your model.

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

The following command tells Fabric that your application needs a SQL database. After you publish your app to Fabric (details below), Fabric will create the database. 

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

This template automatically creates an **AdminUser** table to support that page. That table is the list of people who can open Admin — email address, when they were added, and whether they can add other admins. You do not write this table; it is already in the app. Your own tables (like Note) show up next to it after you publish.

The **Admin** page requires an application owner -- an original admin who can create other admins. You should make yourself the application owner. In `apps/my-app/rayfin/.env`, set the `RAYFIN_PUBLIC_OWNER_ADMIN_EMAIL` variable to your NetID email address:

```
RAYFIN_PUBLIC_OWNER_ADMIN_EMAIL=your-netid@rice.edu
```

After you publish and open the app in Fabric, you get an **Admin** link in the navbar. From there you can manage the tables and add other Rice accounts as admins. Everyone else can still open the app; they just do not see Admin until someone on the list adds them.

## Publish to Fabric

This puts the app in a Fabric workspace you already have. Publish into the workspace whose name you see in the Fabric portal:

```sh
pnpm up-app my-app "Fabric workspace name"
```

The next time you publish this app, you can omit the workspace name. The first publish writes it to `apps/my-app/rayfin/workspace-name`.

```sh
pnpm up-app my-app
```

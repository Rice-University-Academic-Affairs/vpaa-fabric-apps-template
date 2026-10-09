<script lang="ts">
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { getAdminContext } from "@vpaa/admin";
	import { getResourceBySlug, resourcePluralLabel } from "$lib/admin/generated/resources.js";
	import AdminShell from "@vpaa/admin/admin/components/AdminShell.svelte";
	import AdminErrorView from "@vpaa/admin/admin/components/AdminError.svelte";
	import ResourceListPanel from "@vpaa/admin/admin/components/ResourceListPanel.svelte";
	import { Button } from "@vpaa/admin/components/ui/button/index.js";

	getAdminContext();
	const slug = $derived(page.params.resource ?? "");
	const resource = $derived(getResourceBySlug(slug));
	const title = $derived(resource ? resourcePluralLabel(resource.name) : "Not found");
</script>

{#if !resource}
	<AdminShell title="Not found">
		<AdminErrorView title="Not found" message={`Unknown resource "${slug}".`} kind="not_found" />
	</AdminShell>
{:else}
	<AdminShell {title}>
		{#snippet actions()}
			<Button href={resolve(`/admin/${slug}/new`)}>New</Button>
		{/snippet}
		{#key slug}
			<ResourceListPanel {resource} {slug} />
		{/key}
	</AdminShell>
{/if}

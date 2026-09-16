<script lang="ts">
	import { page } from "$app/state";
	import { getAdminContext } from "@vpaa/ui";
	import { getResourceBySlug } from "$lib/admin/generated/resources.js";
	import { humanizeName } from "@vpaa/data";
	import AdminShell from "@vpaa/ui/admin/components/AdminShell.svelte";
	import AdminErrorView from "@vpaa/ui/admin/components/AdminError.svelte";
	import CreateRecordPanel from "@vpaa/ui/admin/components/CreateRecordPanel.svelte";

	getAdminContext();
	const slug = $derived(page.params.resource ?? "");
	const resource = $derived(getResourceBySlug(slug));
	const title = $derived(resource ? `New ${humanizeName(resource.name)}` : "Not found");
</script>

{#if !resource}
	<AdminShell title="Not found">
		<AdminErrorView title="Not found" message={`Unknown resource "${slug}".`} kind="not_found" />
	</AdminShell>
{:else}
	<AdminShell {title}>
		{#key slug}
			<CreateRecordPanel {resource} {slug} />
		{/key}
	</AdminShell>
{/if}

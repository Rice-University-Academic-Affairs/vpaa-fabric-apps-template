<script lang="ts">
	import { page } from "$app/state";
	import { browser } from "$app/environment";
	import { AppShell } from "@vpaa/ui";
	import { buildPrimaryNavigation } from "$lib/auth/navigation.js";
	import { isAdminTestMode } from "@vpaa/data";
	import { getTestAdminContext } from "$lib/admin/test/bootstrap.js";
	import { installAdminTestWindow } from "$lib/admin/test/install-harness.js";
	import "./layout.css";

	let {
		data,
		children
	}: {
		data: { isAdmin?: boolean; email?: string | null };
		children: import("svelte").Snippet;
	} = $props();

	if (isAdminTestMode() && browser) {
		installAdminTestWindow(getTestAdminContext());
	}

	const navigation = $derived(buildPrimaryNavigation({ isAdmin: Boolean(data.isAdmin) }));
</script>

<AppShell
	appName="{{displayName}}"
	{navigation}
	currentPath={page.url.pathname}
	user={{ name: data.email ?? "Signed out", id: data.email ?? undefined }}
>
	{@render children()}
</AppShell>

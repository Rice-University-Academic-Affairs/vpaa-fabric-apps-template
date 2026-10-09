<script lang="ts">
	import * as Sidebar from "../ui/sidebar/index.js";
	import AiChatPanel from "../ai-chat/AiChatPanel.svelte";
	import type { AppNavGroup } from "../../types/navigation.js";
	import type { AppShellSearch, AppShellUser } from "../../types/shell.js";
	import type { AiChatSession } from "../../ai-chat/session/create-session.svelte.js";
	import type { Snippet } from "svelte";
	import { onDestroy } from "svelte";
	import AppNavContent from "./AppNavContent.svelte";
	import AppTopBar from "./AppTopBar.svelte";

	type Props = {
		appName: string;
		navigation: AppNavGroup[];
		currentPath?: string;
		user?: AppShellUser;
		search?: AppShellSearch;
		chat?: AiChatSession;
		children: Snippet;
	};

	let { appName, navigation, currentPath, user, search, chat, children }: Props = $props();

	let chatOpen = $state(false);

	onDestroy(() => {
		chat?.dispose();
	});
</script>

<Sidebar.Provider>
	<Sidebar.Root>
		<Sidebar.Header>
			<a href="/" class="truncate px-2 py-1.5 text-lg font-semibold">{appName}</a>
		</Sidebar.Header>
		<Sidebar.Content>
			<nav aria-label="Primary">
				<AppNavContent {navigation} {currentPath} />
			</nav>
		</Sidebar.Content>
	</Sidebar.Root>
	<Sidebar.Inset>
		<AppTopBar
			{appName}
			{user}
			{search}
			{chat}
			chatOpen={chatOpen}
			onChatOpen={() => (chatOpen = true)}
		/>
		<div class="flex-1 overflow-y-auto" data-app-shell-content>
			{@render children()}
		</div>
	</Sidebar.Inset>
	{#if chat}
		<AiChatPanel bind:open={chatOpen} session={chat} />
	{/if}
</Sidebar.Provider>

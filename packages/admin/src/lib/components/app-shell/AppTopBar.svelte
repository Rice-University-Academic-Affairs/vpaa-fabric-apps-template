<script lang="ts">
	import AiChatTrigger from "../ai-chat/AiChatTrigger.svelte";
	import Search from "../search/Search.svelte";
	import UserBadge from "../user/UserBadge.svelte";
	import * as Sidebar from "../ui/sidebar/index.js";
	import { Separator } from "../ui/separator/index.js";
	import type { AiChatSession } from "../../ai-chat/session/create-session.svelte.js";
	import type { AppShellSearch, AppShellUser } from "../../types/shell.js";

	type Props = {
		appName: string;
		user?: AppShellUser;
		search?: AppShellSearch;
		chat?: AiChatSession;
		chatOpen?: boolean;
		onChatOpen?: () => void;
	};

	let {
		appName,
		user,
		search,
		chat,
		chatOpen = false,
		onChatOpen
	}: Props = $props();
</script>

<header class="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
	<Sidebar.Trigger />
	<Separator orientation="vertical" class="h-4" />
	<span class="truncate text-sm font-medium md:hidden">{appName}</span>
	<div class="ms-auto flex shrink-0 items-center gap-2">
		{#if search}
			<Search
				items={search.items as Record<string, unknown>[]}
				field={search.field}
				secondaryField={search.secondaryField}
				onSelect={(item) => search.onSelect(item)}
				placeholder={search.placeholder}
			/>
		{/if}
		{#if chat}
			<AiChatTrigger expanded={chatOpen} onclick={onChatOpen} />
		{/if}
		{#if user}
			<div data-user-id={user.id ?? user.name}>
				<UserBadge name={user.name} />
			</div>
		{/if}
	</div>
</header>

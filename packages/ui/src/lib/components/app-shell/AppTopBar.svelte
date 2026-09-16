<script lang="ts">
	import AiChatTrigger from "../ai-chat/AiChatTrigger.svelte";
	import Search from "../search/Search.svelte";
	import UserBadge from "../user/UserBadge.svelte";
	import { Button } from "../ui/button/index.js";
	import Menu from "@lucide/svelte/icons/menu";
	import type { AiChatSession } from "../../ai-chat/session/create-session.svelte.js";
	import type { AppShellSearch, AppShellUser } from "../../types/shell.js";

	type Props = {
		appName: string;
		user?: AppShellUser;
		search?: AppShellSearch;
		chat?: AiChatSession;
		chatOpen?: boolean;
		onChatOpen?: () => void;
		onMenuClick?: () => void;
	};

	let {
		appName,
		user,
		search,
		chat,
		chatOpen = false,
		onChatOpen,
		onMenuClick
	}: Props = $props();
</script>

<header
	class="flex h-16 shrink-0 items-center gap-3 bg-[var(--surface-header)] px-5"
	style="grid-area: topbar;"
>
	<div class="flex min-w-0 items-center gap-2">
		{#if onMenuClick}
			<Button
				variant="ghost"
				size="icon"
				class="text-[var(--text-on-navy)] hover:bg-white/10 focus-visible:ring-white/60 md:hidden"
				onclick={onMenuClick}
				aria-label="Open navigation menu"
			>
				<Menu />
			</Button>
		{/if}
		<a
			href="/"
			class="truncate rounded-sm text-xl font-bold text-[var(--text-on-navy)] outline-none focus-visible:ring-2 focus-visible:ring-white/60"
		>
			{appName}
		</a>
	</div>

	<div class="ms-auto flex shrink-0 items-center gap-4">
		{#if search}
			<Search
				variant="header"
				items={search.items as Record<string, unknown>[]}
				field={search.field}
				secondaryField={search.secondaryField}
				onSelect={(item) => search.onSelect(item)}
				placeholder={search.placeholder}
			/>
		{/if}
		{#if chat}
			<AiChatTrigger variant="header" expanded={chatOpen} onclick={onChatOpen} />
		{/if}
		{#if user}
			<div data-user-id={user.id ?? user.name}>
				<UserBadge variant="header" name={user.name} />
			</div>
		{/if}
	</div>
</header>

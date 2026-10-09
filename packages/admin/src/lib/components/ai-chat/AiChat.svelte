<script lang="ts">
	import type { AiChatSession } from "../../ai-chat/session/create-session.svelte.js";
	import AiChatPanel from "./AiChatPanel.svelte";
	import AiChatTrigger from "./AiChatTrigger.svelte";
	import { onDestroy } from "svelte";

	type Props = {
		session: AiChatSession;
	};

	let { session }: Props = $props();

	let open = $state(false);

	onDestroy(() => {
		session.dispose();
	});
</script>

<AiChatTrigger expanded={open} onclick={() => (open = true)} />

<AiChatPanel bind:open {session} />

<script lang="ts">
	import Sparkles from "@lucide/svelte/icons/sparkles";
	import { Button } from "../ui/button/index.js";
	import { cn } from "../../utils.js";

	type Props = {
		expanded?: boolean;
		onclick?: () => void;
		class?: string;
	};

	let { expanded = false, onclick, class: className }: Props = $props();
</script>

<Button
	type="button"
	variant="ghost"
	size="icon"
	class={cn(className)}
	aria-label="Open AI assistant"
	aria-expanded={expanded}
	{onclick}
>
	<Sparkles />
</Button>

<script lang="ts">
	import { cn } from "../../utils.js";

	type Props = {
		name: string;
		class?: string;
	};

	let { name, class: className }: Props = $props();

	const initial = $derived(name.trim().charAt(0).toUpperCase() || "?");
</script>

<div class={cn("flex items-center gap-2", className)}>
	<span
		class="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground"
		aria-hidden="true"
	>
		{initial}
	</span>
	<span class="hidden truncate font-medium text-foreground sm:inline">
		{name}
	</span>
</div>

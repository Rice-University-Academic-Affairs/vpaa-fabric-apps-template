<script lang="ts" generics="T">
	import SearchIcon from "@lucide/svelte/icons/search";
	import { Button } from "../ui/button/index.js";
	import { Input } from "../ui/input/index.js";
	import { cn } from "../../utils.js";

	type Props<T> = {
		items: T[];
		field: keyof T & string;
		secondaryField?: keyof T & string;
		onSelect: (item: T) => void;
		placeholder?: string;
		class?: string;
	};

	let {
		items,
		field,
		secondaryField,
		onSelect,
		placeholder = "Search…",
		class: className
	}: Props<T> = $props();

	let open = $state(false);
	let query = $state("");
	let inputRef = $state<HTMLInputElement | null>(null);
	let rootRef = $state<HTMLDivElement | null>(null);

	const trimmedQuery = $derived(query.trim());
	const matches = $derived(
		trimmedQuery
			? items.filter((item) =>
					String(item[field]).toLowerCase().includes(trimmedQuery.toLowerCase())
				)
			: []
	);
	const hasMatches = $derived(matches.length > 0);

	function splitMatch(
		text: string,
		q: string
	): { before: string; match: string; after: string } | null {
		if (!q) return null;
		const index = text.toLowerCase().indexOf(q.toLowerCase());
		if (index === -1) return null;
		return {
			before: text.slice(0, index),
			match: text.slice(index, index + q.length),
			after: text.slice(index + q.length)
		};
	}

	function close() {
		open = false;
		query = "";
	}

	function selectItem(item: T) {
		onSelect(item);
		close();
	}

	function handleDocumentClick(event: MouseEvent) {
		if (!open || !rootRef) return;
		if (!rootRef.contains(event.target as Node)) {
			close();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Escape" && open) {
			event.preventDefault();
			close();
		}
	}

	$effect(() => {
		if (open) {
			queueMicrotask(() => inputRef?.focus());
			document.addEventListener("click", handleDocumentClick, true);
			document.addEventListener("keydown", handleKeydown);
			return () => {
				document.removeEventListener("click", handleDocumentClick, true);
				document.removeEventListener("keydown", handleKeydown);
			};
		}
	});
</script>

<div bind:this={rootRef} class={cn("relative", className)}>
	{#if !open}
		<Button type="button" variant="ghost" size="icon" aria-label="Search" onclick={() => (open = true)}>
			<SearchIcon />
		</Button>
	{:else}
		<Input
			bind:ref={inputRef}
			class={cn("h-8 w-64", hasMatches && "rounded-b-none")}
			{placeholder}
			bind:value={query}
		/>
		{#if hasMatches}
			<div
				class="absolute top-full z-10 mt-0 max-h-60 w-64 overflow-y-auto rounded-lg rounded-t-none border border-t-0 bg-popover p-1 shadow-md"
			>
				{#each matches as item, index (index)}
					{@const parts = splitMatch(String(item[field]), trimmedQuery)}
					<button
						type="button"
						class="w-full rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
						onclick={() => selectItem(item)}
					>
						{#if parts}
							<span>{parts.before}</span><span class="font-semibold">{parts.match}</span><span
								>{parts.after}</span
							>
						{:else}
							<span>{String(item[field])}</span>
						{/if}
						{#if secondaryField}
							<span class="block text-xs text-muted-foreground"
								>{String(item[secondaryField])}</span
							>
						{/if}
					</button>
				{/each}
			</div>
		{/if}
	{/if}
</div>

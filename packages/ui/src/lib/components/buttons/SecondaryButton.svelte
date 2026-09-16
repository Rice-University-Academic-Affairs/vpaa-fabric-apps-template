<script lang="ts">
	import { Button } from "../ui/button/index.js";
	import type { ComponentProps, Snippet } from "svelte";

	type Props = Omit<ComponentProps<typeof Button>, "variant"> & {
		children?: Snippet;
	};

	let { children, ...restProps }: Props = $props();
</script>

<Button variant="outline" {...restProps}>
	{@render children?.()}
</Button>

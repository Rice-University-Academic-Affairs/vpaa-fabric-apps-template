<script lang="ts">
	import CircleAlertIcon from "@lucide/svelte/icons/circle-alert";
	import * as Alert from "../../components/ui/alert/index.js";
	import type { AdminErrorKind } from "@vpaa/data";

	type Props = {
		title: string;
		message: string;
		kind?: AdminErrorKind | "empty";
	};

	let { title, message, kind }: Props = $props();

	const variant = $derived(
		kind === "forbidden" || kind === "unauthorized" || kind === "unexpected"
			? "destructive"
			: "default"
	);
</script>

<Alert.Root {variant}>
	<CircleAlertIcon />
	<Alert.Title>{title}</Alert.Title>
	<Alert.Description>{message}</Alert.Description>
</Alert.Root>

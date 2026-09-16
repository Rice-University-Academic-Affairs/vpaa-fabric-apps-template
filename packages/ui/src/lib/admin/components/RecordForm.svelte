<script lang="ts">
	import { Button } from "../../components/ui/button/index.js";
	import { Input } from "../../components/ui/input/index.js";
	import { Label } from "../../components/ui/label/index.js";
	import FieldInput from "./FieldInput.svelte";
	import { humanizeName, writableFields, type AdminField, type FormValues } from "@vpaa/data";

	type Props = {
		fields: readonly AdminField[];
		values: FormValues;
		errors?: Record<string, string>;
		onsubmit: () => void | Promise<void>;
		submitLabel: string;
		disabled?: boolean;
	};

	let {
		fields,
		values = $bindable(),
		errors = {},
		onsubmit,
		submitLabel,
		disabled = false
	}: Props = $props();

	const editableFields = $derived(
		writableFields({ name: "", slug: "", fields })
	);
	const displayFields = $derived(
		fields.filter(
			(field) =>
				(field.readOnly || field.generated || field.primaryKey) && field.name in values
		)
	);

	function handleSubmit(event: Event) {
		event.preventDefault();
		void onsubmit();
	}
</script>

<form class="flex flex-col gap-6" onsubmit={handleSubmit}>
	{#if displayFields.length > 0}
		<div class="flex flex-col gap-4">
			{#each displayFields as field (field.name)}
				<div class="flex flex-col gap-2">
					<Label for={`display-${field.name}`}>{humanizeName(field.name)}</Label>
					<Input
						id={`display-${field.name}`}
						value={String(values[field.name] ?? "")}
						disabled
						readonly
					/>
				</div>
			{/each}
		</div>
	{/if}

	<div class="flex flex-col gap-4">
		{#each editableFields as field (field.name)}
			<FieldInput
				{field}
				value={values[field.name] ?? (field.type === "boolean" ? false : "")}
				onValueChange={(next) => {
					values[field.name] = next;
				}}
				error={errors[field.name]}
				disabled={disabled}
			/>
		{/each}
	</div>

	<div>
		<Button type="submit" {disabled}>{submitLabel}</Button>
	</div>
</form>

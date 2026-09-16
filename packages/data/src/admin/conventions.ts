import type { AdminField, AdminRecord, AdminResource, FieldControl, ListSort } from "./types.js";

const ACRONYMS = new Set(["id", "uuid", "url", "api", "sku"]);

export function humanizeName(input: string): string {
	const spaced = input
		.replace(/[-_]+/g, " ")
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
		.trim();

	return spaced
		.split(/\s+/)
		.filter(Boolean)
		.map((part) => {
			const lower = part.toLowerCase();
			if (ACRONYMS.has(lower)) return lower.toUpperCase();
			return lower.charAt(0).toUpperCase() + lower.slice(1);
		})
		.join(" ");
}

export function pluralizeLabel(singular: string): string {
	const label = humanizeName(singular);
	if (/\s/.test(label)) {
		const parts = label.split(" ");
		parts[parts.length - 1] = pluralizeWord(parts[parts.length - 1]!);
		return parts.join(" ");
	}
	return pluralizeWord(label);
}

function pluralizeWord(word: string): string {
	if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
	if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`;
	if (/fee$/i.test(word)) return `${word}s`;
	return `${word}s`;
}

export function resourceSlug(entityName: string): string {
	const human = humanizeName(entityName).toLowerCase().replace(/\s+/g, "-");
	const parts = human.split("-");
	parts[parts.length - 1] = pluralizeWord(parts[parts.length - 1]!);
	return parts.join("-");
}

export function listColumns(resource: AdminResource, max = 6): AdminField[] {
	const supported = resource.fields.filter((field) => {
		if (field.internal) return false;
		if (field.type === "text") return false;
		return true;
	});
	const primary = supported.find((field) => field.primaryKey) ?? supported[0];
	const rest = supported.filter((field) => field !== primary).slice(0, Math.max(0, max - 1));
	return primary ? [primary, ...rest] : [];
}

export const COMPOSITE_RECORD_ID_SEP = "\u001f";

export function primaryKeyNames(resource: AdminResource): string[] {
	const keys = resource.fields.filter((field) => field.primaryKey).map((field) => field.name);
	return keys.length > 0 ? keys : ["id"];
}

export function primaryKeyName(resource: AdminResource): string {
	return primaryKeyNames(resource)[0] ?? "id";
}

export function recordId(resource: AdminResource, record: Record<string, unknown>): string {
	const keys = primaryKeyNames(resource);
	if (keys.length <= 1) {
		const value = record[keys[0] ?? "id"] ?? record.id;
		return value == null ? "" : String(value);
	}
	return keys.map((key) => String(record[key] ?? "")).join(COMPOSITE_RECORD_ID_SEP);
}

export function recordIdentity(resource: AdminResource, id: string): Record<string, string> {
	const keys = primaryKeyNames(resource);
	if (keys.length <= 1) return { [keys[0] ?? "id"]: id };
	const parts = id.split(COMPOSITE_RECORD_ID_SEP);
	const identity: Record<string, string> = {};
	for (let i = 0; i < keys.length; i++) {
		identity[keys[i]!] = parts[i] ?? "";
	}
	return identity;
}

export function recordIdentityFilter(
	resource: AdminResource,
	id: string
): Record<string, { eq: string }> {
	return Object.fromEntries(
		Object.entries(recordIdentity(resource, id)).map(([key, value]) => [key, { eq: value }])
	);
}

export function adminRecordPath(slug: string, id: string): string {
	return `/admin/${slug}/${encodeURIComponent(id)}`;
}

export function withRecordId(
	resource: AdminResource,
	record: Record<string, unknown>
): AdminRecord {
	const id = recordId(resource, record);
	return { ...record, id };
}

export function defaultSort(resource: AdminResource): ListSort {
	const names = new Set(resource.fields.map((field) => field.name));
	if (names.has("updatedAt")) return { field: "updatedAt", direction: "desc" };
	if (names.has("updated_at")) return { field: "updated_at", direction: "desc" };
	if (names.has("createdAt")) return { field: "createdAt", direction: "desc" };
	if (names.has("created_at")) return { field: "created_at", direction: "desc" };
	const pk =
		resource.fields.find((field) => field.primaryKey)?.name ??
		resource.fields.find((field) => !field.internal)?.name ??
		"id";
	return { field: pk, direction: "asc" };
}

export function listSelectFields(resource: AdminResource, sort: ListSort): string[] {
	const fields = new Set(listColumns(resource).map((field) => field.name));
	for (const key of primaryKeyNames(resource)) {
		if (key === "id" || resource.fields.some((field) => field.name === key)) fields.add(key);
	}
	const sortField = resource.fields.find((field) => field.name === sort.field);
	if (sortField && !sortField.internal) fields.add(sort.field);
	return [...fields];
}

export function detailSelectFields(resource: AdminResource): string[] {
	return resource.fields.filter((field) => !field.internal).map((field) => field.name);
}

const TEXTAREA_TOKENS = ["description", "notes", "body", "content", "summary"];

export function fieldControl(field: AdminField): FieldControl {
	if (field.type === "boolean") return "checkbox";
	if (field.type === "integer") return "number-integer";
	if (field.type === "decimal") return "number-decimal";
	if (field.type === "date") return "date";
	if (field.type === "datetime") return "datetime-local";
	if (field.type === "enum") return "select";
	if (field.type === "text") return "textarea";
	const lower = field.name.toLowerCase();
	if (TEXTAREA_TOKENS.some((token) => lower.includes(token))) return "textarea";
	return "text";
}

export function isSystemReadOnlyName(name: string): boolean {
	return (
		name === "id" ||
		name === "createdAt" ||
		name === "updatedAt" ||
		name === "created_at" ||
		name === "updated_at" ||
		name === "createdBy" ||
		name === "created_by" ||
		name === "userId" ||
		name === "user_id"
	);
}

export function writableFields(resource: AdminResource): AdminField[] {
	return resource.fields.filter((field) => !field.readOnly && !field.generated && !field.internal);
}

export const ADMIN_PAGE_SIZE = 25;

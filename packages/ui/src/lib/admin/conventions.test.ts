import { describe, expect, it } from "vitest";
import {
	adminRecordPath,
	COMPOSITE_RECORD_ID_SEP,
	defaultSort,
	detailSelectFields,
	fieldControl,
	humanizeName,
	listColumns,
	listSelectFields,
	pluralizeLabel,
	primaryKeyName,
	primaryKeyNames,
	recordId,
	recordIdentity,
	recordIdentityFilter,
	resourceSlug
} from "@vpaa/data";
import type { AdminResource } from "@vpaa/data";

const product: AdminResource = {
	name: "Product",
	slug: "products",
	fields: [
		{ name: "id", type: "string", nullable: false, readOnly: true, generated: true, primaryKey: true },
		{ name: "name", type: "string", nullable: false, readOnly: false, generated: false },
		{ name: "description", type: "text", nullable: true, readOnly: false, generated: false },
		{ name: "priceInCents", type: "integer", nullable: false, readOnly: false, generated: false },
		{ name: "createdAt", type: "datetime", nullable: false, readOnly: true, generated: false }
	]
};

describe("conventions", () => {
	it("humanizes PascalCase, camelCase, snake_case, and kebab-case (C1-C4)", () => {
		expect(humanizeName("FacultyAward")).toBe("Faculty Award");
		expect(humanizeName("facultyId")).toBe("Faculty ID");
		expect(humanizeName("created_at")).toBe("Created At");
		expect(humanizeName("faculty-award")).toBe("Faculty Award");
	});

	it("pluralizes resource labels (C5)", () => {
		expect(pluralizeLabel("FacultyAward")).toBe("Faculty Awards");
		expect(pluralizeLabel("Product")).toBe("Products");
	});

	it("builds resource slugs (G10)", () => {
		expect(resourceSlug("Product")).toBe("products");
		expect(resourceSlug("FacultyAward")).toBe("faculty-awards");
	});

	it("chooses conventional list columns (C6)", () => {
		const columns = listColumns(product);
		expect(columns.map((c) => c.name)).toEqual(["id", "name", "priceInCents", "createdAt"]);
		expect(columns.length).toBeLessThanOrEqual(6);
		expect(columns.some((c) => c.type === "text")).toBe(false);
	});

	it("selects only rendered and sorted list fields", () => {
		const resource: AdminResource = {
			...product,
			fields: [
				...product.fields,
				{
					name: "embedding",
					type: "text",
					nullable: false,
					readOnly: true,
					generated: false,
					internal: true
				}
			]
		};
		expect(listSelectFields(resource, { field: "description", direction: "asc" })).toEqual([
			"id",
			"name",
			"priceInCents",
			"createdAt",
			"description"
		]);
		expect(listSelectFields(resource, { field: "description", direction: "asc" })).not.toContain("embedding");
		expect(detailSelectFields(resource)).not.toContain("embedding");
	});

	it("chooses default ordering (C7)", () => {
		expect(defaultSort(product)).toEqual({ field: "createdAt", direction: "desc" });
		expect(
			defaultSort({
				...product,
				fields: [
					...product.fields,
					{ name: "updatedAt", type: "datetime", nullable: true, readOnly: true, generated: false }
				]
			})
		).toEqual({ field: "updatedAt", direction: "desc" });
		expect(
			defaultSort({
				name: "X",
				slug: "xes",
				fields: [{ name: "id", type: "string", nullable: false, readOnly: true, generated: true, primaryKey: true }]
			})
		).toEqual({ field: "id", direction: "asc" });
	});

	it("reads the marked primary key name", () => {
		expect(primaryKeyName(product)).toBe("id");
		expect(
			primaryKeyName({
				name: "Faculty",
				slug: "faculties",
				fields: [
					{ name: "aau_id", type: "string", nullable: false, readOnly: false, generated: false, primaryKey: true },
					{ name: "first_name", type: "string", nullable: false, readOnly: false, generated: false }
				]
			})
		).toBe("aau_id");
	});

	it("encodes and decodes composite record identities", () => {
		const topic: AdminResource = {
			name: "OnboardingTopic",
			slug: "onboarding-topics",
			fields: [
				{ name: "aau_id", type: "string", nullable: false, readOnly: false, generated: false, primaryKey: true },
				{ name: "topic", type: "string", nullable: false, readOnly: false, generated: false, primaryKey: true },
				{ name: "display_order", type: "integer", nullable: false, readOnly: false, generated: false }
			]
		};
		expect(primaryKeyNames(topic)).toEqual(["aau_id", "topic"]);
		const id = recordId(topic, { aau_id: "109449", topic: "Quantum Physics" });
		expect(id).toBe(`109449${COMPOSITE_RECORD_ID_SEP}Quantum Physics`);
		expect(recordIdentity(topic, id)).toEqual({ aau_id: "109449", topic: "Quantum Physics" });
		expect(adminRecordPath("onboarding-topics", id)).toBe(
			`/admin/onboarding-topics/${encodeURIComponent(id)}`
		);
		expect(defaultSort(topic)).toEqual({ field: "aau_id", direction: "asc" });
		expect(listSelectFields(topic, defaultSort(topic))).toEqual(["aau_id", "topic", "display_order"]);
	});

	it("encodes three-part recommendation identities", () => {
		const recommendation: AdminResource = {
			name: "Recommendation",
			slug: "recommendations",
			fields: [
				{ name: "aau_id", type: "string", nullable: false, readOnly: false, generated: false, primaryKey: true },
				{ name: "award_id", type: "string", nullable: false, readOnly: false, generated: false, primaryKey: true },
				{ name: "rail_id", type: "string", nullable: false, readOnly: false, generated: false, primaryKey: true },
				{ name: "rank", type: "integer", nullable: false, readOnly: false, generated: false }
			]
		};
		const id = recordId(recommendation, { aau_id: "109449", award_id: "sloan", rail_id: "rail-1" });
		expect(id).toBe(`109449${COMPOSITE_RECORD_ID_SEP}sloan${COMPOSITE_RECORD_ID_SEP}rail-1`);
		expect(recordIdentity(recommendation, id)).toEqual({
			aau_id: "109449",
			award_id: "sloan",
			rail_id: "rail-1"
		});
		expect(recordIdentityFilter(recommendation, id)).toEqual({
			aau_id: { eq: "109449" },
			award_id: { eq: "sloan" },
			rail_id: { eq: "rail-1" }
		});
	});

	it("maps field controls (C8-C9)", () => {
		expect(fieldControl(product.fields[1]!)).toBe("text");
		expect(fieldControl(product.fields[2]!)).toBe("textarea");
		expect(fieldControl(product.fields[3]!)).toBe("number-integer");
		expect(
			fieldControl({ name: "rating", type: "decimal", nullable: false, readOnly: false, generated: false })
		).toBe("number-decimal");
		expect(
			fieldControl({ name: "active", type: "boolean", nullable: false, readOnly: false, generated: false })
		).toBe("checkbox");
		expect(
			fieldControl({ name: "dueDate", type: "date", nullable: true, readOnly: false, generated: false })
		).toBe("date");
		expect(fieldControl(product.fields[4]!)).toBe("datetime-local");
		expect(
			fieldControl({
				name: "status",
				type: "enum",
				nullable: false,
				readOnly: false,
				generated: false,
				enumValues: ["a", "b"]
			})
		).toBe("select");
		expect(
			fieldControl({ name: "summary", type: "string", nullable: true, readOnly: false, generated: false })
		).toBe("textarea");
	});
});

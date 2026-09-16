import type {
	AdminData,
	AdminDeleteImpact,
	AdminRecord,
	AdminResource,
	AdminResources,
	ListRequest,
	ListResult
} from "./types.js";
import { AdminError } from "./types.js";
import {
	defaultSort,
	detailSelectFields,
	listSelectFields,
	primaryKeyName,
	recordIdentityFilter,
	withRecordId
} from "./conventions.js";
import { clampAdminListLimit } from "./list-limit.js";
import {
	cascadeSelectFields,
	computeDeleteImpact,
	performCascadeRemove,
	type CascadeStore
} from "./cascade-delete.js";

type Paginated = Promise<{ items: Record<string, unknown>[]; hasNextPage: boolean; endCursor?: string }>;

type QueryTail = {
	where?: (filter: Record<string, unknown>) => QueryTail;
	orderBy?: (order: Record<string, "asc" | "desc">) => QueryTail;
	first?: (n: number) => QueryTail;
	after?: (cursor: string) => QueryTail;
	execute?: () => Promise<Record<string, unknown>[]>;
	executePaginated?: () => Paginated;
};

type EntityClient = {
	select: (fields: string[]) => QueryTail;
	findById: (id: string) => Promise<Record<string, unknown> | null>;
	create: (values: Record<string, unknown>) => Promise<Record<string, unknown>>;
	update: (where: { id: string }, values: Record<string, unknown>) => Promise<Record<string, unknown>>;
	delete: (where: { id: string }) => Promise<Record<string, unknown> | void>;
};

export type RayfinDataClient = {
	data: Record<string, EntityClient>;
};

const MEMBERSHIP_RESOURCE = "AdminUser";

function wrapRayfinError(error: unknown): never {
	if (error instanceof AdminError) throw error;
	const message = error instanceof Error ? error.message : "Unexpected Rayfin error";
	const lower = message.toLowerCase();
	if (lower.includes("unauthorized")) {
		throw new AdminError("unauthorized", "Sign in required", { status: 401 });
	}
	if (lower.includes("forbidden") || lower.includes("permission")) {
		throw new AdminError("forbidden", "This operation is not permitted.", { status: 403 });
	}
	if (lower.includes("conflict") || lower.includes("foreign key") || lower.includes("constraint")) {
		throw new AdminError("conflict", message, { status: 409 });
	}
	if (lower.includes("validation")) {
		throw new AdminError("validation", message, { status: 400 });
	}
	if (lower.includes("not found") || lower.includes("notfound") || lower.includes("invalid cursor")) {
		throw new AdminError("not_found", message, { status: 404 });
	}
	throw new AdminError("unexpected", "Something went wrong talking to Rayfin.", { status: 500 });
}

export class RayfinAdminData implements AdminData {
	private readonly client: RayfinDataClient;
	private readonly resources: AdminResources;

	constructor(client: { data: unknown }, resources: AdminResources) {
		this.client = client as RayfinDataClient;
		this.resources = resources;
	}

	async list(resource: string, request: ListRequest = {}): Promise<ListResult> {
		this.assertMutableResource(resource, "read");
		try {
			const entity = this.clientFor(resource);
			const def = this.resources[resource]!;
			const sort = request.sort ?? defaultSort(def);
			const pk = primaryKeyName(def);
			const fields = listSelectFields(def, sort);
			const order: Record<string, "asc" | "desc"> = {
				[sort.field]: sort.direction,
				...(sort.field === pk ? {} : { [pk]: "asc" })
			};
			const builder = entity
				.select(fields)
				.orderBy!(order)
				.first!(clampAdminListLimit(request.limit));
			const page = request.cursor
				? await builder.after!(request.cursor).executePaginated!()
				: await builder.executePaginated!();
			return {
				items: page.items.map((item) => withRecordId(def, item)),
				hasNextPage: page.hasNextPage,
				endCursor: page.endCursor
			};
		} catch (error) {
			wrapRayfinError(error);
		}
	}

	async get(resource: string, id: string): Promise<AdminRecord | null> {
		this.assertMutableResource(resource, "read");
		try {
			const found = await this.fetchRecord(resource, id);
			return found ? withRecordId(this.resources[resource]!, found) : null;
		} catch (error) {
			wrapRayfinError(error);
		}
	}

	async create(resource: string, values: Record<string, unknown>): Promise<AdminRecord> {
		this.assertMutableResource(resource, "write");
		try {
			const created = await this.clientFor(resource).create(values);
			const id = withRecordId(this.resources[resource]!, created).id;
			const found = await this.fetchRecord(resource, id);
			return found ? withRecordId(this.resources[resource]!, found) : withRecordId(this.resources[resource]!, created);
		} catch (error) {
			wrapRayfinError(error);
		}
	}

	async update(resource: string, id: string, values: Record<string, unknown>): Promise<AdminRecord> {
		this.assertMutableResource(resource, "write");
		try {
			const def = this.resources[resource]!;
			const raw = await this.loadRaw(resource, id);
			if (!raw) throw new AdminError("not_found", `Record ${id} not found`);
			const updated = await this.clientFor(resource).update(this.mutationWhere(def, raw, id), values);
			const found = await this.fetchRecord(resource, id);
			return found ? withRecordId(def, found) : withRecordId(def, updated);
		} catch (error) {
			wrapRayfinError(error);
		}
	}

	async inspectRemove(resource: string, id: string): Promise<AdminDeleteImpact> {
		this.assertMutableResource(resource, "write");
		try {
			return await computeDeleteImpact(this.resources, this.cascadeStore(), resource, id);
		} catch (error) {
			wrapRayfinError(error);
		}
	}

	async remove(resource: string, id: string): Promise<void> {
		this.assertMutableResource(resource, "write");
		try {
			await performCascadeRemove(this.resources, this.cascadeStore(), resource, id);
		} catch (error) {
			wrapRayfinError(error);
		}
	}

	private cascadeStore(): CascadeStore {
		return {
			get: async (resource, id) => {
				const found = await this.fetchRecord(resource, id);
				return found ? withRecordId(this.resources[resource]!, found) : null;
			},
			listAll: async (resource) => {
				const items: AdminRecord[] = [];
				let cursor: string | undefined;
				for (;;) {
					const page = await this.list(resource, { limit: 200, cursor });
					items.push(...page.items);
					if (page.items.length === 0) break;
					if (!page.hasNextPage) break;
					if (!page.endCursor || page.endCursor === cursor) {
						throw new AdminError(
							"unexpected",
							`Rayfin list for ${resource} reported another page without a usable cursor.`
						);
					}
					cursor = page.endCursor;
				}
				return items;
			},
			listRelated: (resource, foreignKey, parentId) =>
				this.listRelatedRows(resource, foreignKey, parentId),
			deleteOne: async (resource, id) => {
				const def = this.resources[resource]!;
				const raw = await this.loadRaw(resource, id);
				if (!raw) throw new AdminError("not_found", `Record ${id} not found`);
				await this.clientFor(resource).delete(this.mutationWhere(def, raw, id));
			}
		};
	}

	private async listRelatedRows(
		resource: string,
		foreignKey: string,
		parentId: string
	): Promise<AdminRecord[]> {
		const def = this.resources[resource];
		if (!def) throw new AdminError("not_found", `Unknown resource ${resource}`);
		const fields = [...new Set([...cascadeSelectFields(this.resources, resource), foreignKey])];
		const items: AdminRecord[] = [];
		let cursor: string | undefined;
		for (;;) {
			const builder = this.clientFor(resource)
				.select(fields)
				.where!({ [foreignKey]: { eq: parentId } })
				.first!(200);
			const page = cursor
				? await builder.after!(cursor).executePaginated!()
				: await builder.executePaginated!();
			items.push(...page.items.map((item) => withRecordId(def, item)));
			if (page.items.length === 0) break;
			if (!page.hasNextPage) break;
			if (!page.endCursor || page.endCursor === cursor) {
				throw new AdminError(
					"unexpected",
					`Rayfin related list for ${resource} reported another page without a usable cursor.`
				);
			}
			cursor = page.endCursor;
		}
		return items;
	}

	private async fetchRecord(resource: string, id: string): Promise<AdminRecord | null> {
		const raw = await this.loadRaw(resource, id);
		return raw ? withRecordId(this.resources[resource]!, raw) : null;
	}

	private async loadRaw(resource: string, id: string): Promise<Record<string, unknown> | null> {
		const def = this.resources[resource]!;
		const fields = this.fetchSelectFields(def);
		const rows = await this.clientFor(resource)
			.select(fields)
			.where!(recordIdentityFilter(def, id))
			.first!(1)
			.execute!();
		return rows[0] ?? null;
	}

	private fetchSelectFields(def: AdminResource): string[] {
		const fields = detailSelectFields(def);
		return fields.includes("id") ? fields : ["id", ...fields];
	}

	private mutationWhere(
		def: AdminResource,
		raw: Record<string, unknown>,
		urlId: string
	): { id: string } {
		const pk = primaryKeyName(def);
		if (pk === "id") return { id: urlId };
		if (typeof raw.id === "string" && raw.id) return { id: raw.id };
		return { id: urlId };
	}

	private assertMutableResource(resource: string, _mode: "read" | "write"): void {
		if (resource === MEMBERSHIP_RESOURCE) {
			throw new AdminError(
				"forbidden",
				"AdminUser membership must go through the membership service.",
				{ status: 403 }
			);
		}
	}

	private clientFor(resource: string): EntityClient {
		if (!this.resources[resource]) throw new AdminError("not_found", `Unknown resource ${resource}`);
		const entity = this.client.data[resource];
		if (!entity) throw new AdminError("unexpected", `Rayfin client missing entity ${resource}`);
		return entity;
	}
}

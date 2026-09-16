import {
	AppDataError,
	type QueryBuilder,
	type TableClient,
	type WhereFilter
} from "./query.js";

export type TableRpcFn = (op: string, payload?: unknown) => Promise<unknown>;

export function createFetchTableRpc(endpoint = "/api/data/rpc"): TableRpcFn {
	return async (op, payload = {}) => {
		const response = await fetch(endpoint, {
			method: "POST",
			credentials: "include",
			keepalive: true,
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ op, payload })
		});
		const body = (await response.json()) as
			| { ok: true; data: unknown }
			| { ok: false; kind: AppDataError["kind"]; message: string; status: number };
		if (!body.ok) {
			throw new AppDataError(body.kind, body.message, body.status);
		}
		return body.data;
	};
}

class RemoteQueryBuilder<T> implements QueryBuilder<T> {
	private filters: WhereFilter<T>[] = [];
	private order: Partial<Record<keyof T, "asc" | "desc">> = {};
	private limitCount?: number;

	constructor(
		private readonly rpc: TableRpcFn,
		private readonly table: string,
		private readonly fields?: (keyof T & string)[]
	) {}

	where(filter: WhereFilter<T>): QueryBuilder<T> {
		this.filters.push(filter);
		return this;
	}

	orderBy(order: Partial<Record<keyof T, "asc" | "desc">>): QueryBuilder<T> {
		this.order = { ...this.order, ...order };
		return this;
	}

	first(n: number): QueryBuilder<T> {
		this.limitCount = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
		return this;
	}

	execute(): Promise<T[]> {
		return this.rpc("table.select", {
			table: this.table,
			fields: this.fields,
			filters: this.filters,
			order: this.order,
			limit: this.limitCount
		}) as Promise<T[]>;
	}
}

export function createRemoteTableClient<T>(table: string, rpc: TableRpcFn): TableClient<T> {
	return {
		findById: (id) => rpc("table.findById", { table, id }) as Promise<T | null>,
		create: (values) => rpc("table.create", { table, values }) as Promise<T>,
		update: (where, values) => rpc("table.update", { table, where, values }) as Promise<T>,
		remove: (where) => rpc("table.remove", { table, where }) as Promise<void>,
		select: (fields) => new RemoteQueryBuilder<T>(rpc, table, fields),
		upsert: (values) => rpc("table.upsert", { table, values }) as Promise<T>
	};
}

export function handleTableRpc<T extends Record<string, TableClient<Record<string, unknown>>>>(
	tables: T,
	body: { op: string; payload?: Record<string, unknown> }
): Promise<unknown> {
	const payload = body.payload ?? {};
	const tableName = String(payload.table ?? "");
	const target = tables[tableName];
	if (!target) {
		throw new AppDataError("validation", `Unknown table ${tableName}`, 400);
	}
	if (body.op === "table.findById") {
		return target.findById(payload.id as Record<string, string>);
	}
	if (body.op === "table.create") {
		return target.create(payload.values as never);
	}
	if (body.op === "table.update") {
		return target.update(payload.where as Record<string, string>, payload.values as never);
	}
	if (body.op === "table.remove") {
		return target.remove(payload.where as Record<string, string>);
	}
	if (body.op === "table.upsert") {
		return target.upsert(payload.values as never);
	}
	if (body.op === "table.select") {
		let query = target.select(payload.fields as never);
		for (const filter of (payload.filters as Record<string, unknown>[] | undefined) ?? []) {
			query = query.where(filter);
		}
		if (payload.order && Object.keys(payload.order as object).length) {
			query = query.orderBy(payload.order as never);
		}
		if (typeof payload.limit === "number") query = query.first(payload.limit);
		return query.execute();
	}
	throw new AppDataError("validation", `Unknown table op ${body.op}`, 400);
}

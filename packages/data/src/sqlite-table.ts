import type Database from "better-sqlite3";
import {
	AppDataError,
	type QueryBuilder,
	type TableClient,
	type WhereFilter
} from "./query.js";

type Sqlite = Database.Database;

export type SqliteTableCodec = {
	jsonFields?: string[];
	boolFields?: string[];
	encode?: (key: string, value: unknown) => unknown;
	decode?: (key: string, value: unknown) => unknown;
};

export type SqliteTableOptions = {
	primaryKeys: string[];
	codec?: SqliteTableCodec;
};

function wrapSqliteError(error: unknown): never {
	if (error instanceof AppDataError) throw error;
	const message = error instanceof Error ? error.message : String(error);
	const lower = message.toLowerCase();
	if (lower.includes("unique") || lower.includes("primary key")) {
		throw new AppDataError("conflict", message, 409);
	}
	if (lower.includes("foreign key") || lower.includes("constraint") || lower.includes("not null")) {
		throw new AppDataError("validation", message, 400);
	}
	throw new AppDataError("unexpected", message, 500);
}

function quoteIdent(name: string): string {
	if (!/^[a-z_]+$/.test(name)) throw new AppDataError("validation", `Invalid identifier ${name}`);
	return name;
}

function escapeLike(value: string): string {
	return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function encodeValue(codec: SqliteTableCodec | undefined, key: string, value: unknown): unknown {
	if (codec?.encode) return codec.encode(key, value);
	if (value instanceof Date) return value.toISOString();
	if (codec?.jsonFields?.includes(key)) return JSON.stringify(value ?? []);
	if (codec?.boolFields?.includes(key)) return value ? 1 : 0;
	return value;
}

function decodeValue(codec: SqliteTableCodec | undefined, key: string, value: unknown): unknown {
	if (codec?.decode) return codec.decode(key, value);
	if (codec?.jsonFields?.includes(key)) {
		if (typeof value === "string") {
			try {
				return JSON.parse(value);
			} catch {
				return [];
			}
		}
		return value ?? [];
	}
	if (codec?.boolFields?.includes(key)) return Boolean(value);
	return value;
}

function compileFilter(
	codec: SqliteTableCodec | undefined,
	filter: Record<string, unknown>,
	params: unknown[]
): string {
	const parts: string[] = [];
	for (const [key, raw] of Object.entries(filter)) {
		if (key === "and" || key === "or") {
			const nested = (raw as Record<string, unknown>[])
				.map((entry) => compileFilter(codec, entry, params))
				.filter(Boolean);
			if (nested.length) parts.push(`(${nested.join(key === "or" ? " OR " : " AND ")})`);
			continue;
		}
		const field = quoteIdent(key);
		if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
			if (raw == null) parts.push(`${field} IS NULL`);
			else {
				parts.push(`${field} = ?`);
				params.push(encodeValue(codec, key, raw));
			}
			continue;
		}
		const operators = raw as Record<string, unknown>;
		for (const [operator, value] of Object.entries(operators)) {
			if (operator === "in") {
				const values = value as unknown[];
				if (!values.length) {
					parts.push("0 = 1");
				} else {
					parts.push(`${field} IN (${values.map(() => "?").join(", ")})`);
					params.push(...values.map((item) => encodeValue(codec, key, item)));
				}
			} else if (operator === "contains" || operator === "startsWith") {
				parts.push(`lower(${field}) LIKE ? ESCAPE '\\'`);
				const escaped = escapeLike(String(value).toLowerCase());
				params.push(operator === "contains" ? `%${escaped}%` : `${escaped}%`);
			} else if (value == null && operator === "eq") {
				parts.push(`${field} IS NULL`);
			} else {
				const sqlOperator = (
					{ eq: "=", ne: "!=", gt: ">", gte: ">=", lt: "<", lte: "<=" } as Record<string, string>
				)[operator];
				if (!sqlOperator) throw new AppDataError("validation", `Unsupported filter operator ${operator}`);
				parts.push(`${field} ${sqlOperator} ?`);
				params.push(encodeValue(codec, key, value));
			}
		}
	}
	return parts.join(" AND ");
}

class SqliteQueryBuilder<T> implements QueryBuilder<T> {
	private filters: WhereFilter<T>[] = [];
	private order: Partial<Record<keyof T, "asc" | "desc">> = {};
	private limitCount?: number;

	constructor(
		private readonly sqlite: Sqlite,
		private readonly table: string,
		private readonly codec: SqliteTableCodec | undefined,
		private readonly fields?: readonly string[]
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

	async execute(): Promise<T[]> {
		const whereParts: string[] = [];
		const params: unknown[] = [];
		for (const filter of this.filters) {
			const compiled = compileFilter(this.codec, filter as Record<string, unknown>, params);
			if (compiled) whereParts.push(compiled);
		}
		const orderParts = Object.entries(this.order).map(
			([key, dir]) => `${quoteIdent(key)} ${dir === "desc" ? "DESC" : "ASC"}`
		);
		const projection = this.fields?.length ? this.fields.map(quoteIdent).join(", ") : "*";
		let sql = `SELECT ${projection} FROM ${quoteIdent(this.table)}`;
		if (whereParts.length) sql += ` WHERE ${whereParts.join(" AND ")}`;
		if (orderParts.length) sql += ` ORDER BY ${orderParts.join(", ")}`;
		if (this.limitCount != null) sql += ` LIMIT ${Number(this.limitCount)}`;
		try {
			const rows = this.sqlite.prepare(sql).all(...params) as Record<string, unknown>[];
			return rows.map((row) => decodeRow<T>(this.codec, row)!);
		} catch (error) {
			wrapSqliteError(error);
		}
	}
}

function decodeRow<T>(codec: SqliteTableCodec | undefined, row: Record<string, unknown> | undefined): T | null {
	if (!row) return null;
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(row)) {
		out[key] = decodeValue(codec, key, value);
	}
	return out as T;
}

function encodeRow(
	codec: SqliteTableCodec | undefined,
	values: Record<string, unknown>
): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(values)) {
		if (value === undefined) continue;
		out[key] = encodeValue(codec, key, value);
	}
	return out;
}

export function createSqliteTableClient<T extends Record<string, unknown>>(
	sqlite: Sqlite,
	table: string,
	options: SqliteTableOptions
): TableClient<T> {
	const codec = options.codec;
	const primaryKeys = options.primaryKeys;

	function pkFrom(values: T): Record<string, string | number> {
		const out: Record<string, string | number> = {};
		for (const key of primaryKeys) {
			out[key] = values[key] as string | number;
		}
		return out;
	}

	return {
		async findById(id) {
			const keys = Object.keys(id);
			const sql = `SELECT * FROM ${quoteIdent(table)} WHERE ${keys.map((key) => `${quoteIdent(key)} = ?`).join(" AND ")}`;
			try {
				const row = sqlite.prepare(sql).get(...keys.map((key) => id[key])) as Record<string, unknown> | undefined;
				return decodeRow<T>(codec, row);
			} catch (error) {
				wrapSqliteError(error);
			}
		},
		async create(values) {
			const encoded = encodeRow(codec, values);
			const keys = Object.keys(encoded);
			const sql = `INSERT INTO ${quoteIdent(table)} (${keys.map(quoteIdent).join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`;
			try {
				sqlite.prepare(sql).run(...keys.map((key) => encoded[key]));
				return (await this.findById(pkFrom(values))) as T;
			} catch (error) {
				wrapSqliteError(error);
			}
		},
		async update(where, values) {
			const encoded = encodeRow(codec, values as Record<string, unknown>);
			const keys = Object.keys(encoded);
			if (!keys.length) {
				const current = await this.findById(where);
				if (!current) throw new AppDataError("not_found", `${table} not found`, 404);
				return current;
			}
			const whereKeys = Object.keys(where);
			const sql = `UPDATE ${quoteIdent(table)} SET ${keys.map((key) => `${quoteIdent(key)} = ?`).join(", ")} WHERE ${whereKeys.map((key) => `${quoteIdent(key)} = ?`).join(" AND ")}`;
			try {
				const result = sqlite
					.prepare(sql)
					.run(...keys.map((key) => encoded[key]), ...whereKeys.map((key) => where[key]));
				if (result.changes === 0) throw new AppDataError("not_found", `${table} not found`, 404);
				const updated = await this.findById(where);
				if (!updated) throw new AppDataError("not_found", `${table} not found`, 404);
				return updated;
			} catch (error) {
				wrapSqliteError(error);
			}
		},
		async remove(where) {
			const keys = Object.keys(where);
			const sql = `DELETE FROM ${quoteIdent(table)} WHERE ${keys.map((key) => `${quoteIdent(key)} = ?`).join(" AND ")}`;
			try {
				sqlite.prepare(sql).run(...keys.map((key) => where[key]));
			} catch (error) {
				wrapSqliteError(error);
			}
		},
		select(fields) {
			return new SqliteQueryBuilder<T>(sqlite, table, codec, fields);
		},
		async upsert(values) {
			const existing = await this.findById(pkFrom(values));
			if (existing) return this.update(pkFrom(values), values);
			try {
				return await this.create(values);
			} catch (error) {
				if (error instanceof AppDataError && error.kind === "conflict") {
					return this.update(pkFrom(values), values);
				}
				throw error;
			}
		}
	};
}

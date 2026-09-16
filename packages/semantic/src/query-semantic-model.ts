import {
	type CachedQueryResult,
	type QueryCacheOptions,
	type QueryError,
	type QueryTable
} from "@microsoft/fabric-app-data";
import { table, type ColumnTable } from "arquero";
import { getFabricClient, type FabricDataConfig } from "./fabric-client.js";

export type SemanticQueryClient = {
	semanticModel: (alias: string) => {
		query: (dax: string, options?: QueryCacheOptions) => Promise<CachedQueryResult>;
		clearCache: () => void;
	};
	clearCache: () => void;
};

export type SemanticQueryOptions = {
	bypassCache?: boolean;
	client?: SemanticQueryClient;
	config?: FabricDataConfig;
};

export type ReadSemanticModelTableResult =
	| { status: "success"; table: ColumnTable; fromCache: boolean; cachedAt?: Date }
	| { status: "error"; error: QueryError; fromCache: boolean };

function unqualifyColumnName(qualified: string, tableName: string): string {
	const prefix = `${tableName}[`;
	if (qualified.startsWith(prefix) && qualified.endsWith("]")) {
		return qualified.slice(prefix.length, -1);
	}
	const match = qualified.match(/^[^[\]]+\[(.+)\]$/);
	return match ? match[1] : qualified;
}

function uniqueColumnNames(names: string[]): string[] {
	const used = new Map<string, number>();
	return names.map((name) => {
		const n = used.get(name) ?? 0;
		used.set(name, n + 1);
		if (n === 0) return name;
		return `${name}_${n + 1}`;
	});
}

function toArqueroTable({ columns, rows }: QueryTable, tableName: string): ColumnTable {
	const shortNames = uniqueColumnNames(columns.map(({ name }) => unqualifyColumnName(name, tableName)));
	const data: Record<string, unknown[]> = {};
	for (const name of shortNames) data[name] = [];
	for (const row of rows) {
		for (let i = 0; i < columns.length; i++) {
			data[shortNames[i]].push(row[i]);
		}
	}
	return table(data);
}

function formatDaxTableRef(name: string): string {
	return `'${name.replace(/'/g, "''")}'`;
}

function resolveClient(options?: SemanticQueryOptions): SemanticQueryClient {
	if (options?.client) return options.client;
	if (options?.config) return getFabricClient(options.config);
	return getFabricClient();
}

function cacheOptions(options?: SemanticQueryOptions): QueryCacheOptions | undefined {
	return options?.bypassCache ? { bypassCache: true } : undefined;
}

export function readSemanticModelTable(
	connection: string,
	tableName: string,
	options?: SemanticQueryOptions
): Promise<ReadSemanticModelTableResult> {
	return resolveClient(options)
		.semanticModel(connection)
		.query(`EVALUATE ${formatDaxTableRef(tableName)}`, cacheOptions(options))
		.then((result) => {
			if (result.status === "error") {
				return { status: "error" as const, error: result.error, fromCache: result.fromCache };
			}
			return {
				status: "success" as const,
				table: toArqueroTable(result.table, tableName),
				fromCache: result.fromCache,
				cachedAt: result.cachedAt
			};
		});
}

export function querySemanticModel(
	connection: string,
	dax: string,
	options?: SemanticQueryOptions
): Promise<CachedQueryResult> {
	return resolveClient(options).semanticModel(connection).query(dax, cacheOptions(options));
}

export function clearQueryCache(connection?: string, options?: SemanticQueryOptions): void {
	const client = resolveClient(options);
	if (connection) {
		client.semanticModel(connection).clearCache();
	} else {
		client.clearCache();
	}
}

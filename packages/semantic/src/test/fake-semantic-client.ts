import type { QueryError, QueryTable } from "@microsoft/fabric-app-data";

export type QueryCallOptions = { bypassCache?: boolean };

export type CachedQueryResult =
	| { status: "success"; table: QueryTable; fromCache: boolean; cachedAt?: Date }
	| { status: "error"; error: QueryError; fromCache: boolean };

export type SemanticClientCall =
	| { type: "semanticModel"; alias: string }
	| { type: "query"; alias: string; dax: string; options: QueryCallOptions | undefined }
	| { type: "clearModelCache"; alias: string }
	| { type: "clearAll" };

export type RecordingSemanticClient = {
	calls: SemanticClientCall[];
	semanticModel: (alias: string) => {
		query: (dax: string, options?: QueryCallOptions) => Promise<CachedQueryResult>;
		clearCache: () => void;
	};
	clearCache: () => void;
};

export function createRecordingClient(
	handler: (alias: string, dax: string, options?: QueryCallOptions) => CachedQueryResult | Promise<CachedQueryResult>
): RecordingSemanticClient {
	const calls: SemanticClientCall[] = [];
	return {
		calls,
		semanticModel(alias: string) {
			calls.push({ type: "semanticModel", alias });
			return {
				query: async (dax: string, options?: QueryCallOptions) => {
					calls.push({ type: "query", alias, dax, options });
					return handler(alias, dax, options);
				},
				clearCache: () => {
					calls.push({ type: "clearModelCache", alias });
				}
			};
		},
		clearCache() {
			calls.push({ type: "clearAll" });
		}
	};
}

export function successTable(
	columns: Array<{ name: string; dataType?: string }>,
	rows: unknown[][],
	extras?: { fromCache?: boolean; cachedAt?: Date }
): CachedQueryResult {
	return {
		status: "success",
		table: {
			columns: columns.map((column) => ({ name: column.name, dataType: column.dataType ?? "String" })),
			rows
		},
		fromCache: extras?.fromCache ?? false,
		cachedAt: extras?.cachedAt
	};
}

export function queryError(
	message: string,
	category: QueryError["category"] = "query"
): CachedQueryResult {
	return {
		status: "error",
		error: { category, message },
		fromCache: false
	};
}

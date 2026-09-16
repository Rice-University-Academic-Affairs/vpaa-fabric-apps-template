export class AppDataError extends Error {
	readonly kind: "validation" | "not_found" | "conflict" | "unexpected";
	readonly status: number;

	constructor(kind: AppDataError["kind"], message: string, status?: number) {
		super(message);
		this.name = "AppDataError";
		this.kind = kind;
		this.status =
			status ??
			({
				validation: 400,
				not_found: 404,
				conflict: 409,
				unexpected: 500
			}[kind] as number);
	}
}

export type FieldFilter<T> = {
	eq?: T;
	ne?: T;
	gt?: T;
	gte?: T;
	lt?: T;
	lte?: T;
	contains?: T extends string ? string : never;
	startsWith?: T extends string ? string : never;
	in?: T[];
};

export type WhereFilter<T> = {
	[K in keyof T]?: T[K] | FieldFilter<T[K]> | null;
} & {
	and?: WhereFilter<T>[];
	or?: WhereFilter<T>[];
};

export type QueryBuilder<T> = {
	where(filter: WhereFilter<T>): QueryBuilder<T>;
	orderBy(order: Partial<Record<keyof T, "asc" | "desc">>): QueryBuilder<T>;
	first(n: number): QueryBuilder<T>;
	execute(): Promise<T[]>;
};

export type TableClient<T> = {
	findById(id: Record<string, string | number>): Promise<T | null>;
	create(values: T): Promise<T>;
	update(where: Record<string, string | number>, values: Partial<T>): Promise<T>;
	remove(where: Record<string, string | number>): Promise<void>;
	select(fields?: (keyof T & string)[]): QueryBuilder<T>;
	upsert(values: T): Promise<T>;
};

export type CursorPage<T> = {
	items: T[];
	hasNextPage: boolean;
	endCursor?: string;
};

export function isAppDataTestMode(
	env: { PUBLIC_ADMIN_TEST_MODE?: string; PUBLIC_APP_DATA_TEST_MODE?: string } = {}
): boolean {
	return env.PUBLIC_APP_DATA_TEST_MODE === "true" || env.PUBLIC_ADMIN_TEST_MODE === "true";
}

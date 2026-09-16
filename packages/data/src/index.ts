export type { AdminIdentity } from "@vpaa/types";

export {
	AdminError,
	type AdminChildRelation,
	type AdminData,
	type AdminDeleteImpact,
	type AdminDeletePolicy,
	type AdminErrorKind,
	type AdminField,
	type AdminFieldType,
	type AdminMembershipRecord,
	type AdminMembershipService,
	type AdminRecord,
	type AdminResource,
	type AdminResources,
	type AppRoles,
	type DeleteChildBucket,
	type FieldControl,
	type ListRequest,
	type ListResult,
	type ListSort,
	type MembershipListResult
} from "./admin/types.js";

export {
	ADMIN_PAGE_SIZE,
	COMPOSITE_RECORD_ID_SEP,
	adminRecordPath,
	defaultSort,
	detailSelectFields,
	fieldControl,
	humanizeName,
	isSystemReadOnlyName,
	listColumns,
	listSelectFields,
	pluralizeLabel,
	primaryKeyName,
	primaryKeyNames,
	recordId,
	recordIdentity,
	recordIdentityFilter,
	resourceSlug,
	withRecordId,
	writableFields
} from "./admin/conventions.js";

export {
	cascadeSelectFields,
	computeDeleteImpact,
	formatDeleteConflictMessage,
	inboundChildEdges,
	isSharedChildRecord,
	performCascadeRemove,
	type CascadeStore,
	type InboundChildEdge
} from "./admin/cascade-delete.js";
export { MemoryAdminData, type MemoryAdminDataOptions, type SeedRecord } from "./admin/memory-admin-data.js";
export { RayfinAdminData, type RayfinDataClient } from "./admin/rayfin-admin-data.js";
export {
	extractResources,
	formatResourcesModule,
	GeneratorError,
	normalizeField,
	type GenerateOptions
} from "./admin/generator/extract.js";
export { parseFormValues, emptyFormValues, recordToFormValues, type FormValues, type ParsedValues } from "./admin/form-values.js";
export { mapAdminError, type UiErrorState } from "./admin/errors.js";
export { canConfirmAdminDelete, createDeleteInspectGate, type DeleteInspectGate } from "./admin/delete-inspect.js";
export { clampAdminListLimit } from "./admin/list-limit.js";
export { advanceListPage } from "./admin/list-paging.js";
export { isAdminTestMode } from "./admin/mode.js";

export {
	AppDataError,
	isAppDataTestMode,
	type CursorPage,
	type FieldFilter,
	type QueryBuilder,
	type TableClient,
	type WhereFilter
} from "./query.js";
export {
	createFetchTableRpc,
	createRemoteTableClient,
	handleTableRpc,
	type TableRpcFn
} from "./remote-table.js";
export { createSqliteTableClient, type SqliteTableOptions, type SqliteTableCodec } from "./sqlite-table.js";
export {
	getRayfinClient,
	resetRayfinClientForTests,
	RayfinClientConfigError,
	type RayfinClientEnv
} from "./rayfin-client.js";

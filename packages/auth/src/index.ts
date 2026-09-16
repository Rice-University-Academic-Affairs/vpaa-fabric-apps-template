export type { AdminIdentity } from "@vpaa/types";
export {
	AdminError,
	type AdminMembershipRecord,
	type AdminMembershipService,
	type AppRoles,
	type MembershipListResult
} from "@vpaa/data";

export {
	bootstrapAuth,
	identityFromSession,
	loadAppAuth,
	readFabricAuthOptions,
	sessionToAppAuth,
	FabricAuthConfigError,
	type AppAuthSession,
	type BootstrapAuthOptions,
	type IAuthService
} from "./rayfin/auth.js";
export { createFakeFabricInit, createOpaqueSession } from "./rayfin/fake-fabric.js";
export { getRayfinClient, resetRayfinClientForTests, type RayfinClientEnv } from "@vpaa/data";

export {
	normalizeEmail,
	isValidEmail,
	requireOwnerAdminEmail,
	readOwnerAdminEmailFromEnv,
	resolveOwnerAdminEmailOptional,
	resolveOwnerAdminEmail
} from "./owner-config.js";

export { MemoryAdminMembership, type MemoryMembershipOptions } from "./membership.js";
export { RayfinAdminMembership, type AdminUserDataClient, type AdminUserRow, type RayfinMembershipClient } from "./rayfin-admin-membership.js";
export { getSharedAppMembership, resetSharedAppMembershipForTests } from "./shared-membership.js";
export { resolveAdminAccess, type AdminAccessResult, type AdminAccessStatus } from "./access.js";
export { resolveAppAdminAccess, resolveSuperUserAccess } from "./app-admin-access.js";
export { buildPrimaryNavigation } from "./navigation.js";

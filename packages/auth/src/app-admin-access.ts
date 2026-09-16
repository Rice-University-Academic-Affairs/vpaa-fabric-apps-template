import type { AdminIdentity, AdminMembershipService } from "./types.js";
import { normalizeEmail } from "./owner-config.js";
import type { AdminAccessResult } from "./access.js";

export async function resolveSuperUserAccess(
	identity: AdminIdentity | null,
	membership: AdminMembershipService
): Promise<AdminAccessResult> {
	if (!identity?.email || !normalizeEmail(identity.email)) {
		return { status: "unauthenticated", identity: null };
	}
	const roles = await membership.resolveRoles(identity);
	if (roles.isSuperUser) {
		return { status: "allowed", identity: { email: normalizeEmail(identity.email) } };
	}
	return { status: "forbidden", identity: { email: normalizeEmail(identity.email) } };
}

export async function resolveAppAdminAccess(
	identity: AdminIdentity | null,
	membership: AdminMembershipService
): Promise<AdminAccessResult> {
	if (!identity?.email || !normalizeEmail(identity.email)) {
		return { status: "unauthenticated", identity: null };
	}
	const roles = await membership.resolveRoles(identity);
	if (roles.isAppAdmin) {
		return { status: "allowed", identity: { email: normalizeEmail(identity.email) } };
	}
	return { status: "forbidden", identity: { email: normalizeEmail(identity.email) } };
}

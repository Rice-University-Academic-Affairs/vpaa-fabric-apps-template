import { describe, expect, it } from "vitest";
import { resolveAppAdminAccess, resolveSuperUserAccess } from "@vpaa/auth";
import type { AdminIdentity, AdminMembershipService, AppRoles } from "@vpaa/data";

function membershipWithRoles(roles: AppRoles): AdminMembershipService {
	return {
		check: async () => ({
			allowed: roles.isAppAdmin,
			status: roles.isAppAdmin ? 200 : 403
		}),
		resolveRoles: async () => roles,
		list: async () => ({ items: [] }),
		add: async () => {
			throw new Error("unused");
		},
		remove: async () => {
			throw new Error("unused");
		}
	};
}

describe("resolveSuperUserAccess", () => {
	it("requires authentication", async () => {
		await expect(resolveSuperUserAccess(null, membershipWithRoles({ isAppAdmin: true, isSuperUser: true }))).resolves.toEqual({
			status: "unauthenticated",
			identity: null
		});
	});

	it("allows super users regardless of app admin", async () => {
		const identity: AdminIdentity = { email: "Super@Example.EDU" };
		await expect(
			resolveSuperUserAccess(identity, membershipWithRoles({ isAppAdmin: false, isSuperUser: true }))
		).resolves.toEqual({ status: "allowed", identity: { email: "super@example.edu" } });
	});

	it("forbids app admins who are not super users", async () => {
		const identity: AdminIdentity = { email: "admin@example.edu" };
		await expect(
			resolveSuperUserAccess(identity, membershipWithRoles({ isAppAdmin: true, isSuperUser: false }))
		).resolves.toEqual({ status: "forbidden", identity: { email: "admin@example.edu" } });
	});
});

describe("resolveAppAdminAccess", () => {
	it("allows every app admin", async () => {
		const identity: AdminIdentity = { email: "admin@example.edu" };
		await expect(
			resolveAppAdminAccess(identity, membershipWithRoles({ isAppAdmin: true, isSuperUser: false }))
		).resolves.toEqual({ status: "allowed", identity: { email: "admin@example.edu" } });
	});

	it("forbids super users without app admin membership", async () => {
		const identity: AdminIdentity = { email: "super@example.edu" };
		await expect(
			resolveAppAdminAccess(identity, membershipWithRoles({ isAppAdmin: false, isSuperUser: true }))
		).resolves.toEqual({ status: "forbidden", identity: { email: "super@example.edu" } });
	});
});

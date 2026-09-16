import type { AdminData, AdminIdentity, AdminMembershipService } from "@vpaa/data";

export type AdminTestHarness = {
	setIdentity: (identity: AdminIdentity | null) => void | Promise<void>;
	resetData: () => void;
	setForbidden: (resourceNames: string[]) => void;
	membership: AdminMembershipService;
	data: AdminData;
	identities: {
		TEST_OWNER: AdminIdentity;
		TEST_ADMIN: AdminIdentity;
		TEST_INVITEE: AdminIdentity;
		TEST_NON_ADMIN: AdminIdentity;
	};
};

declare global {
	interface Window {
		__ADMIN_TEST__?: AdminTestHarness;
	}
}

export {};

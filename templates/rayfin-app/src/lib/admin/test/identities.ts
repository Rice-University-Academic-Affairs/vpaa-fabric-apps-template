import { DEFAULT_OWNER_ADMIN_EMAIL } from "./owner-email.js";
import type { AdminIdentity } from "../types.js";

export { DEFAULT_OWNER_ADMIN_EMAIL };

export const TEST_OWNER: AdminIdentity = {
	email: DEFAULT_OWNER_ADMIN_EMAIL
};

export const TEST_ADMIN: AdminIdentity = {
	email: "admin@example.edu"
};

export const TEST_INVITEE: AdminIdentity = {
	email: "invitee@example.edu"
};

export const TEST_NON_ADMIN: AdminIdentity = {
	email: "guest@example.edu"
};

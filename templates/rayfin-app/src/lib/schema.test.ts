import { expect, test } from "vitest";
import { adminResources } from "./admin/generated/resources.js";

test("admin resources include AdminUser", () => {
	expect(adminResources.AdminUser.slug).toBe("admin-users");
});

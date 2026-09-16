import { expect, test } from "@playwright/test";
import { DEFAULT_OWNER_ADMIN_EMAIL } from "../src/lib/admin/test/owner-email.js";
import { gotoFixtures } from "./helpers/fixtures.js";

test.describe("Fixture smoke", () => {
	test("loads the app shell on home", async ({ page }) => {
		await gotoFixtures(page);
		await expect(page.locator(`[data-user-id="${DEFAULT_OWNER_ADMIN_EMAIL}"]`)).toBeVisible();
		await expect(page.locator("header").getByText(DEFAULT_OWNER_ADMIN_EMAIL)).toBeVisible();
		await expect(page.getByRole("link", { name: "Fixtures" })).toBeVisible();
		await expect(page.getByRole("link", { name: "Admin" })).toBeVisible();
	});
});

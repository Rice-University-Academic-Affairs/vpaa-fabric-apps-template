import { expect, test } from "@playwright/test";
import { DEFAULT_OWNER_ADMIN_EMAIL } from "../src/lib/admin/test/owner-email.js";

test.describe("App smoke", () => {
	test("loads home and admin", async ({ page }) => {
		await page.goto("/", { waitUntil: "networkidle" });
		await expect(page.locator("[data-app-ready][data-hydrated]")).toBeVisible();
		await expect(page.getByRole("heading", { name: "{{displayName}}" })).toBeVisible();
		await expect(page.locator(`[data-user-id="${DEFAULT_OWNER_ADMIN_EMAIL}"]`)).toBeVisible();
		await expect(page.getByRole("link", { name: "Admin" }).first()).toBeVisible();
		await page.goto("/admin");
		await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();
		await page.getByRole("link", { name: "Admin Users", exact: true }).click();
		await expect(page).toHaveURL(/\/admin\/admin-users$/);
		await expect(page.getByRole("heading", { name: "Admin Users" })).toBeVisible();
	});
});

import { expect, test } from "@playwright/test";
import { gotoFixtures, openHeaderSearch, useMobileViewport } from "./helpers/fixtures.js";

test.describe("Fixture app shell", () => {
	test("opens mobile navigation and shows the Fixtures link", async ({ page }) => {
		await useMobileViewport(page);
		await gotoFixtures(page);

		await page.getByRole("button", { name: "Open navigation menu" }).click();

		await expect(page.getByRole("link", { name: "Fixtures" })).toBeVisible();
	});

	test("finds and selects a faculty member from global search", async ({ page }) => {
		await gotoFixtures(page);
		const searchInput = await openHeaderSearch(page);

		await searchInput.fill("Elena");
		await page.locator("header").getByRole("button", { name: /Elena/ }).click();

		await expect(page.locator("[data-search-result]")).toHaveAttribute(
			"data-search-result",
			"Dr. Elena Martinez"
		);
		await expect(page.locator("header").getByPlaceholder("Search faculty…")).not.toBeVisible();
	});
});

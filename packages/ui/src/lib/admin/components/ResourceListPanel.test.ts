import { cleanup, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import { adminResources } from "../generated/resources.js";
import { DEFAULT_OWNER_ADMIN_EMAIL, TEST_ADMIN } from "../test/identities.js";
import ResourceListPanelHarness from "./ResourceListPanelHarness.svelte";

afterEach(() => {
	cleanup();
});

describe("ResourceListPanel", () => {
	it("lists seeded Product rows when admin context is the @vpaa/ui instance", async () => {
		render(ResourceListPanelHarness, {
			props: {
				resource: adminResources.Product,
				slug: "products"
			}
		});
		expect(await screen.findByText("Product 001")).toBeInTheDocument();
		expect(screen.getByText("Product 002")).toBeInTheDocument();
		expect(screen.getByText("Product 003")).toBeInTheDocument();
	});

	it("lists membership rows for AdminUser", async () => {
		render(ResourceListPanelHarness, {
			props: {
				resource: adminResources.AdminUser,
				slug: "admin-users"
			}
		});
		expect(await screen.findByText(TEST_ADMIN.email)).toBeInTheDocument();
		expect(screen.getAllByText(DEFAULT_OWNER_ADMIN_EMAIL).length).toBeGreaterThan(0);
		expect(screen.getByText("Owner")).toBeInTheDocument();
	});
});

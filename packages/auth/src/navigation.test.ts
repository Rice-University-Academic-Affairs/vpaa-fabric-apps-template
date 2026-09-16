import { describe, expect, it } from "vitest";
import { buildPrimaryNavigation } from "./navigation.js";

describe("buildPrimaryNavigation", () => {
	it("wraps caller-supplied items without hard-coding routes", () => {
		const nav = buildPrimaryNavigation({
			items: [
				{ label: "Home", href: "/" },
				{ label: "Admin", href: "/admin" }
			]
		});
		expect(nav).toEqual([
			{
				items: [
					{ label: "Home", href: "/" },
					{ label: "Admin", href: "/admin" }
				]
			}
		]);
	});
});

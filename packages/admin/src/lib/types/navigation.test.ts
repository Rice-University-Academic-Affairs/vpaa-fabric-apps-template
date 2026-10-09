import { describe, expect, it } from "vitest";
import { isNavItemActive } from "./navigation.js";

describe("isNavItemActive", () => {
	it("treats exact and root hrefs as whole-path matches", () => {
		expect(isNavItemActive("/", "/", true)).toBe(true);
		expect(isNavItemActive("/", "/admin", true)).toBe(false);
		expect(isNavItemActive("/", "/admin")).toBe(false);
		expect(isNavItemActive("/admin", "/admin", true)).toBe(true);
		expect(isNavItemActive("/admin", "/admin/schools", true)).toBe(false);
	});

	it("treats nested ORM admin paths as the Admin item without matching FAME administration", () => {
		expect(isNavItemActive("/admin", "/admin")).toBe(true);
		expect(isNavItemActive("/admin", "/admin/schools")).toBe(true);
		expect(isNavItemActive("/admin", "/admin-users")).toBe(false);
		expect(isNavItemActive("/admin", "/fame-administration")).toBe(false);
		expect(isNavItemActive("/fame-administration", "/fame-administration")).toBe(true);
		expect(isNavItemActive("/fame-administration", "/fame-administration/awards/sloan/faculty")).toBe(
			true
		);
	});
});

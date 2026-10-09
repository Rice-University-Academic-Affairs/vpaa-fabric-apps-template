import { describe, expect, it } from "vitest";
import { getAdminContext as fromBarrel, setAdminContext as setFromBarrel } from "$lib";
import { getAdminContext, setAdminContext } from "./context.js";

describe("admin context module identity", () => {
	it("exports the same getAdminContext and setAdminContext as the package barrel", () => {
		expect(fromBarrel).toBe(getAdminContext);
		expect(setFromBarrel).toBe(setAdminContext);
	});
});

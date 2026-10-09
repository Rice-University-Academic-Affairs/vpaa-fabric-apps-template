import { describe, expect, it } from "vitest";
import { faculty as fixtureFaculty } from "../routes/fixtures/data.js";

describe("fixture search data", () => {
	it("includes Elena Martinez for header search", () => {
		expect(fixtureFaculty).toHaveLength(12);
		expect(fixtureFaculty.some((row) => row.name === "Dr. Elena Martinez")).toBe(true);
	});
});

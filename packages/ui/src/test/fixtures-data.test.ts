import { describe, expect, it } from "vitest";
import { faculty as fixtureFaculty } from "../routes/fixtures/data.js";
import { facultyData } from "./table-fixtures.js";

describe("fixture table data", () => {
	it("keeps unit test faculty data aligned with the fixture page", () => {
		const fixtureNames = fixtureFaculty.map((row) => row.name).sort();
		const unitNames = facultyData.map((row) => row.name).sort();

		expect(unitNames).toEqual(fixtureNames);
		expect(fixtureFaculty).toHaveLength(12);
	});
});

import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
	entityNameFromSource,
	formatDomainEntities,
	syncDomainEntities
} from "./sync-domain-schema.mjs";

test("entityNameFromSource reads the exported class", () => {
	assert.equal(entityNameFromSource("Note.ts", "export class Note {\n}"), "Note");
	assert.equal(entityNameFromSource("Note.ts", "const x = 1;\n"), "Note");
});

test("formatDomainEntities writes an empty stub", () => {
	assert.equal(
		formatDomainEntities([]),
		`export const domainEntities = [] as const;

export type DomainSchema = Record<string, never>;
`
	);
});

test("syncDomainEntities picks up domain table files", async () => {
	const tmp = await mkdtemp(path.join(os.tmpdir(), "vpaa-domain-schema-"));
	try {
		const domainDir = path.join(tmp, "rayfin", "data", "domain");
		await mkdir(domainDir, { recursive: true });
		await writeFile(
			path.join(domainDir, "Note.ts"),
			`export class Note {\n\tid!: string;\n}\n`,
			"utf8"
		);
		const { entities } = await syncDomainEntities(tmp);
		assert.deepEqual(entities, [{ className: "Note", fileBase: "Note" }]);
		const generated = await readFile(path.join(domainDir, "entities.generated.ts"), "utf8");
		assert.match(generated, /import \{ Note \} from "\.\/Note\.js"/);
		assert.match(generated, /domainEntities = \[Note\]/);
		assert.match(generated, /Note: Note;/);
	} finally {
		await rm(tmp, { recursive: true, force: true });
	}
});

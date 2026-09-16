import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "os";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
	parseFabricPortalUrl,
	writeFabricYaml
} from "./register-semantic-model.mjs";

const modelingUrl =
	"https://app.fabric.microsoft.com/groups/57f51a03-ccf4-4f17-aa88-174bd878a1bb/modeling/aea86285-a1a3-4b9d-8017-b31ff2379375";
const semanticModelsUrl =
	"https://app.fabric.microsoft.com/groups/57f51a03-ccf4-4f17-aa88-174bd878a1bb/semanticmodels/aea86285-a1a3-4b9d-8017-b31ff2379375";

test("parseFabricPortalUrl reads modeling and semanticmodels URLs", () => {
	const expected = {
		workspaceId: "57f51a03-ccf4-4f17-aa88-174bd878a1bb",
		itemId: "aea86285-a1a3-4b9d-8017-b31ff2379375",
		itemType: "semanticModel"
	};
	assert.deepEqual(parseFabricPortalUrl(modelingUrl), expected);
	assert.deepEqual(parseFabricPortalUrl(semanticModelsUrl), expected);
});

test("parseFabricPortalUrl reads OneLake dataset URLs", () => {
	assert.deepEqual(
		parseFabricPortalUrl(
			"https://msit.powerbi.com/onelake/details/00c98f7c-1111-2222-3333-444444444444/dataset/03f2dc11-aaaa-bbbb-cccc-ddddeeeeffff/foo"
		),
		{
			workspaceId: "00c98f7c-1111-2222-3333-444444444444",
			itemId: "03f2dc11-aaaa-bbbb-cccc-ddddeeeeffff",
			itemType: "semanticModel"
		}
	);
});

test("parseFabricPortalUrl rejects non-semantic-model and invalid URLs", () => {
	assert.throws(
		() =>
			parseFabricPortalUrl(
				"https://app.fabric.microsoft.com/groups/57f51a03-ccf4-4f17-aa88-174bd878a1bb/lakehouses/aea86285-a1a3-4b9d-8017-b31ff2379375"
			),
		/semantic model/
	);
	assert.throws(() => parseFabricPortalUrl("not-a-url"), /Invalid URL/);
	assert.throws(
		() => parseFabricPortalUrl("https://app.fabric.microsoft.com/home"),
		/Could not extract/
	);
});

test("writeFabricYaml writes workspace and item IDs", async () => {
	const tmp = await mkdtemp(path.join(os.tmpdir(), "vpaa-fabric-yaml-"));
	try {
		const parsed = parseFabricPortalUrl(modelingUrl);
		const yamlPath = await writeFabricYaml(tmp, parsed);
		const yaml = await readFile(yamlPath, "utf8");
		assert.match(yaml, /activeProfile:\s*dev/);
		assert.match(yaml, /workspaceId:\s*["']?57f51a03-ccf4-4f17-aa88-174bd878a1bb["']?/);
		assert.match(yaml, /itemId:\s*["']?aea86285-a1a3-4b9d-8017-b31ff2379375["']?/);
		assert.match(yaml, /default:/);
		const generated = await readFile(path.join(tmp, "src", "fabric.generated.ts"), "utf8");
		assert.match(generated, /workspaceId: '57f51a03-ccf4-4f17-aa88-174bd878a1bb'/);
		assert.match(generated, /itemId: 'aea86285-a1a3-4b9d-8017-b31ff2379375'/);
	} finally {
		await rm(tmp, { recursive: true, force: true });
	}
});

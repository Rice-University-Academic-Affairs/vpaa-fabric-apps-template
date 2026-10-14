import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "os";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
	applySemanticDeps,
	parseArgs,
	parseFabricPortalUrl,
	writeFabricYaml
} from "./add-semantic-model.mjs";
import { copyTemplate, substitutions } from "./create-app.mjs";
import { enableSqlDatabase } from "./add-sql-database.mjs";

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

test("parseArgs reads slug and URL", () => {
	assert.deepEqual(parseArgs(["faculty-activity", modelingUrl]), {
		slug: "faculty-activity",
		fromUrl: modelingUrl,
		alias: "default"
	});
	assert.deepEqual(parseArgs(["faculty-activity", modelingUrl, "--alias", "sales"]), {
		slug: "faculty-activity",
		fromUrl: modelingUrl,
		alias: "sales"
	});
	assert.throws(() => parseArgs(["faculty-activity"]), /Usage/);
	assert.throws(() => parseArgs(["faculty-activity", "--from-url", modelingUrl]), /Usage/);
	assert.throws(() => parseArgs([modelingUrl]), /Usage/);
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

test("applySemanticDeps wires generate without touching SQL data", async () => {
	const tmp = await mkdtemp(path.join(os.tmpdir(), "vpaa-add-semantic-"));
	try {
		const dest = path.join(tmp, "app");
		await copyTemplate(dest, substitutions("faculty-activity"));
		const before = await readFile(path.join(dest, "rayfin", "rayfin.yml"), "utf8");
		assert.match(before, /data:\s*\r?\n\s+enabled:\s*false/);
		await applySemanticDeps(dest);
		await writeFabricYaml(dest, parseFabricPortalUrl(modelingUrl));
		const yml = await readFile(path.join(dest, "rayfin", "rayfin.yml"), "utf8");
		assert.match(yml, /data:\s*\r?\n\s+enabled:\s*false/);
		assert.doesNotMatch(yml, /dialect:\s*mssql/);
		const pkg = JSON.parse(await readFile(path.join(dest, "package.json"), "utf8"));
		assert.equal(pkg.dependencies["@vpaa/semantic"], "workspace:*");
		assert.equal(pkg.dependencies["@microsoft/fabric-app-data"], "catalog:");
		assert.equal(pkg.dependencies["@microsoft/fabric-app-data-embed-client"], "catalog:");
		assert.equal(pkg.dependencies["@microsoft/fabric-app-data-proxy"], "catalog:");
		assert.equal(pkg.dependencies.arquero, "catalog:");
		assert.equal(pkg.devDependencies["@microsoft/fabric-app-data-cli"], "catalog:");
		assert.equal(pkg.devDependencies["@microsoft/fabric-app-data-cli-proxy"], "catalog:");
		assert.equal(
			pkg.scripts["fabric:generate"],
			"node scripts/fabric-app-data.mjs generate -o src/fabric.generated.ts"
		);
		assert.match(pkg.scripts.predev, /admin:generate/);
		assert.match(pkg.scripts.predev, /fabric:generate/);
		assert.match(pkg.scripts["build:fabric"], /fabric:generate/);
		assert.match(pkg.scripts["build:fabric"], /admin:generate/);
		const helper = await readFile(path.join(dest, "src", "lib", "semantic.ts"), "utf8");
		assert.match(helper, /from "@vpaa\/semantic"/);
		assert.match(helper, /fabric\.generated\.js/);
		assert.match(helper, /readSemanticModelTable/);
		const yaml = await readFile(path.join(dest, "fabric.yaml"), "utf8");
		assert.match(yaml, /workspaceId:\s*["']?57f51a03-ccf4-4f17-aa88-174bd878a1bb["']?/);
		assert.match(yaml, /itemId:\s*["']?aea86285-a1a3-4b9d-8017-b31ff2379375["']?/);
	} finally {
		await rm(tmp, { recursive: true, force: true });
	}
});

test("applySemanticDeps keeps an existing semantic helper", async () => {
	const tmp = await mkdtemp(path.join(os.tmpdir(), "vpaa-add-semantic-keep-"));
	try {
		const dest = path.join(tmp, "app");
		await copyTemplate(dest, substitutions("faculty-activity"));
		const helperPath = path.join(dest, "src", "lib", "semantic.ts");
		await writeFile(helperPath, "export const keep = true;\n", "utf8");
		await applySemanticDeps(dest);
		assert.equal(await readFile(helperPath, "utf8"), "export const keep = true;\n");
	} finally {
		await rm(tmp, { recursive: true, force: true });
	}
});

test("applySemanticDeps leaves an existing SQL database on", async () => {
	const tmp = await mkdtemp(path.join(os.tmpdir(), "vpaa-add-semantic-sql-"));
	try {
		const dest = path.join(tmp, "app");
		await copyTemplate(dest, substitutions("faculty-activity"));
		await enableSqlDatabase(dest);
		await applySemanticDeps(dest);
		const yml = await readFile(path.join(dest, "rayfin", "rayfin.yml"), "utf8");
		assert.match(yml, /data:\s*\r?\n\s+enabled:\s*true/);
		assert.match(yml, /dialect:\s*mssql/);
	} finally {
		await rm(tmp, { recursive: true, force: true });
	}
});

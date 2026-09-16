import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const cli = realpathSync(
	join(dirname(fileURLToPath(import.meta.url)), "../node_modules/@microsoft/fabric-app-data-cli/dist/index.js")
);
process.argv[1] = cli;
await import(pathToFileURL(cli).href);

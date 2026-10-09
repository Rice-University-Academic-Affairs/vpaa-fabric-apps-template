import { RayfinContext, UserDataFunctions } from "@microsoft/fabric-user-data-functions";
import type { AppSchema } from "../../data/schema.js";

const udf = new UserDataFunctions();

udf.func("ping", async (_ctx: RayfinContext<AppSchema>) => ({ ok: true as const }), []);

export default udf;

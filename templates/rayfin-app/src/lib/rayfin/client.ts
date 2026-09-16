import type { RayfinClient } from "@microsoft/rayfin-client";
import {
	getRayfinClient as createClient,
	resetRayfinClientForTests,
	RayfinClientConfigError,
	type RayfinClientEnv
} from "@vpaa/data";
import { FabricAuthConfigError } from "@vpaa/auth";
import type { AppSchema } from "../../../rayfin/data/schema.js";

export { resetRayfinClientForTests, type RayfinClientEnv };

export function getRayfinClient(env?: RayfinClientEnv): RayfinClient<AppSchema> {
	try {
		return createClient(env) as unknown as RayfinClient<AppSchema>;
	} catch (error) {
		if (error instanceof RayfinClientConfigError) {
			throw new FabricAuthConfigError(error.message);
		}
		throw error;
	}
}

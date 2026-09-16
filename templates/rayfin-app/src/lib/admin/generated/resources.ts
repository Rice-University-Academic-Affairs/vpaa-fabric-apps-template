import type { AdminResources } from "../types.js";

export const adminResources = {} as const satisfies AdminResources;

export function getResourceBySlug(_slug: string) {
	return undefined;
}

export function listResourceEntries() {
	return Object.values(adminResources);
}

export function resourceDisplayName(name: string): string {
	return name;
}

export function resourcePluralLabel(name: string): string {
	return name;
}

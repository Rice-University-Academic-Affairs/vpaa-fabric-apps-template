import LayoutDashboard from "@lucide/svelte/icons/layout-dashboard";
import { buildPrimaryNavigation as buildNav } from "@vpaa/auth";
import type { AppNavGroup } from "../types/navigation.js";

export function buildPrimaryNavigation(options: { isAdmin: boolean }): AppNavGroup[] {
	const items: AppNavGroup["items"] = [
		{ label: "Fixtures", href: "/", icon: LayoutDashboard, exact: true }
	];
	if (options.isAdmin) {
		items.push({ label: "Admin", href: "/admin" });
	}
	return buildNav({ items });
}

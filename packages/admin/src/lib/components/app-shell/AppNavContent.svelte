<script lang="ts">
	import * as Sidebar from "../ui/sidebar/index.js";
	import type { AppNavGroup } from "../../types/navigation.js";
	import { isNavItemActive } from "../../types/navigation.js";

	type Props = {
		navigation: AppNavGroup[];
		currentPath?: string;
		onNavigate?: () => void;
	};

	let { navigation, currentPath = "", onNavigate }: Props = $props();
	const sidebar = Sidebar.useSidebar();

	function handleNavigate() {
		sidebar.setOpenMobile(false);
		onNavigate?.();
	}
</script>

{#each navigation as group (group.label ?? group.items[0]?.href)}
	<Sidebar.Group>
		{#if group.label}
			<Sidebar.GroupLabel>{group.label}</Sidebar.GroupLabel>
		{/if}
		<Sidebar.GroupContent>
			<Sidebar.Menu>
				{#each group.items as item (item.href)}
					<Sidebar.MenuItem>
						{#if item.disabled}
							<Sidebar.MenuButton disabled>
								{#if item.icon}
									{@const Icon = item.icon}
									<Icon />
								{/if}
								<span>{item.label}</span>
								{#if item.badge}
									<Sidebar.MenuBadge>{item.badge}</Sidebar.MenuBadge>
								{/if}
							</Sidebar.MenuButton>
						{:else}
							<Sidebar.MenuButton
								isActive={isNavItemActive(item.href, currentPath, item.exact)}
							>
								{#snippet child({ props })}
									<a href={item.href} {...props} onclick={handleNavigate}>
										{#if item.icon}
											{@const Icon = item.icon}
											<Icon />
										{/if}
										<span>{item.label}</span>
										{#if item.badge}
											<Sidebar.MenuBadge>{item.badge}</Sidebar.MenuBadge>
										{/if}
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						{/if}
					</Sidebar.MenuItem>
				{/each}
			</Sidebar.Menu>
		</Sidebar.GroupContent>
	</Sidebar.Group>
{/each}

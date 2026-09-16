<script lang="ts">
	import { MemoryAdminData, type AdminResource } from "@vpaa/data";
	import { setAdminContext } from "../context.js";
	import { adminResources } from "../generated/resources.js";
	import { MemoryAdminMembership } from "@vpaa/auth";
	import {
		createProductSeed,
		DEFAULT_OWNER_ADMIN_EMAIL,
		TEST_ADMIN,
		TEST_OWNER
	} from "../test/identities.js";
	import ResourceListPanel from "./ResourceListPanel.svelte";

	type Props = {
		resource: AdminResource;
		slug: string;
	};

	let { resource, slug }: Props = $props();

	const data = new MemoryAdminData({
		resources: adminResources,
		seed: { Product: createProductSeed(3) }
	});
	const membership = new MemoryAdminMembership({
		ownerEmail: DEFAULT_OWNER_ADMIN_EMAIL,
		seed: [
			{
				id: "admin-1",
				email: TEST_ADMIN.email,
				createdAt: "2026-01-15T00:00:00.000Z",
				createdBy: DEFAULT_OWNER_ADMIN_EMAIL,
				isSuperUser: false
			}
		]
	});

	setAdminContext({
		resources: adminResources,
		data,
		membership,
		identity: TEST_OWNER,
		mode: "memory"
	});
</script>

<ResourceListPanel {resource} {slug} />

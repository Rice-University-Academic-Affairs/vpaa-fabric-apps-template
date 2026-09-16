<script lang="ts">
	import { DataTable, DrilldownTable, PageContainer, PageHeader, type Column } from "$lib/index.js";
	import { departments, faculty, schools } from "./fixtures/data.js";

	const facultyColumns: Column[] = [
		{ field: "name", style: "title", searchable: true, sortable: true },
		{ field: "department", searchable: true, filterable: true },
		{
			field: "status",
			style: "tag",
			filterable: true,
			labels: { tenured: "Tenured", "tenure-track": "T-track", pending: "Pending" }
		},
		{ field: "fte", style: "metric", sortable: true }
	];

	const schoolColumns: Column[] = [
		{ field: "school", style: "title" },
		{ field: "dean" },
		{ field: "deptCount", style: "metric" },
		{ field: "facultyCount", style: "metric" }
	];

	const departmentColumns: Column[] = [
		{ field: "department", style: "title" },
		{ field: "chair" },
		{ field: "facultyCount", style: "metric" }
	];
</script>

<PageContainer data-app-ready>
	<PageHeader title="Component fixtures" description="UI test host" />

	<section class="mb-10">
		<DataTable
			title="All faculty"
			data={faculty}
			columns={facultyColumns}
			searchPlaceholder="Search faculty…"
		/>
	</section>

	<section class="mb-10">
		<DrilldownTable
			title="Faculty drilldown"
			{schools}
			{departments}
			{faculty}
			columns={{
				school: schoolColumns,
				department: departmentColumns,
				faculty: facultyColumns
			}}
			searchPlaceholder="Search faculty…"
		/>
	</section>
</PageContainer>

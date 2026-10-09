/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
	forbidden: [
		{
			name: "no-packages-to-apps",
			comment: "Shared packages must not import deployable apps.",
			severity: "error",
			from: { path: "^packages/" },
			to: { path: "^apps/" }
		},
		{
			name: "types-is-leaf",
			comment: "@vpaa/types must not import other workspace packages.",
			severity: "error",
			from: { path: "^packages/types/" },
			to: { path: "^packages/(data|auth|admin|config|semantic)/" }
		},
		{
			name: "config-is-leaf",
			comment: "@vpaa/config must not import other workspace packages.",
			severity: "error",
			from: { path: "^packages/config/" },
			to: { path: "^packages/(types|data|auth|admin|semantic)/" }
		},
		{
			name: "data-dag",
			comment: "@vpaa/data may only import @vpaa/types.",
			severity: "error",
			from: { path: "^packages/data/" },
			to: { path: "^packages/(auth|admin|config|semantic)/" }
		},
		{
			name: "auth-dag",
			comment: "@vpaa/auth may import @vpaa/data and @vpaa/types only.",
			severity: "error",
			from: { path: "^packages/auth/" },
			to: { path: "^packages/(admin|config|semantic)/" }
		},
		{
			name: "semantic-is-leaf",
			comment: "@vpaa/semantic must not import other workspace packages.",
			severity: "error",
			from: { path: "^packages/semantic/" },
			to: { path: "^packages/(types|data|auth|admin|config)/" }
		},
		{
			name: "admin-not-to-apps",
			comment: "@vpaa/admin must not import apps.",
			severity: "error",
			from: { path: "^packages/admin/" },
			to: { path: "^apps/" }
		},
		{
			name: "admin-not-to-semantic",
			comment: "@vpaa/admin may import types, data, and auth only.",
			severity: "error",
			from: { path: "^packages/admin/" },
			to: { path: "^packages/semantic/" }
		},
		{
			name: "no-deep-data-imports",
			comment: "Import @vpaa/data from its public entry, not internals.",
			severity: "error",
			from: { pathNot: "^packages/data/" },
			to: { path: "^packages/data/src/", pathNot: "^packages/data/src/index\\.ts$" }
		},
		{
			name: "no-deep-auth-imports",
			comment: "Import @vpaa/auth from its public entry, not internals.",
			severity: "error",
			from: { pathNot: "^packages/auth/" },
			to: { path: "^packages/auth/src/", pathNot: "^packages/auth/src/index\\.ts$" }
		},
		{
			name: "no-deep-types-imports",
			comment: "Import @vpaa/types from its public entry, not internals.",
			severity: "error",
			from: { pathNot: "^packages/types/" },
			to: { path: "^packages/types/src/", pathNot: "^packages/types/src/index\\.ts$" }
		},
		{
			name: "no-deep-semantic-imports",
			comment: "Import @vpaa/semantic from its public entry, not internals.",
			severity: "error",
			from: { pathNot: "^packages/semantic/" },
			to: { path: "^packages/semantic/src/", pathNot: "^packages/semantic/src/index\\.ts$" }
		},
		{
			name: "no-relative-across-packages",
			comment: "Do not hop between workspace packages with relative paths.",
			severity: "error",
			from: { path: "^packages/data/" },
			to: {
				path: "^(packages/(?!data/)|apps/)",
				dependencyTypes: ["local"]
			}
		},
		{
			name: "no-relative-across-auth",
			severity: "error",
			from: { path: "^packages/auth/" },
			to: {
				path: "^(packages/(?!auth/)|apps/)",
				dependencyTypes: ["local"]
			}
		},
		{
			name: "no-relative-across-admin",
			severity: "error",
			from: { path: "^packages/admin/" },
			to: {
				path: "^(packages/(?!admin/)|apps/)",
				dependencyTypes: ["local"]
			}
		},
		{
			name: "no-relative-across-types",
			severity: "error",
			from: { path: "^packages/types/" },
			to: {
				path: "^(packages/(?!types/)|apps/)",
				dependencyTypes: ["local"]
			}
		},
		{
			name: "no-relative-across-config",
			severity: "error",
			from: { path: "^packages/config/" },
			to: {
				path: "^(packages/(?!config/)|apps/)",
				dependencyTypes: ["local"]
			}
		},
		{
			name: "no-relative-across-semantic",
			severity: "error",
			from: { path: "^packages/semantic/" },
			to: {
				path: "^(packages/(?!semantic/)|apps/)",
				dependencyTypes: ["local"]
			}
		},
		{
			name: "no-relative-from-apps-to-packages",
			severity: "error",
			from: { path: "^apps/" },
			to: {
				path: "^packages/",
				dependencyTypes: ["local"]
			}
		},
		{
			name: "no-circular",
			comment: "Intra-package cycles are noisy; warn only. Cross-package cycles are blocked by DAG rules.",
			severity: "warn",
			from: {},
			to: { circular: true }
		}
	],
	options: {
		doNotFollow: {
			path: "(^|/)node_modules/"
		},
		exclude: {
			path: "(^|/)(node_modules|\\.svelte-kit|dist|build|test-results|templates|coverage)(/|$)"
		},
		tsPreCompilationDeps: true,
		combinedDependencies: false,
		skipAnalysisNotInRules: true
	}
};

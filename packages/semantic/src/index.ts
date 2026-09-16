export {
	FabricClientConfigError,
	getFabricClient,
	resetFabricClientForTests,
	type FabricDataConfig
} from "./fabric-client.js";
export {
	clearQueryCache,
	querySemanticModel,
	readSemanticModelTable,
	type ReadSemanticModelTableResult,
	type SemanticQueryClient,
	type SemanticQueryOptions
} from "./query-semantic-model.js";

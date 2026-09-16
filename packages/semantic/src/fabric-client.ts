import { FabricClient, type FabricClientConfig } from "@microsoft/fabric-app-data";
import { SemanticModelMessageClient } from "@microsoft/fabric-app-data-embed-client";
import { EmbedFabricApiProxy } from "@microsoft/fabric-app-data-proxy";

export class FabricClientConfigError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "FabricClientConfigError";
	}
}

export type FabricDataConfig = Omit<FabricClientConfig, "proxy">;

let _client: FabricClient | undefined;
let _clientKey: string | undefined;
let _messageClient: SemanticModelMessageClient | undefined;

function configKey(config: FabricDataConfig): string {
	return JSON.stringify(config);
}

export function resetFabricClientForTests(): void {
	_client = undefined;
	_clientKey = undefined;
	_messageClient = undefined;
}

export function getFabricClient(config?: FabricDataConfig): FabricClient {
	if (!config) {
		if (!_client) {
			throw new FabricClientConfigError("Fabric client has not been created");
		}
		return _client;
	}
	const key = configKey(config);
	if (_client && _clientKey !== key) {
		throw new FabricClientConfigError("Fabric client already created with different credentials");
	}
	if (!_client) {
		if (!_messageClient) {
			_messageClient = new SemanticModelMessageClient();
		}
		const proxy = new EmbedFabricApiProxy(_messageClient);
		_client = new FabricClient({ proxy, ...config });
		_clientKey = key;
	}
	return _client;
}

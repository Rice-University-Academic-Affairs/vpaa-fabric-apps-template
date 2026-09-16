import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
	const FabricClient = vi.fn();
	const EmbedFabricApiProxy = vi.fn(function EmbedFabricApiProxy(this: { messageClient: unknown }, messageClient: unknown) {
		this.messageClient = messageClient;
	});
	const SemanticModelMessageClient = vi.fn(function SemanticModelMessageClient(this: { kind: string }) {
		this.kind = "message";
	});
	return { FabricClient, EmbedFabricApiProxy, SemanticModelMessageClient };
});

vi.mock("@microsoft/fabric-app-data", () => ({
	FabricClient: mocks.FabricClient
}));
vi.mock("@microsoft/fabric-app-data-proxy", () => ({
	EmbedFabricApiProxy: mocks.EmbedFabricApiProxy
}));
vi.mock("@microsoft/fabric-app-data-embed-client", () => ({
	SemanticModelMessageClient: mocks.SemanticModelMessageClient
}));

import { FabricClientConfigError, getFabricClient, resetFabricClientForTests } from "./fabric-client.js";

const configA = {
	semanticModels: {
		default: { workspaceId: "ws-1", itemId: "item-1" }
	}
};
const configB = {
	semanticModels: {
		other: { workspaceId: "ws-2", itemId: "item-2" }
	}
};

describe("getFabricClient", () => {
	beforeEach(() => {
		resetFabricClientForTests();
		mocks.FabricClient.mockReset();
		mocks.EmbedFabricApiProxy.mockClear();
		mocks.SemanticModelMessageClient.mockClear();
		mocks.FabricClient.mockImplementation(function FabricClient(this: { config: unknown }, config: unknown) {
			this.config = config;
			return this;
		});
	});

	it("constructs FabricClient with embed proxy and the caller's semanticModels", () => {
		const client = getFabricClient(configA);
		expect(mocks.SemanticModelMessageClient).toHaveBeenCalledOnce();
		expect(mocks.EmbedFabricApiProxy).toHaveBeenCalledOnce();
		const proxy = mocks.EmbedFabricApiProxy.mock.instances[0];
		expect(mocks.FabricClient).toHaveBeenCalledOnce();
		expect(mocks.FabricClient).toHaveBeenCalledWith({
			proxy,
			semanticModels: {
				default: { workspaceId: "ws-1", itemId: "item-1" }
			}
		});
		expect(client).toBe(mocks.FabricClient.mock.instances[0]);
	});

	it("returns the same client for the same config", () => {
		const first = getFabricClient(configA);
		const second = getFabricClient(configA);
		expect(first).toBe(second);
		expect(mocks.FabricClient).toHaveBeenCalledOnce();
	});

	it("rejects a second config without reset", () => {
		getFabricClient(configA);
		expect(() => getFabricClient(configB)).toThrow(FabricClientConfigError);
		expect(() => getFabricClient(configB)).toThrow(/different/i);
		expect(mocks.FabricClient).toHaveBeenCalledOnce();
	});

	it("allows a new config after reset", () => {
		getFabricClient(configA);
		resetFabricClientForTests();
		getFabricClient(configB);
		expect(mocks.FabricClient).toHaveBeenCalledTimes(2);
		expect(mocks.FabricClient).toHaveBeenLastCalledWith(
			expect.objectContaining({
				semanticModels: {
					other: { workspaceId: "ws-2", itemId: "item-2" }
				}
			})
		);
	});

	it("throws when called without config and no client exists", () => {
		expect(() => getFabricClient()).toThrow(FabricClientConfigError);
		expect(mocks.FabricClient).not.toHaveBeenCalled();
	});
});

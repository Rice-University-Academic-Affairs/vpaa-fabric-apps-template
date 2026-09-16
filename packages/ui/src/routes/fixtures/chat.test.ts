import { afterEach, describe, expect, it, vi } from "vitest";
import * as storageModule from "$lib/ai-chat/core/storage.js";
import {
	createFixtureChatSession,
	createFixtureChatSessionIfAvailable,
	DEMO_CHAT_THREADS
} from "./chat.js";

describe("createFixtureChatSession", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		localStorage.clear();
	});

	it("seeds demo threads and selects the first thread", async () => {
		const session = createFixtureChatSession();

		await session.refreshThreads();

		expect(session.threads.map((thread) => thread.id)).toEqual(
			DEMO_CHAT_THREADS.map((thread) => thread.id)
		);
		expect(session.selectedThreadId).toBe(DEMO_CHAT_THREADS[0]?.id);
		expect(session.selectedThread?.title).toBe(DEMO_CHAT_THREADS[0]?.title);
	});

	it("uses the default chat endpoint and demo thread selection", async () => {
		const session = createFixtureChatSession();
		await session.refreshThreads();

		expect(session.selectedThreadId).toBe("thread-1");
		expect(session.threads.find((thread) => thread.id === "thread-1")?.title).toBe(
			"Faculty headcount trends"
		);
	});
});

describe("createFixtureChatSessionIfAvailable", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns null when local chat storage is unavailable", () => {
		vi.spyOn(storageModule, "canUseLocalChatStorage").mockReturnValue(false);

		expect(createFixtureChatSessionIfAvailable()).toBeNull();
	});

	it("creates a fixture session when local chat storage is available", () => {
		vi.spyOn(storageModule, "canUseLocalChatStorage").mockReturnValue(true);

		const session = createFixtureChatSessionIfAvailable();

		expect(session).not.toBeNull();
		expect(session?.selectedThreadId).toBe(DEMO_CHAT_THREADS[0]?.id);
	});
});

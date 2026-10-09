export { default as AppShell } from "./components/app-shell/AppShell.svelte";

export { default as PageContainer } from "./components/page/PageContainer.svelte";
export { default as PageHeader } from "./components/page/PageHeader.svelte";

export { default as UserBadge } from "./components/user/UserBadge.svelte";
export { default as Search } from "./components/search/Search.svelte";

export { default as AiChat } from "./components/ai-chat/AiChat.svelte";
export { default as AiChatTrigger } from "./components/ai-chat/AiChatTrigger.svelte";
export { default as AiChatPanel } from "./components/ai-chat/AiChatPanel.svelte";
export { default as AiChatThreadList } from "./components/ai-chat/AiChatThreadList.svelte";
export { default as AiChatView } from "./components/ai-chat/AiChatView.svelte";
export { default as AiChatMessages } from "./components/ai-chat/AiChatMessages.svelte";
export { default as AiChatMessage } from "./components/ai-chat/AiChatMessage.svelte";
export { default as AiChatInput } from "./components/ai-chat/AiChatInput.svelte";

export {
	createAiChatSession,
	createLocalChatStorage,
	createMemoryChatStorage,
	clientTools,
	toolDefinition,
	createChatRouteHandler,
	DEFAULT_CHAT_ENDPOINT,
	type AiChatSession,
	type CreateAiChatSessionOptions,
	type ChatStorage,
	type AiChatThread,
	type CreateChatThreadInput,
	type LocalChatStorageOptions,
	type UpdateChatThreadPatch,
	type ChatEndpoint,
	type AnyClientTool,
	type ClientTool,
	type ServerTool,
	type ToolDefinition,
	type ChatRouteHandler,
	type ChatRouteHandlerContext,
	type CreateChatRouteHandlerOptions
} from "./ai-chat/index.js";

export type { AppNavGroup, AppNavItem, AppNavIcon } from "./types/navigation.js";
export { isNavItemActive } from "./types/navigation.js";
export type { AppShellUser, AppShellSearch, AppShellChat } from "./types/shell.js";

export { getAdminContext, setAdminContext, type AdminContext } from "./admin/context.js";
export { buildPrimaryNavigation } from "./auth/navigation.js";

import type { UIMessage } from "ai";

// Information delivered when a chat generation completes.
type ChatFinishInfo = {
  messages: UIMessage[];
};

// Lifecycle callbacks for thread-level chat events.
type ChatRegistryCallbacks = {
  onFinish?: (threadId: string, info: ChatFinishInfo) => void;
  onError?: (threadId: string) => void;
};

// Configuration options passed to configureChatRegistry.
type ChatRegistryConfig = {
  getAccessToken: () => string | null | undefined;
  callbacks?: ChatRegistryCallbacks;
};

export type { ChatFinishInfo, ChatRegistryCallbacks, ChatRegistryConfig };


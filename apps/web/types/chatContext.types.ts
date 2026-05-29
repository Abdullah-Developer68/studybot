import type { useChat } from "@ai-sdk/react";

type TypeofUseChat = ReturnType<typeof useChat>;
type StopMethod = { stop: () => void };

type ChatContextValue = TypeofUseChat & StopMethod

export type { ChatContextValue };

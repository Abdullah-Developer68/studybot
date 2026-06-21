import type { useChat } from "@ai-sdk/react";

type TypeofUseChat = ReturnType<typeof useChat>;
type StopMethod = { stop: () => void };
// True while the thread's existing messages are being fetched from the
// database on mount/thread switch. Lets ChatBox show a spinner before the
// AI SDK's own "submitted"/"streaming" status kicks in.
type LoadingState = { isLoadingMessages: boolean };

type ChatContextValue = TypeofUseChat & StopMethod & LoadingState;

export type { ChatContextValue };

import type { useChat } from "@ai-sdk/react";

type TypeofUseChat = ReturnType<typeof useChat>;
type StopMethod = { stop: () => void };
// True while the thread's existing messages are being fetched from the
// database on mount/thread switch. Lets ChatBox show a spinner before the
// AI SDK's own "submitted"/"streaming" status kicks in.
type LoadingState = { isLoadingMessages: boolean };
// Called by Input before creating a new thread from a user message.
// Tells ChatProvider to skip clearing/loading messages when the threadId
// changes from null → newId, preserving the in-flight AI SDK state.
type ThreadPreparation = { prepareForNewThread: () => void };

type ChatContextValue = TypeofUseChat &
  StopMethod &
  LoadingState &
  ThreadPreparation;

export type { ChatContextValue };

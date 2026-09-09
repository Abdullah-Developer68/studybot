"use client";

import { useChat, type Chat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import {
  useEffect,
  useState,
  useRef,
  type ReactNode,
  useCallback,
} from "react";
import ChatContext from "@/app/context/ChatContext";
import { fetchThreadTitle, fetchThreadWithMessages } from "@studybot/supabase";
import useAuth from "@/hooks/auth/useAuth";
import {
  configureChatRegistry,
  getOrCreateChat,
  getDetachedChat,
} from "@/lib/chat/chatRegistry";
import {
  useChatStoreActions,
  useChatStoreStates,
} from "@/stores/chatStore";
import type { ChatContextValue } from "@/types/chatContext.types";

// Converts DB messages (role + content string) into the AI SDK UI message
// format (id + role + parts[]) that useChat expects.
const toUiMessages = (
  dbMessages: { message_id: string; role: string; content: string }[],
) =>
  dbMessages
    .filter((msg) => msg.role === "user" || msg.role === "assistant")
    .map((msg) => ({
      id: msg.message_id,
      role: msg.role as "user" | "assistant",
      parts: [{ type: "text" as const, text: msg.content }],
    }));

// Stable scope key for the no-thread binding target (see getDetachedChat).
const DETACHED_SCOPE = {};

// Provides access to the context
const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { user, accessToken } = useAuth();
  // Read activeThreadId from the store — set by the layout when the URL
  // param changes, or by Input when creating a new thread from a message.
  const { activeThreadId: threadId, threads } = useChatStoreStates();
  const {
    updateThreadTitle: updateThreadTitleInStore,
    setTitleGeneratingThreadId,
  } = useChatStoreActions();
  // True while the thread's existing messages are being fetched from the
  // database on mount/thread switch. Lets ChatBox show a spinner before the
  // AI SDK's own "submitted"/"streaming" status kicks in.
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Ref mirror of threads so the finish callback can read the current title
  // without being re-registered on every threads update.
  const threadsRef = useRef(threads);
  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  // Picks up the title the chat edge function auto-generated for a new
  // thread. The server generates it fire-and-forget while streaming the
  // reply, so we poll until the DB row actually carries it, then reveal
  // it in the sidebar (clearing the blur + spinner placeholder).
  const pollGeneratedTitle = useCallback(
    async (pollThreadId: string) => {
      // Title generation is a background LLM call on the server — allow up
      // to ~15s before giving up and just keeping the "New Chat" label.
      const maxAttempts = 10;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Wait before each check — generation runs concurrently with the stream.
        await new Promise((resolve) => setTimeout(resolve, 1500));
        try {
          const title = await fetchThreadTitle(pollThreadId);
          if (title && title !== "New Chat") {
            updateThreadTitleInStore(pollThreadId, title);
            return;
          }
        } catch (pollError) {
          console.error("Failed to poll generated thread title:", pollError);
          return;
        }
      }
    },
    [updateThreadTitleInStore],
  );

  // Clears the sidebar's generating indicator no matter how polling ends.
  const finishTitlePolling = useCallback(
    (pollThreadId: string) => {
      setTitleGeneratingThreadId((current) =>
        current === pollThreadId ? null : current,
      );
    },
    [setTitleGeneratingThreadId],
  );

  // Wire the per-thread chat registry to auth + lifecycle callbacks. The
  // headers resolver runs per-request so token refreshes are always picked
  // up, and each Chat reports finish/error with its own threadId — streams
  // keep running even when their thread isn't the one on screen.
  useEffect(() => {
    configureChatRegistry({
      getAccessToken: () => accessToken,
      callbacks: {
        onFinish: (finishedThreadId, { messages }) => {
          // Only the very first exchange (one user message + its reply)
          // triggers title pickup — later messages never change the title.
          const userCount = messages.filter((m) => m.role === "user").length;
          if (userCount !== 1 || messages.length > 2) return;

          // Skip polling if the user already renamed the thread manually.
          const currentTitle = threadsRef.current.find(
            (t) => t.session_id === finishedThreadId,
          )?.title;
          if (currentTitle && currentTitle !== "New Chat") return;

          pollGeneratedTitle(finishedThreadId).finally(() =>
            finishTitlePolling(finishedThreadId),
          );
        },
        onError: (errorThreadId) => {
          console.error(`Chat stream failed for thread ${errorThreadId}`);
          // A failed stream also means failed title generation — stop
          // showing the sidebar placeholder so it can't get stuck forever.
          setTitleGeneratingThreadId((current) =>
            current === errorThreadId ? null : current,
          );
        },
      },
    });
  }, [accessToken, pollGeneratedTitle, finishTitlePolling, setTitleGeneratingThreadId]);

  // Binding target for useChat when no thread is active (bare /chat).
  const boundChat = threadId
    ? getOrCreateChat(threadId)
    : getDetachedChat(DETACHED_SCOPE);

  const { stop, ...restChat } = useChat({ chat: boundChat });

  // Fetch existing messages for this thread from the database whenever
  // threadId changes — but only when the registry has no live copy of the
  // conversation. A thread left mid-generation still holds its (growing)
  // messages in memory and must not be clobbered by a stale DB read.
  useEffect(() => {
    if (!user?.id || !threadId) return;

    let cancelled = false;

    const loadMessages = async () => {
      const targetChat = getOrCreateChat(threadId);
      // Live conversation (cached history or in-flight stream) wins.
      if (targetChat.messages.length > 0 || targetChat.status !== "ready") {
        return;
      }

      setIsLoadingMessages(true);

      try {
        const { messages: dbMessages } = await fetchThreadWithMessages(
          threadId,
          user.id,
        );

        if (cancelled) return;

        // Re-check after the await: the user may have sent a message in
        // this thread while the fetch was in flight (e.g. the new-thread
        // flow lands here before the optimistic message hit the DB).
        const latestChat = getOrCreateChat(threadId);
        if (
          latestChat.messages.length > 0 ||
          latestChat.status !== "ready"
        ) {
          return;
        }

        latestChat.messages = toUiMessages(dbMessages);
      } catch (error) {
        console.error("Failed to load thread messages:", error);
      } finally {
        if (!cancelled) setIsLoadingMessages(false);
      }
    };

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [threadId, user?.id]);

  // Override sendMessage to inject threadId from the store into the request
  // body AND route the send to that thread's own Chat instance. Respects an
  // explicitly-passed threadId in options.body so Input can target a newly
  // created thread before the store has re-rendered with it.
  const sendMessageWithThread = useCallback(
    async (
      message: Parameters<Chat<UIMessage>["sendMessage"]>[0],
      options?: Parameters<Chat<UIMessage>["sendMessage"]>[1],
    ) => {
      // An explicitly-passed threadId takes precedence over the store value.
      // This handles the case where Input creates a new thread and sends
      // a message in the same event handler — the store's activeThreadId
      // hasn't been updated yet by the next React render.
      const explicitBody = options?.body as Record<string, unknown> | undefined;
      const resolvedThreadId =
        (explicitBody?.threadId as string | undefined) ?? threadId;

      if (!resolvedThreadId) {
        throw new Error("Cannot send a chat message without an active thread.");
      }

      const targetChat = getOrCreateChat(resolvedThreadId);

      // First user message of a still-untitled thread → flag the sidebar row
      // so it shows a blur + spinner until the server-generated title lands.
      const isFirstUserMessage = !targetChat.messages.some(
        (m) => m.role === "user",
      );
      const currentTitle = threadsRef.current.find(
        (t) => t.session_id === resolvedThreadId,
      )?.title;
      if (
        isFirstUserMessage &&
        (!currentTitle || currentTitle === "New Chat")
      ) {
        setTitleGeneratingThreadId(resolvedThreadId);
      }

      return targetChat.sendMessage(message, {
        ...options,
        body: {
          ...explicitBody,
          threadId: resolvedThreadId,
        },
      });
    },
    [threadId, setTitleGeneratingThreadId],
  );

  // Manual abort only affects the ACTIVE thread's stream — other threads
  // keep generating in the background. It also cancels server-side title
  // generation, so drop the sidebar blur + spinner placeholder.
  const stopAndClearTitle = useCallback(() => {
    setTitleGeneratingThreadId(null);
    return stop();
  }, [stop, setTitleGeneratingThreadId]);

  // Expose stop, overridden sendMessage, and loading state.
  const value: ChatContextValue = {
    ...restChat,
    stop: stopAndClearTitle,
    sendMessage: sendMessageWithThread,
    isLoadingMessages,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export default ChatProvider;

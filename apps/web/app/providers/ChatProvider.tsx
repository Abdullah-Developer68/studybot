"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  useEffect,
  useState,
  useRef,
  type ReactNode,
  useCallback,
} from "react";
import ChatContext from "@/app/context/ChatContext";
import { createClient } from "@/utils/supabase/client";
import { fetchThreadWithMessages } from "@studybot/supabase";
import useAuth from "@/hooks/auth/useAuth";
import { useChatStoreStates } from "@/stores/chatStore";
import type { ChatContextValue } from "@/types/chatContext.types";

// Static env access per AGENTS.md — Next.js inlines these at build time.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

type ChatProviderProps = {
  children: ReactNode;
};

// Provides access to the context
const ChatProvider = ({ children }: ChatProviderProps) => {
  const { user } = useAuth();
  // Read activeThreadId from the store — set synchronously by ChatThreadPage
  // during render, so it's always populated before this component mounts.
  const { activeThreadId: threadId } = useChatStoreStates();
  // True while we are loading existing messages for this thread from the DB.
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const chatApi = supabaseUrl ? `${supabaseUrl}/functions/v1/chat` : undefined;

  // Custom transport that adds auth headers and points to the edge function.
  const transport = new DefaultChatTransport({
    api: chatApi || "/api/chat",
    headers: {
      Authorization: `Bearer ${supabaseKey || ""}`,
      apikey: supabaseKey || "",
    },
  });

  const chat = useChat({
    transport,
    onFinish: undefined,
    // Log transport errors so failures surface in the console instead of
    // being swallowed silently. The AI SDK still updates `error` state for
    // the UI regardless, but this makes server/500 errors visible while debugging.
    onError: (error) => {
      console.error("Chat transport error:", error);
    },
  });

  // Keep a ref to setMessages so the fetch effect doesn't re-run when
  // the AI SDK re-creates the function reference between renders.
  const setMessagesRef = useRef(chat.setMessages);
  useEffect(() => {
    setMessagesRef.current = chat.setMessages;
  }, [chat.setMessages]);

  // Keep a ref to stop so the fetch effect can abort in-flight streams
  // without depending on the full chat object (which changes every render).
  const stopRef = useRef(chat.stop);
  useEffect(() => {
    stopRef.current = chat.stop;
  }, [chat.stop]);

  // Fetch existing messages for this thread from the database whenever
  // threadId changes. Clears useChat's messages immediately on switch so
  // the old thread's messages don't flash before the new ones load.
  useEffect(() => {
    // Clear any in-flight AI streaming from the previous thread.
    stopRef.current();

    if (!user?.id || !threadId) {
      setIsLoadingMessages(false);
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      // Immediately clear old messages so the UI shows a loading state
      // rather than stale content from the previous thread.
      setMessagesRef.current([]);
      setIsLoadingMessages(true);

      try {
        const supabaseClient = createClient();
        const { messages: dbMessages } = await fetchThreadWithMessages(
          supabaseClient,
          threadId,
          user.id,
        );

        if (cancelled) return;

        // Convert DB messages (role + content string) into the AI SDK UI
        // message format (id + role + parts[]) that useChat expects.
        const uiMessages = dbMessages
          .filter((msg) => msg.role === "user" || msg.role === "assistant")
          .map((msg) => ({
            id: msg.message_id,
            role: msg.role as "user" | "assistant",
            parts: [{ type: "text" as const, text: msg.content }],
          }));

        setMessagesRef.current(uiMessages);
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

  // Override sendMessage to inject threadId from the store into the request body.
  const originalSendMessage = chat.sendMessage;
  const sendMessageWithThread = useCallback(
    async (
      message: Parameters<typeof originalSendMessage>[0],
      options?: Parameters<typeof originalSendMessage>[1],
    ) => {
      // Merge threadId into the request body
      return originalSendMessage(message, {
        ...options,
        body: {
          ...options?.body,
          threadId,
        },
      });
    },
    [originalSendMessage, threadId],
  );

  // Destructure to expose stop function along with other chat utilities
  const { stop, ...restChat } = chat;

  // Include stop function, override sendMessage, and expose loading state.
  const value: ChatContextValue = {
    ...restChat,
    stop,
    sendMessage: sendMessageWithThread,
    isLoadingMessages,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export default ChatProvider;

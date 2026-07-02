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
  // Read activeThreadId from the store — set by the layout when the URL
  // param changes, or by Input when creating a new thread from a message.
  const { activeThreadId: threadId } = useChatStoreStates();
  // True while we are loading existing messages for this thread from the DB.
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const chatApi = supabaseUrl ? `${supabaseUrl}/functions/v1/chat` : undefined;

  // When Input creates a new thread from a user message, it sets this flag
  // before navigating. This prevents the load-messages effect from clearing
  // the AI SDK's internal state (which already contains the just-sent user
  // message) and re-fetching an empty thread from the DB.
  const skipNextLoadRef = useRef(false);
  const prepareForNewThread = useCallback(() => {
    skipNextLoadRef.current = true;
  }, []);

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

    // If Input created a new thread from a user message, skip clearing
    // and re-fetching — the AI SDK already has the just-sent message.
    if (skipNextLoadRef.current) {
      skipNextLoadRef.current = false;
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
  // Respects an explicitly-passed threadId in options.body so Input can pass a
  // newly created threadId before the store has re-rendered with it.
  const originalSendMessage = chat.sendMessage;
  const sendMessageWithThread = useCallback(
    async (
      message: Parameters<typeof originalSendMessage>[0],
      options?: Parameters<typeof originalSendMessage>[1],
    ) => {
      // An explicitly-passed threadId takes precedence over the store value.
      // This handles the case where Input creates a new thread and sends
      // a message in the same event handler — the store's activeThreadId
      // hasn't been updated yet by the next React render.
      const explicitBody = options?.body as Record<string, unknown> | undefined;
      const resolvedThreadId =
        (explicitBody?.threadId as string | undefined) ?? threadId;
      return originalSendMessage(message, {
        ...options,
        body: {
          ...explicitBody,
          threadId: resolvedThreadId,
        },
      });
    },
    [originalSendMessage, threadId],
  );

  // Destructure to expose stop function along with other chat utilities
  const { stop, ...restChat } = chat;

  // Include stop function, override sendMessage, expose loading state,
  // and expose prepareForNewThread for lazy thread creation in Input.
  const value: ChatContextValue = {
    ...restChat,
    stop,
    sendMessage: sendMessageWithThread,
    isLoadingMessages,
    prepareForNewThread,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export default ChatProvider;

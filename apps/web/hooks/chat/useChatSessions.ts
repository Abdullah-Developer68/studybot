"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import useAuth from "@/hooks/auth/useAuth";
import { useChatStoreActions, useChatStoreStates } from "@/stores/chatStore";
import { createChatThread, fetchUserThreads } from "@studybot/supabase";

// Loads the signed-in user's chat sessions for the sidebar and exposes
// thread actions. No longer auto-creates a default thread on login —
// threads are created lazily when the user sends their first message.
const useChatSessions = () => {
  const router = useRouter();
  const supabaseClient = createClient();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { threads, activeThreadId, isLoading, error } = useChatStoreStates();
  const {
    setThreads,
    setActiveThread,
    setLoading,
    setError,
    addThread,
    reset,
  } = useChatStoreActions();

  // Keep a ref to activeThreadId so the load-threads effect can check
  // whether a thread is already active without including activeThreadId
  // in its dep array. This prevents re-fetching all threads from the DB
  // every time the user switches between threads.
  const activeThreadIdRef = useRef(activeThreadId);
  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    if (authLoading) return;

    const loadThreads = async () => {
      if (!isAuthenticated || !user?.id) {
        reset();
        return;
      }

      setLoading(true);
      try {
        const userThreads = await fetchUserThreads(supabaseClient, user.id);

        // Just populate the sidebar list. No auto-creation, no auto-selection.
        // The user sees an empty chat interface and the first message they send
        // creates a thread lazily (handled by Input / ChatProvider).
        setThreads(userThreads);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load chat sessions",
        );
      } finally {
        setLoading(false);
      }
    };

    loadThreads();
    // activeThreadId is intentionally excluded — it's read via ref above.
  }, [
    authLoading,
    isAuthenticated,
    reset,
    setError,
    setLoading,
    setThreads,
    supabaseClient,
    user?.id,
  ]);

  // Manual thread creation from the sidebar "New Chat" button.
  // Still creates the thread immediately and navigates — this is a
  // deliberate user action, not an automatic creation on login.
  const createThread = async (title?: string) => {
    if (!user?.id) return null;

    setLoading(true);
    try {
      // When creating from the sidebar, derive a title from the user's
      // message if provided, otherwise fall back to a generic title.
      const threadTitle = title || "New Chat";
      const newThread = await createChatThread(
        supabaseClient,
        user.id,
        threadTitle,
      );

      if (!newThread) {
        throw new Error("Failed to create chat thread");
      }

      addThread(newThread);
      setActiveThread(newThread.session_id);
      router.push(`/chat/${newThread.session_id}`);
      return newThread;
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create chat thread",
      );
      return null;
    } finally {
      setLoading(false);
    }
  };

  const switchThread = (threadId: string) => {
    setActiveThread(threadId);
    router.push(`/chat/${threadId}`);
  };

  return {
    threads,
    activeThreadId,
    isLoading,
    error,
    createThread,
    switchThread,
  };
};

export default useChatSessions;

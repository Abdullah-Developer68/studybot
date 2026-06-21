"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import useAuth from "@/hooks/auth/useAuth";
import { useChatStoreActions, useChatStoreStates } from "@/stores/chatStore";
import { createChatThread, fetchUserThreads } from "@studybot/supabase";

// Tracks which users have already had their default chat session initialized in this browser session.
const initializedDefaultSessions = new Set<string>();

// Loads the signed-in user's chat sessions for the sidebar and exposes thread actions.
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

  // Keep a ref to activeThreadId so the load-threads effect can check whether
  // a thread is already active without including activeThreadId in its dep
  // array. This prevents the effect from re-running (and re-fetching all
  // threads from the DB) every time the user switches between threads.
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

        // Create a default session the first time this user opens the app and no threads exist yet.
        if (
          userThreads.length === 0 &&
          !initializedDefaultSessions.has(user.id)
        ) {
          initializedDefaultSessions.add(user.id);

          const defaultThread = await createChatThread(
            supabaseClient,
            user.id,
            "New Chat",
          );

          if (defaultThread) {
            setThreads([defaultThread]);
            setActiveThread(defaultThread.session_id);
            router.push(`/chat/${defaultThread.session_id}`);
            return;
          }
        }

        setThreads(userThreads);

        // Keep the active thread aligned with the first available thread if none is selected yet.
        // Uses the ref so this effect doesn't re-run when activeThreadId changes.
        if (!activeThreadIdRef.current && userThreads.length > 0) {
          setActiveThread(userThreads[0].session_id);
        }
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
    setActiveThread,
    setError,
    setLoading,
    setThreads,
    supabaseClient,
    router,
    user?.id,
  ]);

  const createThread = async (title?: string) => {
    if (!user?.id) return null;

    setLoading(true);
    try {
      const newThread = await createChatThread(supabaseClient, user.id, title);

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

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useChatStoreStates, useChatStoreActions } from "@/stores/chatStore";
import {
  createChatThread,
  fetchUserThreads,
  fetchThreadWithMessages,
} from "@studybot/supabase";
import useAuth from "@/hooks/auth/useAuth";

const useThreadManager = () => {
  const router = useRouter();
  const supabaseClient = createClient();
  // states
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { threads, activeThreadId, messages, isLoading } = useChatStoreStates();
  // actions
  const {
    setThreads,
    setActiveThread,
    setMessages,
    addThread,
    setLoading,
    setError,
  } = useChatStoreActions();

  // Initialize threads when user logs in
  useEffect(() => {
    if (authLoading || !isAuthenticated || !user?.id) return;

    const initializeThreads = async () => {
      setLoading(true);

      try {
        const userThreads = await fetchUserThreads(supabaseClient, user.id);

        if (userThreads.length === 0) {
          // Create default thread if none exist
          const newThread = await createChatThread(
            supabaseClient,
            user.id,
            "Chat",
          );
          if (newThread) {
            setThreads([newThread]);
            setActiveThread(newThread.session_id);
            router.push(`/chat/${newThread.session_id}`);
          } else {
            throw new Error("Failed to create chat thread");
          }
        } else {
          // Load existing threads
          setThreads(userThreads);
          setActiveThread(userThreads[0].session_id);
          // Set active thread to most recent
          router.push(`/chat/${userThreads[0].session_id}`);
        }
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to initialize threads",
        );
      } finally {
        setLoading(false);
      }
    };
    initializeThreads();
  }, [isAuthenticated, user?.id, authLoading]);

  // Load thread messages when active thread changes
  useEffect(() => {
    if (!activeThreadId || !user?.id) return;

    const loadThread = async () => {
      setLoading(true);
      try {
        const { thread, messages: threadMessages } =
          await fetchThreadWithMessages(
            supabaseClient,
            activeThreadId,
            user.id,
          );

        if (thread) {
          // Cast to the shared ChatMessage type — the SDK type allows "tool"
          // role which the shared type doesn't, but this dead hook never
          // receives tool messages in practice.
          setMessages(threadMessages as import("@studybot/types").ChatMessage[]);
        }
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to load thread",
        );
      } finally {
        setLoading(false);
      }
    };

    loadThread();
  }, [activeThreadId, user?.id]);

  // Create new thread

  const createThread = async (title?: string) => {
    if (!user?.id) return null;

    setLoading(true);
    try {
      const newThread = await createChatThread(supabaseClient, user.id, title);
      if (newThread) {
        addThread(newThread);
        setActiveThread(newThread.session_id);
        setMessages([]); // Clear messages for new thread
        router.push(`/chat/${newThread.session_id}`);
        return newThread;
      }
      // in here error handling has to be done is newThread is not created.
      // I need to modify these functions such that when ever you import some function
      //  to run you are sure that it will return an error
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to create thread",
      );
    } finally {
      setLoading(false);
    }
    return null;
  };

  // Switch to thread
  const switchThread = (threadId: string) => {
    setActiveThread(threadId);
    router.push(`/chat/${threadId}`);
  };

  return {
    threads,
    activeThreadId,
    messages,
    isLoading,
    createThread,
    switchThread,
  };
};

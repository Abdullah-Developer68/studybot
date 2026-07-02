"use client";

import { useEffect, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth";
import { useChatStoreActions } from "@/stores/chatStore";
import ChatShell from "@/components/chat/ChatShell";

// ChatShell lives in the layout so it persists across navigations
// between /chat and /chat/[threadId]. This prevents ChatProvider from
// unmounting and remounting when a new thread is created, preserving
// the in-flight AI SDK stream state.
const ChatLayout = ({ children }: { children: ReactNode }) => {
  const params = useParams();
  const threadId = params?.threadId as string | undefined;
  const { setActiveThread } = useChatStoreActions();

  // Sync the URL param to the store so ChatProvider knows which
  // thread to load. When threadId is undefined (bare /chat route),
  // we leave activeThreadId as null — the store is reset on logout
  // and Input creates a thread lazily on first send.
  useEffect(() => {
    if (threadId) {
      setActiveThread(threadId);
    }
    // If no threadId, ChatProvider's activeThreadId stays null.
    // We don't explicitly clear it here to avoid races with thread
    // creation in Input (which sets it before navigating).
  }, [threadId, setActiveThread]);

  return (
    <ProtectedRoute>
      <ChatShell />
    </ProtectedRoute>
  );
};

export default ChatLayout;

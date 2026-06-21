"use client";

import { useEffect, use } from "react";
import ChatShell from "@/components/chat/ChatShell";
import { useChatStoreActions } from "@/stores/chatStore";

type ChatThreadPageProps = {
  params: Promise<{ threadId: string }>;
};

// Renders the chat UI for a specific thread. setActiveThread is called in
// an effect rather than during render so we don't trigger a setState in a
// sibling component (ExpandedSidebar subscribes to the same store) while
// this component is still rendering. Thread switching is handled in-place
// by ChatProvider (no key remount); its own effect re-runs on threadId
// change, so the brief gap before the store updates is covered by its
// loading state.
const ChatThreadPage = ({ params }: ChatThreadPageProps) => {
  const { threadId } = use(params);
  const { setActiveThread } = useChatStoreActions();

  // Sync the store's activeThreadId whenever the route param changes.
  // Doing this during render would mutate the store mid-render and cause
  // React's "Cannot update a component while rendering a different
  // component" warning, so it must happen in an effect.
  useEffect(() => {
    setActiveThread(threadId);
  }, [threadId, setActiveThread]);

  return <ChatShell />;
};

export default ChatThreadPage;

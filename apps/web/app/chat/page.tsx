"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChatStoreStates } from "@/stores/chatStore";
import { Loader2 } from "lucide-react";

// The /chat route (no threadId) redirects to the active thread once one is
// available. The sidebar's useChatSessions hook loads/creates threads and
// sets activeThreadId in the store; once that's set we redirect. If no
// threads exist yet, useChatSessions creates a default one and navigates
// directly, so this page mainly covers the brief loading window.
export default function ChatPage() {
  const router = useRouter();
  const { activeThreadId } = useChatStoreStates();

  useEffect(() => {
    if (activeThreadId) {
      // Use replace so the bare /chat URL doesn't linger in browser history.
      router.replace(`/chat/${activeThreadId}`);
    }
  }, [activeThreadId, router]);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] w-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
    </div>
  );
}

import type { ChatThread, ChatMessage } from "@studybot/types";

type ChatStoreStates = {
  // State
  threads: ChatThread[];
  activeThreadId: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  // Tracks which threads are awaiting AI-generated titles.
  // Used by Sidebar to show blur + spinner on those tabs.
  titleLoadingThreadIds: string[];
};

type ChatStoreActions = {
  actions: {
    // Actions
    setThreads: (threads: ChatThread[]) => void;
    setActiveThread: (threadId: string) => void;
    setMessages: (messages: ChatMessage[]) => void;
    addThread: (thread: ChatThread) => void;
    removeThread: (threadId: string) => void;
    updateThreadTitle: (threadId: string, title: string) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    markTitleLoading: (threadId: string) => void;
    unmarkTitleLoading: (threadId: string) => void;
    reset: () => void;
  };
};

export type { ChatStoreStates, ChatStoreActions };

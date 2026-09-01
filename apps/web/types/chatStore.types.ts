import type { ChatThread } from "@studybot/types";

// Lifecycle status representing the state of thread data fetching and mutations.
type ChatStoreStatus = "idle" | "loading" | "error";

type ChatStoreState = {
  threads: ChatThread[];
  activeThreadId: string | null;
  status: ChatStoreStatus;
  error: string | null;
  // Thread whose AI-generated title is currently being fetched, so the
  // sidebar can show a blur + spinner placeholder on that row.
  titleGeneratingThreadId: string | null;
};

type ChatStoreActions = {
  actions: {
    setThreads: (threads: ChatThread[]) => void;
    setActiveThread: (threadId: string) => void;
    addThread: (thread: ChatThread) => void;
    removeThread: (threadId: string) => void;
    updateThreadTitle: (threadId: string, title: string) => void;
    setStatus: (status: ChatStoreStatus) => void;
    setError: (error: string | null) => void;
    setTitleGeneratingThreadId: (
      threadId:
        | string
        | null
        | ((current: string | null) => string | null),
    ) => void;
    reset: () => void;
  };
};

type ChatStore = ChatStoreState & ChatStoreActions;

export type { ChatStoreStatus, ChatStoreState, ChatStoreActions, ChatStore };

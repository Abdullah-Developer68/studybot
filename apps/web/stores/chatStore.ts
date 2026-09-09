import { create } from "zustand";
import type { ChatStore } from "@/types/chatStore.types";
import { useShallow } from "zustand/react/shallow";

const useChatStore = create<ChatStore>((set) => ({
  threads: [],
  activeThreadId: null,
  status: "idle",
  error: null,
  titleGeneratingThreadId: null,
  actions: {
    setThreads: (threads) => set({ threads, status: "idle", error: null }),
    addThread: (thread) =>
      set((state) => ({
        threads: [thread, ...state.threads],
        activeThreadId: thread.session_id,
        status: "idle",
      })),

    removeThread: (threadId) =>
      set((state) => ({
        threads: state.threads.filter((t) => t.session_id !== threadId),
        activeThreadId:
          state.activeThreadId === threadId ? null : state.activeThreadId,
      })),

    updateThreadTitle: (threadId, title) =>
      set((state) => ({
        threads: state.threads.map((t) =>
          t.session_id === threadId ? { ...t, title } : t,
        ),
      })),

    setActiveThread: (activeThreadId) => set({ activeThreadId }),
    setStatus: (status) => set({ status }),
    setError: (error) => set({ error, status: error ? "error" : "idle" }),
    setTitleGeneratingThreadId: (threadIdOrUpdater) =>
      set((state) => ({
        titleGeneratingThreadId:
          typeof threadIdOrUpdater === "function"
            ? threadIdOrUpdater(state.titleGeneratingThreadId)
            : threadIdOrUpdater,
      })),

    reset: () =>
      set({
        threads: [],
        activeThreadId: null,
        status: "idle",
        error: null,
        titleGeneratingThreadId: null,
      }),
  },
}));

const useChatStoreStates = () =>
  useChatStore(
    useShallow((state) => ({
      // States
      threads: state.threads,
      activeThreadId: state.activeThreadId,
      status: state.status,
      error: state.error,
    })),
  );

const useChatStoreActions = () => useChatStore((state) => state.actions);

// Raw store hook for components that need a single field via a selector
// (avoids subscribing to every piece of state).
export { useChatStoreStates, useChatStoreActions, useChatStore };

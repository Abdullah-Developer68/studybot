import { create } from "zustand";
import type {
  ChatStoreStates,
  ChatStoreActions,
} from "@/types/chatStore.types";
import { useShallow } from "zustand/react/shallow";

const useChatStore = create<ChatStoreStates & ChatStoreActions>((set) => ({
  threads: [],
  activeThreadId: null,
  messages: [],
  isLoading: false,
  error: null,
  // Tracks which threads are awaiting an AI-generated title.
  // The Sidebar uses this to show a blur + spinner on those thread tabs.
  titleLoadingThreadIds: [],
  actions: {
    setThreads: (threads) => set({ threads }),
    addThread: (thread) =>
      set((state) => ({
        threads: [thread, ...state.threads],
        activeThreadId: thread.session_id,
      })),

    removeThread: (threadId) =>
      set((state) => ({
        threads: state.threads.filter((t) => t.session_id !== threadId),
        activeThreadId:
          state.activeThreadId === threadId ? null : state.activeThreadId,
        // Also clean up any pending title load for this thread.
        titleLoadingThreadIds: state.titleLoadingThreadIds.filter(
          (id) => id !== threadId,
        ),
      })),

    updateThreadTitle: (threadId, title) =>
      set((state) => ({
        threads: state.threads.map((t) =>
          t.session_id === threadId ? { ...t, title } : t,
        ),
      })),

    setActiveThread: (activeThreadId) => set({ activeThreadId }),
    setMessages: (messages) => set({ messages }),
    setLoading: (isLoading: boolean) => set({ isLoading }),
    setError: (error) => set({ error }),

    // Marks a thread as waiting for an AI-generated title.
    markTitleLoading: (threadId) =>
      set((state) => ({
        titleLoadingThreadIds: state.titleLoadingThreadIds.includes(threadId)
          ? state.titleLoadingThreadIds
          : [...state.titleLoadingThreadIds, threadId],
      })),

    // Removes a thread from the title-loading set once the title arrives.
    unmarkTitleLoading: (threadId) =>
      set((state) => ({
        titleLoadingThreadIds: state.titleLoadingThreadIds.filter(
          (id) => id !== threadId,
        ),
      })),

    reset: () =>
      set({
        threads: [],
        activeThreadId: null,
        messages: [],
        isLoading: false,
        error: null,
        titleLoadingThreadIds: [],
      }),
  },
}));

const useChatStoreStates = () =>
  useChatStore(
    useShallow((state) => ({
      // States
      threads: state.threads,
      activeThreadId: state.activeThreadId,
      messages: state.messages,
      isLoading: state.isLoading,
      error: state.error,
      titleLoadingThreadIds: state.titleLoadingThreadIds,
    })),
  );

const useChatStoreActions = () =>
  useChatStore((state) => state.actions);

export { useChatStoreStates, useChatStoreActions, useChatStore };

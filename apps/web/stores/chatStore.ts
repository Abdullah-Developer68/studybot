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

    reset: () =>
      set({
        threads: [],
        activeThreadId: null,
        messages: [],
        isLoading: false,
        error: null,
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
    })),
  );

const useChatStoreActions = () =>
  useChatStore((state) => state.actions);

export { useChatStoreStates, useChatStoreActions };

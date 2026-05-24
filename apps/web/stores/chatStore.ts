import { create } from "zustand";

type Exchange = {
  query: string;
  response: string;
};

type ChatState = {
  query: string;
  response: string;
  currentExchange: Exchange;
  chatHistory: Exchange[];
  storeQuery: (query: string) => void;
  sendResponse: (response: string) => void;
  addToChatHistory: () => void;
};

export const useChatStore = create<ChatState>((set) => ({
  query: "",
  response: "",
  currentExchange: { query: "", response: "" },
  chatHistory: [],

  storeQuery: (query) =>
    set((state) => ({
      query,
      currentExchange: { ...state.currentExchange, query },
    })),

  sendResponse: (response) =>
    set((state) => ({
      response,
      currentExchange: { ...state.currentExchange, response },
    })),

  addToChatHistory: () =>
    set((state) => ({
      chatHistory: [...state.chatHistory, { ...state.currentExchange }],
      currentExchange: { query: "", response: "" },
    })),
}));

import { createContext } from "react";
import type { useChat } from "@ai-sdk/react";

type ChatContextValue = ReturnType<typeof useChat> & {
  stop: () => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export default ChatContext;

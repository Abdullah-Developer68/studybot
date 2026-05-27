"use client";

import { useContext } from "react";
import ChatContext from "@/app/context/ChatContext";

type ChatContextValue = NonNullable<React.ContextType<typeof ChatContext>>;

const useChatContext = (): ChatContextValue => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
};

export default useChatContext;

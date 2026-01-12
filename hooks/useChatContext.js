"use client";
import { useContext } from "react";
import ChatContext from "@/app/context/ChatContext";

const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
};

export default useChatContext;

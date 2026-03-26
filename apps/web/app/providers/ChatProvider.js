"use client";
import { useChat } from "@ai-sdk/react";
import ChatContext from "@/app/context/ChatContext";
import { useEffect } from "react";

// Provides access to the context
const ChatProvider = ({ children }) => {
  const chat = useChat({
    api: "/api/chat",
    // experimental_throttle: 30, // throttles updates to every 30ms
  });

  // Destructure to expose stop function along with other chat utilities
  const { stop, ...restChat } = chat;

  useEffect(() => {
    console.log("Chat context:", chat);
    console.log("Available methods:", Object.keys(chat));
  }, [chat]);

  // Include stop function in the context value
  return (
    <ChatContext.Provider value={{ ...restChat, stop }}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatProvider;

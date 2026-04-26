"use client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ChatContext from "@/app/context/ChatContext";
import { useEffect } from "react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

// Provides access to the context
const ChatProvider = ({ children }) => {
  const chatApi = supabaseUrl ? `${supabaseUrl}/functions/v1/chat` : undefined;
// if we want to send the request to an external API instead of the Next.js API route, we use defaultChatTransport
  const transport = new DefaultChatTransport({
    //api: "/api/chat", // For local development, this would be the Next.js API route
    api: chatApi || "/api/chat",
    headers: {
      Authorization: `Bearer ${supabaseKey || ""}`,
      apikey: supabaseKey || "",
    },
  });

  const chat = useChat({
    transport,
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

"use client";

import Input from "@/components/chat/Input";
import ChatBox from "@/components/chat/ChatBox";
import ChatProvider from "@/app/providers/ChatProvider";

export default function ChatPage() {
  return (
    <ChatProvider>
      <div className="relative flex h-[calc(100dvh-3.5rem)] w-full flex-col overflow-hidden md:h-screen">
        <ChatBox />
        <span className="absolute inset-x-0 bottom-2 md:bottom-5 flex items-center justify-center px-4 md:px-6">
          <Input />
        </span>
      </div>
    </ChatProvider>
  );
}

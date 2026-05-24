"use client";

import Input from "@/components/chat/Input";
import ChatBox from "@/components/chat/ChatBox";
import ChatProvider from "@/app/providers/ChatProvider";

export default function ChatPage() {
  return (
    <ChatProvider>
      <div className="relative flex h-screen w-full flex-col overflow-hidden">
        <ChatBox />
        <span className="absolute inset-x-0 bottom-5 flex items-center justify-center px-4 md:px-6">
          <Input />
        </span>
      </div>
    </ChatProvider>
  );
}

"use client";

import Input from "@/components/chat/Input";
import ChatBox from "@/components/chat/ChatBox";
import ChatProvider from "@/app/providers/ChatProvider";

export default function ChatPage() {
  return (
    <ChatProvider>
      <div className="relative flex h-screen w-full flex-col overflow-hidden">
        <ChatBox />
        <span className="fixed bottom-5 left-1/2 w-3/4 -translate-x-1/2 flex items-center justify-center">
          <Input />
        </span>
      </div>
    </ChatProvider>
  );
}

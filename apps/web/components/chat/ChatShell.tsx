"use client";

import ChatProvider from "@/app/providers/ChatProvider";
import ChatBox from "@/components/chat/ChatBox";
import Input from "@/components/chat/Input";

const ChatShell = () => {
  return (
    <ChatProvider>
      <div className="relative flex h-[calc(100dvh-3.5rem)] w-full flex-col overflow-hidden md:h-screen">
        <ChatBox />
        <span className="absolute inset-x-0 bottom-2 flex items-center justify-center px-4 md:bottom-5 md:px-6">
          <Input />
        </span>
      </div>
    </ChatProvider>
  );
};

export default ChatShell;

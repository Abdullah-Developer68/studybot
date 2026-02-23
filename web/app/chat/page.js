"use client";
import React from "react";
import Input from "@/components/chat/Input";
import ChatBox from "@/components/chat/ChatBox";
import ChatProvider from "@/app/providers/ChatProvider";

const Chat = () => {
  return (
    <>
      <ChatProvider>
        <div className="relative w-full h-screen flex items-start justify-center overflow-hidden">
          <ChatBox />
          <span className="fixed bottom-5 w-3/4 flex justify-center items-center">
            <Input />
          </span>
        </div>
      </ChatProvider>
    </>
  );
};

export default Chat;

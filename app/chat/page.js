"use client";
import React from "react";
import Input from "@/components/chat/Input";
import ChatBox from "@/components/chat/ChatBox";
import ChatProvider from "@/app/providers/ChatProvider";

const Chat = () => {
  return (
    <>
      <ChatProvider>
        <div className="relative w-full flex flex-col items-center justify-around">
          <span className="">
            <ChatBox />
          </span>
          <span className="relative top-20 w-3/4 flex justify-center items-center">
            <Input />
          </span>
        </div>
      </ChatProvider>
    </>
  );
};

export default Chat;

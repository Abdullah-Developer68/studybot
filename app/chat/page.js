import React from "react";
import Input from "@/components/chat/Input";
import ChatBox from "@/components/chat/ChatBox";

const Chat = () => {
  return (
    <>
      <div className="relative h-screen w-full flex flex-col items-center justify-center">
        <span className="">
          <ChatBox />
        </span>
        <span className="relative top-70 w-full flex justify-center items-center">
          <Input />
        </span>
      </div>
    </>
  );
};

export default Chat;

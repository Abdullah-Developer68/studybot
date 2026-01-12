"use client";
import React from "react";
import useChatContext from "@/hooks/useChatContext";

const ChatBox = () => {
  const { messages, status } = useChatContext();
  console.log("These are the messages in the ChatBox.js");
  console.log(messages);
  const isLoading = status === "submitted" || status === "streaming";

  // Helper function to extract text content from a message
  const getMessageContent = (message) => {
    // User messages have content as a string
    if (typeof message.content === "string") {
      return message.content;
    }
    // Assistant messages have parts array instead of content
    if (Array.isArray(message.parts)) {
      return message.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("");
    }
    return "";
  };

  return (
    <>
      <div className="chatBox">
        {messages.map((message, index) => {
          if (message.role === "user") {
            return (
              <span key={index} className="userPrompt">
                <p className="">{getMessageContent(message)}</p>
              </span>
            );
          } else {
            return (
              <span key={index} className="reply">
                <p className="">{getMessageContent(message)}</p>
              </span>
            );
          }
        })}
      </div>
    </>
  );
};

export default ChatBox;

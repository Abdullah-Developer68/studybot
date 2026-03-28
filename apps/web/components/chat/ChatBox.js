"use client";
import React from "react";
import useChatContext from "@/hooks/chat/useChatContext";
import { Bot, Loader2, User, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import WelcomeScreen from "./WelcomeScreen";

const ChatBox = () => {
  const { messages, status } = useChatContext();
  // console.log("These are the messages in the ChatBox.js");
  // console.log(messages);
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

  // Helper function to extract user-visible content (hide document content)
  const getUserDisplayContent = (content) => {
    // Check if message contains multiple documents (separated by ---)
    const multiDocPattern =
      /^((?:\[Document: .+?\]\n\n[\s\S]*?(?:\n\n---\n\n)?)+)\[User Request\]: ([\s\S]*)$/;
    const multiMatch = content.match(multiDocPattern);

    if (multiMatch) {
      // Extract all document names
      const docSection = multiMatch[1];
      const fileNames = [...docSection.matchAll(/\[Document: (.+?)\]/g)].map(
        (m) => m[1],
      );
      const userRequest = multiMatch[2];
      return { fileNames, userRequest };
    }

    // Check if message contains single document content (legacy format)
    const singleDocMatch = content.match(
      /^\[Document: (.+?)\]\n\n[\s\S]*?\n\n\[User Request\]: ([\s\S]*)$/,
    );
    if (singleDocMatch) {
      const fileName = singleDocMatch[1];
      const userRequest = singleDocMatch[2];
      return { fileNames: [fileName], userRequest };
    }

    return { fileNames: [], userRequest: content };
  };

  // Show welcome screen when no messages
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col p-4 gap-4 w-[90%] overflow-auto max-h-[80%] h-full mt-16">
        <WelcomeScreen />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col p-4 gap-4 w-[90%] overflow-auto max-h-[80%] h-full mt-16">
        {messages.map((message, index) => {
          const content = getMessageContent(message);

          if (message.role === "user") {
            const { fileNames, userRequest } = getUserDisplayContent(content);

            return (
              <div key={index} className="flex justify-end items-start gap-2">
                <div className="bg-gray-700 text-white rounded-2xl rounded-tr-sm p-3 max-w-[80%]">
                  {/* Show file attachment indicator(s) */}
                  {fileNames.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mb-2 pb-2 border-b border-gray-600 text-sm text-blue-300">
                      {fileNames.map((fileName, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <FileText size={14} />
                          <span>{fileName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="prose prose-sm prose-invert max-w-none wrap-break-words">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        // `node` is an object representing a markdown element in the parsed tree.
                        pre: ({ node, ...props }) => (
                          <div className="overflow-auto my-2 rounded-lg bg-zinc-900 p-4">
                            <pre {...props} />
                          </div>
                        ),
                        code: ({ node, inline, ...props }) =>
                          inline ? (
                            <code
                              className="bg-blue-800 rounded px-1 py-0.5"
                              {...props}
                            />
                          ) : (
                            <code {...props} />
                          ),
                        p: ({ node, ...props }) => (
                          <p className="mb-2 last:mb-0" {...props} />
                        ),
                      }}
                    >
                      {/* Show only the user's request, not the full document content */}
                      {userRequest}
                    </ReactMarkdown>
                  </div>
                </div>
                <div className="shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <User size={18} className="text-white" />
                </div>
              </div>
            );
          } else {
            return (
              <div
                key={index}
                className="flex justify-center items-start gap-2"
              >
                <div className="shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                  <Bot size={18} className="text-white" />
                </div>
                <div className=" text-gray-100 rounded-2xl rounded-tl-sm p-3 min-w-[80%]">
                  <div className="prose prose-sm prose-invert max-w-none wrap-break-words">
                    {/* Markdown Handling */}
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        // In here we are saying if you encounter these tags then apply the following styles to them
                        pre: ({ node, ...props }) => (
                          <div className="overflow-auto my-2 rounded-lg bg-zinc-900 p-4">
                            <pre {...props} />
                          </div>
                        ),
                        code: ({ node, inline, ...props }) =>
                          inline ? (
                            <code
                              className="bg-zinc-700 rounded px-1 py-0.5"
                              {...props}
                            />
                          ) : (
                            <code {...props} />
                          ),
                        p: ({ node, ...props }) => (
                          <p className="mb-2 last:mb-0" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul
                            className="list-disc list-inside mb-2"
                            {...props}
                          />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol
                            className="list-decimal list-inside mb-2"
                            {...props}
                          />
                        ),
                        li: ({ node, ...props }) => (
                          <li className="mb-1" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                          <a
                            className="text-blue-400 hover:text-blue-300 underline"
                            target="_blank"
                            rel="noopener noreferrer"
                            {...props}
                          />
                        ),
                        blockquote: ({ node, ...props }) => (
                          <blockquote
                            className="border-l-4 border-gray-500 pl-4 italic my-2"
                            {...props}
                          />
                        ),
                        table: ({ node, ...props }) => (
                          <div className="overflow-auto my-2">
                            <table
                              className="min-w-full border-collapse border border-gray-600"
                              {...props}
                            />
                          </div>
                        ),
                        th: ({ node, ...props }) => (
                          <th
                            className="border border-gray-600 px-3 py-2 bg-gray-700"
                            {...props}
                          />
                        ),
                        td: ({ node, ...props }) => (
                          <td
                            className="border border-gray-600 px-3 py-2"
                            {...props}
                          />
                        ),
                      }}
                    >
                      {content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            );
          }
        })}

        {isLoading && (
          <div className="flex justify-start items-start gap-2">
            <div className="shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </div>
            <div className="bg-gray-800 text-gray-100 rounded-2xl rounded-tl-sm p-3">
              <Loader2 size={20} className="animate-spin" />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ChatBox;

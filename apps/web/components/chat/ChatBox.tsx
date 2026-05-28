"use client";
import useChatContext from "@/hooks/chat/useChatContext";
import type { CodeRendererProps } from "@studybot/types";
import { Loader2, FileText } from "lucide-react";
import Image from "next/image";
import { assets } from "@studybot/assets/assets";
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
      <div className="h-full w-full overflow-y-auto pb-28 md:pb-44 pt-4 md:pt-16">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 md:px-0">
          <WelcomeScreen />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full w-full overflow-y-auto pb-28 md:pb-44 pt-4 md:pt-16">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4">
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
                          pre: ({ node: _node, ...props }) => (
                            <div className="overflow-auto my-2 rounded-lg bg-zinc-900 p-4">
                              <pre {...props} />
                            </div>
                          ),
                          code: ({
                            node: _node,
                            ...props
                          }: CodeRendererProps) => (
                            <code
                              className="bg-blue-800 rounded px-1 py-0.5"
                              {...props}
                            />
                          ),
                          p: ({ node: _node, ...props }) => (
                            <p className="mb-2 last:mb-0" {...props} />
                          ),
                        }}
                      >
                        {/* Show only the user's request, not the full document content */}
                        {userRequest}
                      </ReactMarkdown>
                    </div>
                  </div>
                  <div className="shrink-0 w-8 h-8 overflow-hidden rounded-full bg-blue-600">
                    <Image
                      src={assets.defaultProfile}
                      alt="User"
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              );
            } else {
              return (
                <div
                  key={index}
                  className="flex justify-center items-start gap-2"
                >
                  <div className="shrink-0 w-8 h-8 overflow-hidden rounded-full bg-gray-700">
                    <Image
                      src={assets.openAiLogo}
                      alt="AI"
                      width={32}
                      height={32}
                      className="h-full w-full object-contain invert"
                    />
                  </div>
                  <div className=" text-gray-100 rounded-2xl rounded-tl-sm p-3 min-w-[80%]">
                    <div className="prose prose-sm prose-invert max-w-none wrap-break-words">
                      {/* Markdown Handling */}
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={{
                          // In here we are saying if you encounter these tags then apply the following styles to them
                          pre: ({ node: _node, ...props }) => (
                            <div className="overflow-auto my-2 rounded-lg bg-zinc-900 p-4">
                              <pre {...props} />
                            </div>
                          ),
                          code: ({
                            node: _node,
                            ...props
                          }: CodeRendererProps) => (
                            <code
                              className="bg-zinc-700 rounded px-1 py-0.5"
                              {...props}
                            />
                          ),
                          p: ({ node: _node, ...props }) => (
                            <p className="mb-2 last:mb-0" {...props} />
                          ),
                          ul: ({ node: _node, ...props }) => (
                            <ul
                              className="list-disc list-inside mb-2"
                              {...props}
                            />
                          ),
                          ol: ({ node: _node, ...props }) => (
                            <ol
                              className="list-decimal list-inside mb-2"
                              {...props}
                            />
                          ),
                          li: ({ node: _node, ...props }) => (
                            <li className="mb-1" {...props} />
                          ),
                          a: ({ node: _node, ...props }) => (
                            <a
                              className="text-blue-400 hover:text-blue-300 underline"
                              target="_blank"
                              rel="noopener noreferrer"
                              {...props}
                            />
                          ),
                          blockquote: ({ node: _node, ...props }) => (
                            <blockquote
                              className="border-l-4 border-gray-500 pl-4 italic my-2"
                              {...props}
                            />
                          ),
                          table: ({ node: _node, ...props }) => (
                            <div className="overflow-auto my-2">
                              <table
                                className="min-w-full border-collapse border border-gray-600"
                                {...props}
                              />
                            </div>
                          ),
                          th: ({ node: _node, ...props }) => (
                            <th
                              className="border border-gray-600 px-3 py-2 bg-gray-700"
                              {...props}
                            />
                          ),
                          td: ({ node: _node, ...props }) => (
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
              <div className="shrink-0 w-8 h-8 overflow-hidden rounded-full bg-gray-700">
                <Image
                  src={assets.openAiLogo}
                  alt="AI"
                  width={32}
                  height={32}
                  className="h-full w-full object-contain invert"
                />
              </div>
              <div className="bg-gray-800 text-gray-100 rounded-2xl rounded-tl-sm p-3">
                <Loader2 size={20} className="animate-spin" />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ChatBox;

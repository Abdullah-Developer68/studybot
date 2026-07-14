"use client";
import useChatContext from "@/hooks/chat/useChatContext";
import type { CodeRendererProps } from "@studybot/types";
import {
  FileText,
  Loader2,
  Copy,
  Check,
  Pencil,
  RefreshCw,
} from "lucide-react";
import Image from "next/image";
import { assets } from "@studybot/assets/assets";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { useState, useCallback } from "react";
import WelcomeScreen from "./WelcomeScreen";
import { useChatStoreStates } from "@/stores/chatStore";
import { useHighlightLanguages } from "@/hooks/chat/useHighlightLanguages";
import useStreamingContent from "@/hooks/chat/useStreamingContent";

const ChatBox = () => {
  const { messages, status, error, isLoadingMessages, setMessages } =
    useChatContext();
  const { threads, activeThreadId } = useChatStoreStates();
  // Lazy-loads highlight.js language grammars based on code blocks in messages
  const { lowlight } = useHighlightLanguages(messages, status);
  // submitted = waiting for the first token; streaming = response is arriving.
  const isSubmitted = status === "submitted";
  const isStreaming = status === "streaming";

  // Model used by the active thread — shown on AI message actions.
  const activeThread = threads.find((t) => t.session_id === activeThreadId);
  const activeModelName = activeThread?.model ?? "";

  // Tracks which message's content was just copied to the clipboard.
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Tracks which user message is being edited and its draft content.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  // Compute the last assistant message's content so useStreamingContent
  // can be called exactly once at the top level (Rules of Hooks forbid
  // calling hooks inside .map). When there is no streaming assistant
  // message, pass an empty string and isStreamingLocal is false so the
  // hook is a no-op pass-through.
  // Inline extraction of text content from the last message. We can't call
  // getMessageContent here because it's declared later in the component and
  // const arrow functions aren't hoisted — so we replicate its small logic.
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const lastIsStreamingAssistant =
    isStreaming &&
    lastMessage?.role === "assistant";
  const lastMessageContent = lastMessage
    ? typeof lastMessage.content === "string"
      ? lastMessage.content
      : Array.isArray(lastMessage.parts)
        ? lastMessage.parts
            .filter((p: any) => p.type === "text")
            .map((p: any) => p.text)
            .join("")
        : ""
    : "";

  // Called once, unconditionally — keeps hook count stable across renders.
  const displayStreamedContent = useStreamingContent(
    lastMessageContent,
    !!lastIsStreamingAssistant,
  );

  const handleCopy = useCallback(async (messageId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (copyError) {
      console.error("Failed to copy message:", copyError);
    }
  }, []);

  const startEdit = (messageId: string, currentText: string) => {
    setEditingId(messageId);
    setEditDraft(currentText);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft("");
  };

  // Saves the edited user message, truncates the conversation after it,
  // and regenerates the AI response from that point.
  const confirmEdit = async () => {
    if (!editingId || !editDraft.trim()) {
      cancelEdit();
      return;
    }

    const editIndex = messages.findIndex(
      (m) => (m.id ?? String(messages.indexOf(m))) === editingId,
    );
    if (editIndex === -1) {
      cancelEdit();
      return;
    }

    const updatedMessages = messages
      .slice(0, editIndex + 1)
      .map((m, idx) =>
        idx === editIndex ? { ...m, content: editDraft.trim() } : m,
      );

    setMessages(updatedMessages);
    cancelEdit();

    // Future: trigger regeneration from the edited message once the chat
    // context exposes a reload method compatible with the current AI SDK version.
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      confirmEdit();
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  };

  // While existing messages are being fetched from the database (on mount
  // or thread switch), show a centered spinner instead of the welcome screen
  // or an empty chat — this prevents a flash of "no messages" before the
  // thread history loads.
  if (isLoadingMessages) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

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
  if (messages.length === 0 && !isSubmitted && !isStreaming) {
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

            // Only the last assistant message while streaming uses the
            // rAF-throttled content from the single top-level hook call.
            // All other messages pass through the raw content directly.
            const useStreamed =
              message.role === "assistant" &&
              lastIsStreamingAssistant &&
              index === messages.length - 1;
            const displayContent = useStreamed ? displayStreamedContent : content;

            if (message.role === "user") {
              const { fileNames, userRequest } = getUserDisplayContent(content);

              return (
                <div
                  key={index}
                  className="group flex justify-end items-start gap-2"
                >
                  <div className="flex flex-col items-end gap-1 max-w-[80%]">
                    {editingId === (message.id ?? String(index)) ? (
                      // Inline edit mode for user messages.
                      <div className="flex w-full flex-col gap-2">
                        <textarea
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          className="min-h-20 w-full resize-y rounded-2xl rounded-tr-sm border border-zinc-600 bg-gray-700 p-3 text-sm text-white outline-none focus:border-zinc-400"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={confirmEdit}
                            className="rounded bg-white px-3 py-1 text-xs font-medium text-zinc-900 hover:bg-zinc-100"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="bg-gray-700 text-white rounded-2xl rounded-tr-sm p-3">
                          {/* Show file attachment indicator(s) */}
                          {fileNames.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 mb-2 pb-2 border-b border-gray-600 text-sm text-blue-300">
                              {fileNames.map((fileName, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-1"
                                >
                                  <FileText size={14} />
                                  <span>{fileName}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="prose prose-sm prose-invert max-w-none wrap-break-words">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[[rehypeHighlight, { lowlight }]]}
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

                        {/* User message actions — visible on hover. */}
                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(
                                message.id ?? String(index),
                                userRequest,
                              )
                            }
                            className="flex items-center gap-1 rounded p-1.5 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                            title="Copy"
                          >
                            {copiedId === (message.id ?? String(index)) ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              startEdit(
                                message.id ?? String(index),
                                userRequest,
                              )
                            }
                            className="flex items-center gap-1 rounded p-1.5 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </>
                    )}
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
              // displayContent is already computed above the if/else —
              // for the streaming message it's the rAF-throttled value,
              // for completed assistant messages it's the raw content.
              return (
                <div
                  key={index}
                  className="flex justify-start items-start gap-2"
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
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="text-gray-100">
                      <div className="prose prose-sm prose-invert max-w-none wrap-break-words">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[[rehypeHighlight, { lowlight }]]}
                          components={{
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
                          {displayContent}
                        </ReactMarkdown>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              message.id ?? String(index),
                              displayContent,
                            )
                          }
                          className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                          title="Copy"
                        >
                          {copiedId ===
                          (message.id ?? String(index)) ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                          title="Regenerate"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      </div>
                      {activeModelName && (
                        <span className="text-xs text-zinc-500">
                          {activeModelName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
          })}

          {/* Typing indicator: shown only while waiting for the first token.
              Removed once streaming starts so the actual response renders cleanly. */}
          {isSubmitted && (
            <div className="flex justify-start items-start gap-2">
              <div className="bg-gray-800 rounded-2xl rounded-tl-sm p-4">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                </div>
              </div>
            </div>
          )}

          {/* Render any error from the chat transport so failures are not silent. */}
          {error && (
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
              <div className="border border-red-700 bg-red-900/40 text-red-200 rounded-2xl rounded-tl-sm p-3 text-sm max-w-[80%]">
                Something went wrong while contacting the AI. Please try again.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ChatBox;

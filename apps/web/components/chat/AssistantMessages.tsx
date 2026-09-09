import useStreamingContent from "@/hooks/chat/useStreamingContent";
import {
  Copy,
  Check,
  Pencil,
  RefreshCw,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { CodeRendererProps } from "@studybot/types";
import ShikiPre from "./ShikiPre";

// Three bouncing dots shown while the AI reply is pending. Rendered inside
// a chat bubble by ChatBox and disappears as soon as response text arrives.
const TypingDots = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center justify-center gap-1.5 ${className}`}>
    {[0, 1, 2].map((dotIndex) => (
      <span
        key={dotIndex}
        className="typing-dot h-2.5 w-2.5 rounded-full bg-zinc-300"
        style={{ animationDelay: `${dotIndex * 0.15}s` }}
      />
    ))}
  </div>
);

// Renders a single assistant message. Uses useStreamingContent to bypass
// React batching for the streaming message so text appears word-by-word at
// 60fps even as the markdown AST grows. Completed messages pass through
// with the raw content so ReactMarkdown renders once and stays stable.
const AssistantMessage = ({
  message,
  index,
  messagesLength,
  isStreaming,
  activeModelName,
  copiedId,
  onCopy,
}: {
  message: any;
  index: number;
  messagesLength: number;
  isStreaming: boolean;
  activeModelName: string;
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
}) => {
  // Only the last message while streaming benefits from rAF-throttled updates.
  const isLastAndStreaming = isStreaming && index === messagesLength - 1;
  // The response is only considered complete when generation has ended for
  // this message — action buttons stay hidden until then.
  const isComplete = !isLastAndStreaming;
  const rawContent =
    typeof message.content === "string"
      ? message.content
      : Array.isArray(message.parts)
        ? message.parts
            .filter((p: any) => p.type === "text")
            .map((p: any) => p.text)
            .join("")
        : "";

  // For the streaming message, throttle through rAF so React can't batch
  // multiple token updates into a single render. Completed messages pass
  // through directly.
  const content = useStreamingContent(rawContent, isLastAndStreaming);

  return (
    <div className="flex justify-start items-start gap-2">
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <div className="text-gray-100">
          <div className="prose prose-sm prose-invert max-w-none wrap-break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // ShikiPre highlights fenced code blocks with Shiki.
                pre: ShikiPre,
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

        {/* Actions appear only after the entire response has completed. */}
        {isComplete && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  onCopy(message.id ?? String(index), content)
                }
                className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                title="Copy"
              >
                {copiedId === (message.id ?? String(index)) ? (
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
        )}
      </div>
    </div>
  );
};

export { TypingDots };
export default AssistantMessage;

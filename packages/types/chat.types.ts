import { z } from "zod";
import type { ComponentPropsWithoutRef } from "react";

// this is for markdown in the AI chat
type CodeRendererProps = ComponentPropsWithoutRef<"code"> & {
  inline?: boolean;
  node?: unknown;
};

// props for the custom `pre` renderer in the AI chat markdown (Shiki highlighting)
type PreRendererProps = ComponentPropsWithoutRef<"pre"> & {
  node?: unknown;
};

// Roles the app-level chat history supports. The chat edge function accepts
// "tool" as well, but that lives in the function's own schema.
const ChatMessageRoleSchema = z.enum(["user", "assistant", "system"]);

// Attachment metadata embedded in a stored chat message.
const ChatAttachmentSchema = z.object({
  document_id: z.string(),
  name: z.string(),
  type: z.string(),
});

// Mirrors a row in the chat_sessions table.
const ChatThreadSchema = z.object({
  session_id: z.string(),
  profile_id: z.string(),
  title: z.string(),
  model: z.string(),
  is_archived: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Mirrors a row in the chat_messages table.
const ChatMessageSchema = z.object({
  message_id: z.string(),
  session_id: z.string(),
  role: ChatMessageRoleSchema,
  content: z.string(),
  attachments: z.array(ChatAttachmentSchema).optional(),
  created_at: z.string(),
});

// Types are inferred from the schemas so compile-time types and runtime
// validation can never drift apart.
type ChatThread = z.infer<typeof ChatThreadSchema>;
type ChatMessage = z.infer<typeof ChatMessageSchema>;

export {
  ChatMessageRoleSchema,
  ChatAttachmentSchema,
  ChatThreadSchema,
  ChatMessageSchema,
};
export type { ChatThread, ChatMessage, CodeRendererProps, PreRendererProps };
import { z } from "zod";

// Roles the chat endpoint accepts from clients.
const AllowedRolesSchema = z.enum(["user", "assistant", "system", "tool"]);

// Loose client message shape: text can arrive as `content`, `text`, or
// AI SDK message `parts`.
const IncomingMessageSchema = z.object({
  role: AllowedRolesSchema,
  content: z.string().optional(),
  text: z.string().optional(),
  parts: z
    .array(
      z.object({
        type: z.string().optional(),
        text: z.string().optional(),
      }),
    )
    .optional(),
});

// Request body sent from the client (ChatProvider). The handler cannot do any
// work without messages and a threadId, so the schema enforces them up front.
const ChatRequestBodySchema = z.object({
  messages: z.array(IncomingMessageSchema).min(1),
  model: z.string().optional(),
  threadId: z.string().min(1), // Session/thread ID to associate messages
});

// Types are inferred from the schemas so compile-time types and runtime
// validation can never drift apart.
type AllowedRoles = z.infer<typeof AllowedRolesSchema>;
type IncomingMessage = z.infer<typeof IncomingMessageSchema>;
type ChatRequestBody = z.infer<typeof ChatRequestBodySchema>;

export { AllowedRolesSchema, IncomingMessageSchema, ChatRequestBodySchema };
export type { IncomingMessage, AllowedRoles, ChatRequestBody };

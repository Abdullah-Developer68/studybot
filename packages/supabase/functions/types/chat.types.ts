// The edge function accepts the same chat payload shape used by useChat.
// We keep this loose because the client may send extra fields, but we only
// care about role, content, and assistant parts when building the prompt.
export type IncomingMessage = {
  role: "user" | "assistant" | "system" | string;
  content?: string;
  text?: string;
  parts?: Array<{ type?: string; text?: string }>;
};

// export type ChatRequestBody = {
//   messages?: IncomingMessage[];
//   model?: string;
//   session_id?: string;
// };

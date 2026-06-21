type AllowedRoles = "user" | "assistant" | "system" | "tool";

type IncomingMessage = {
  role: AllowedRoles;
  content?: string;
  text?: string;
  parts?: Array<{ type?: string; text?: string }>;
};

// Request body sent from the client (ChatProvider)
export type ChatRequestBody = {
  messages?: IncomingMessage[];
  model?: string;
  threadId?: string; // Session/thread ID to associate messages
};

export type { IncomingMessage, AllowedRoles };

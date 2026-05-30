
type AllowedRoles = "user" | "assistant" | "system" | "tool";

type IncomingMessage = {
  role: AllowedRoles;
  content?: string;
  text?: string;
  parts?: Array<{ type?: string; text?: string }>;
};

// export type ChatRequestBody = {
//   messages?: IncomingMessage[];
//   model?: string;
//   session_id?: string;
// };

export type { IncomingMessage, AllowedRoles };

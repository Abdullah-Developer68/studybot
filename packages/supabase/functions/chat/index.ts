import type { ModelMessage } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  IncomingMessage,
  AllowedRoles,
} from "@/types/chat.function.types.ts";
import type { SupabaseContext } from "@supabase/server";
import { streamText, smoothStream } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { withSupabase } from "@supabase/server";
import { corsHeaders } from "@supabase/supabase-js/cors";

const DEFAULT_MODEL = "nvidia/nemotron-3-nano-30b-a3b:free";

const supportedModels = new Set([
  "openai/gpt-5.5",
  "openai/gpt-5.4",
  "openai/gpt-imagegen-2",
  "openai/gpt-4o-mini",
  "anthropic/claude-3.5-haiku",
  "google/gemini-2.0-flash",
  "meta/llama-3.3-70b",
  "deepseek/deepseek-r1",
  DEFAULT_MODEL,
]);

const isSupportedRole = (role: unknown): role is AllowedRoles => {
  return (
    role === "user" ||
    role === "assistant" ||
    role === "system" ||
    role === "tool"
  );
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const extractAssistantTextFromParts = (
  parts: IncomingMessage["parts"],
): string => {
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((part) => part?.type === "text")
    .map((part) => part?.text ?? "")
    .join("");
};

const normalizeMessages = (messages: IncomingMessage[]): ModelMessage[] => {
  const normalized: ModelMessage[] = [];

  for (const message of messages) {
    if (!isSupportedRole(message.role)) {
      console.warn("Skipped message with unsupported role:", message.role);
      continue;
    }

    if (message.role === "tool") {
      console.warn("Skipped message with role 'tool' — not yet supported");
      continue;
    }

    if (Array.isArray(message.parts)) {
      const content = extractAssistantTextFromParts(message.parts).trim();
      if (!content) {
        console.warn("Skipped message with empty parts");
        continue;
      }
      normalized.push({ role: message.role, content });
      continue;
    }

    const content =
      typeof message.text === "string"
        ? message.text.trim()
        : typeof message.content === "string"
          ? message.content.trim()
          : "";
    if (!content) {
      console.warn("Skipped message with empty content. Message:", message);
      continue;
    }

    normalized.push({ role: message.role, content });
  }

  return normalized;
};

const storeMessage = async (
  supabase: SupabaseClient,
  sessionId: string,
  role: string,
  content: string,
) => {
  try {
    const { error } = await supabase.from("chat_messages").insert({
      session_id: sessionId,
      role,
      content,
      attachments: [],
    });

    if (error) {
      console.error("Failed to store message:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error storing message:", error);
    return false;
  }
};

const persistAssistantReply = async (
  stream: ReadableStream<Uint8Array>,
  supabase: SupabaseClient,
  threadId: string,
) => {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let assistantContent = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("0:")) {
        try {
          const chunk = JSON.parse(line.slice(2));
          if (typeof chunk === "string") assistantContent += chunk;
        } catch {
          // Skip malformed lines
        }
      }
    }
  }

  if (buffer.startsWith("0:")) {
    try {
      const chunk = JSON.parse(buffer.slice(2));
      if (typeof chunk === "string") assistantContent += chunk;
    } catch {
      // Ignore parse errors on the final fragment
    }
  }

  if (assistantContent.trim()) {
    await storeMessage(supabase, threadId, "assistant", assistantContent.trim());
  }
};

const unauthorizedResponse = () =>
  new Response(
    JSON.stringify({ error: "Unauthorized", code: "INVALID_CREDENTIALS" }),
    {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );

export default {
  fetch: withSupabase({ auth: "user" }, async (req: Request, ctx: SupabaseContext) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    // Only run the handler for authenticated users. withSupabase({ auth: "user" })
    // already rejects other modes, but this guard keeps the handler fail-closed.
    if (ctx.authMode === "user") {
      try {
        const openRouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
        if (!openRouterApiKey) {
          return jsonResponse(
            { error: "OPENROUTER_API_KEY is not configured" },
            500,
          );
        }

        const supabase = ctx.supabase;

        const body = (await req.json()) as {
          messages?: IncomingMessage[];
          model?: string;
          threadId?: string;
        };

        const incomingMessages = body?.messages;
        const threadId = body?.threadId;
        const selectedModel = supportedModels.has(body?.model ?? "")
          ? body.model!
          : DEFAULT_MODEL;

        if (!Array.isArray(incomingMessages) || incomingMessages.length === 0) {
          return jsonResponse({ error: "Messages are required" }, 400);
        }

        if (!threadId) {
          return jsonResponse({ error: "threadId is required" }, 400);
        }

        console.log(
          "Processing",
          incomingMessages.length,
          "incoming messages for thread:",
          threadId,
        );

        const transformedMessages = normalizeMessages(incomingMessages);

        if (transformedMessages.length === 0) {
          console.error("No messages survived normalization. Raw input:", incomingMessages);
          return jsonResponse({ error: "Messages must contain non-empty content" }, 400);
        }

        const lastMessage = transformedMessages[transformedMessages.length - 1];
        if (lastMessage.role === "user") {
          storeMessage(supabase, threadId, "user", String(lastMessage.content)).catch(
            (error) => {
              console.error("Failed to store user message, but continuing:", error);
            },
          );
        }

        const openrouter = createOpenRouter({ apiKey: openRouterApiKey });

        const result = streamText({
          model: openrouter(selectedModel),
          messages: transformedMessages,
        });

        const streamResponse = result.toUIMessageStreamResponse();
        const headers = new Headers(streamResponse.headers);

        Object.entries(corsHeaders).forEach(([key, value]) => {
          headers.set(key, value);
        });

        const streamBody = streamResponse.body;
        if (!streamBody) {
          return jsonResponse({ error: "Failed to create stream" }, 500);
        }

        const [bodyForClient, bodyForStorage] = streamBody.tee();

        persistAssistantReply(bodyForStorage, supabase, threadId).catch((error) => {
          console.error("Failed to persist assistant message:", error);
        });

        return new Response(bodyForClient, {
          status: streamResponse.status,
          statusText: streamResponse.statusText,
          headers,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        console.error("Chat function error:", message);
        return jsonResponse({ error: message }, 500);
      }
    }

    return unauthorizedResponse();
  }),
};

import type { ModelMessage } from "ai";
import type {
  IncomingMessage,
  AllowedRoles,
} from "@/types/chat.function.types.ts";
import { streamText, smoothStream } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { getSupabaseClient } from "@/_shared/supabaseClient.ts";

// CORS headers keep browser requests to this edge function working.
// The browser will send a preflight OPTIONS request before the actual chat POST,
// so these headers need to be present on both the preflight and the real response.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_MODEL = "poolside/laguna-xs.2:free";

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

// Used for debugging. Accepts any value, but returns true only if it is valid
const isSupportedRole = (role: unknown): role is AllowedRoles => {
  return (
    role === "user" ||
    role === "assistant" ||
    role === "system" ||
    role === "tool"
  );
};

// Small helper for consistent JSON error responses.
// It ensures all non-streaming errors return the same JSON shape and CORS headers.
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

const extractAssistantTextFromParts = (
  parts: IncomingMessage["parts"],
): string => {
  if (!Array.isArray(parts)) return "";
  // Convert parts (individual strings) into 1 string
  return parts
    .filter((part) => part?.type === "text")
    .map((part) => part?.text ?? "")
    .join("");
};

// Normalize user/assistant/tools messages into the strict AI SDK ModelMessage format.
const normalizeMessages = (messages: IncomingMessage[]): ModelMessage[] => {
  const normalized: ModelMessage[] = [];

  for (const message of messages) {
    // Warn about skipped messages due to unsupported role
    if (!isSupportedRole(message.role)) {
      console.warn("Skipped message with unsupported role:", message.role);
      continue;
    }

    // Tools will be supported later.
    if (message.role === "tool") {
      console.warn(
        "Skipped message with role 'tool' since tools are not supported in this example",
      );
      continue;
    }

    // Handle messages that arrive with a parts array (either user or assistant)
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

// Helper to store message in database
const storeMessage = async (
  supabase: ReturnType<typeof getSupabaseClient>,
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

// Reads one branch of the teed UI message stream, extracts text deltas,
// and persists the assistant's final reply. Runs in the background so it
// never blocks or locks the response stream returned to the client.
const persistAssistantReply = async (
  stream: ReadableStream<Uint8Array>,
  supabase: ReturnType<typeof getSupabaseClient>,
  threadId: string,
) => {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let assistantContent = "";
  let buffer = "";

  // The AI SDK UI Message Stream wire format is line-based: each line is
  // `<type>:<json-value>`. Type "0" is a text-delta whose value is a
  // JSON-encoded string chunk. Other types (finish, data, etc.) are ignored.
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    // Keep the last (possibly incomplete) chunk in the buffer for next read.
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("0:")) {
        try {
          const chunk = JSON.parse(line.slice(2));
          if (typeof chunk === "string") assistantContent += chunk;
        } catch {
          // Skip malformed lines — the stream may emit non-text parts.
        }
      }
    }
  }

  // Flush any trailing line left in the buffer after the stream ends.
  if (buffer.startsWith("0:")) {
    try {
      const chunk = JSON.parse(buffer.slice(2));
      if (typeof chunk === "string") assistantContent += chunk;
    } catch {
      // Ignore parse errors on the final fragment.
    }
  }

  if (assistantContent.trim()) {
    await storeMessage(
      supabase,
      threadId,
      "assistant",
      assistantContent.trim(),
    );
  }
};

Deno.serve(async (req: Request) => {
  // Preflight requests must return immediately for browser clients.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only POST is supported because the chat client sends message payloads.
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // The OpenRouter key is injected as a Supabase secret at deploy time.
    const openRouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openRouterApiKey) {
      return jsonResponse(
        { error: "OPENROUTER_API_KEY is not configured" },
        500,
      );
    }

    // Initialize Supabase client using shared helper (respects RLS with user's auth token)
    const supabase = getSupabaseClient(req);

    // useChat sends a JSON body containing the conversation history.
    // We read the messages array, model, and threadId.
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

    // Validate required inputs
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

    // Convert the loose client payload into the exact message format the AI SDK expects.
    const transformedMessages = normalizeMessages(incomingMessages);

    if (transformedMessages.length === 0) {
      console.error(
        "No messages survived normalization. Raw input:",
        incomingMessages,
      );
      return jsonResponse(
        { error: "Messages must contain non-empty content" },
        400,
      );
    }

    // Store the user's message (the last message in the array)
    const lastMessage = transformedMessages[transformedMessages.length - 1];
    if (lastMessage.role === "user") {
      const stored = await storeMessage(
        supabase,
        threadId,
        "user",
        lastMessage.content,
      );
      if (!stored) {
        console.warn(
          "Failed to store user message, but continuing with AI response",
        );
      }
    }

    const openrouter = createOpenRouter({
      apiKey: openRouterApiKey,
    });

    // streamText returns an AI SDK stream response that can be forwarded to the client.
    // This is what gives you token-by-token streaming instead of waiting for a full response.
    const result = streamText({
      model: openrouter(selectedModel),
      messages: transformedMessages,
      experimental_transform: smoothStream({
        chunking: "word",
      }),
    });

    const streamResponse = result.toUIMessageStreamResponse();

    // Rebuild headers so the streaming response still includes CORS metadata.
    // Without this, the browser could block the streamed response even though the server succeeded.
    const headers = new Headers(streamResponse.headers);

    Object.entries(corsHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });

    // Tee the response body so the client gets one branch (streamed live)
    // and the other branch is consumed in the background to persist the
    // assistant's reply. tee() locks streamResponse.body but returns two
    // independent branches, so we return bodyForClient — not the locked
    // original — and never await the storage work before responding.
    // The previous implementation accessed result.text, which shares the
    // same underlying stream as toUIMessageStreamResponse() and locks it,
    // causing a "ReadableStream is locked or disturbed" TypeError on every
    // request. Teeing the already-created response body avoids that entirely.
    const streamBody = streamResponse.body;
    if (!streamBody) {
      return jsonResponse({ error: "Failed to create stream" }, 500);
    }

    const [bodyForClient, bodyForStorage] = streamBody.tee();

    // Fire-and-forget: persist the assistant reply after the stream finishes.
    persistAssistantReply(bodyForStorage, supabase, threadId).catch((error) => {
      console.error("Failed to persist assistant message:", error);
    });

    return new Response(bodyForClient, {
      status: streamResponse.status,
      statusText: streamResponse.statusText,
      headers,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    console.error("Chat function error:", message);
    return jsonResponse({ error: message }, 500);
  }
});

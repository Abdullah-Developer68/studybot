/// <reference path="../deno-globals.d.ts" />
import type { ModelMessage } from "ai";
import type { IncomingMessage } from "@/types/chat.types.ts";
import { streamText, smoothStream } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

// CORS headers keep browser requests to this edge function working.
// The browser will send a preflight OPTIONS request before the actual chat POST,
// so these headers need to be present on both the preflight and the real response.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_MODEL = "z-ai/glm-4.5-air:free";

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

// AI SDK model messages only support a limited set of roles here.
// This guard lets TypeScript narrow a generic string role into a valid AI SDK role.
const isSupportedRole = (
  role: IncomingMessage["role"],
): role is "user" | "assistant" | "system" => {
  return role === "user" || role === "assistant" || role === "system";
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
  // Assistant messages can arrive as structured parts instead of a single string.
  // We only keep text parts here and ignore any non-text content.
  return parts
    .filter((part) => part?.type === "text")
    .map((part) => part?.text ?? "")
    .join("");
};

// Normalize user/assistant messages into the strict AI SDK ModelMessage format.
// This step protects the AI call from unsupported roles and empty messages,
// which can happen because the chat client sends the full conversation state.
const normalizeMessages = (messages: IncomingMessage[]): ModelMessage[] => {
  const normalized: ModelMessage[] = [];

  for (const message of messages) {
    if (!isSupportedRole(message.role)) {
      console.warn("Skipped message with unsupported role:", message.role);
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

    // useChat sends a JSON body containing the conversation history.
    // We only read the messages array and ignore everything else.
    const body = (await req.json()) as {
      messages?: IncomingMessage[];
      model?: string;
    };
    const incomingMessages = body?.messages;
    const selectedModel = supportedModels.has(body?.model ?? "")
      ? body.model!
      : DEFAULT_MODEL;

    if (!Array.isArray(incomingMessages) || incomingMessages.length === 0) {
      return jsonResponse({ error: "Messages are required" }, 400);
    }

    console.log("Processing", incomingMessages.length, "incoming messages");

    // Convert the loose client payload into the exact message format the AI SDK expects.
    const transformedMessages = normalizeMessages(incomingMessages);

    if (transformedMessages.length === 0) {
      console.error(
        "No messages survived normalization. Raw input:",
        incomingMessages
      );
      return jsonResponse(
        { error: "Messages must contain non-empty content" },
        400,
      );
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
        delayInMs: 10,
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

    return new Response(streamResponse.body, {
      status: streamResponse.status,
      statusText: streamResponse.statusText,
      headers,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return jsonResponse({ error: message }, 500);
  }
});

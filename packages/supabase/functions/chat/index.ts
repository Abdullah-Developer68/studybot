import type { ModelMessage } from "ai";
import {
  ChatRequestBodySchema,
  type AllowedRoles,
  type Attachment,
  type IncomingMessage,
  type RetrievedChunk,
} from "@/types/chat.function.types.ts";
import { smoothStream, streamText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { GoogleGenAI } from "@google/genai";
import { withSupabase } from "@supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupabaseContext } from "@supabase/server";

// CORS headers keep browser requests to this edge function working.
// The browser will send a preflight OPTIONS request before the actual chat POST,
// so these headers need to be present on both the preflight and the real response.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_MODEL = "cohere/north-mini-code:free";

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

    // TODO: Tools will be supported later.
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

    const content = typeof message.text === "string"
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

// Helper to store message in database. Accepts optional attachments metadata so
// user messages persist the document_id links the client sends.
const storeMessage = async (
  supabase: SupabaseClient,
  sessionId: string,
  role: string,
  content: string,
  attachments: Attachment[] = [],
) => {
  // Keep only the safe fields that match the chat_messages JSONB contract.
  const storedAttachments = attachments
    .filter((a) => a.document_id)
    .map((a) => ({
      document_id: a.document_id,
      name: a.name ?? null,
      type: a.type ?? null,
    }));

  try {
    const { error } = await supabase.from("chat_messages").insert({
      session_id: sessionId,
      role,
      content,
      attachments: storedAttachments,
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

// Supabase's edge runtime cancels pending work once a request's response has
// finished unless the promise is registered through EdgeRuntime.waitUntil.
// All fire-and-forget persistence tasks must go through this helper so they
// survive until they settle. Falls back to a plain catch when the global is
// unavailable (local Deno/Node tooling outside the edge runtime).
const runInBackground = (task: Promise<unknown>) => {
  const runtime = (
    globalThis as {
      EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void };
    }
  ).EdgeRuntime;
  if (typeof runtime?.waitUntil === "function") {
    runtime.waitUntil(task);
  } else {
    task.catch(() => {});
  }
};

// Reads one branch of the teed UI message stream and persists the
// assistant's final reply. Runs in the background so it never blocks
// or locks the response stream returned to the client.
//
// Wire format (AI SDK v6 toUIMessageStreamResponse): SSE events where each
// "data:" line carries one JSON object. Assistant text arrives as
// {"type":"text-delta","id":"…","delta":"…"} chunks — every other part type
// is ignored. The legacy v4 data-stream protocol ("0:\"…\"") is still
// tolerated for older clients.
const persistAssistantReply = async (
  stream: ReadableStream<Uint8Array>,
  supabase: SupabaseClient,
  threadId: string,
) => {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let assistantContent = "";
  let buffer = "";

  // Extracts text from one wire line. Both protocols are line-based and
  // self-contained, so processing per newline is sufficient.
  const handleLine = (line: string) => {
    const trimmed = line.trim();
    let payload = "";
    if (trimmed.startsWith("data:")) {
      // SSE format: "data: <json>" (or "data: [DONE]" as terminator).
      payload = trimmed.slice("data:".length).trim();
    } else if (trimmed.startsWith("0:")) {
      // Legacy data-stream protocol fallback.
      payload = trimmed.slice(2);
    } else {
      return;
    }
    if (!payload || payload === "[DONE]") return;

    try {
      const chunk = JSON.parse(payload);
      if (typeof chunk === "string") {
        // Legacy protocol: text deltas were plain JSON strings.
        assistantContent += chunk;
      } else if (
        chunk !== null &&
        typeof chunk === "object" &&
        chunk.type === "text-delta" &&
        typeof chunk.delta === "string"
      ) {
        assistantContent += chunk.delta;
      }
    } catch {
      // Skip malformed lines — the stream may emit non-text events.
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    // Keep the last (possibly incomplete) chunk in the buffer for next read.
    buffer = lines.pop() ?? "";

    for (const line of lines) handleLine(line);
  }

  // Flush any trailing line left in the buffer after the stream ends.
  if (buffer) handleLine(buffer);

  if (assistantContent.trim()) {
    await storeMessage(
      supabase,
      threadId,
      "assistant",
      assistantContent.trim(),
    );
  }
};

// ---- RAG retrieval helpers -------------------------------------------------

const EMBED_MODEL = "gemini-embedding-001";
const EMBED_DIMENSIONS = 768; // must match the vector(768) column / ingest function
const MATCH_COUNT = 8;
const MAX_CONTEXT_CHUNKS = 8;

// Google requires manual L2 normalization below 3072 dims. Normalizing the query
// puts it in the same normalized space as the stored document vectors, so the
// pgvector cosine operator returns true cosine similarity.
const l2Normalize = (vector: number[]): number[] => {
  const norm = Math.sqrt(vector.reduce((sum, x) => sum + x * x, 0)) || 1;
  return vector.map((x) => x / norm);
};

// Embed the user's question as a RETRIEVAL_QUERY vector. Using a different
// taskType than ingestion (RETRIEVAL_DOCUMENT) improves retrieval quality.
const embedQuery = async (
  genai: GoogleGenAI,
  query: string,
): Promise<number[]> => {
  const result = await genai.models.embedContent({
    model: EMBED_MODEL,
    contents: [query],
    config: {
      taskType: "RETRIEVAL_QUERY",
      outputDimensionality: EMBED_DIMENSIONS,
    },
  });
  const values = result.embeddings?.[0]?.values ?? [];
  return l2Normalize(values);
};

// Link documents the client attached (uploaded before a thread existed) to this
// thread so the match_document_chunks RPC can scope retrieval by session. RLS
// guarantees only the caller's own documents can be updated.
const linkDocumentsToThread = async (
  supabase: SupabaseClient,
  threadId: string,
  attachments: Attachment[] | undefined,
) => {
  const documentIds = (attachments ?? [])
    .map((a) => a.document_id)
    .filter((id): id is string => Boolean(id));
  if (documentIds.length === 0) return;

  const { error } = await supabase
    .from("documents")
    .update({ session_id: threadId })
    .in("document_id", documentIds)
    .is("session_id", null);
  if (error) {
    console.error("Failed to link documents to thread:", error.message);
  }
};

// Embed the query and run similarity search against this thread's chunks.
// Never throws: retrieval is best-effort and the chat must keep working even if
// the embedding API or the RPC fails.
const retrieveContext = async (
  supabase: SupabaseClient,
  threadId: string,
  queryText: string,
): Promise<RetrievedChunk[]> => {
  const apiKey = Deno.env.get("GOOGLE_API_KEY");
  if (!apiKey || !queryText.trim()) return [];

  try {
    const genai = new GoogleGenAI({ apiKey });
    const queryVec = await embedQuery(genai, queryText);

    const { data, error } = await supabase.rpc("match_document_chunks", {
      p_session_id: threadId,
      p_query_embedding: `[${queryVec.join(",")}]`,
      p_match_count: MATCH_COUNT,
    });
    if (error) throw error;

    return (data ?? []) as RetrievedChunk[];
  } catch (error) {
    console.error("Retrieval failed, continuing without context:", error);
    return [];
  }
};

// Build a labeled context block from retrieved chunks for the system prompt.
const buildContextMessage = (chunks: RetrievedChunk[], queryText: string) => {
  const contextText = chunks
    .slice(0, MAX_CONTEXT_CHUNKS)
    .map((chunk) => {
      const page = chunk.metadata?.page;
      const sheet = chunk.metadata?.sheet;
      const location = page != null
        ? `, Page: ${page}`
        : sheet != null
          ? `, Sheet: ${sheet}`
          : "";
      return `[Document: ${chunk.document_name}${location}]\n${chunk.content}`;
    })
    .join("\n\n---\n\n");

  return {
    role: "system" as const,
    content:
      `You are helping the user with a question about their uploaded documents. ` +
      `Use ONLY the context below to answer; if it is insufficient, say so. ` +
      `Cite the document name and page/sheet where relevant.\n\n` +
      `User question:\n${queryText}\n\n` +
      `Relevant context:\n${contextText}`,
  };
};

// Generates a short conversation title from the thread's first user message
// and persists it on the chat_sessions row. Only runs on the first exchange
// (exactly one user message, no assistant reply yet). Called fire-and-forget
// so title generation never delays the streamed chat response.
const generateThreadTitle = async (
  openrouter: ReturnType<typeof createOpenRouter>,
  supabase: SupabaseClient,
  threadId: string,
  messages: ModelMessage[],
) => {
  const userMessages = messages.filter((m) => m.role === "user");
  const assistantMessages = messages.filter((m) => m.role === "assistant");
  if (userMessages.length !== 1 || assistantMessages.length > 0) return;

  // Cap the input so a very long first message doesn't blow up the title prompt.
  const firstUserText = String(userMessages[0].content).slice(0, 500);

  const result = streamText({
    model: openrouter(DEFAULT_MODEL),
    system:
      "Generate a concise title of 3-6 words summarizing the user's message. " +
      "Reply with the title only — no quotes, no trailing punctuation.",
    prompt: firstUserText,
  });

  const rawTitle = await result.text;
  const title = rawTitle
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 60);

  if (!title) return;

  const { error } = await supabase
    .from("chat_sessions")
    .update({ title })
    .eq("session_id", threadId);

  if (error) {
    console.error("Failed to save generated thread title:", error.message);
  } else {
    console.log("Generated thread title:", title);
  }
};

// withSupabase verifies the caller's session JWT (auth: "user") against the
// project's JWKS before the handler runs, answers OPTIONS preflights before
// the auth check, and returns a 401 automatically on missing or invalid
// credentials. ctx.supabase arrives already scoped to the caller's RLS policies.
export default {
  fetch: withSupabase({ auth: "user" }, async (req: Request, ctx: SupabaseContext) => {
    // Safety net only — the wrapper already answers preflights before auth.
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

      // RLS-scoped client for the verified user, provided by withSupabase.
      const supabase = ctx.supabase;

      // Verified identity from the JWT — no extra auth round-trip needed.
      console.log("Authenticated user:", ctx.userClaims?.id);

      // useChat sends a JSON body containing the conversation history.
      // The body is untrusted input, so validate it against the zod schema
      // instead of casting — malformed payloads get a 400 with a useful
      // message, and required fields (messages, threadId) are enforced by
      // the schema itself.
      const parsedBody = ChatRequestBodySchema.safeParse(await req.json());
      if (!parsedBody.success) {
        return jsonResponse(
          {
            error: parsedBody.error.issues[0]?.message ??
              "Invalid request body",
          },
          400,
        );
      }

      const body = parsedBody.data;
      const incomingMessages = body.messages;
      const threadId = body.threadId;
      const selectedModel = supportedModels.has(body.model ?? "")
        ? body.model!
        : DEFAULT_MODEL;

      console.log(
        "Processing",
        incomingMessages.length,
        "incoming messages for thread:",
        threadId,
      );

      // Convert the loose client payload into the exact message format the AI SDK expects.
      // Declared with `let` because retrieval prepends a context system message below.
      let transformedMessages = normalizeMessages(incomingMessages);

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

      // Store the user's message (the last message in the array) and keep its
      // text so it can be embedded for retrieval below.
      const lastMessage = transformedMessages[transformedMessages.length - 1];
      let lastUserText = "";
      if (lastMessage.role === "user") {
        lastUserText = String(lastMessage.content);
        console.log("Type of LastMessage.content:", typeof lastUserText);
        // Fire-and-forget via runInBackground so TTFT is not affected and
        // the insert still survives after the response finishes.
        runInBackground(
          storeMessage(
            supabase,
            threadId,
            "user",
            lastUserText,
            body.attachments,
          ).catch((error) => {
            console.error(
              "Failed to store user message, but continuing with AI response:",
              error,
            );
          }),
        );
      }

      // RAG: link any freshly-attached documents to this thread (owned rows
      // only, enforced by RLS), then retrieve relevant chunks for the question.
      // best-effort — if retrieval fails we stream normally without context.
      await linkDocumentsToThread(supabase, threadId, body.attachments);
      const retrieved = await retrieveContext(supabase, threadId, lastUserText);
      if (retrieved.length > 0) {
        transformedMessages = [
          buildContextMessage(retrieved, lastUserText),
          ...transformedMessages,
        ];
      }

      const openrouter = createOpenRouter({
        apiKey: openRouterApiKey,
      });

      // Fire-and-forget: auto-title the thread after its first user message.
      runInBackground(
        generateThreadTitle(openrouter, supabase, threadId, transformedMessages)
          .catch((error) => {
            console.error("Failed to generate thread title:", error);
          }),
      );

      // streamText returns an AI SDK stream response that can be forwarded to the client.
      // This is what gives you token-by-token streaming instead of waiting for a full response.
      const result = streamText({
        model: openrouter(selectedModel),
        messages: transformedMessages,
        experimental_transform: smoothStream(),
      });

      // Fan-out instead of tee(): the generation stream is read exactly once
      // by a background pump that writes every chunk into two independent
      // channels — one streamed to the client, one consumed for persistence.
      // With tee(), a client disconnect cancels the client branch and can
      // tear down the shared source, truncating the stored reply. With this
      // pump, a failed client write merely stops feeding the socket while
      // generation runs to completion, so switching threads or closing the
      // tab mid-answer never loses the assistant message.
      const generationStream = result.toUIMessageStream();

      const clientChannel = new TransformStream<Uint8Array, Uint8Array>();
      const persistChannel = new TransformStream<Uint8Array, Uint8Array>();

      const clientWriter = clientChannel.writable.getWriter();
      const persistWriter = persistChannel.writable.getWriter();

      // The UI message stream yields structured chunk objects; both channels
      // carry the SSE wire encoding ("data: <json>\n\n") so the persistence
      // parser and the browser transport read the same format.
      const sseEncoder = new TextEncoder();
      const encodeChunk = (chunk: unknown): Uint8Array =>
        sseEncoder.encode(`data: ${JSON.stringify(chunk)}\n\n`);

      let clientAlive = true;

      runInBackground(
        (async () => {
          const reader = generationStream.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (!value) continue;

              if (clientAlive) {
                try {
                  await clientWriter.write(encodeChunk(value));
                } catch {
                  // Client went away mid-stream — stop writing to it but
                  // keep draining the model output for persistence below.
                  clientAlive = false;
                  clientWriter.releaseLock();
                }
              }

              await persistWriter.write(encodeChunk(value));
            }

            if (clientAlive) {
              // SSE terminator expected by the browser transport.
              await clientWriter
                .write(sseEncoder.encode("data: [DONE]\n\n"))
                .catch(() => {});
              await clientWriter.close().catch(() => {});
            }
          } catch (error) {
            // Generation itself errored — propagate to the client if it is
            // still connected, otherwise just log; persistence gets closed
            // in finally with whatever completed.
            if (clientAlive) {
              await clientWriter.abort(error).catch(() => {});
            }
            throw error;
          } finally {
            await persistWriter.close().catch(() => {});
          }
        })().catch((error) => {
          console.error("Chat stream pump failed:", error);
        }),
      );

      // Fire-and-forget: persist the assistant reply as the stream finishes.
      // runInBackground keeps the task alive once the response body completes.
      runInBackground(
        persistAssistantReply(persistChannel.readable, supabase, threadId)
          .catch((error) => {
            console.error("Failed to persist assistant message:", error);
          }),
      );

      // Rebuild the UI message stream response manually so CORS metadata is
      // present and the headers match what the AI SDK's browser transport
      // expects (SSE + v1 protocol marker).
      const headers = new Headers({ ...corsHeaders });
      headers.set("Content-Type", "text/event-stream");
      headers.set("Cache-Control", "no-cache");
      headers.set("Connection", "keep-alive");
      headers.set("x-vercel-ai-ui-message-stream", "v1");
      headers.set("x-accel-buffering", "no");

      return new Response(clientChannel.readable, {
        status: 200,
        headers,
      });
    } catch (error: unknown) {
      const message = error instanceof Error
        ? error.message
        : "Internal Server Error";
      console.error("Chat function error:", message);
      return jsonResponse({ error: message }, 500);
    }
  }),
};

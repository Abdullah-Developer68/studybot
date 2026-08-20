import type { ModelMessage } from "ai";
import {
  ChatRequestBodySchema,
  type AllowedRoles,
  type Attachment,
  type IncomingMessage,
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

// Reads one branch of the teed UI message stream, extracts text deltas,
// and persists the assistant's final reply. Runs in the background so it
// never blocks or locks the response stream returned to the client.
const persistAssistantReply = async (
  stream: ReadableStream<Uint8Array>,
  supabase: SupabaseClient,
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

// ---- RAG retrieval helpers -------------------------------------------------

const EMBED_MODEL = "gemini-embedding-001";
const EMBED_DIMENSIONS = 768; // must match the vector(768) column / ingest function
const MATCH_COUNT = 8;
const MAX_CONTEXT_CHUNKS = 8;

// Shape of one row returned by the match_document_chunks RPC.
type RetrievedChunk = {
  content: string;
  metadata?: { source?: string; page?: number; sheet?: string; chunkIndex?: number } | null;
  similarity: number;
  document_name: string;
  document_id: string;
};

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

// withSupabase verifies the caller's session JWT (auth: "user") against the

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
        // Removed the usage of await so TTFT can be improved.
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
        });
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

      // streamText returns an AI SDK stream response that can be forwarded to the client.
      // This is what gives you token-by-token streaming instead of waiting for a full response.
      const result = streamText({
        model: openrouter(selectedModel),
        messages: transformedMessages,
        experimental_transform: smoothStream(),
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
      persistAssistantReply(bodyForStorage, supabase, threadId).catch(
        (error) => {
          console.error("Failed to persist assistant message:", error);
        },
      );

      return new Response(bodyForClient, {
        status: streamResponse.status,
        statusText: streamResponse.statusText,
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

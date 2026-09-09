"use client";

import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import type {
  ChatRegistryCallbacks,
  ChatRegistryConfig,
} from "@/types/chatRegistry.types";

// Static env access per AGENTS.md — Next.js inlines these at build time.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

// Resolved at request time so token refreshes are always picked up.
let getAccessToken: () => string | null | undefined = () => null;
let registryCallbacks: ChatRegistryCallbacks = {};

export const configureChatRegistry = (config: ChatRegistryConfig) => {
  getAccessToken = config.getAccessToken;
  if (config.callbacks) registryCallbacks = config.callbacks;
};

// Upper bound on cached conversations. Evicted chats lose only their
// in-memory copy — the DB remains the source of truth on next visit.
const MAX_CACHED_CHATS = 10;

const chats = new Map<string, Chat<UIMessage>>();

const createChat = (threadId: string): Chat<UIMessage> =>
  new Chat<UIMessage>({
    id: threadId,
    transport: new DefaultChatTransport({
      api: supabaseUrl ? `${supabaseUrl}/functions/v1/chat` : "/api/chat",
      headers: () => {
        const accessToken = getAccessToken();
        return {
          // The chat edge function uses auth: "user", so Authorization must
          // carry the session access token. The publishable key goes on the
          // apikey header only — sending it as the bearer fails the JWT check.
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          apikey: supabaseKey || "",
        };
      },
    }),
    onFinish: (info) => registryCallbacks.onFinish?.(threadId, info),
    onError: () => registryCallbacks.onError?.(threadId),
  });

// Returns the long-lived Chat instance for a thread, creating it on first
// use. Each instance keeps consuming its stream even when no component is
// subscribed to it, which is what lets users switch threads mid-generation.
export const getOrCreateChat = (threadId: string): Chat<UIMessage> => {
  const existing = chats.get(threadId);
  if (existing) return existing;

  // Simple eviction: drop the oldest idle conversation once over the cap.
  if (chats.size >= MAX_CACHED_CHATS) {
    for (const [candidateId, candidateChat] of chats) {
      if (candidateChat.status === "ready" || candidateChat.status === "error") {
        chats.delete(candidateId);
        break;
      }
    }
  }

  const chat = createChat(threadId);
  chats.set(threadId, chat);
  return chat;
};

// Drops a thread's in-memory conversation (called when the thread is deleted).
export const releaseChat = (threadId: string) => {
  chats.delete(threadId);
};

// Binding target for useChat when no thread is active — never sent to.
const detachedChats = new WeakMap<object, Chat<UIMessage>>();
export const getDetachedChat = (scope: object): Chat<UIMessage> => {
  let detached = detachedChats.get(scope);
  if (!detached) {
    detached = new Chat<UIMessage>({ transport: new DefaultChatTransport() });
    detachedChats.set(scope, detached);
  }
  return detached;
};

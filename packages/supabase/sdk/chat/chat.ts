import { getSupabase } from "../client/client";
import type { ChatThread, ChatMessage } from "../types/chat.sdk.types";

// Makes sure the signed-in user has a profile row before we create a chat session.
const ensureProfileExists = async (userId: string) => {
  const supabase = getSupabase();
  const { data: userResult, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  const user = userResult?.user;
  const name =
    user?.user_metadata?.name ?? user?.email?.split("@")[0] ?? "User";
  const email = user?.email ?? null;
  const profilePic = user?.user_metadata?.avatar_url ?? null;

  const { error } = await supabase.from("profiles").upsert(
    {
      profile_id: userId,
      name,
      email,
      profile_pic: profilePic,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "profile_id",
    },
  );

  if (error) {
    throw new Error(error.message);
  }
};

// Creates a new chat thread in the database.
const createChatThread = async (
  userId: string,
  title: string = "New Chat",
  model: string = "poolside/laguna-xs.2:free",
): Promise<ChatThread | null> => {
  try {
    const supabase = getSupabase();
    await ensureProfileExists(userId);

    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({
        profile_id: userId,
        title,
        model,
        is_archived: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create thread:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return null;
    }

    return data as ChatThread;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create thread";
    console.error("Failed to create thread:", message);
    return null;
  }
};

// Fetches all threads for a given user from the database.
const fetchUserThreads = async (userId: string): Promise<ChatThread[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("chat_sessions")
    .select()
    .eq("profile_id", userId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch threads:", error);
    return [];
  }

  return data as ChatThread[];
};

// Fetches a thread with its messages from the database.
const fetchThreadWithMessages = async (
  threadId: string,
  userId: string,
): Promise<{ thread: ChatThread | null; messages: ChatMessage[] }> => {
  const supabase = getSupabase();
  const { data: threadData, error: threadError } = await supabase
    .from("chat_sessions")
    .select()
    .eq("session_id", threadId)
    .eq("profile_id", userId)
    .single();

  if (threadError) {
    console.error("Failed to fetch thread:", threadError);
    return { thread: null, messages: [] };
  }

  const { data: messageData, error: messageError } = await supabase
    .from("chat_messages")
    .select()
    .eq("session_id", threadId)
    // Ascending so oldest messages come first — this is the order the
    // AI SDK useChat expects when seeding initial conversation history.
    .order("created_at", { ascending: true });

  if (messageError) {
    console.error("Failed to fetch messages:", messageError);
    return { thread: threadData as ChatThread, messages: [] };
  }

  return {
    thread: threadData as ChatThread,
    messages: messageData as ChatMessage[],
  };
};

// Update thread title
const updateThreadTitle = async (
  threadId: string,
  title: string,
): Promise<ChatThread | null> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("chat_sessions")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("session_id", threadId)
    .select()
    .single();

  if (error) {
    console.error("Failed to update thread:", error);
    return null;
  }

  return data as ChatThread;
};

// Archive thread (soft-delete — sets is_archived = true).
const archiveThread = async (threadId: string): Promise<boolean> => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("chat_sessions")
    .update({ is_archived: true })
    .eq("session_id", threadId);

  if (error) {
    console.error("Failed to archive thread:", error);
    return false;
  }

  return true;
};

// Delete thread (hard-delete — removes the row; messages cascade via FK).
const deleteThread = async (threadId: string): Promise<boolean> => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("chat_sessions")
    .delete()
    .eq("session_id", threadId);

  if (error) {
    console.error("Failed to delete thread:", error);
    return false;
  }

  return true;
};

export {
  createChatThread,
  fetchUserThreads,
  fetchThreadWithMessages,
  updateThreadTitle,
  archiveThread,
  deleteThread,
};

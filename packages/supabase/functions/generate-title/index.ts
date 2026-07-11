import { withSupabase } from "@supabase/server";
import type { SupabaseContext } from "@supabase/server";
import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { corsHeaders } from "@supabase/supabase-js/cors";

// Use the same free default model as the chat function.
const TITLE_MODEL = "nvidia/nemotron-3-nano-30b-a3b:free";

// Builds a single prompt that instructs the model to produce a title.
// Uses a plain-prompt format (no system prompt) because smaller models
// often ignore system prompts and work better with a single instruction.
const buildTitlePrompt = (message: string): string => {
  return [
    "Task: Write a very short title (under 50 characters) that summarizes this chat message.",
    "Return only the title text. No quotes, no prefixes, no explanations.",
    "",
    `Message: "${message}"`,
    "",
    "Title:",
  ].join("\n");
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
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Only run the handler for authenticated users. withSupabase({ auth: "user" })
    // already rejects other modes, but this guard keeps the handler fail-closed.
    if (ctx.authMode === "user") {
      try {
        const openRouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
        if (!openRouterApiKey) {
          return new Response(
            JSON.stringify({ error: "OPENROUTER_API_KEY is not configured" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const body = (await req.json()) as { message?: string };
        const message = body?.message?.trim();

        if (!message) {
          return new Response(
            JSON.stringify({ error: "message is required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const openrouter = createOpenRouter({
          apiKey: openRouterApiKey,
        });

        // Truncate the message to 300 chars to keep the prompt small and fast.
        const truncatedMessage =
          message.length > 300 ? message.slice(0, 300) + "..." : message;

        const { text: rawTitle } = await generateText({
          model: openrouter(TITLE_MODEL),
          prompt: buildTitlePrompt(truncatedMessage),
          // Keep generation small and fast — titles should be short.
          maxTokens: 30,
          temperature: 0.3,
        });

        const title = rawTitle.trim().slice(0, 50);

        return new Response(JSON.stringify({ title }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        console.error("generate-title error:", message);
        return new Response(
          JSON.stringify({ error: message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    return unauthorizedResponse();
  }),
};

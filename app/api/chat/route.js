import { streamText } from "ai";
import { NextResponse } from "next/server";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req) {
  try {
    const body = await req.json();

    // useChat sends { messages: [...] }, not { prompt: "..." }
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new NextResponse("Messages are required", { status: 400 });
    }

    // Transform messages to ensure all have content field
    // Assistant messages from useChat have 'parts' instead of 'content'
    // This is because while communicating the previous chats are sent as context as well.
    const transformedMessages = messages.map((message) => {
      if (message.role === "assistant" && message.parts) {
        // Extract text content from parts array
        const textContent = message.parts
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("");
        return {
          role: message.role,
          content: textContent,
        };
      }
      // User messages already have content as string
      return {
        role: message.role,
        content: message.content,
      };
    });

    const result = streamText({
      model: openrouter("xiaomi/mimo-v2-flash:free"),
      messages: transformedMessages,
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("Error in POST /api/chat:", err);
    return new NextResponse(
      JSON.stringify({ error: err.message || "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

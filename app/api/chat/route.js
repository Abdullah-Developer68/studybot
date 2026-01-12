import { streamText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

// const google = createGoogleGenerativeAI({
//   apiKey: process.env.GEMINI_KEY,
// });

// const model = google("gemini-2.0-flash");

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req) {
  try {
    // In here the req have to be parsed as express.json does not exist in here.
    const body = await req.json();
    const { prompt } = body;

    const result = streamText({
      model: openrouter("xiaomi/mimo-v2-flash:free"),
      prompt,
    });
    let fullresponse = "";

    for await (const textPart of result.textStream) {
      fullresponse += textPart;
      console.log(textPart);
    }

    // return result.toDataStreamResponse();
    return NextResponse.json({ response: fullresponse });
  } catch (err) {
    console.error("Error in POST /api/chat:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

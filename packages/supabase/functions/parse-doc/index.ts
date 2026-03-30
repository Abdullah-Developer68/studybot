// This is in Deno runtime
import { serve } from "https://deno.land/std@0.205.0/http/server.ts";
import { parseDocument } from "@studybot/utils/server/deno-document.parse.ts";
import {
  validateFileSize,
  validateFileExtension,
} from "@studybot/utils/global/file-utils.ts";

serve(async (req) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: "File is required" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    // convert data to array buffer
    const arrayBuffer = await file.arrayBuffer();

    // validate file size - throws on error
    validateFileSize(arrayBuffer.byteLength);

    // validate file extension - throws on error
    validateFileExtension(file.name);

    const text = await parseDocument(arrayBuffer, file.name, file.type);

    return new Response(JSON.stringify({ text }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});

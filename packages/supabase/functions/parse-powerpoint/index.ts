import { parseOffice } from "officeparser";
import { Buffer } from "node:buffer";
import { validateFileSize } from "@studybot/utils/global/file-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPPORTED_EXTENSIONS = ["ppt", "pptx"];

const getExtension = (fileName: string): string => {
  const ext = fileName.toLowerCase().split(".").pop();
  return ext ?? "";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: "File is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const extension = getExtension(file.name);
    if (!SUPPORTED_EXTENSIONS.includes(extension)) {
      return new Response(
        JSON.stringify({
          error: "Unsupported file type. Expected: .ppt or .pptx",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    validateFileSize(arrayBuffer.byteLength);

    const parsed = await parseOffice(Buffer.from(arrayBuffer));
    const text = String(parsed ?? "").trim();

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

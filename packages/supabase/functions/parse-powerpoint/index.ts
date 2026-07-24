import { parseOffice } from "officeparser";
import { withSupabase } from "@supabase/server";
import { Buffer } from "node:buffer";
import {
  getExtension,
  validateFileSize,
} from "@studybot/utils/global/file-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPPORTED_EXTENSIONS = ["ppt", "pptx"];

// auth: ["user", "publishable"] — signed-in users match "user" via their
// session JWT on Authorization; callers without a session match "publishable"
// via the project's publishable key on the apikey header (the web client sends
// it on every request). withSupabase answers OPTIONS preflights before the
// auth check and returns a 401 automatically when neither credential is valid.
export default {
  fetch: withSupabase({ auth: ["user", "publishable"] }, async (req, _ctx) => {
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
  }),
};

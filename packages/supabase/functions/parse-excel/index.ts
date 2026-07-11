import { withSupabase } from "@supabase/server";
import type { SupabaseContext } from "@supabase/server";
import { corsHeaders } from "@supabase/supabase-js/cors";
import * as XLSX from "xlsx";
import {
  getExtension,
  validateFileSize,
} from "@studybot/utils/global/file-utils.ts";

const SUPPORTED_EXTENSIONS = ["xls", "xlsx"];

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

    // Only run the handler for authenticated users. withSupabase({ auth: "user" })
    // already rejects other modes, but this guard keeps the handler fail-closed.
    if (ctx.authMode === "user") {
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
              error: "Unsupported file type. Expected: .xls or .xlsx",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        const arrayBuffer = await file.arrayBuffer();
        validateFileSize(arrayBuffer.byteLength);

        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
        let text = "";

        workbook.SheetNames.forEach((sheetName: string) => {
          const worksheet = workbook.Sheets[sheetName];
          const sheetText = XLSX.utils.sheet_to_csv(worksheet, { FS: " | " });
          if (sheetText.trim()) {
            text += `\n--- Sheet: ${sheetName} ---\n${sheetText}`;
          }
        });

        return new Response(JSON.stringify({ text: text.trim() }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return new Response(JSON.stringify({ error: message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    }

    return unauthorizedResponse();
  }),
};

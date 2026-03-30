import { serve } from "https://deno.land/std@0.205.0/http/server.ts";

serve(async (req) => {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

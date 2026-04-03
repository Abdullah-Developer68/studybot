const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_FILE_SIZE_MB = 10;
const SUPPORTED_EXTENSIONS = ["txt", "md"];

const validateFileSize = (
  fileSize: number,
  maxSizeInMB = MAX_FILE_SIZE_MB,
): void => {
  const maxBytes = maxSizeInMB * 1024 * 1024;
  if (fileSize > maxBytes) {
    throw new Error(
      `File size exceeds maximum allowed size of ${maxSizeInMB}MB`,
    );
  }
};

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
          error: "Unsupported file type. Expected: .txt or .md",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    validateFileSize(arrayBuffer.byteLength);

    const text = new TextDecoder("utf-8")
      .decode(new Uint8Array(arrayBuffer))
      .trim();

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

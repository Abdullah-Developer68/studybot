// -------------------  Types ---------------------
import type { UploadResponse } from "@studybot/types";
import type { UploadProgressCallback } from "@studybot/types";

import { createClient } from "@supabase/supabase-js";

// Supabase Edge Function configuration
const getSupabaseConfig = () => ({
  url:
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_SUPABASE_URL || ""
      : "",
  anonKey:
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
        ""
      : "",
});

const MAX_TEXT_LENGTH = 50000;

// Create Supabase client for Edge Function calls
const getSupabaseClient = () => {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
};

// Upload a document via Supabase Edge Function
const uploadDocumentViaEdgeFunction = async (
  file: File,
  onProgress?: UploadProgressCallback,
): Promise<UploadResponse> => {
  if (!file) {
    throw new Error("File is required");
  }

  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error(
      "Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  const formData = new FormData();
  formData.append("file", file);

  // Simulate progress (supabase.functions.invoke doesn't support progress events)
  onProgress?.(50);

  try {
    const { data, error } = await supabase.functions.invoke("parse-doc", {
      body: formData,
    });

    if (error) {
      throw new Error(error.message || "Failed to parse document");
    }

    onProgress?.(100);

    const extractedText = data?.text || "";
    const wasTruncated = extractedText.length > MAX_TEXT_LENGTH;

    return {
      success: true,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      extractedText: wasTruncated
        ? extractedText.slice(0, MAX_TEXT_LENGTH)
        : extractedText,
      characterCount: extractedText.length,
      wasTruncated,
      message: "Document parsed successfully",
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to upload document";
    console.error("Error uploading document via Edge Function:", message);
    throw new Error(message);
  }
};

// Convenience alias
const uploadDocument = uploadDocumentViaEdgeFunction;

// -------------------------------------------
export {
  getSupabaseConfig,
  getSupabaseClient,
  uploadDocumentViaEdgeFunction,
  uploadDocument,
};

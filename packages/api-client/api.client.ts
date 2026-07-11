// -------------------  Types ---------------------
import type { UploadProgressCallback, UploadResponse } from "@studybot/types";
import type { SupabaseRequestOptions } from "@studybot/utils/client/api.client.utils";

import axios from "axios";
import { MAX_TEXT_LENGTH } from "@studybot/utils/global/file-utils";
import { getParserFunctionByFileName } from "@studybot/utils/global/upload.utils";
import {
  buildSupabaseHeaders,
  getErrorMessage,
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@studybot/utils/client/api.client.utils";

// ------------------------ APIS --------------------------

// 1) Generate a short descriptive title for a chat session from the first user message.
// Routes the message to a cheap AI model via the generate-title edge function.
const generateChatTitle = async (
  message: string,
  options?: SupabaseRequestOptions,
): Promise<string | null> => {
  if (!message?.trim()) {
    throw new Error("Message is required");
  }

  const supabaseUrl = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();
  const endpoint = `${supabaseUrl}/functions/v1/generate-title`;

  try {
    const response = await axios.post<{
      title?: string;
      error?: string;
    }>(endpoint, { message }, {
      headers: {
        ...buildSupabaseHeaders(publishableKey, options),
        "Content-Type": "application/json",
      },
    });

    const data = response.data;

    if (!data?.title) {
      console.warn("generate-title returned no title:", data?.error);
      return null;
    }

    return data.title.trim() || null;
  } catch (err) {
    console.error("Failed to generate chat title:", err);
    return null;
  }
};

// --- file upload apis
const uploadDocument = async (
  file: File,
  onProgress?: UploadProgressCallback,
  options?: SupabaseRequestOptions,
) => {
  if (!file) {
    throw new Error("File is required");
  }

  const functionName = getParserFunctionByFileName(file.name);
  if (!functionName) {
    throw new Error(`Unsupported file type for ${file.name}`);
  }

  const formData = new FormData();
  formData.append("file", file);

  if (typeof onProgress === "function") {
    // fetch does not expose upload progress events in browsers.
    onProgress(0);
  }

  const supabaseUrl = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  const endpoint = `${supabaseUrl}/functions/v1/${functionName}`;

  try {
    const response = await axios.post<{
      text?: string;
      error?: string;
      message?: string;
    }>(endpoint, formData, {
      headers: buildSupabaseHeaders(publishableKey, options),
      onUploadProgress:
        typeof onProgress === "function"
          ? (event) => {
              const total = event.total || 0;
              const percent = total
                ? Math.round(((event.loaded || 0) * 100) / total)
                : 0;
              onProgress(percent);
            }
          : undefined,
    });

    const data = response.data;

    if (data.error) {
      throw new Error(data.error);
    }

    const rawText = String(data.text || "").trim();

    if (!rawText) {
      throw new Error(
        "The document appears to be empty or contains no extractable text.",
      );
    }

    let extractedText = rawText;
    let wasTruncated = false;

    if (extractedText.length > MAX_TEXT_LENGTH) {
      extractedText =
        extractedText.substring(0, MAX_TEXT_LENGTH) +
        `\n\n[Document truncated - showing first ${MAX_TEXT_LENGTH} characters of ${extractedText.length} total]`;
      wasTruncated = true;
    }

    if (typeof onProgress === "function") {
      onProgress(100);
    }

    return {
      success: true,
      fileName: file.name,
      fileType: file.type || "unknown",
      fileSize: file.size,
      extractedText,
      characterCount: extractedText.length,
      wasTruncated,
      message: `Successfully extracted text from ${file.name}`,
    } as UploadResponse;
  } catch (error: unknown) {
    throw new Error(
      getErrorMessage(
        error,
        `Unable to reach document parser service at ${endpoint}. Check internet connection, Supabase function deployment, and CORS configuration.`,
      ),
    );
  }
};

export { generateChatTitle, uploadDocument };

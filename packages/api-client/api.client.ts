// -------------------  Types ---------------------
import {
  UploadResponseSchema,
  type UploadProgressCallback,
} from "@studybot/types";
import type { SupabaseRequestOptions } from "@studybot/utils/client/api.client.utils";

import axios from "axios";
import { z } from "zod";
import { MAX_TEXT_LENGTH } from "@studybot/utils/global/file-utils";
import { getParserFunctionByFileName } from "@studybot/utils/global/upload.utils";
import {
  buildSupabaseHeaders,
  getErrorMessage,
  getSupabasePublishableKey,
  getSupabaseUrl,
  invokeSupabaseFunction,
} from "@studybot/utils/client/api.client.utils";

const api = axios.create({
  baseURL: "http://localhost:3000/api/",
  withCredentials: true,
});

// Response shape of the parse-* edge functions: { text } on success,
// { error } on failure.
const ParserFunctionResponseSchema = z.object({
  text: z.string().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

// ------------------------ APIS --------------------------

// 1) Send a user prompt to the chat API
const sendUserPrompt = async (prompt: string) => {
  if (!prompt) {
    throw new Error("Prompt is required");
  }

  try {
    const res = await api.post("chat", { prompt });
    // {Promise} - API response with the generated answer and metadata
    return res;
  } catch (err) {
    console.error("Error sending prompt:", err);
    throw err;
  }
};

// --- from here on out the apis are written
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
    const response = await axios.post<unknown>(endpoint, formData, {
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

    // Axios hands us untyped JSON — validate it with zod before reading fields.
    const parsedResponse = ParserFunctionResponseSchema.safeParse(response.data);
    if (!parsedResponse.success) {
      throw new Error("Parser service returned an unexpected response");
    }

    const data = parsedResponse.data;

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

    // Parse the payload we hand back so the return value is guaranteed to
    // satisfy UploadResponse at runtime, not just by cast.
    return UploadResponseSchema.parse({
      success: true,
      fileName: file.name,
      fileType: file.type || "unknown",
      fileSize: file.size,
      extractedText,
      characterCount: extractedText.length,
      wasTruncated,
      message: `Successfully extracted text from ${file.name}`,
    });
  } catch (error: unknown) {
    throw new Error(
      getErrorMessage(
        error,
        `Unable to reach document parser service at ${endpoint}. Check internet connection, Supabase function deployment, and CORS configuration.`,
      ),
    );
  }
};

export { sendUserPrompt, uploadDocument, invokeSupabaseFunction, api };

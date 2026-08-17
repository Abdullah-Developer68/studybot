// -------------------  Types ---------------------
import {
  UploadResponseSchema,
  type UploadProgressCallback,
} from "@studybot/types";
import type { SupabaseRequestOptions } from "@studybot/utils/client/api.client.utils";

import axios from "axios";
import { z } from "zod";
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

// Response shape returned by the ingest-document edge function: the parsed file
// plus ingestion metadata. The client maps it onto UploadResponse below.
const IngestResponsePayloadSchema = z.object({
  documentId: z.string(),
  name: z.string(),
  type: z.string(),
  size: z.number(),
  chunkCount: z.number(),
  characterCount: z.number(),
  preview: z.string(),
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

  const formData = new FormData();
  formData.append("file", file);

  if (typeof onProgress === "function") {
    // fetch does not expose upload progress events in browsers.
    onProgress(0);
  }

  const supabaseUrl = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  const endpoint = `${supabaseUrl}/functions/v1/ingest-document`;

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
    const parsedResponse = IngestResponsePayloadSchema.safeParse(response.data);
    if (!parsedResponse.success) {
      throw new Error("Ingest service returned an unexpected response");
    }

    const data = parsedResponse.data;

    if (typeof onProgress === "function") {
      onProgress(100);
    }

    // Map the ingest payload onto UploadResponse, adding the fields the schema
    // requires and the UI expects (guaranteed at runtime by .parse()).
    return UploadResponseSchema.parse({
      success: true,
      documentId: data.documentId,
      fileName: data.name,
      fileType: data.type,
      fileSize: data.size,
      chunkCount: data.chunkCount,
      characterCount: data.characterCount,
      preview: data.preview,
      message: `Successfully indexed ${file.name} (${data.chunkCount} chunks)`,
    });
  } catch (error: unknown) {
    throw new Error(
      getErrorMessage(
        error,
        `Unable to reach document ingest service at ${endpoint}. Check internet connection, Supabase function deployment, and CORS configuration.`,
      ),
    );
  }
};

export { sendUserPrompt, uploadDocument, invokeSupabaseFunction, api };

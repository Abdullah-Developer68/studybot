// -------------------  Types ---------------------
import type {
  UploadProgressCallback,
  UploadResponse,
} from "@studybot/types/upload";

import axios from "axios";
import { MAX_TEXT_LENGTH } from "@studybot/utils/global/file-utils";
import { getParserFunctionByFileName } from "@studybot/utils/global/upload.utils";

const api = axios.create({
  baseURL: "http://localhost:3000/api/",
  withCredentials: true,
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
//---------------------------------------------------

// 2) Upload a document file and extract its text content (Next.js API Route)
// const uploadDocument = async (
//   file: File,
//   onProgress?: UploadProgressCallback,
// ) => {
//   if (!file) {
//     throw new Error("File is required");
//   }

//   const formData = new FormData();
//   formData.append("file", file);

//   try {
//     const res = await api.post<UploadResponse>("upload", formData, {
//       headers: {
//         "Content-Type": "multipart/form-data",
//       },
//       onUploadProgress: onProgress
//         ? (progressEvent: AxiosProgressEvent) => {
//             const total = progressEvent.total || 0;
//             const percentCompleted = total
//               ? Math.round((progressEvent.loaded * 100) / total)
//               : 0;
//             onProgress(percentCompleted);
//           }
//         : undefined,
//     });

//     return res.data as UploadResponse;
//   } catch (err: unknown) {
//     if (axios.isAxiosError(err)) {
//       const message =
//         err.response?.data?.message || err.message || "Unknown error";
//       console.error("Error uploading document:", message);
//       throw new Error(message);
//     }
//     throw new Error("Failed to upload document");
//   }
// };

// -------------------------------------------
const getEnvValue = (key: string) => {
  const env = (
    globalThis as unknown as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env;
  return env?.[key];
};

const getSupabaseUrl = () => {
  const url = getEnvValue("NEXT_PUBLIC_SUPABASE_URL");
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
  }
  // Remove trailing slash if present to ensure consistent URL formatting.
  return url.replace(/\/$/, "");
};

const getSupabaseAnonKey = () => {
  return (
    getEnvValue("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
    getEnvValue("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY") ||
    ""
  );
};

const invokeSupabaseFunction = async <TRequest extends object, TResponse>(
  functionName: string,
  payload: TRequest,
) => {
  const supabaseUrl = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as TResponse & {
    error?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(
      data.error || data.message || `Request failed with ${response.status}`,
    );
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
};

const uploadDocument = async (
  file: File,
  onProgress?: UploadProgressCallback,
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
  const anonKey = getSupabaseAnonKey();

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: formData,
  });

  const data = (await response.json()) as {
    text?: string;
    error?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(
      data.error || data.message || `Request failed with ${response.status}`,
    );
  }

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
};

export { sendUserPrompt, uploadDocument, invokeSupabaseFunction, api };

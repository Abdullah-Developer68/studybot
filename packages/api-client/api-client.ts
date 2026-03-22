// -------------------  Types ---------------------
import type { UploadResponse } from "@studybot/types";
import type { UploadProgressCallback } from "@studybot/types";

import axios, { AxiosProgressEvent } from "axios";

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

// 2) Upload a document file and extract its text content
const uploadDocument = async (
  file: File,
  onProgress?: UploadProgressCallback,
) => {
  if (!file) {
    throw new Error("File is required");
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await api.post<UploadResponse>("upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: onProgress
        ? (progressEvent: AxiosProgressEvent) => {
            const total = progressEvent.total || 0;
            const percentCompleted = total
              ? Math.round((progressEvent.loaded * 100) / total)
              : 0;
            onProgress(percentCompleted);
          }
        : undefined,
    });

    return res.data as UploadResponse;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const message =
        err.response?.data?.message || err.message || "Unknown error";
      console.error("Error uploading document:", message);
      throw new Error(message);
    }
    throw new Error("Failed to upload document");
  }
};

// -------------------------------------------
export { sendUserPrompt, uploadDocument, api };

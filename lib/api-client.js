import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api/",
  withCredentials: true,
});

/**
 * Send a user prompt to the chat API
 * @param {string} prompt - The user's message
 * @returns {Promise} - API response
 */
const sendUserPrompt = async (prompt) => {
  if (!prompt) {
    throw new Error("Prompt is required");
  }
  try {
    const res = await api.post("chat", { prompt });
    return res;
  } catch (err) {
    console.error("Error sending prompt:", err);
    throw err;
  }
};

/**
 * Upload a document file and extract its text content
 * @param {File} file - The file to upload
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<{success: boolean, fileName: string, extractedText: string, wasTruncated: boolean}>}
 */
const uploadDocument = async (file, onProgress = null) => {
  if (!file) {
    throw new Error("File is required");
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await api.post("upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: onProgress
        ? (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            onProgress(percentCompleted);
          }
        : undefined,
    });
    return res.data;
  } catch (err) {
    console.error("Error uploading document:", err);
    // Extract error message from response if available
    const errorMessage =
      err.response?.data?.error || err.message || "Failed to upload file";
    throw new Error(errorMessage);
  }
};

/**
 * Upload an image file to Supabase storage
 * @param {File} file - The image file to upload
 * @param {Function} onProgress - Optional progress callback that receives { progress: number }
 * @param {AbortSignal} abortSignal - Optional signal to cancel the upload
 * @param {string} templateId - Optional template ID to organize images
 * @returns {Promise<{success: boolean, url: string, path: string, fileName: string}>}
 */
const uploadImage = async (
  file,
  onProgress = null,
  abortSignal = null,
  templateId = null,
) => {
  if (!file) {
    throw new Error("File is required");
  }

  const formData = new FormData();
  formData.append("file", file);
  if (templateId) {
    formData.append("templateId", templateId);
  }

  try {
    const res = await api.post("supabase/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      signal: abortSignal,
      onUploadProgress: onProgress
        ? (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            onProgress({ progress: percentCompleted });
          }
        : undefined,
    });

    return res.data;
  } catch (err) {
    // Handle abort/cancellation
    if (axios.isCancel(err) || err.name === "AbortError") {
      throw new Error("Upload cancelled");
    }

    console.error("Error uploading image:", err);
    const errorMessage =
      err.response?.data?.error || err.message || "Failed to upload image";
    throw new Error(errorMessage);
  }
};

export { sendUserPrompt, uploadDocument, uploadImage, api };

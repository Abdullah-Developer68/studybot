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
 * @param {Function|null} onProgress - Optional progress callback
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
            const total = progressEvent.total || 0;
            const percentCompleted = total
              ? Math.round((progressEvent.loaded * 100) / total)
              : 0;
            onProgress(percentCompleted);
          }
        : undefined,
    });

    return res.data;
  } catch (err) {
    console.error("Error uploading document:", err);
    const errorMessage =
      err.response?.data?.error || err.message || "Failed to upload file";
    throw new Error(errorMessage);
  }
};

export { sendUserPrompt, uploadDocument, api };

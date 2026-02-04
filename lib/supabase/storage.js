import { createClient } from "@/utils/supabase/client";

/**
 * Get the Supabase client instance
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
const getSupabase = () => createClient();

/**
 * Upload a file to Supabase storage
 * @param {string} bucket - The storage bucket name
 * @param {string} path - The file path within the bucket
 * @param {File|Blob|ArrayBuffer} file - The file to upload
 * @param {object} options - Upload options
 * @param {string} options.contentType - The file's content type
 * @param {boolean} options.upsert - Whether to overwrite existing files
 * @returns {Promise<{data: object | null, error: string | null}>}
 */
export const uploadFile = async (bucket, path, file, options = {}) => {
  const supabase = getSupabase();

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: options.contentType,
    upsert: options.upsert ?? false,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
};

/**
 * Upload an image to the images bucket
 * @param {File} file - The image file to upload
 * @param {string} userId - The user's UUID
 * @param {string} templateId - Optional template ID for organization
 * @param {function} onProgress - Optional progress callback
 * @returns {Promise<{url: string | null, path: string | null, error: string | null}>}
 */
export const uploadImage = async (file, userId, templateId = null, onProgress = null) => {
  if (!file) {
    return { url: null, path: null, error: "No file provided" };
  }

  if (!userId) {
    return { url: null, path: null, error: "User ID is required" };
  }

  const supabase = getSupabase();

  // Generate unique file name
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
  const filePath = templateId
    ? `${userId}/${templateId}/${fileName}`
    : `${userId}/${fileName}`;

  // Convert file to ArrayBuffer for upload
  const arrayBuffer = await file.arrayBuffer();

  const { data, error } = await supabase.storage.from("images").upload(filePath, arrayBuffer, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    return { url: null, path: null, error: error.message };
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from("images").getPublicUrl(filePath);

  // Simulate progress completion if callback provided
  if (onProgress) {
    onProgress({ progress: 100 });
  }

  return {
    url: urlData.publicUrl,
    path: filePath,
    fileName: file.name,
    error: null,
  };
};

/**
 * Get public URL for a file
 * @param {string} bucket - The storage bucket name
 * @param {string} path - The file path within the bucket
 * @returns {{url: string}}
 */
export const getPublicUrl = (bucket, path) => {
  const supabase = getSupabase();

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  return { url: data.publicUrl };
};

/**
 * Get signed URL for private file access
 * @param {string} bucket - The storage bucket name
 * @param {string} path - The file path within the bucket
 * @param {number} expiresIn - URL expiry time in seconds (default: 3600)
 * @returns {Promise<{url: string | null, error: string | null}>}
 */
export const getSignedUrl = async (bucket, path, expiresIn = 3600) => {
  const supabase = getSupabase();

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);

  if (error) {
    return { url: null, error: error.message };
  }

  return { url: data.signedUrl, error: null };
};

/**
 * Delete a file from storage
 * @param {string} bucket - The storage bucket name
 * @param {string|string[]} paths - The file path(s) to delete
 * @returns {Promise<{data: object | null, error: string | null}>}
 */
export const deleteFile = async (bucket, paths) => {
  const supabase = getSupabase();

  const pathsArray = Array.isArray(paths) ? paths : [paths];

  const { data, error } = await supabase.storage.from(bucket).remove(pathsArray);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
};

/**
 * List files in a bucket/folder
 * @param {string} bucket - The storage bucket name
 * @param {string} folder - The folder path (optional)
 * @param {object} options - List options
 * @param {number} options.limit - Maximum number of files to return
 * @param {number} options.offset - Number of files to skip
 * @param {string} options.sortBy - Column to sort by
 * @returns {Promise<{files: array | null, error: string | null}>}
 */
export const listFiles = async (bucket, folder = "", options = {}) => {
  const supabase = getSupabase();

  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    limit: options.limit ?? 100,
    offset: options.offset ?? 0,
    sortBy: options.sortBy ?? { column: "created_at", order: "desc" },
  });

  if (error) {
    return { files: null, error: error.message };
  }

  return { files: data, error: null };
};

/**
 * Move/rename a file
 * @param {string} bucket - The storage bucket name
 * @param {string} fromPath - Current file path
 * @param {string} toPath - New file path
 * @returns {Promise<{data: object | null, error: string | null}>}
 */
export const moveFile = async (bucket, fromPath, toPath) => {
  const supabase = getSupabase();

  const { data, error } = await supabase.storage.from(bucket).move(fromPath, toPath);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
};

/**
 * Copy a file
 * @param {string} bucket - The storage bucket name
 * @param {string} fromPath - Source file path
 * @param {string} toPath - Destination file path
 * @returns {Promise<{data: object | null, error: string | null}>}
 */
export const copyFile = async (bucket, fromPath, toPath) => {
  const supabase = getSupabase();

  const { data, error } = await supabase.storage.from(bucket).copy(fromPath, toPath);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
};

/**
 * Download a file
 * @param {string} bucket - The storage bucket name
 * @param {string} path - The file path
 * @returns {Promise<{data: Blob | null, error: string | null}>}
 */
export const downloadFile = async (bucket, path) => {
  const supabase = getSupabase();

  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
};

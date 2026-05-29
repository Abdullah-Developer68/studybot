import type { SupabaseClient } from "@supabase/supabase-js";
import type { OwnedImageParams, SignedImageOptions, UploadImageOptions, UploadOptions } from "../types/storage.sdk.types";

// Validates that a usable Supabase client with storage access is provided.
function ensureClient(
  supabaseClient: SupabaseClient | null | undefined,
): asserts supabaseClient is SupabaseClient {
  if (!supabaseClient?.storage) {
    throw new Error("Supabase client is required");
  }
}

// Uploads a generic file to a specified bucket/path with optional content type and upsert.
const uploadFile = async (
  supabaseClient: SupabaseClient | null | undefined,
  bucket: string,
  path: string,
  file: BodyInit,
  options: UploadOptions = {},
) => {
  ensureClient(supabaseClient);

  const { data, error } = await supabaseClient.storage
    .from(bucket)
    .upload(path, file, {
      contentType: options.contentType,
      upsert: options.upsert ?? false,
    });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
};

// Uploads an image to the images bucket, generates a public URL, and returns upload metadata.
const uploadImage = async (
  supabaseClient: SupabaseClient | null | undefined,
  file: File | null | undefined,
  userId: string | null | undefined,
  templateId: string | null = null,
  onProgress: UploadImageOptions["onProgress"] = null,
) => {
  ensureClient(supabaseClient);

  if (!file) {
    return { url: null, path: null, error: "No file provided" };
  }

  if (!userId) {
    return { url: null, path: null, error: "User ID is required" };
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
  const filePath = templateId
    ? `${userId}/${templateId}/${fileName}`
    : `${userId}/${fileName}`;

  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabaseClient.storage
    .from("images")
    .upload(filePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return { url: null, path: null, error: error.message };
  }

  const { data: urlData } = supabaseClient.storage
    .from("images")
    .getPublicUrl(filePath);

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

// Returns a public URL for a file stored in a given bucket/path.
const getPublicUrl = (
  supabaseClient: SupabaseClient | null | undefined,
  bucket: string,
  path: string,
) => {
  ensureClient(supabaseClient);

  const { data } = supabaseClient.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl };
};

// Creates a time-limited signed URL for secure file access.
const getSignedUrl = async (
  supabaseClient: SupabaseClient | null | undefined,
  bucket: string,
  path: string,
  expiresIn = 3600,
) => {
  ensureClient(supabaseClient);

  const { data, error } = await supabaseClient.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    return { url: null, error: error.message };
  }

  return { url: data.signedUrl, error: null };
};

// Resolves an uploaded image value into a usable URL (passthrough for absolute URLs, signed URL for storage paths).
const resolveImageUrl = async (
  supabaseClient: SupabaseClient | null | undefined,
  pathOrUrl: string | null | undefined,
  options: SignedImageOptions = {},
) => {
  ensureClient(supabaseClient);

  if (typeof pathOrUrl !== "string" || pathOrUrl.length === 0) {
    return { url: null, error: "Invalid image path/url" };
  }

  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return { url: pathOrUrl, error: null };
  }

  const bucket = options.bucket ?? "images";
  const expiresIn = options.expiresIn ?? 3600;

  const result = await getSignedUrl(
    supabaseClient,
    bucket,
    pathOrUrl,
    expiresIn,
  );
  return result;
};

// Deletes one or multiple files from a storage bucket.
const deleteFile = async (
  supabaseClient: SupabaseClient | null | undefined,
  bucket: string,
  paths: string | string[],
) => {
  ensureClient(supabaseClient);

  const pathsArray = Array.isArray(paths) ? paths : [paths];
  const { data, error } = await supabaseClient.storage
    .from(bucket)
    .remove(pathsArray);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
};

// Lists files in a bucket folder with pagination and sorting options.
const listFiles = async (
  supabaseClient: SupabaseClient | null | undefined,
  bucket: string,
  folder: string = "",
  options: { limit?: number; offset?: number; sortBy?: { column: string; order: "asc" | "desc" } } = {},
) => {
  ensureClient(supabaseClient);

  const { data, error } = await supabaseClient.storage
    .from(bucket)
    .list(folder, {
      limit: options.limit ?? 100,
      offset: options.offset ?? 0,
      sortBy: options.sortBy ?? { column: "created_at", order: "desc" },
    });

  if (error) {
    return { files: null, error: error.message };
  }

  return { files: data, error: null };
};

// Moves a file within the same bucket from one path to another.
const moveFile = async (
  supabaseClient: SupabaseClient | null | undefined,
  bucket: string,
  fromPath: string,
  toPath: string,
) => {
  ensureClient(supabaseClient);

  const { data, error } = await supabaseClient.storage
    .from(bucket)
    .move(fromPath, toPath);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
};

// Copies a file within the same bucket from one path to another.
const copyFile = async (
  supabaseClient: SupabaseClient | null | undefined,
  bucket: string,
  fromPath: string,
  toPath: string,
) => {
  ensureClient(supabaseClient);

  const { data, error } = await supabaseClient.storage
    .from(bucket)
    .copy(fromPath, toPath);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
};

// Downloads a file from a bucket/path and returns the file payload.
const downloadFile = async (
  supabaseClient: SupabaseClient | null | undefined,
  bucket: string,
  path: string,
) => {
  ensureClient(supabaseClient);

  const { data, error } = await supabaseClient.storage
    .from(bucket)
    .download(path);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
};

// Creates a signed image URL only if the requested path belongs to the requester
const signOwnedImagePath = async (
  supabaseClient: SupabaseClient | null | undefined,
  params: OwnedImageParams = {},
) => {
  ensureClient(supabaseClient);

  const {
    requesterId,
    pathOrUrl,
    bucket = "images",
    expiresIn = 60 * 60 * 24,
  } = params;

  if (!requesterId) {
    return { url: null, error: "Missing requester id" };
  }

  if (typeof pathOrUrl !== "string" || !pathOrUrl.trim()) {
    return { url: null, error: "Invalid path" };
  }

  const value = pathOrUrl.trim();

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return { url: value, error: null, path: value, bucket };
  }

  const normalizedPath = value.startsWith(`${bucket}/`)
    ? value.slice(bucket.length + 1)
    : value;

  const ownerFolder = normalizedPath.split("/")[0];
  if (ownerFolder !== requesterId) {
    return { url: null, error: "Forbidden path access" };
  }

  const signed = await getSignedUrl(
    supabaseClient,
    bucket,
    normalizedPath,
    expiresIn,
  );

  if (signed.error || !signed.url) {
    return { url: null, error: signed.error || "Failed to sign url" };
  }

  return { url: signed.url, error: null, path: normalizedPath, bucket };
};

export {
  uploadFile,
  uploadImage,
  getPublicUrl,
  getSignedUrl,
  resolveImageUrl,
  deleteFile,
  listFiles,
  moveFile,
  copyFile,
  downloadFile,
  signOwnedImagePath,
};

// Validates that a usable Supabase client with storage access is provided.
const ensureClient = (supabaseClient) => {
  if (!supabaseClient?.storage) {
    throw new Error("Supabase client is required");
  }
};

// Uploads a generic file to a specified bucket/path with optional content type and upsert.
const uploadFile = async (supabaseClient, bucket, path, file, options = {}) => {
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
  supabaseClient,
  file,
  userId,
  templateId = null,
  onProgress = null,
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
const getPublicUrl = (supabaseClient, bucket, path) => {
  ensureClient(supabaseClient);

  const { data } = supabaseClient.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl };
};

// Creates a time-limited signed URL for secure file access.
const getSignedUrl = async (supabaseClient, bucket, path, expiresIn = 3600) => {
  ensureClient(supabaseClient);

  const { data, error } = await supabaseClient.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    return { url: null, error: error.message };
  }

  return { url: data.signedUrl, error: null };
};

// Deletes one or multiple files from a storage bucket.
const deleteFile = async (supabaseClient, bucket, paths) => {
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
const listFiles = async (supabaseClient, bucket, folder = "", options = {}) => {
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
const moveFile = async (supabaseClient, bucket, fromPath, toPath) => {
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
const copyFile = async (supabaseClient, bucket, fromPath, toPath) => {
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
const downloadFile = async (supabaseClient, bucket, path) => {
  ensureClient(supabaseClient);

  const { data, error } = await supabaseClient.storage
    .from(bucket)
    .download(path);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
};

export {
  uploadFile,
  uploadImage,
  getPublicUrl,
  getSignedUrl,
  deleteFile,
  listFiles,
  moveFile,
  copyFile,
  downloadFile,
};

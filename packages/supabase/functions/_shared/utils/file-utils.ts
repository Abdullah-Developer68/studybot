// File utilities shared across Supabase Edge Functions.
// Maximum file size in MB.
export const MAX_FILE_SIZE_MB = 10;

// Returns the lowercase file extension without the leading dot.
export const getExtension = (fileName: string): string => {
  const ext = fileName.toLowerCase().split(".").pop();
  return ext ?? "";
};

// Validates that the file size does not exceed the maximum allowed size.
export const validateFileSize = (fileSize: number, maxSizeInMB = 10): boolean => {
  const maxBytes = maxSizeInMB * 1024 * 1024;
  if (fileSize > maxBytes) {
    throw new Error(
      `File size exceeds maximum allowed size of ${maxSizeInMB}MB`,
    );
  }
  return true;
};


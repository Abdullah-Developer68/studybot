// Capitalize variables tells that they are constants and should not be changed.
const MAX_FILE_SIZE_MB = 10;
const MAX_TEXT_LENGTH = 50000;

const getSupportedExtensions = () => {
  return [
    ".pdf",
    ".docx",
    ".doc",
    ".xlsx",
    ".xls",
    ".pptx",
    ".ppt",
    ".md",
    ".txt",
  ];
};

const getExtension = (fileName: string): string => {
  const ext = fileName.toLowerCase().split(".").pop();
  return ext ?? "";
};

// Validate a browser File object for upload and return a UI-friendly result shape.
const validateFile = (file: File) => {
  // Guard against missing file input.
  if (!file) {
    return { valid: false, error: "File is required." };
  }

  try {
    // Enforce the shared size limit.
    validateFileSize(file.size, MAX_FILE_SIZE_MB);
    // Enforce the shared extension allow-list.
    validateFileExtension(file.name);
    return { valid: true, error: null };
  } catch (error: unknown) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Invalid file",
    };
  }
};

// Validate file size (bytes)
const validateFileSize = (fileSize: number, maxSizeInMB = 10): boolean => {
  const maxBytes = maxSizeInMB * 1024 * 1024;
  if (fileSize > maxBytes) {
    throw new Error(
      `File size exceeds maximum allowed size of ${maxSizeInMB}MB`,
    );
  }
  return true;
};

// Validate file extension
const validateFileExtension = (fileName: string): boolean => {
  const extension = getExtension(fileName);
  if (!extension) {
    throw new Error("File has no extension");
  }
  const supportedExtensions = getSupportedExtensions();
  const hasValidExtension = supportedExtensions.some(
    (ext) => ext.toLowerCase() === `.${extension}`,
  );
  if (!hasValidExtension) {
    throw new Error(
      `Unsupported file type: .${extension}. Supported types: ${supportedExtensions.join(", ")}`,
    );
  }
  return true;
};

export {
  MAX_FILE_SIZE_MB,
  MAX_TEXT_LENGTH,
  getExtension,
  getSupportedExtensions,
  validateFile,
  validateFileSize,
  validateFileExtension,
};

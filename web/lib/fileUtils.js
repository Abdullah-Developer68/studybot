// Client-safe utilities for file handling
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

const MAX_FILE_SIZE_MB = 10;
const MAX_TEXT_LENGTH = 50000; // ~12,500 tokens - adjust based on your model's context limit

export { MAX_FILE_SIZE_MB, MAX_TEXT_LENGTH, getSupportedExtensions };

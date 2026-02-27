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

export { MAX_FILE_SIZE_MB, MAX_TEXT_LENGTH, getSupportedExtensions };

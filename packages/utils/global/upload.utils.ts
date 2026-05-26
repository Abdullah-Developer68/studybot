import {
  getExtension,
  validateFileExtension,
  validateFileSize,
} from "./file-utils";
import type {
  ParseFileArgs,
  UploadFilesWithProgressArgs,
  UploadedFileData,
} from "@studybot/types";

// Map file extensions to the dedicated Supabase edge function that parses them.
const extensionToParserFunction: Record<string, string> = {
  pdf: "parse-pdf",
  doc: "parse-word",
  docx: "parse-word",
  xls: "parse-excel",
  xlsx: "parse-excel",
  ppt: "parse-powerpoint",
  pptx: "parse-powerpoint",
  txt: "parse-text",
  md: "parse-text",
};

// Build a stable key so each file can be tracked independently during upload.
const buildUploadFileKey = (file: File) => {
  return `${file.name}-${file.size}-${file.lastModified ?? 0}`;
};

// Resolve the parser function name from the uploaded file name.
const getParserFunctionByFileName = (fileName: string) => {
  const extension = getExtension(fileName);
  return extensionToParserFunction[extension] ?? null;
};

// Send a file to the matching edge function and return the parsed response.
const parseFile = async ({ file, invokeEdgeFunction }: ParseFileArgs) => {
  if (!file || !(file instanceof File)) {
    throw new Error("File is required");
  }

  // Require a caller-provided function so this utility stays transport-agnostic.
  if (typeof invokeEdgeFunction !== "function") {
    throw new Error("invokeEdgeFunction must be a function");
  }

  // Run centralized file-size and extension validation from file-utils.
  validateFileSize(file.size);
  validateFileExtension(file.name);

  // Determine the parser to call from the file extension.
  const extension = getExtension(file.name);
  const parserFunction = getParserFunctionByFileName(file.name);

  // Fail fast when a parser route for this valid extension is not configured.
  if (!parserFunction) {
    throw new Error(
      `No parser function configured for extension: .${extension}`,
    );
  }

  // Wrap the file in multipart form data because the edge functions expect an upload.
  const formData = new FormData();
  formData.append("file", file);

  // Call the parser edge function chosen for this file type.
  const { data, error } = await invokeEdgeFunction(parserFunction, {
    body: formData,
  });

  // Surface edge function errors to the caller.
  if (error) {
    throw new Error(error.message || "Failed to parse document");
  }

  // Return both the parsed payload and the function that handled it.
  return { data, parserFunction };
};

// Convert the upload response into the app-level attached file shape.
const mapUploadedFile = (file: File, data: UploadedFileData) => {
  return {
    name: file.name,
    type: file.type,
    size: file.size,
    extractedText: data.extractedText,
    wasTruncated: data.wasTruncated,
  };
};

// Upload files in parallel while reporting combined progress.
const uploadFilesWithProgress = ({
  files,
  uploadDocument,
  onOverallProgress,
}: UploadFilesWithProgressArgs) => {
  if (!Array.isArray(files)) {
    throw new Error("files must be an array");
  }

  // Nothing to upload means nothing to process.
  if (files.length === 0) {
    return [];
  }

  // Require the caller to provide the actual upload implementation.
  if (typeof uploadDocument !== "function") {
    throw new Error("uploadDocument must be a function");
  }

  // Track each file separately so overall progress can be aggregated.
  const totalFiles = files.length;
  const fileProgressMap: Record<string, number> = {};

  // Initialize progress for every file.
  for (const file of files) {
    fileProgressMap[buildUploadFileKey(file)] = 0;
  }

  // Upload each file and update aggregate progress as each one advances.
  const uploadPromises = files.map(async (file: File) => {
    const key = buildUploadFileKey(file);

    const data = await uploadDocument(file, (percent) => {
      fileProgressMap[key] = percent;

      const sum = Object.values(fileProgressMap).reduce(
        (acc, value) => acc + value,
        0,
      );
      const overall = Math.round(sum / totalFiles);

      if (typeof onOverallProgress === "function") {
        onOverallProgress(overall, { ...fileProgressMap });
      }
    });

    return mapUploadedFile(file, data);
  });

  // Resolve when every upload has finished.
  return Promise.all(uploadPromises);
};

export {
  buildUploadFileKey,
  getParserFunctionByFileName,
  mapUploadedFile,
  parseFile,
  uploadFilesWithProgress,
};

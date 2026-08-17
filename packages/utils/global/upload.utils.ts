import {
  type AttachedFile,
  type UploadFilesWithProgressArgs,
  type UploadResponse,
} from "@studybot/types";

// Build a stable key so each file can be tracked independently during upload.
const buildUploadFileKey = (file: File) => {
  return `${file.name}-${file.size}-${file.lastModified ?? 0}`;
};

// Convert the ingest response into the app-level attached file shape. The
// documentId is what the chat request uses as an attachment to link the file to
// a thread and enable RAG retrieval.
const mapUploadedFile = (file: File, data: UploadResponse): AttachedFile => {
  return {
    name: file.name,
    type: file.type,
    size: file.size,
    documentId: data.documentId,
    chunkCount: data.chunkCount,
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

export { buildUploadFileKey, mapUploadedFile, uploadFilesWithProgress };


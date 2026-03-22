const buildUploadFileKey = (file) => {
  return `${file.name}-${file.size}-${file.lastModified ?? 0}`;
};

const validateUploadableFile = (
  file,
  { maxFileSizeMb, supportedExtensions } = {},
) => {
  if (!file) {
    return {
      valid: false,
      error: "File is required.",
    };
  }

  const fileSizeInMB = file.size / (1024 * 1024);
  if (typeof maxFileSizeMb === "number" && fileSizeInMB > maxFileSizeMb) {
    return {
      valid: false,
      error: `File size exceeds ${maxFileSizeMb}MB limit. Current size: ${fileSizeInMB.toFixed(2)}MB`,
    };
  }

  if (Array.isArray(supportedExtensions) && supportedExtensions.length > 0) {
    const fileName = String(file.name || "").toLowerCase();
    const hasValidExtension = supportedExtensions.some((ext) =>
      fileName.endsWith(String(ext).toLowerCase()),
    );

    if (!hasValidExtension) {
      return {
        valid: false,
        error: `Unsupported file type. Supported formats: ${supportedExtensions.join(", ")}`,
      };
    }
  }

  return { valid: true, error: null };
};

const mapUploadedFile = (file, data) => {
  return {
    name: file.name,
    type: file.type,
    size: file.size,
    extractedText: data.extractedText,
    wasTruncated: data.wasTruncated,
  };
};

const uploadFilesWithProgress = async ({
  files,
  uploadDocument,
  onOverallProgress,
}) => {
  if (!Array.isArray(files)) {
    throw new Error("files must be an array");
  }

  if (files.length === 0) {
    return [];
  }

  if (typeof uploadDocument !== "function") {
    throw new Error("uploadDocument must be a function");
  }

  const totalFiles = files.length;
  const fileProgressMap = {};

  for (const file of files) {
    fileProgressMap[buildUploadFileKey(file)] = 0;
  }

  const uploadPromises = files.map(async (file) => {
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

  return Promise.all(uploadPromises);
};

export {
  buildUploadFileKey,
  mapUploadedFile,
  uploadFilesWithProgress,
  validateUploadableFile,
};

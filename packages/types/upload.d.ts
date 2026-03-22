export interface UploadResponse {
  success: boolean;
  fileName: string;
  fileType: string;
  fileSize: number;
  extractedText: string;
  characterCount: number;
  wasTruncated: boolean;
  message: string;
}

export interface AttachedFile {
  name: string;
  type: string;
  size: number;
  extractedText: string;
  wasTruncated: boolean;
}
export interface FileValidationResult {
  valid: boolean;
  error: string | null;
}

export type UploadProgressMap = Record<string, number>;

export type UploadProgressCallback = (progress: number) => void;

// Final parsed document data returned by an upload parser.
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

// File info stored in chat state after upload parsing.
export interface AttachedFile {
  name: string;
  type: string;
  size: number;
  extractedText: string;
  wasTruncated: boolean;
}

// Result from validating a file before upload.
export interface FileValidationResult {
  valid: boolean;
  error: string | null;
}

// Tracks progress for each file during a batch upload.
export type UploadProgressMap = Record<string, number>;

// Callback for a single file's upload progress.
export type UploadProgressCallback = (progress: number) => void;

// Standard response shape from a parser edge function.
export interface EdgeFunctionResponse {
  data?: {
    extractedText?: string;
    wasTruncated?: boolean;
  };
  error?: {
    message?: string;
  } | null;
}

// Transport-agnostic edge function invoker.
export type InvokeEdgeFunction = (
  functionName: string,
  options: { body: FormData },
) => Promise<EdgeFunctionResponse>;

// Input for parsing a single file.
export interface ParseFileArgs {
  file: File;
  invokeEdgeFunction: InvokeEdgeFunction;
}

// Small subset of data we keep from a parser response.
export interface UploadedFileData {
  extractedText?: string;
  wasTruncated?: boolean;
}

// Optional auth info for calling Supabase edge functions.
export interface SupabaseFunctionAuthOptions {
  accessToken?: string;
}

// Upload function expected by the batch helper.
export type UploadDocumentFn = (
  file: File,
  onProgress?: (percent: number) => void,
  options?: SupabaseFunctionAuthOptions,
) => Promise<UploadResponse>;

// Inputs for the batch upload helper.
export interface UploadFilesWithProgressArgs {
  files: File[];
  uploadDocument: UploadDocumentFn;
  onOverallProgress?: (
    percent: number,
    fileProgress: Record<string, number>,
  ) => void;
}

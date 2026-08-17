import { z } from "zod";

// Response returned by the ingest-document edge function after a file has been
// parsed, chunked, embedded, and stored.
const UploadResponseSchema = z.object({
  success: z.boolean(),
  documentId: z.string(),
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
  chunkCount: z.number(),
  characterCount: z.number(),
  preview: z.string(),
  message: z.string(),
});

// File info stored in chat state after upload ingestion.
const AttachedFileSchema = z.object({
  name: z.string(),
  type: z.string(),
  size: z.number(),
  documentId: z.string(),
  chunkCount: z.number().optional(),
});

// Result from validating a file before upload.
const FileValidationResultSchema = z.object({
  valid: z.boolean(),
  error: z.string().nullable(),
});

// Types below are inferred from the schemas so compile-time types and runtime
// validation can never drift apart.
type UploadResponse = z.infer<typeof UploadResponseSchema>;
type AttachedFile = z.infer<typeof AttachedFileSchema>;

// Hand-written (not inferred) on purpose: consumers compile with
// strictNullChecks off, where zod infers `.nullable()` object fields as
// optional, which would weaken `error` from required to optional. The schema
// above validates the same contract at runtime.
type FileValidationResult = {
  valid: boolean;
  error: string | null;
};

// Tracks progress for each file during a batch upload.
export type UploadProgressMap = Record<string, number>;

// Callback for a single file's upload progress.
export type UploadProgressCallback = (progress: number) => void;

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

export {
  UploadResponseSchema,
  AttachedFileSchema,
  FileValidationResultSchema,
};
export type { UploadResponse, AttachedFile, FileValidationResult };


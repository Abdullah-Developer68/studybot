import { z } from "zod";

// Small subset of data we keep from a parser response.
const UploadedFileDataSchema = z.object({
  extractedText: z.string().optional(),
  wasTruncated: z.boolean().optional(),
});

// Final parsed document data returned by an upload parser.
const UploadResponseSchema = z.object({
  success: z.boolean(),
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
  extractedText: z.string(),
  characterCount: z.number(),
  wasTruncated: z.boolean(),
  message: z.string(),
});

// File info stored in chat state after upload parsing.
const AttachedFileSchema = z.object({
  name: z.string(),
  type: z.string(),
  size: z.number(),
  extractedText: z.string(),
  wasTruncated: z.boolean(),
});

// Result from validating a file before upload.
const FileValidationResultSchema = z.object({
  valid: z.boolean(),
  error: z.string().nullable(),
});

// Standard response shape from a parser edge function.
const EdgeFunctionResponseSchema = z.object({
  data: UploadedFileDataSchema.optional(),
  error: z
    .object({
      message: z.string().optional(),
    })
    .nullish(),
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

type EdgeFunctionResponse = z.infer<typeof EdgeFunctionResponseSchema>;
type UploadedFileData = z.infer<typeof UploadedFileDataSchema>;

// Tracks progress for each file during a batch upload.
export type UploadProgressMap = Record<string, number>;

// Callback for a single file's upload progress.
export type UploadProgressCallback = (progress: number) => void;

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
  EdgeFunctionResponseSchema,
  UploadedFileDataSchema,
};
export type {
  UploadResponse,
  AttachedFile,
  FileValidationResult,
  EdgeFunctionResponse,
  UploadedFileData,
};

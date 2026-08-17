import { z } from "zod";

// Response contract for the ingest-document edge function. The function builds
// this object and validates it before returning so the web client always gets a
// well-formed payload (the client validates again with its own schema).
const IngestDocumentResponseSchema = z.object({
  documentId: z.string(),
  name: z.string(),
  type: z.string(),
  size: z.number(),
  chunkCount: z.number(),
  characterCount: z.number(),
  preview: z.string(),
});

type IngestDocumentResponse = z.infer<typeof IngestDocumentResponseSchema>;

export { IngestDocumentResponseSchema };
export type { IngestDocumentResponse };

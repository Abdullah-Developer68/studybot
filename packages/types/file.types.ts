import { z } from "zod";

// This is the type of the file user uploads, and needs to be parsed to extract text content
//  for the AI to process. It can be a PDF, Word document, Excel spreadsheet,
//  PowerPoint presentation, Markdown file, or plain text file.
const DocumentDataSchema = z.union([
  z.instanceof(ArrayBuffer),
  z.instanceof(Uint8Array),
  z.string(),
]);

// Inferred from the schema so the type and runtime check stay in sync.
type DocumentData = z.infer<typeof DocumentDataSchema>;

export { DocumentDataSchema };
export type { DocumentData };
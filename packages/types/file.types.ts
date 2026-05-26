// This is the type of the file user uploads, and needs to be parsed to extract text content
//  for the AI to process. It can be a PDF, Word document, Excel spreadsheet,
//  PowerPoint presentation, Markdown file, or plain text file.
export type DocumentData = ArrayBuffer | Uint8Array | string;
// Lightweight recursive character text splitter for chunking documents.
// Breaks long texts into overlapping chunks using standard separators.

export interface DocumentChunk {
  pageContent: string;
  metadata?: Record<string, unknown>;
}

export interface SplitterOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
}

export class RecursiveCharacterTextSplitter {
  private chunkSize: number;
  private chunkOverlap: number;
  private separators: string[];

  constructor(options: SplitterOptions = {}) {
    this.chunkSize = options.chunkSize ?? 1000;
    this.chunkOverlap = options.chunkOverlap ?? 200;
    this.separators = options.separators ?? ["\n\n", "\n", " ", ""];
  }

  // Splits raw text into an array of string chunks
  splitText(text: string): string[] {
    const rawSplits: string[] = [];
    this.recursiveSplit(text, this.separators, rawSplits);
    return this.mergeSplits(rawSplits);
  }

  // Recursively partitions text across decreasing separator levels
  private recursiveSplit(text: string, separators: string[], output: string[]) {
    if (text.length <= this.chunkSize) {
      if (text.trim().length > 0) {
        output.push(text);
      }
      return;
    }

    let separator = separators[separators.length - 1];
    let nextSeparators = separators;
    for (let i = 0; i < separators.length; i++) {
      const s = separators[i];
      if (s === "" || text.includes(s)) {
        separator = s;
        nextSeparators = separators.slice(i + 1);
        break;
      }
    }

    const parts = separator ? text.split(separator) : Array.from(text);
    for (const part of parts) {
      if (part.length > this.chunkSize && nextSeparators.length > 0) {
        this.recursiveSplit(part, nextSeparators, output);
      } else if (part.trim().length > 0) {
        output.push(part);
      }
    }
  }

  // Combines smaller splits into chunks respecting chunkSize and chunkOverlap
  private mergeSplits(splits: string[]): string[] {
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentLength = 0;

    for (const piece of splits) {
      const pieceLen = piece.length;
      if (currentLength + pieceLen + (currentChunk.length > 0 ? 1 : 0) > this.chunkSize) {
        if (currentChunk.length > 0) {
          const doc = currentChunk.join(" ").trim();
          if (doc) {
            chunks.push(doc);
          }

          // Maintain overlap window
          while (currentLength > this.chunkOverlap && currentChunk.length > 0) {
            const popped = currentChunk.shift()!;
            currentLength -= popped.length + 1;
          }
        }
      }
      currentChunk.push(piece);
      currentLength += pieceLen + 1;
    }

    if (currentChunk.length > 0) {
      const doc = currentChunk.join(" ").trim();
      if (doc) {
        chunks.push(doc);
      }
    }

    return chunks;
  }

  // Splits an array of documents preserving their attached metadata
  splitDocuments(docs: DocumentChunk[]): DocumentChunk[] {
    const result: DocumentChunk[] = [];
    for (const doc of docs) {
      const pieces = this.splitText(doc.pageContent);
      for (const piece of pieces) {
        result.push({
          pageContent: piece,
          metadata: { ...doc.metadata },
        });
      }
    }
    return result;
  }
}


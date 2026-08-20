import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/classic/document_loaders/base";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { PPTXLoader } from "@langchain/community/document_loaders/fs/pptx";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenAI } from "@google/genai";
import * as XLSX from "xlsx";
import { extractText } from "unpdf";
import { withSupabase } from "@supabase/server";
import type { SupabaseContext } from "@supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getExtension,
  validateFileSize,
} from "@studybot/utils/global/file-utils.ts";
import { IngestDocumentResponseSchema } from "@/types/ingest-document.types.ts";

// CORS headers keep browser uploads (which send a preflight) working.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// The 8 supported extensions. `.ppt` (binary PowerPoint) is intentionally
// excluded — no JS parser exists for it — and gets its own clear error.
const SUPPORTED_EXTENSIONS = new Set([
  "pdf",
  "docx",
  "doc",
  "xlsx",
  "xls",
  "pptx",
  "md",
  "txt",
]);

// Chunking + embedding tuning (matches the RAG plan's locked values).
const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 150;
const EMBED_BATCH_SIZE = 100;
const EMBED_DIMENSIONS = 768; // indexable because pgvector HNSW caps at 2000 dims
const EMBED_MODEL = "gemini-embedding-001";

// Consistent JSON error responses with CORS + JSON content type.
const jsonResponse = (body: unknown, status = 200): Response => {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Google requires manual L2 normalization below 3072 dims. Normalizing makes
// the pgvector cosine operator (<=>) behave like exact cosine similarity, so
// document and query embeddings are comparable even though they used different
// taskTypes during embedding.
const l2Normalize = (vector: number[]): number[] => {
  const norm = Math.sqrt(vector.reduce((sum, x) => sum + x * x, 0)) || 1;
  return vector.map((x) => x / norm);
};

// pgvector accepts the bracket vector literal syntax. supabase-js serializes a
// bare number[] as a Postgres `{...}` array, which some versions reject for the
// custom vector type, so we pass the explicit `[0.1,0.2,...]` string instead.
const toVectorString = (vector: number[]): string =>
  `[${vector.join(",")}]`;

// Embed a batch of ≤100 texts in one request (one rate-limit unit per request)

// with exponential backoff on 429 so the free AI Studio tier is respected.
// taskType RETRIEVAL_DOCUMENT marks these vectors as documents, which improves
// retrieval quality when a RETRIEVAL_QUERY vector is compared against them.
const embedBatch = async (
  genai: GoogleGenAI,
  texts: string[],
  title: string,
): Promise<number[][]> => {
  const maxRetries = 3;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await genai.models.embedContent({
        model: EMBED_MODEL,
        contents: texts,
        config: {
          taskType: "RETRIEVAL_DOCUMENT",
          outputDimensionality: EMBED_DIMENSIONS,
          title,
        },
      });
      const embeddings = result.embeddings ?? [];
      if (embeddings.length !== texts.length) {
        throw new Error("Embedding count does not match input text count");
      }
      return embeddings.map((e) => l2Normalize(e.values ?? []));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      const isRateLimit =
        (error as { status?: number } | undefined)?.status === 429 ||
        /429|quota|rate limit|resource exhausted/i.test(message);
      // Only retry rate-limit errors; rethrow everything else immediately.
      if (!isRateLimit || attempt === maxRetries) {
        throw error;
      }
      await sleep(Math.min(1000 * 2 ** attempt, 8000));
    }
  }
  throw new Error("Embedding failed after retries");
};

// LangChain has no Excel loader (verified against the published package), so we
// wrap `xlsx` in a BaseDocumentLoader and emit one Document per sheet with a
// `sheet` metadata field, mirroring the plan's spike.
class ExcelLoader extends BaseDocumentLoader {
  private blob: Blob;

  constructor(blob: Blob) {
    super();
    this.blob = blob;
  }

  async load(): Promise<Document[]> {
    const buffer = await this.blob.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    return workbook.SheetNames.map((name) => {
      const sheetText = XLSX.utils.sheet_to_csv(workbook.Sheets[name]);
      return new Document({
        pageContent: `--- Sheet: ${name} ---\n${sheetText}`,
        metadata: { sheet: name },
      });
    });
  }
}

// LangChain's PDFLoader can't run in the Supabase edge runtime: its default
// pdf-parse backend isn't bundled, and its pdfjs-dist option fails to bundle
// (dynamic import resolves to a broken path). So we wrap `unpdf` (already a
// dependency, already proven in the old parse-pdf function) in a
// BaseDocumentLoader and emit one Document per page with a `page` metadata
// field. LangChain still owns the pipeline + chunking downstream.
class UnpdfPDFLoader extends BaseDocumentLoader {
  private blob: Blob;

  constructor(blob: Blob) {
    super();
    this.blob = blob;
  }

  async load(): Promise<Document[]> {
    const buffer = await this.blob.arrayBuffer();
    // Default options -> mergePages:false, so `text` is a per-page string[].
    const result = await extractText(new Uint8Array(buffer));
    const pages = Array.isArray(result.text)
      ? result.text
      : [String(result.text ?? "")];
    return pages
      .map((text, index) =>
        new Document({
          pageContent: String(text ?? "").trim(),
          metadata: { page: index + 1 },
        }))
      .filter((doc) => doc.pageContent.length > 0);
  }
}

// Pick the right LangChain loader for a file extension. Loaders directly read a
// Blob/File and return Document[] with per-page/per-sheet metadata attached.
const createLoader = (ext: string, blob: Blob) => {
  switch (ext) {
    case "pdf":
      return new UnpdfPDFLoader(blob);
    case "docx":
    case "doc":
      // DocxLoader uses mammoth for docx and word-extractor for legacy .doc.
      return new DocxLoader(blob);
    case "pptx":
      return new PPTXLoader(blob);
    case "xls":
    case "xlsx":
      return new ExcelLoader(blob);
    default:
      // md + txt share the plain text loader.
      return new TextLoader(blob);
  }
};

export default {
  fetch: withSupabase(
    { auth: "user" }, // ingest writes user-owned rows, so a session JWT is required
    async (req: Request, ctx: SupabaseContext) => {
      // Safety net only — withSupabase answers preflights before the auth check.
      if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
      }

      if (req.method !== "POST") {
        return jsonResponse({ error: "Method not allowed" }, 405);
      }

      // Tracks an inserted document row so a later failure can roll it back
      // (cascade deletes the chunk rows it owns).
      let insertedDocumentId: string | null = null;

      try {
        const formData = await req.formData();
        const file = formData.get("file");

        if (!file || !(file instanceof File)) {
          return jsonResponse({ error: "File is required" }, 400);
        }

        const ext = getExtension(file.name); // no leading dot
        if (!SUPPORTED_EXTENSIONS.has(ext)) {
          if (ext === "ppt") {
            return jsonResponse(
              { error: "legacy .ppt is not supported - convert to .pptx" },
              400,
            );
          }
          return jsonResponse(
            { error: `Unsupported file type: .${ext}` },
            400,
          );
        }

        // Enforce the shared 10MB limit (throws on oversized files).
        validateFileSize(file.size);

        const profileId = ctx.userClaims?.id;
        if (!profileId) {
          return jsonResponse({ error: "Unauthorized" }, 401);
        }

        // Embedding key is injected as a Supabase secret.
        const apiKey = Deno.env.get("GOOGLE_API_KEY");
        if (!apiKey) {
          return jsonResponse(
            { error: "GOOGLE_API_KEY is not configured" },
            500,
          );
        }

        // Annotate as a generic SupabaseClient so .insert() accepts our row
        // shapes (ctx.supabase's context-typed generic is too strict for the
        // un-generated database schema).
        const supabase: SupabaseClient = ctx.supabase;

        // 1) Parse -> Document[] via the loader for this extension.
        const loader = createLoader(ext, file);
        const docs = await loader.load();
        if (!docs || docs.length === 0) {
          return jsonResponse(
            { error: "The document contains no extractable text" },
            400,
          );
        }

        // 2) Split every document into overlapping text chunks.
        const splitter = new RecursiveCharacterTextSplitter({
          chunkSize: CHUNK_SIZE,
          chunkOverlap: CHUNK_OVERLAP,
        });
        const chunks = await splitter.splitDocuments(docs);
        if (chunks.length === 0) {
          return jsonResponse(
            { error: "No content could be chunked from this document" },
            400,
          );
        }

        // 3) Enrich each chunk's metadata with source + chunk position so the
        //    retrieved context can be labeled in the chat prompt.
        const totalChunks = chunks.length;
        const enriched = chunks.map((chunk, chunkIndex) => ({
          content: chunk.pageContent,
          metadata: {
            source: file.name,
            page:
              chunk.metadata?.page ??
              (chunk.metadata?.loc as { pageNumber?: number } | undefined)
                ?.pageNumber,
            sheet: chunk.metadata?.sheet,
            chunkIndex,
            totalChunks,
          },
        }));

        // Full extracted text is stored on the documents row for reference/UI.
        const fullText = enriched.map((c) => c.content).join("\n\n");

        // 4) Embed all chunks in batches (taskType RETRIEVAL_DOCUMENT).
        const genai = new GoogleGenAI({ apiKey });
        const vectors: number[][] = [];
        for (let i = 0; i < enriched.length; i += EMBED_BATCH_SIZE) {
          const batch = enriched
            .slice(i, i + EMBED_BATCH_SIZE)
            .map((c) => c.content);
          vectors.push(...(await embedBatch(genai, batch, file.name)));
        }

        // 5) Insert the documents row first (RLS-scoped to the caller).
        const { data: docRow, error: docError } = await supabase
          .from("documents")
          .insert({
            profile_id: profileId,
            name: file.name,
            file_name: file.name,
            file_type: file.type || "application/octet-stream",
            file_size: file.size,
            extracted_text: fullText,
            was_truncated: false,
            chunk_count: totalChunks,
          })
          .select("document_id")
          .single();

        if (docError || !docRow?.document_id) {
          throw new Error(docError?.message ?? "Failed to create document");
        }
        insertedDocumentId = docRow.document_id;

        // 6) Insert every chunk with its 768-dim embedding, batched.
        const chunkRows = enriched.map((chunk, i) => ({
          document_id: insertedDocumentId as string,
          chunk_index: i,
          content: chunk.content,
          metadata: chunk.metadata,
          embedding: toVectorString(vectors[i]),
        }));

        for (let i = 0; i < chunkRows.length; i += EMBED_BATCH_SIZE) {
          const { error: chunkError } = await supabase
            .from("document_chunks")
            .insert(chunkRows.slice(i, i + EMBED_BATCH_SIZE));
          if (chunkError) {
            throw chunkError;
          }
        }

        // 7) Build and validate the response before returning it.
        const response = {
          documentId: insertedDocumentId,
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          chunkCount: totalChunks,
          characterCount: fullText.length,
          preview: fullText.slice(0, 500),
        };

        const parsed = IngestDocumentResponseSchema.safeParse(response);
        if (!parsed.success) {
          throw new Error("Built an invalid ingest response");
        }

        return jsonResponse(parsed.data);
      } catch (error: unknown) {
        // Roll back the document row (cascade deletes its chunks) so a failed
        // ingest never leaves orphaned/partial rows behind. Harmless if no row
        // was inserted yet.
        if (insertedDocumentId) {
          await ctx.supabase
            .from("documents")
            .delete()
            .eq("document_id", insertedDocumentId);
        }
        const message =
          error instanceof Error
            ? error.message
            : typeof error === "string"
              ? error
              : JSON.stringify(error) || "Unknown error";
        console.error("ingest-document error:", message);
        return jsonResponse({ error: message }, 500);
      }
    },
  ),
};


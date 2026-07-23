# RAG Pipeline Implementation Plan

> Status tracker for the LangChain + pgvector RAG migration.
> Mark tasks `[x]` as they complete and log findings/decisions in `plans/notes.md`.
> Legend: `[ ]` pending · `[~]` in progress · `[x]` done · `[!]` blocked

## Locked Decisions

- **Embedding provider:** Vercel AI Gateway -> `openai/text-embedding-3-small` (1536 dims) via `@ai-sdk/gateway` + `embedMany`/`embed` from `ai@6.0.3` (already proven in the `chat` function)
- **Runtime:** LangChain.js inside NEW Supabase Deno edge functions, deployed alongside the existing `parse-*` functions
- **Chunking:** `RecursiveCharacterTextSplitter`, chunkSize 1500, overlap 150, metadata `{ source, page?/sheet?, chunkIndex, totalChunks }`
- **Compatibility:** old flow 100% preserved; new flow gated behind `NEXT_PUBLIC_USE_RAG` (static env per AGENTS.md)
- **Secrets:** `AI_GATEWAY_API_KEY` must be set as a Supabase secret for `ingest-document` and `chat` functions (already declared in `turbo.json` globalEnv)
- **Comment style:** `//` only, per AGENTS.md
- **Response contract:** ingestion returns `{ documentId, name, type, size, chunkCount, characterCount, preview }`; no truncation ever in RAG mode

## Current Flow (preserved, for reference)

1. `Input.tsx` -> `uploadFilesWithProgress()` -> `uploadDocument()` (api-client) -> axios POST FormData to `${supabaseUrl}/functions/v1/{parse-*}`
2. Five Deno functions extract text: `parse-pdf` (unpdf), `parse-word` (mammoth), `parse-excel` (xlsx), `parse-powerpoint` (officeparser), `parse-text` (utf-8 decode)
3. Client truncates at `MAX_TEXT_LENGTH = 50000` chars in `packages/api-client/api.client.ts`
4. `buildMessageForAI()` concatenates `[Document: name]\n\n<text>` blocks + `[User Request]: prompt` into ONE user message
5. AI SDK `useChat` -> `DefaultChatTransport` -> `chat` edge function -> OpenRouter -> streamed reply

Nothing in this chain chunks documents. `useChat` only stitches streaming RESPONSE chunks (text-delta). Vercel AI Gateway is only a model-routing proxy.

---

## Phase 0 — Spike (go/no-go) `[ ]`

**Goal:** prove every new dependency works inside a local Deno edge function BEFORE building anything real.

**Files (new only):**
- `packages/supabase/functions/ingest-document/deno.json`
- `packages/supabase/functions/ingest-document/index.ts` (throwaway spike version)

**Tasks:**
- [ ] Create `deno.json` with `nodeModulesDir: auto`, `@/` alias, and npm imports: `@langchain/core`, `@langchain/community`, `@langchain/textsplitters`, `ai`, `@ai-sdk/gateway`, `xlsx`, `@supabase/supabase-js` (pin exact versions found working)
- [ ] Loader smoke test: POST one real file per extension (pdf, doc, docx, xls, xlsx, ppt, pptx, txt, md) -> log `Document[]` count and metadata (page for pdf, sheet for xlsx)
- [ ] Custom Excel loader smoke test (`BaseDocumentLoader` wrapping `xlsx`, one Document per sheet, `--- Sheet: name ---` format matching current `parse-excel` output)
- [ ] `RecursiveCharacterTextSplitter` (1500/150) smoke test -> log chunk counts + metadata propagation
- [ ] `embedMany` via `@ai-sdk/gateway` `gateway.textEmbeddingModel("openai/text-embedding-3-small")` -> verify 1536-dim vectors returned in Deno
- [ ] pgvector round-trip: insert rows with embeddings into a scratch table, run a similarity `rpc` select, verify ordered results
- [ ] Log all results + the go/no-go decision in `plans/notes.md`

**Acceptance:** all 9 extensions produce Documents; embeddings are 1536-dim; similarity query returns correctly ordered rows.

**Fallback (if `@langchain/community` fails in Deno):** use `@langchain/core` + `@langchain/textsplitters` only, and wrap today's proven libs (unpdf, mammoth, xlsx, officeparser) in custom `BaseDocumentLoader` classes. LangChain still owns the pipeline + chunking.

---

## Phase 1 — Database migrations `[ ]`

**Goal:** pgvector-enabled storage for chunks + thread linkage, with RLS.

**Files (new/edited):**
- NEW `packages/supabase/migrations/schema/009_create_document_chunks.sql`
- EDIT `packages/supabase/migrations/policies/009_documents_policies.sql` (currently an empty stub)
- NEW `packages/supabase/migrations/policies/015_document_chunks_policies.sql`

**Tasks:**
- [ ] `CREATE EXTENSION IF NOT EXISTS vector;`
- [ ] `ALTER TABLE public.documents`: add `session_id UUID NULL REFERENCES public.chat_sessions(session_id) ON DELETE SET NULL` (thread link, nullable because upload happens before thread creation) and `chunk_count INT DEFAULT 0`
- [ ] `CREATE TABLE public.document_chunks`: `chunk_id UUID PK DEFAULT gen_random_uuid()`, `document_id UUID NOT NULL REFERENCES public.documents(document_id) ON DELETE CASCADE`, `chunk_index INT NOT NULL`, `content TEXT NOT NULL`, `metadata JSONB DEFAULT '{}'::jsonb`, `embedding vector(1536)`, `created_at TIMESTAMPTZ DEFAULT NOW()`
- [ ] HNSW index on `document_chunks.embedding` (`vector_cosine_ops`) + btree index on `document_id`
- [ ] SQL function `match_document_chunks(p_session_id UUID, p_query_embedding vector(1536), p_match_count INT DEFAULT 8)`: cosine-similarity search over chunks joined to documents, `SECURITY DEFINER` with internal `d.profile_id = auth.uid()` guard, returns `content, metadata, similarity, document name`
- [ ] RLS policies for `documents`: SELECT/INSERT/UPDATE/DELETE where `profile_id = auth.uid()` (follow `013_chat_messages_policies.sql` pattern)
- [ ] RLS policies for `document_chunks`: access only via parent document ownership (subquery on `documents.profile_id = auth.uid()`)
- [ ] Apply migrations locally (`supabase db reset` / migration runner) and verify tables, index, function, policies

**Acceptance:** tables + index + RPC exist; user A cannot select/insert/match user B's documents or chunks.

---

## Phase 2 — `ingest-document` edge function `[ ]`

**Goal:** one endpoint that parses, chunks, embeds, and stores any supported file. Old `parse-*` functions stay untouched.

**Files (new only):**
- `packages/supabase/functions/ingest-document/deno.json` (finalized from spike)
- `packages/supabase/functions/ingest-document/index.ts`

**Tasks:**
- [ ] Same request contract as existing parsers: POST multipart FormData with `file` field; same CORS headers; same `{ error }` JSON error shape (400/500)
- [ ] Validate with shared `getExtension` / `validateFileSize` from `@studybot/utils/global/file-utils.ts`; allow all 9 extensions
- [ ] LangChain pipeline: extension -> loader -> `Document[]` (pdf: `PDFLoader` w/ page metadata; doc/docx: `DocxLoader`; ppt/pptx: `PPTXLoader`; txt/md: `TextLoader`; xls/xlsx: custom `ExcelLoader` emitting one Document per sheet with `--- Sheet: name ---` format)
- [ ] `RecursiveCharacterTextSplitter` (chunkSize 1500, overlap 150); merge metadata `{ source: fileName, page?/sheet?, chunkIndex, totalChunks }`
- [ ] Batch embeddings via `embedMany` (~100 chunks per batch) using `gateway.textEmbeddingModel("openai/text-embedding-3-small")`; read `AI_GATEWAY_API_KEY` from `Deno.env`
- [ ] Resolve user via `getSupabaseClient(req)` + `supabase.auth.getUser()`; reject unauthenticated requests (401)
- [ ] Insert `documents` row (profile_id, name, file_name, file_type, file_size, extracted_text = full joined text, was_truncated = false, chunk_count)
- [ ] Insert all `document_chunks` rows (document_id, chunk_index, content, metadata, embedding)
- [ ] On any failure after the documents insert, roll back by deleting the document row (cascade removes chunks)
- [ ] Return `{ documentId, name, type, size, chunkCount, characterCount, preview }` (preview = first ~500 chars for UI display)
- [ ] Add scripts to `packages/supabase/package.json`: `functions:serve:ingest`, `functions:deploy:ingest` (same pattern as existing)
- [ ] Set `AI_GATEWAY_API_KEY` secret: `supabase secrets set AI_GATEWAY_API_KEY=...`

**Acceptance:** uploading each of the 9 file types creates 1 documents row + N chunk rows with non-null embeddings; response matches contract; unauthenticated request fails.

**Deferred (not in scope):** raw file upload to a Storage bucket (`storage_path`). Enables re-ingestion/download later; needs bucket + storage policies.

---

## Phase 3 — `chat` edge function retrieval `[ ]`

**Goal:** server-side retrieval injected per message. Additive only — threads without documents behave exactly as today.

**Files (edited):**
- `packages/supabase/functions/chat/index.ts`
- `packages/supabase/functions/chat/deno.json` (add `@ai-sdk/gateway` import)
- `packages/supabase/functions/types/chat.function.types.ts` (extend body type)

**Tasks:**
- [ ] Extend `ChatRequestBody`: `attachments?: Array<{ document_id?: string; name?: string; type?: string }>`
- [ ] After validating threadId: if body.attachments contains `document_id`s, `UPDATE documents SET session_id = threadId WHERE document_id IN (...) AND session_id IS NULL` via the user-RLS client (ownership enforced by RLS)
- [ ] Retrieval helper: embed last user message content with the same gateway embedding model; call `rpc("match_document_chunks", { p_session_id: threadId, p_query_embedding, p_match_count: 8 })`
- [ ] If chunks found: prepend a system message to `transformedMessages` with instructions + labeled context block (`[Document: name, Page: N]\n<content>` per chunk)
- [ ] If zero chunks / no documents: skip retrieval entirely (identical behavior to current implementation)
- [ ] `storeMessage`: persist the real attachments array instead of hardcoded `[]`
- [ ] Handle embedding/RPC failure gracefully: log error, continue WITHOUT context (chat must never hard-fail because retrieval failed)
- [ ] Set `AI_GATEWAY_API_KEY` secret for the `chat` function

**Acceptance:** questions about linked documents are answered with retrieved context; a thread with no documents streams identically to the current behavior; retrieval failure still returns a normal chat response.


---

## Phase 4 — Web client RAG mode `[ ]`

**Goal:** flag-gated switch between old and new flows.

**Files (edited):**
- `packages/api-client/api.client.ts` — add `uploadDocumentForRag(file, onProgress, options)` (same signature style as `uploadDocument`; POSTs to `ingest-document`; returns documentId etc.)
- `packages/types/upload.types.ts` — additive: `AttachedFile.documentId?: string`, `AttachedFile.chunkCount?: number`; `UploadedFileData` extended accordingly
- `packages/utils/global/upload.utils.ts` — `mapUploadedFile` maps the new optional fields
- `apps/web/components/chat/Input.tsx` — flag logic
- `apps/web/.env.local` (or deployment env) — `NEXT_PUBLIC_USE_RAG=true/false`

**Tasks:**
- [ ] Add `uploadDocumentForRag` to api-client (do NOT modify `uploadDocument`)
- [ ] Extend types additively in `packages/types/upload.types.ts`
- [ ] Map `documentId`/`chunkCount` in `mapUploadedFile`
- [ ] `Input.tsx`: `const USE_RAG = process.env.NEXT_PUBLIC_USE_RAG === "true"` (static reference per AGENTS.md)
- [ ] RAG mode upload: use `uploadDocumentForRag`; store `documentId` in `attachedFiles`
- [ ] RAG mode submit: message text = user prompt only (no document stuffing); `body.attachments` includes `{ document_id, name, type }`
- [ ] Old mode: unchanged `buildMessageForAI` path
- [ ] UI: file chips unchanged; hide truncation badge in RAG mode; optionally show chunk count tooltip

**Acceptance:** flag OFF produces byte-identical behavior to current production flow; flag ON sends prompt-only messages with document_id attachments and uploads via `ingest-document`.

---

## Phase 5 — Testing & validation `[ ]`

**Tasks:**
- [ ] Ingestion matrix: all 9 extensions -> verify documents row, chunk rows, embeddings non-null, chunk_count correct
- [ ] **Killer test:** long PDF (40+ pages) -> ask about content near the END (impossible with the old 50k truncation) -> must answer correctly
- [ ] Multi-file: 3 different docs in one thread -> cross-document synthesis question -> verify source labels in answer
- [ ] Mid-thread attach: start thread, send message, attach new file -> next message retrieves from it
- [ ] Multi-turn: 5+ follow-up questions -> confirm flat token usage / no context overflow
- [ ] RLS isolation: user B cannot read/match user A's documents or chunks (direct API + rpc attempts)
- [ ] Edge cases: empty file, corrupt file, unsupported extension, 10MB boundary file, unauthenticated ingest -> correct error responses
- [ ] CORS preflight from browser for `ingest-document`
- [ ] Flag-OFF regression: old flow end-to-end unchanged
- [ ] `pnpm run typecheck` passes; `deno check` passes for new/edited functions
- [ ] Deploy `ingest-document` + updated `chat` to the hosted project and re-run the killer test
- [ ] Log all results in `plans/notes.md`

---

## Phase 6 — Cleanup (DEFERRED — separate approval required) `[ ]`

Only after Phase 5 passes in production-like usage:
- [ ] Remove `parse-pdf`, `parse-word`, `parse-excel`, `parse-powerpoint`, `parse-text` functions + their serve/deploy scripts
- [ ] Remove old `uploadDocument` from api-client, `extensionToParserFunction` / `getParserFunctionByFileName` from upload.utils
- [ ] Remove legacy `packages/utils/server/document-parser.js` (dead code from the pre-edge-function era)
- [ ] Remove `NEXT_PUBLIC_USE_RAG` flag and the old branch in `Input.tsx`
- [ ] Update AGENTS.md + README.md to document the RAG architecture

---

## Execution order

`Phase 0 -> Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5` (Phase 6 deferred)

Phase 1 is independent of Phase 0 and may be done in parallel, but the `vector(1536)` dimension assumes the gateway embedding model — if the spike forces a different embedding model, update the dimension before applying migrations.


# RAG Pipeline Implementation Plan

> Status tracker for the LangChain + pgvector RAG migration.
> Mark tasks `[x]` as they complete and log findings/decisions in `notes.md` (same directory).
> Legend: `[ ]` pending · `[~]` in progress · `[x]` done · `[!]` blocked

## Locked Decisions

- **Embedding provider:** Google AI Studio (Gemini API free tier) -> `gemini-embedding-001` via the official `@google/genai` SDK. NOT `@langchain/google-genai`: v2.2.0 does not expose `outputDimensionality` and wraps the deprecated `@google/generative-ai` SDK.
- **Embedding params:** `outputDimensionality: 768` (pgvector HNSW caps at 2000 dims, so the 3072 default is unindexable; 768 is an officially supported MRL dimension); `taskType: RETRIEVAL_DOCUMENT` for ingestion / `RETRIEVAL_QUERY` for chat queries; every vector L2-normalized in the edge function (Google requires manual normalization below 3072 dims; also makes cosine ops exact).
- **Embedding batching:** up to ~100 texts per `embedContent` request (one rate-limit unit per request); retry with exponential backoff on 429 (free tier has RPM/RPD limits; exact numbers verified in AI Studio during the spike).
- **Chat LLM:** unchanged - OpenRouter via `createOpenRouter` + Vercel AI SDK (`streamText`/`smoothStream`/`toUIMessageStreamResponse` server-side, `useChat` + `DefaultChatTransport` client-side). Google is used ONLY for embeddings. `AI_GATEWAY_API_KEY` is dead config (no code ever read it) -> removed from `turbo.json` globalEnv in Phase 6.
- **Runtime:** LangChain.js inside ONE new Supabase Deno edge function `ingest-document` that parses ALL supported types (replaces the five `parse-*` functions, deleted in Phase 6).
- **Parsing:** LangChain loaders - `PDFLoader` (fallback: custom unpdf loader), `DocxLoader` (docx via mammoth + legacy .doc via word-extractor), `PPTXLoader` (officeparser), `TextLoader`; custom `ExcelLoader` (LangChain.js has NO Excel loader - verified against the published package) wrapping `xlsx`, one Document per sheet.
- **Supported extensions (8):** pdf, docx, doc, xlsx, xls, pptx, md, txt. `.ppt` is DROPPED - no JS parser exists for binary .ppt (today `parse-powerpoint` accepts it and then throws). UI rejects it upfront via `getSupportedExtensions()`; `ingest-document` rejects it server-side with a clear "convert to .pptx" error.
- **Chunking:** `RecursiveCharacterTextSplitter`, chunkSize 1500, overlap 150, metadata `{ source, page?/sheet?, chunkIndex, totalChunks }`.
- **Cutover:** NO feature flag - hard cutover in Phase 4; old parse functions + old-flow client code removed in Phase 6 (core phase gated only on Phase 5 passing); rollback = git revert.
- **Auth:** `withSupabase({ auth: "user" })` + `ctx.supabase` (RLS-scoped) + `ctx.userClaims` - the exact pattern of the `chat` function (ingest writes user-owned rows, so `publishable` is not sufficient).
- **Schema workflow:** declarative files stay the source of truth - EDIT `packages/supabase/schema/documents.sql` + `packages/supabase/schema/document_chunks.sql` (already authored but never applied; fix `vector(1536)` -> `vector(768)`) and register `document_chunks.sql` in `config.toml` `schema_paths`. Push DIRECTLY to the hosted project with a HAND-WRITTEN migration (`supabase migration new` + paste the DDL) + `pnpm db:push` (`supabase db push --linked` - Docker-free; project already linked). `supabase db diff` is NOT used: it requires a local shadow Postgres in Docker, and Docker is unavailable on this machine.
- **Secrets:** `GOOGLE_API_KEY` (free key from aistudio.google.com) as a Supabase secret for `ingest-document` and `chat`; added to `turbo.json` globalEnv (Phase 6) and to `packages/supabase/.env.local` for local `functions serve`.
- **Comment style:** `//` only, per AGENTS.md.
- **Response contract:** ingestion returns `{ documentId, name, type, size, chunkCount, characterCount, preview }` (preview = first ~500 chars for UI display); no truncation ever - `MAX_TEXT_LENGTH` is deleted.

## Current Flow (being replaced, for reference)

1. `Input.tsx` -> `uploadFilesWithProgress()` -> `uploadDocument()` (api-client) -> axios POST FormData to `${supabaseUrl}/functions/v1/{parse-*}`
2. Five Deno functions extract text: `parse-pdf` (unpdf), `parse-word` (mammoth), `parse-excel` (xlsx), `parse-powerpoint` (officeparser), `parse-text` (utf-8 decode)
3. Client truncates at `MAX_TEXT_LENGTH = 50000` chars in `packages/api-client/api.client.ts`
4. `buildMessageForAI()` concatenates `[Document: name]\n\n<text>` blocks + `[User Request]: prompt` into ONE user message
5. AI SDK `useChat` -> `DefaultChatTransport` -> `chat` edge function -> OpenRouter -> streamed reply

Nothing in this chain chunks documents and nothing is persisted (the `documents` table exists but is unused). Known gaps in the old flow: legacy `.doc` goes to mammoth (docx-only) and binary `.ppt` goes to officeparser (OOXML-only) - both effectively fail today.

---

## Phase 0 — Spike (go/no-go) `[ ]`

**Goal:** prove every new dependency works in Deno BEFORE building anything real, via plain `deno run` spike scripts (Deno 2.9.4 confirmed installed; `supabase functions serve` needs Docker, which is down).

**Prerequisite:** DONE - `GOOGLE_API_KEY` is saved in `packages/supabase/.env.local` (gitignored).

**Files (new only):**
- `packages/supabase/functions/ingest-document/deno.json`
- `packages/supabase/functions/ingest-document/spike/*.ts` (throwaway spike scripts run with plain `deno run` - no edge runtime or Docker needed)

**Tasks:**
- [ ] Create `deno.json` with `nodeModulesDir: auto`, `@/` alias, and npm imports: `@langchain/core`, `@langchain/community`, `@langchain/textsplitters`, `@google/genai`, `mammoth`, `word-extractor`, `officeparser`, `xlsx`, `unpdf`, `zod`, `@supabase/supabase-js`, `@supabase/server` (pin exact versions found working)
- [ ] Loader smoke test: POST one real file per extension (pdf, doc, docx, xls, xlsx, pptx, txt, md) -> log `Document[]` count and metadata (page for pdf, sheet for xlsx)
- [ ] PDFLoader decision: try default (pdf-parse) in Deno -> if broken, the `pdfjs` option -> final fallback: custom unpdf-based loader emitting one Document per page (unpdf already returns per-page text arrays - proven in `parse-pdf`)
- [ ] `DocxLoader` with `type: "doc"` -> verify `word-extractor` parses a real legacy .doc in Deno
- [ ] Custom `ExcelLoader` smoke test (`BaseDocumentLoader` wrapping `xlsx`, one Document per sheet, `--- Sheet: name ---` body + `{ source, sheet }` metadata)
- [ ] `RecursiveCharacterTextSplitter` (1500/150) smoke test -> log chunk counts + metadata propagation
- [ ] `@google/genai` `embedContent`: batch ~100 texts in one request, `taskType: "RETRIEVAL_DOCUMENT"`, `outputDimensionality: 768` -> verify 768-dim vectors; L2-normalize helper; 429 retry-with-backoff helper
- [ ] Log all results + the go/no-go decision in `notes.md`

**Acceptance:** all 8 extensions produce Documents; embeddings are 768-dim (the pgvector round-trip is verified on the hosted project in Phase 1).

**Fallback (if `@langchain/community` fails in Deno):** use `@langchain/core` + `@langchain/textsplitters` only, and wrap today's proven libs (unpdf, mammoth, xlsx, officeparser, word-extractor) in custom `BaseDocumentLoader` classes. LangChain still owns the pipeline + chunking.

---

## Phase 1 — Database (declarative schema) `[ ]`

**Goal:** pgvector-enabled storage for chunks + thread linkage, with RLS, pushed DIRECTLY to the hosted (cloud) project. The local Supabase instance is not set up AND Docker is down, so no local-only `db:reset` / `db:diff` steps run - the migration is hand-written from the declarative files.

**Current state:** `schema/document_chunks.sql` already exists (table + HNSW + `match_document_chunks` RPC + RLS policies) but was NEVER applied - it is missing from `config.toml` `schema_paths`, says `vector(1536)` "via OpenRouter", and its RPC references `documents.session_id`, a column that does not exist yet.

**Files (edited):**
- `packages/supabase/schema/documents.sql` (add 2 columns)
- `packages/supabase/schema/document_chunks.sql` (fix dimension + comment)
- `packages/supabase/config.toml` (register the file)

**Tasks:**
- [ ] `documents.sql`: add `session_id UUID NULL REFERENCES public.chat_sessions(session_id) ON DELETE SET NULL` (nullable because upload happens before thread creation), `chunk_count INTEGER NOT NULL DEFAULT 0`, and `CREATE INDEX IF NOT EXISTS idx_documents_session_id ON public.documents(session_id)` (the RPC filters by session_id)
- [ ] `document_chunks.sql`: `embedding extensions.vector(768)` and `p_query_embedding extensions.vector(768)`; update the comment to `gemini-embedding-001 (Google AI Studio, outputDimensionality 768)`; HNSW index + RLS policies stay as authored
- [ ] `config.toml`: add `"./schema/document_chunks.sql"` to `schema_paths` (after `./schema/chat_messages.sql`). If pgdelta errors on FK ordering (`documents.sql` now references `chat_sessions` but is listed before it), move `documents.sql` after `chat_sessions.sql`
- [ ] Create the migration WITHOUT Docker: `supabase migration new rag_document_chunks` (creates an empty timestamped file in `migrations/`), then hand-write the DDL into it (content = the declarative files): `CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions`, the `documents` ALTERs + index, `document_chunks` table + HNSW + `match_document_chunks` RPC + RLS policies. (`supabase db diff --linked` would auto-generate this, but it spins up a local shadow Postgres container - Docker is down)
- [ ] Push directly to the hosted project: `pnpm db:push` (i.e. `supabase db push --linked` - Docker-free; project already linked, global CLI v2.109.1 confirmed). May prompt for the database password (not stored by linking) - user provides it. Do NOT run `pnpm db:reset` / `db:diff` / `db:diff:file`
- [ ] Hosted verification + pgvector round-trip via `psql` (user provides the DB connection string/password): table, HNSW index, RPC, policies, and the two new `documents` columns exist; insert 2-3 test chunks with 768-dim embeddings, call `match_document_chunks`, verify correctly ordered results, delete test rows
- [ ] RLS isolation check (hosted): user B cannot select/insert/match user A's documents or chunks

**Acceptance:** tables + index + RPC exist on the hosted project; the round-trip returns correctly ordered rows; user A cannot select/insert/match user B's documents or chunks.

---

## Phase 2 — `ingest-document` edge function `[ ]`

**Goal:** ONE endpoint that parses, chunks, embeds, and stores every supported file type. Replaces all five `parse-*` functions.

**Files (new only):**
- `packages/supabase/functions/ingest-document/deno.json` (finalized from spike)
- `packages/supabase/functions/ingest-document/index.ts`

**Tasks:**
- [ ] Same request contract as existing parsers: POST multipart FormData with `file` field; same CORS headers; same `{ error }` JSON error shape (400/500)
- [ ] `withSupabase({ auth: "user" })` + `ctx.supabase` + `ctx.userClaims` (writes user-owned rows)
- [ ] Validate with shared `getExtension` / `validateFileSize` from `@studybot/utils/global/file-utils.ts`; allow the 8 extensions; reject `.ppt` with a clear "legacy .ppt is not supported - convert to .pptx" 400
- [ ] LangChain pipeline: extension -> loader -> `Document[]` (pdf: `PDFLoader` w/ page metadata [or unpdf fallback from spike]; doc+docx: `DocxLoader`; pptx: `PPTXLoader`; txt/md: `TextLoader`; xls/xlsx: custom `ExcelLoader`, one Document per sheet)
- [ ] `RecursiveCharacterTextSplitter` (chunkSize 1500, overlap 150); merge metadata `{ source: fileName, page?/sheet?, chunkIndex, totalChunks }`
- [ ] Embeddings via `@google/genai`: batches of ~100, `taskType: RETRIEVAL_DOCUMENT` (+ `title: fileName`), `outputDimensionality: 768`, L2-normalize, 429-backoff; key from `Deno.env.get("GOOGLE_API_KEY")`
- [ ] Insert `documents` row (profile_id from `ctx.userClaims.id`, name, file_name, file_type, file_size, extracted_text = full joined text, was_truncated = false, chunk_count) via `ctx.supabase`
- [ ] Insert all `document_chunks` rows (document_id, chunk_index, content, metadata, embedding)
- [ ] On any failure after the documents insert, roll back by deleting the document row (cascade removes chunks)
- [ ] Return `{ documentId, name, type, size, chunkCount, characterCount, preview }` (preview = first ~500 chars)
- [ ] Add scripts to `packages/supabase/package.json`: `functions:serve:ingest`, `functions:deploy:ingest` (same pattern as existing). NOTE: `supabase functions serve` needs Docker (down) - local function testing uses a `deno serve` harness with hosted env vars, or the deployed hosted function
- [ ] Set secret: `supabase secrets set GOOGLE_API_KEY=...` (and local env for `functions serve`)

**Acceptance:** uploading each of the 8 file types creates 1 documents row + N chunk rows with non-null 768-dim embeddings; response matches contract; unauthenticated request -> 401; `.ppt` -> clear 400.

**Deferred (not in scope):** raw file upload to a Storage bucket (`storage_path`). Enables re-ingestion/download later; needs bucket + storage policies.

---

## Phase 3 — `chat` edge function retrieval `[ ]`

**Goal:** server-side retrieval injected per message. Additive only - threads without documents behave exactly as today. Streaming stack (`streamText`, `smoothStream`, `toUIMessageStreamResponse`, OpenRouter) is untouched.

**Files (edited):**
- `packages/supabase/functions/chat/index.ts`
- `packages/supabase/functions/chat/deno.json` (add `@google/genai` import)
- `packages/supabase/functions/types/chat.function.types.ts` (extend body schema)

**Tasks:**
- [ ] Extend `ChatRequestBodySchema`: `attachments: z.array(z.object({ document_id: z.string().optional(), name: z.string().optional(), type: z.string().optional() })).optional()` - today the schema SILENTLY STRIPS the attachments `Input.tsx` already sends
- [ ] After validating threadId: if body.attachments contains `document_id`s, `UPDATE documents SET session_id = threadId WHERE document_id IN (...) AND session_id IS NULL` via `ctx.supabase` (ownership enforced by RLS)
- [ ] Retrieval helper: embed last user message via `@google/genai` (`taskType: RETRIEVAL_QUERY`, `outputDimensionality: 768`, L2-normalized); call `rpc("match_document_chunks", { p_session_id: threadId, p_query_embedding, p_match_count: 8 })`
- [ ] If chunks found: prepend a system message to `transformedMessages` with instructions + labeled context block (`[Document: name, Page: N]\n<content>` per chunk)
- [ ] If zero chunks / no documents: skip retrieval entirely (identical behavior to current implementation)
- [ ] `storeMessage`: persist the real attachments array instead of hardcoded `[]`
- [ ] Handle embedding/RPC failure gracefully: log error, continue WITHOUT context (chat must never hard-fail because retrieval failed)
- [ ] Set `GOOGLE_API_KEY` secret for the `chat` function

**Acceptance:** questions about linked documents are answered with retrieved context; a thread with no documents streams identically to the current behavior; retrieval failure still returns a normal chat response.

---

## Phase 4 — Web client cutover (no flag) `[ ]`

**Goal:** replace the old upload/parse flow with the RAG flow everywhere. No `NEXT_PUBLIC_USE_RAG` flag - git history is the rollback.

**Files (edited):**
- `packages/utils/global/file-utils.ts` - remove `.ppt` from `getSupportedExtensions()`
- `packages/api-client/api.client.ts` - REPLACE `uploadDocument` to POST `ingest-document` and return the new contract; delete the `MAX_TEXT_LENGTH` truncation block and the old parser response schema
- `packages/types/upload.types.ts` - rewrite schemas for the RAG contract
- `packages/utils/global/upload.utils.ts` - `mapUploadedFile` maps new fields; delete dead parser-routing code
- `apps/web/components/chat/Input.tsx` - prompt-only submit + document_id attachments

**Tasks:**
- [ ] `file-utils.ts`: remove `".ppt"` from `getSupportedExtensions()` (8 extensions)
- [ ] `api.client.ts`: `uploadDocument` now POSTs FormData to `${supabaseUrl}/functions/v1/ingest-document` (same axios upload-progress pattern, same auth headers); validate response with the new zod schema; NO truncation
- [ ] `upload.types.ts`: `UploadResponseSchema` -> `{ success, documentId, fileName, fileType, fileSize, chunkCount, characterCount, preview, message }`; `AttachedFileSchema` -> `{ name, type, size, documentId, chunkCount? }` (drops `extractedText` / `wasTruncated`); remove `UploadedFileDataSchema`, `EdgeFunctionResponseSchema`, and parseFile-only types (verified: `parseFile` has zero callers)
- [ ] `upload.utils.ts`: `mapUploadedFile` maps `documentId` / `chunkCount`; DELETE `extensionToParserFunction`, `getParserFunctionByFileName`, `parseFile`
- [ ] `Input.tsx`: delete `buildMessageForAI`; submit message text = user prompt only; `body.attachments` = `[{ document_id, name, type }]` from attachedFiles; delete the truncation badge; file chips unchanged (optional: chunk-count tooltip)
- [ ] Verify no remaining imports of removed symbols (`getParserFunctionByFileName`, `parseFile`, `MAX_TEXT_LENGTH`, old `AttachedFile` fields) - `pnpm run typecheck` green

**Acceptance:** the RAG flow is the only flow; uploads hit `ingest-document`; messages carry prompt-only text + `document_id` attachments; typecheck passes with the old code deleted.

---

## Phase 5 — Testing & validation `[ ]`

**Tasks:**
- [ ] Ingestion matrix: all 8 extensions -> verify documents row, chunk rows, embeddings non-null, SQL check `vector_dims(embedding) = 768`, chunk_count correct
- [ ] **Killer test:** long PDF (40+ pages) -> ask about content near the END (impossible with the old 50k truncation) -> must answer correctly
- [ ] Multi-file: 3 different docs in one thread -> cross-document synthesis question -> verify source labels in answer
- [ ] Mid-thread attach: start thread, send message, attach new file -> next message retrieves from it
- [ ] Multi-turn: 5+ follow-up questions -> confirm flat token usage / no context overflow
- [ ] RLS isolation: user B cannot read/match user A's documents or chunks (direct API + rpc attempts)
- [ ] Edge cases: empty file, corrupt file, unsupported extension, `.ppt` rejection (client blocks upfront + server 400s), 10MB boundary file, unauthenticated ingest -> correct error responses
- [ ] Real legacy `.doc` file -> parsed via word-extractor
- [ ] Free-tier behavior: batched requests stay within RPM; forced 429 -> backoff retry succeeds
- [ ] CORS preflight from browser for `ingest-document`
- [ ] `pnpm run typecheck` passes; `deno check` passes for new/edited functions
- [ ] Deploy `ingest-document` + updated `chat` to the hosted project and re-run the killer test
- [ ] Log all results in `notes.md`

---

## Phase 6 — Removal (CORE - runs immediately after Phase 5 passes) `[ ]`

- [ ] Delete `functions/parse-pdf`, `parse-word`, `parse-excel`, `parse-powerpoint`, `parse-text` directories
- [ ] `packages/supabase/package.json`: remove `functions:serve:{pdf,word,excel,powerpoint,text}` and `functions:deploy:{pdf,word,excel,powerpoint,text}` scripts
- [ ] Hosted project: `supabase functions delete parse-pdf parse-word parse-excel parse-powerpoint parse-text`
- [ ] Grep-guard, then delete legacy `packages/utils/server/document-parser.js` + remove the `"./server/document-parser"` export from `packages/utils/package.json` + the re-export in `packages/utils/server/index.js`
- [ ] Grep-guard, then remove `MAX_TEXT_LENGTH` from `packages/utils/global/file-utils.ts`
- [ ] `turbo.json`: replace `AI_GATEWAY_API_KEY` with `GOOGLE_API_KEY` in `globalEnv` (the gateway key is dead config - no code ever read it; chat streaming uses OpenRouter, unchanged)
- [ ] Update AGENTS.md + README.md to document the RAG architecture
- [ ] Full regression: upload -> ingest -> chat retrieval end-to-end

Note: the `documents.was_truncated` column stays in the DB schema (harmless; new rows are always false).

---

## Execution order

`Phase 0 -> Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5 -> Phase 6`

Phase 1 is independent of Phase 0 and may be done in parallel, but `vector(768)` assumes the spike confirms `gemini-embedding-001` via `@google/genai` - if the spike forces a different model/dimension, update `schema/document_chunks.sql` BEFORE writing the migration file, since a pushed migration is harder to change afterwards.

Phase 0 prerequisite is DONE: `GOOGLE_API_KEY` is saved in `packages/supabase/.env.local` (gitignored).

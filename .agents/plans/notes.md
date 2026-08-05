# RAG Migration — Notes

> What is changing, why, and how it affects the application.
> Companion to `rag-pipeline-plan.md` (same directory). Findings and decisions are logged here as phases complete.

## 1. Background — how document handling works TODAY

- User attaches files in chat -> browser POSTs each file to one of 5 Supabase edge functions (`parse-pdf`, `parse-word`, `parse-excel`, `parse-powerpoint`, `parse-text`)
- Each function extracts raw text and returns `{ text }`
- The client hard-truncates the text at 50,000 characters (mid-sentence if needed)
- The FULL text of every file is baked into the first user message (`[Document: name]\n\n<text>`) and sent to the `chat` edge function
- Nothing is persisted: no `documents` rows, no storage upload, no chunks. The `documents` table exists but is completely unused.
- Known gaps: `.doc` -> mammoth (docx-only) and `.ppt` -> officeparser (OOXML-only) effectively fail today despite being listed as supported.

### Terminology that caused confusion (verified against sdk.vercel.ai docs)

- **Streaming chunks** = `text-delta` fragments of the AI's REPLY (server -> browser). `useChat` stitches these automatically. This is the ONLY "chunking" the AI SDK does.
- **Document chunks** = pieces of the extracted file text sent TO the model (browser -> model). Nothing handles this today; the whole (truncated) file rides inside one user message.
- Vercel AI Gateway is only a model-routing proxy; it was never wired into the code (`AI_GATEWAY_API_KEY` in turbo.json is dead config - no code reads it).

## 2. The problems being solved

| Scenario | Today | With RAG |
|---|---|---|
| 40-page PDF | 50k-char cut ~= pages 1-20 only; pages 21-40 permanently invisible; whole text re-sent EVERY message | Full doc chunked (~80-120 chunks) + embedded once; each question retrieves ~8 relevant chunks (~3-4k tokens); page 37 answers as well as page 2 |
| Multiple files | All concatenated into one mega-prompt; truncation slices across file boundaries; no source attribution | Each file ingested independently; retrieval spans ALL thread docs ranked by similarity; chunks labeled `[source, page]` so the model can cite |
| Multi-turn chat | Doc text lives in message history -> token cost multiplies every turn, eventual context overflow | History is pure conversation; retrieval injects only what is needed per turn -> flat cost |

## 3. What changes are being made (by layer)

### 3.1 Database (Phase 1) - declarative schema workflow

- The repo uses DECLARATIVE schema files in `packages/supabase/schema/` listed in `config.toml` `schema_paths`; migrations are generated from those files, not hand-written numbered files.
- **Cloud-only DB pushes:** the local Supabase instance is not set up AND Docker is down, so `supabase db diff` (which spins up a local shadow Postgres container) cannot run. The declarative files stay the source of truth; the migration is HAND-WRITTEN (`supabase migration new` + paste the DDL) and applied directly to the hosted project with `pnpm db:push` (`supabase db push --linked` - Docker-free; project already linked; global CLI v2.109.1). The pgvector round-trip (insert 768-dim rows, call `match_document_chunks`, verify ordering) happens here on the hosted DB via psql (user provides the DB connection string/password) - it was moved out of the Phase 0 spike.
- `schema/document_chunks.sql` was already authored (table + HNSW + `match_document_chunks` RPC + RLS) but never applied (missing from `schema_paths`) and was written for `vector(1536)` "via OpenRouter" -> updated to `vector(768)` for `gemini-embedding-001`.
- **Altered:** `documents` table gains `session_id` (nullable FK to `chat_sessions` - nullable because files are uploaded BEFORE a thread exists), `chunk_count`, and an index on `session_id` (the RPC filters by it)
- **Why 768 dims:** pgvector HNSW indexes cap at 2000 dimensions, so gemini-embedding-001's 3072-dim default is unindexable; 768 is an officially supported MRL dimension (Google requires manual L2 normalization below 3072 - done in the edge functions).

### 3.2 Ingestion — NEW `ingest-document` edge function (Phase 2)

- ONE endpoint for all 8 supported extensions (pdf, docx, doc, xlsx, xls, pptx, md, txt) - replaces all five `parse-*` functions (deleted in Phase 6)
- `.ppt` is dropped from the allow-list: no JS parser exists for binary PowerPoint (today it fails at parse time anyway); UI rejects it upfront, the function 400s with "convert to .pptx"
- LangChain loaders: `PDFLoader` (fallback: custom unpdf loader), `DocxLoader` (docx via mammoth + **legacy .doc via word-extractor** - BETTER than today), `PPTXLoader` (officeparser), `TextLoader`; custom `ExcelLoader` (LangChain.js has no Excel loader - verified against the published package) wrapping `xlsx`, one Document per sheet
- `RecursiveCharacterTextSplitter` (1500/150) with metadata `{ source, page?/sheet?, chunkIndex, totalChunks }`
- Embeddings: official `@google/genai` SDK (NOT `@langchain/google-genai` - it cannot set `outputDimensionality` and wraps the deprecated `@google/generative-ai` SDK): `gemini-embedding-001`, `outputDimensionality: 768`, `taskType: RETRIEVAL_DOCUMENT`, batches of ~100 texts/request, 429 backoff, L2-normalized
- Auth: `withSupabase({ auth: "user" })` + `ctx.supabase` + `ctx.userClaims` (same pattern as `chat`)
- Inserts `documents` row (full text, NO truncation) + all `document_chunks` rows; rollback deletes the document row on failure
- Returns `{ documentId, chunkCount, characterCount, preview }` instead of giant text

### 3.3 Chat edge function (Phase 3) - additive only

- `ChatRequestBodySchema` gains `attachments?: [{ document_id?, name?, type? }]` - today zod SILENTLY STRIPS the attachments the client already sends
- First message with attachments: links documents to the thread (`UPDATE documents SET session_id = ...` scoped by RLS)
- Every message: embeds the question (`RETRIEVAL_QUERY`, 768, normalized) -> `match_document_chunks(threadId, k=8)` -> prepends a system message with labeled context (`[notes.pdf, p.12] <chunk>`)
- Threads with NO linked documents behave byte-identically to today; retrieval failure logs + continues WITHOUT context (chat never hard-fails)
- `storeMessage` persists the real attachments array instead of hardcoded `[]`
- Streaming stack untouched: OpenRouter via `createOpenRouter`, `streamText`, `smoothStream`, `toUIMessageStreamResponse`

### 3.4 Web client (Phase 4) - full cutover, no flag

- No `NEXT_PUBLIC_USE_RAG` flag: the RAG flow REPLACES the old flow; rollback = git revert
- `uploadDocument` (api-client) now POSTs to `ingest-document` and returns the new contract; the 50k truncation block is deleted
- `AttachedFile` = `{ name, type, size, documentId, chunkCount? }` (drops `extractedText` / `wasTruncated`); `buildMessageForAI` is deleted - the message is the user's prompt only, with `body.attachments` carrying `document_id`s
- Dead code removed: `extensionToParserFunction`, `getParserFunctionByFileName`, `parseFile` (verified zero callers), `MAX_TEXT_LENGTH`, truncation badge
- `.ppt` removed from `getSupportedExtensions()`

## 4. How this affects the application

### 4.1 User-facing impact

- **Larger effective documents:** the 50k-char ceiling disappears; a 40-page PDF is fully usable, including its last pages (impossible today)
- **Better answers:** retrieval injects only relevant passages with `[source, page]` labels -> the model cites where information came from
- **Cheaper long threads:** documents no longer ride inside message history -> token usage stays flat across turns
- **Slightly slower upload:** ingestion adds embedding time (~1-3s for typical files, batched ~100 chunks per embedding request)
- **Slightly slower first token per message:** retrieval adds ~300-600ms before streaming starts (embed question + vector search)
- **UI:** file chips and upload progress behave the same; the truncation warning badge disappears (nothing is truncated); `.ppt` files are rejected upfront with a clear message

### 4.2 Data & security impact

- Extracted text and chunk embeddings are now PERSISTED in Postgres (`documents`, `document_chunks`) - previously nothing was stored
- Both tables are RLS-protected per user; the `match_document_chunks` RPC has an internal `auth.uid()` ownership guard (SECURITY DEFINER)
- Embeddings leave Supabase for the Google Gemini API (AI Studio key) - same trust-boundary style as chat prompts going through OpenRouter. Note: on the free tier Google states content may be used to improve its products (paid tier: not used).
- Raw files are still NOT stored anywhere (`storage_path` stays null until the deferred storage phase)

### 4.3 Cost impact

- **Embedding cost: $0** within the Google AI Studio free tier (rate-limited per minute/day; batching ~100 texts per request keeps uploads comfortably inside limits; 429s are retried with backoff)
- **Saved cost:** no more re-sending full document text with every message -> significant token savings on multi-turn document chats
- **New infra:** pgvector storage grows with usage (~3KB per 768-dim vector + content)
- `AI_GATEWAY_API_KEY` is removed from turbo.json globalEnv (dead config - the old plan's gateway-based embeddings were never implemented)

### 4.4 Rollback strategy

- No feature flag: rollback = git revert of the cutover commits; DB changes are additive (new table, new nullable columns) so old code keeps working against the new schema during transition
- The `chat` function's retrieval is self-disabling: threads without linked documents behave exactly as today

### 4.5 Known limitations / future work

- **Deferred:** raw file storage in Supabase Storage (`storage_path`) - enables re-ingestion and download later; needs bucket + storage policies
- Old `parse-*` functions + old-flow client code are removed in Phase 6 (core phase, runs right after Phase 5 validation passes)
- `.ppt` (binary PowerPoint) is unsupported by design - no JS parser exists
- Free-tier rate limits: heavy bulk-upload testing may hit RPM/RPD caps; backoff handles transient 429s
- Semantic retrieval quality depends on chunking parameters (1500/150); tunable later without schema changes
- No hybrid (keyword + vector) search yet; pure cosine similarity is used first
- No document management UI yet (list/delete ingested documents); cascade delete happens with profile deletion
- Local function serving (`supabase functions serve`) is unavailable while Docker is down - test via a `deno serve` harness or the deployed hosted function

## 5. Decision log

| Date | Decision | Rationale |
|---|---|---|
| 2026-07-19 | LangChain.js in new Deno edge functions (not Next.js route, not Python) | Keeps upload transport (browser -> Supabase direct, 10MB works); libs already proven in Deno; no new service to deploy |
| 2026-07-19 | Full RAG (not prompt-assembly-only chunking) | User requirement: 40-page PDFs and multi-file threads must work properly |
| 2026-07-19 | RecursiveCharacterTextSplitter 1500/150 | RAG-standard sizes; metadata preserved per chunk; tunable later |
| 2026-07-19 | Retrieval inside the existing `chat` function (not a separate function) | Retrieval must happen per-message server-side; self-disables when no documents are linked |
| 2026-08-05 | Google AI Studio `gemini-embedding-001` for embeddings (supersedes 2026-07-19 Vercel AI Gateway / OpenAI decision) | User requirement: OpenAI embeddings have no free tier; Google AI Studio does. `taskType` asymmetry (RETRIEVAL_DOCUMENT vs RETRIEVAL_QUERY) improves retrieval quality |
| 2026-08-05 | Official `@google/genai` SDK instead of `@langchain/google-genai` | LangChain wrapper (v2.2.0) does not expose `outputDimensionality` and wraps the deprecated `@google/generative-ai` SDK |
| 2026-08-05 | 768 dims via `outputDimensionality` (not 3072, not 1536) | pgvector HNSW caps at 2000 dims -> 3072 is unindexable; 768 is an officially supported MRL dimension: indexable, ~4x smaller storage, negligible quality loss |
| 2026-08-05 | L2-normalize every embedding | Google requires manual normalization below 3072 dims; makes pgvector cosine ops exact |
| 2026-08-05 | ONE `ingest-document` function parses all types; old `parse-*` functions deleted in Phase 6 (core, not deferred) | User requirement; single LangChain pipeline replaces five per-type functions |
| 2026-08-05 | No feature flag - hard cutover (supersedes 2026-07-19 flag decision) | User decision; git history is the rollback; no throwaway flag code |
| 2026-08-05 | Drop `.ppt`; supported extensions = 8 | No JS parser exists for binary .ppt (it fails at parse time today); rejected upfront with a clear message. `.doc` IMPROVES: DocxLoader handles it via word-extractor |
| 2026-08-05 | Phase 1 uses the repo's declarative schema workflow | `schema/document_chunks.sql` was already authored but unapplied; fix + register in `config.toml` schema_paths; the migration is hand-written because `db diff` needs Docker |
| 2026-08-05 | Chat LLM stays on OpenRouter + Vercel AI SDK; `AI_GATEWAY_API_KEY` removed from turbo.json | Streaming stack is untouched; the gateway key was dead config (no code ever read it); Google is used ONLY for embeddings |
| 2026-08-05 | Phase 1 schema changes are pushed directly to the hosted project (no local Supabase instance, Docker down) | `db diff` requires a local shadow Postgres container (Docker down); `supabase migration new` + `pnpm db:push` are Docker-free; project already linked (global CLI v2.109.1) |
| 2026-08-05 | Phase 0 spike runs as plain `deno run` scripts; pgvector round-trip moved to Phase 1 | `supabase functions serve` needs Docker (down); Deno 2.9.4 is installed; the spike proves loaders/splitter/embeddings without any server |
| 2026-08-05 | Hosted DB verification via `psql` (not Studio) | User choice; most automatable; user provides the DB connection string/password (also needed if `db push` prompts) |

## 6. Findings log (filled during implementation)

- (Phase 0 spike results: pending)
- (Phase 1 migration results: pending)
- (Phase 2 ingestion results: pending)
- (Phase 3 retrieval results: pending)
- (Phase 4 client results: pending)
- (Phase 5 test results: pending)
- (Phase 6 removal results: pending)

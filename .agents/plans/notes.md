# RAG Migration — Notes

> What is changing, why, and how it affects the application.
> Companion to `plans/rag-pipeline-plan.md`. Findings and decisions are logged here as phases complete.

## 1. Background — how document handling works TODAY

- User attaches files in chat -> browser POSTs each file to one of 5 Supabase edge functions (`parse-pdf`, `parse-word`, `parse-excel`, `parse-powerpoint`, `parse-text`)
- Each function extracts raw text and returns `{ text }`
- The client hard-truncates the text at 50,000 characters (mid-sentence if needed)
- The FULL text of every file is baked into the first user message (`[Document: name]\n\n<text>`) and sent to the `chat` edge function
- Nothing is persisted: no `documents` rows, no storage upload, no chunks. The `documents` table exists but is completely unused.

### Terminology that caused confusion (verified against sdk.vercel.ai docs)

- **Streaming chunks** = `text-delta` fragments of the AI's REPLY (server -> browser). `useChat` stitches these automatically. This is the ONLY "chunking" the AI SDK does.
- **Document chunks** = pieces of the extracted file text sent TO the model (browser -> model). Nothing handles this today; the whole (truncated) file rides inside one user message.
- Vercel AI Gateway is only a model-routing proxy; it never processes documents.

## 2. The problems being solved

| Scenario | Today | With RAG |
|---|---|---|
| 40-page PDF | 50k-char cut ~= pages 1-20 only; pages 21-40 permanently invisible; whole text re-sent EVERY message | Full doc chunked (~80-120 chunks) + embedded once; each question retrieves ~8 relevant chunks (~3-4k tokens); page 37 answers as well as page 2 |
| Multiple files | All concatenated into one mega-prompt; truncation slices across file boundaries; no source attribution | Each file ingested independently; retrieval spans ALL thread docs ranked by similarity; chunks labeled `[source, page]` so the model can cite |
| Multi-turn chat | Doc text lives in message history -> token cost multiplies every turn, eventual context overflow | History is pure conversation; retrieval injects only what is needed per turn -> flat cost |

## 3. What changes are being made (by layer)

### 3.1 Database (Phase 1)

- **New:** pgvector extension; `document_chunks` table (content + metadata + 1536-dim embedding + HNSW index); `match_document_chunks()` RPC scoped to a chat session with an `auth.uid()` ownership guard
- **Altered:** `documents` table gains `session_id` (nullable FK to `chat_sessions` — nullable because files are uploaded BEFORE a thread exists) and `chunk_count`
- **New RLS policies:** `documents` policies were an empty stub — users can only CRUD their own rows; chunks inherit ownership via parent document
- **Why:** chunks must be searchable per-thread while strictly isolated per-user

### 3.2 Ingestion — NEW `ingest-document` edge function (Phase 2)

- One endpoint for all 9 extensions: LangChain loaders (pdf/docx/pptx/txt) + a custom `ExcelLoader` (LangChain.js has no Excel loader) that reproduces the current `--- Sheet: name ---` format
- `RecursiveCharacterTextSplitter` (1500/150) with metadata `{ source, page?/sheet?, chunkIndex, totalChunks }`
- `embedMany` via Vercel AI Gateway (`openai/text-embedding-3-small`), batched (~100 chunks/batch)
- Inserts `documents` row (full text, NO truncation) + all `document_chunks` rows using the user-RLS client
- Returns `{ documentId, chunkCount, characterCount, preview }` instead of giant text
- **Why:** all "work before the AI" (parse, chunk, embed, store) happens once at upload time, server-side

### 3.3 Chat edge function (Phase 3) — additive only

- Reads `attachments[].document_id` from the request body (the `chat_messages.attachments` JSONB column was already designed for this shape)
- First message with attachments: links documents to the thread (`UPDATE documents SET session_id = ...` scoped by RLS)
- Every message: embeds the user's question -> `match_document_chunks(threadId, k=8)` -> prepends a system message containing labeled context (`[notes.pdf, p.12] <chunk>`)
- Threads with NO linked documents behave byte-identically to today (old threads unaffected)
- `storeMessage` now persists the real attachments array instead of hardcoded `[]`
- **Why:** retrieval must happen server-side where the vector store lives; the client only sends the prompt

### 3.4 Web client (Phase 4) — flag-gated

- `NEXT_PUBLIC_USE_RAG=true` switches: upload endpoint (`ingest-document` vs `parse-*`) AND message building (prompt-only + `document_id` attachments vs stuffed document text)
- `AttachedFile` gains `documentId?` / `chunkCount?` (additive types); file chips UI unchanged; truncation badge hidden in RAG mode (nothing is truncated)
- Flag OFF = current behavior exactly -> instant rollback
- **Why:** the two flows must coexist until RAG is validated in production-like usage

## 4. How this affects the application

### 4.1 User-facing impact

- **Larger effective documents:** the 50k-char ceiling disappears; a 40-page PDF is fully usable, including its last pages (impossible today)
- **Better answers:** retrieval injects only relevant passages with `[source, page]` labels -> the model cites where information came from
- **Cheaper long threads:** documents no longer ride inside message history -> token usage stays flat across turns
- **Slightly slower upload:** ingestion adds embedding time (~1-3s for typical files, batched ~100 chunks per embedding call)
- **Slightly slower first token per message:** retrieval adds ~300-600ms before streaming starts (embed question + vector search)
- **UI:** file chips and upload progress behave the same; the truncation warning badge disappears in RAG mode (nothing is truncated)

### 4.2 Data & security impact

- Extracted text and chunk embeddings are now PERSISTED in Postgres (`documents`, `document_chunks`) — previously nothing was stored
- Both tables are RLS-protected per user; the `match_document_chunks` RPC has an internal `auth.uid()` ownership guard (SECURITY DEFINER)
- Embeddings leave Supabase for the Vercel AI Gateway (OpenAI model) — same trust boundary as chat prompts already going through OpenRouter
- Raw files are still NOT stored anywhere (storage_path stays null until the deferred storage phase)

### 4.3 Cost impact

- **New cost:** one embedding call batch per uploaded file (fractions of a cent for typical documents with text-embedding-3-small) + one small embedding per chat question
- **Saved cost:** no more re-sending full document text with every message -> significant token savings on multi-turn document chats
- **New infra:** pgvector storage grows with usage (~6KB per chunk with 1536-dim vectors + content)

### 4.4 Rollback strategy

- `NEXT_PUBLIC_USE_RAG=false` instantly restores the current flow (old `parse-*` functions remain deployed and untouched)
- The `chat` function's retrieval is self-disabling: threads without linked documents behave exactly as today
- Database changes are purely additive (new table, new nullable columns) — rolling back code never breaks existing data

### 4.5 Known limitations / future work

- **Deferred:** raw file storage in Supabase Storage (`storage_path`) — enables re-ingestion and download later; needs bucket + storage policies
- **Deferred:** removal of the old flow (Phase 6) requires separate approval after validation
- Semantic retrieval quality depends on chunking parameters (1500/150); tunable later without schema changes
- No hybrid (keyword + vector) search yet; pure cosine similarity is used first
- No document management UI yet (list/delete ingested documents); cascade delete happens with profile deletion

## 5. Decision log

| Date | Decision | Rationale |
|---|---|---|
| 2026-07-19 | LangChain.js in new Deno edge functions (not Next.js route, not Python) | Keeps upload transport (browser -> Supabase direct, 10MB works); libs already proven in Deno; no new service to deploy |
| 2026-07-19 | Full RAG (not prompt-assembly-only chunking) | User requirement: 40-page PDFs and multi-file threads must work properly |
| 2026-07-19 | Vercel AI Gateway `openai/text-embedding-3-small` (1536 dims) | `AI_GATEWAY_API_KEY` already provisioned in turbo.json; `@ai-sdk/gateway` works in Deno; one vendor for chat + embeddings |
| 2026-07-19 | RecursiveCharacterTextSplitter 1500/150 | RAG-standard sizes; metadata preserved per chunk; tunable later |
| 2026-07-19 | Old flow preserved behind `NEXT_PUBLIC_USE_RAG` flag | Safe rollout + instant rollback; removal only after validation |
| 2026-07-19 | Retrieval inside the existing `chat` function (not a separate function) | Retrieval must happen per-message server-side; self-disables when no documents are linked |

## 6. Findings log (filled during implementation)

- (Phase 0 spike results: pending)
- (Phase 1 migration results: pending)
- (Phase 2 ingestion results: pending)
- (Phase 3 retrieval results: pending)
- (Phase 4 client results: pending)
- (Phase 5 test results: pending)


# AGENTS.md

This repository is a Turborepo monorepo for StudyBot, an AI-assisted academic productivity platform. Use this file as the working guide for agents and contributors so changes stay aligned with the current architecture.

## Project Scope

The core of the application are these 3 modes:

### Chat:

- Standard Chat interface for interacting with AI models.
- Provides access to models of all providers such as OpenAI, DeepSeek, Cohere, etc. via OpenRouter.
- Uses RAG with document ingestion, so documents of all types (PDF, Word, Excel, PowerPoint, Text) can be parsed and embedded for queries.

### Editor mode:

- Generates assignments by taking input from the user.
- Assignments are not detectable by LLM detectors.
- Provides analytics about what portion of the text is LLM generated vs Human generated, with exact percentages.
- Export content into user-defined custom templates.
- Toggle to turn off humanization of assignments for specific needs (such as coding assignments) to save user credits.

### Templates:

- Web editor to create custom templates for exporting assignments from editor mode.
- User-created templates are stored and can be viewed, updated, or reused at any time.

## Project Shape

- `apps/web` is the primary Next.js app.
- `apps/mobile` is the Expo mobile client.
- `packages/supabase` contains Supabase SDK helpers, migrations, declarative schemas, snippets, and edge functions.
- `packages/utils`, `packages/api-client`, `packages/assets`, `packages/types`, and `packages/typescript-config` are shared workspace packages.

## Current Stack

- Next.js, React, TypeScript, Tailwind CSS, Shadcn UI, TipTap, CodeMirror, Highlight.js (TipTap editor code blocks only), and Shiki (chat markdown syntax highlighting) on web.
- Expo, React Native, and Expo Router on mobile.
- Supabase for auth, database, storage, and edge functions.
- Vercel AI SDK with OpenRouter for model access and streaming.
- Zustand for client state management where needed.
- PostHog for analytics and Socket.io where real-time messaging is required.

## Working Rules

- If state needs to be shared for a new set of components, create a separate store for them using Zustand. Do not use a single store for everything.

- If a type is shared or reused across both web and mobile codebases, keep it in `packages/types`.

- If a type is shared or used within a single codebase (e.g. web or app), keep it in that codebase's own types directory, such as `apps/web/types`.

- Supabase SDK has a `types` directory in its root (`packages/supabase/sdk/types`). Supabase Edge Functions keep shared types and utils in `packages/supabase/functions/_shared/types/` and `_shared/utils/` (so Supabase CLI does not treat them as deployable functions). Use `"@/": "../_shared/"` alias in the import object in `deno.json` of edge functions, importing types via `@/types/...` or relative `../_shared/types/...`.

- Always write comments to explain the code that you write and use only `//` to write them. Do not use multiline comments syntax (`/* */`).

## Web Chat Architecture & Streaming

- **Chat Registry (`apps/web/lib/chat/chatRegistry.ts`)**:
  - Maintains long-lived `Chat<UIMessage>` instances in a per-thread map.
  - Instances continue consuming SSE streams in the background even if the user switches threads mid-generation.
  - Request headers (including the dynamic user JWT bearer token) are resolved dynamically per-request via `configureChatRegistry`.
  - When threads are deleted, call `releaseChat(threadId)` to evict in-memory conversation state.

- **Chat State & UI Synchronization (`apps/web/app/providers/ChatProvider.tsx`, `apps/web/stores/chatStore.ts`)**:
  - Store tracks thread lifecycle via `status: "idle" | "loading" | "error"`.
  - On the first exchange of a newly created thread ("New Chat"), the chat edge function automatically generates a thread title in the background.
  - `ChatProvider` initiates title polling (`pollGeneratedTitle`), flagging `titleGeneratingThreadId` in `chatStore`.
  - The sidebar displays an animated spinner and text blur on the thread item while title generation is in flight.

- **Edge Function Resilience & Persistence (`packages/supabase/functions/chat/index.ts`)**:
  - Chat streams are split into client SSE writer and server persistence writer.
  - Model responses are fully drained and persisted to the `messages` table via `runInBackground` even if the client disconnects or aborts early.

## Zod & Runtime Validation

- Zod schemas are the source of truth for data shapes that cross a runtime boundary (DB rows, edge-function request/response bodies, parser payloads, persisted localStorage state). The schema lives in the same types file where the type used to live, and the TS type is inferred with `z.infer` so existing `import type` sites keep working unchanged.
- Exception: object types with required nullable fields (e.g. `category: string | null`) are hand-written next to their schema so the contract stays identical regardless of a consumer's `strictNullChecks` setting — zod infers `.nullable()` fields as optional when it is off. Keep schema and type in sync when fields change.
- Validate untrusted data with `schema.safeParse()` at the boundary (edge-function handlers, SDK methods reading PostgREST rows, API-client responses, zustand `persist` merge) instead of `as` casts. Preserve the caller's existing failure behavior (400 responses, `null`/`[]` fallbacks) when validation fails.
- `@studybot/types` is a runtime package (exports schema values, not only types), so its `default` export condition in `packages/types/package.json` must stay intact.
- When a Deno edge function imports zod-bearing modules, add `"zod": "npm:zod@^4.4.3"` to that function's `deno.json` imports.

- For client-side Next.js code, use static `process.env.NEXT_PUBLIC_*` references rather than dynamic env lookup.

- The web chat calls the Supabase `chat` edge function at `${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/chat` with the session access token on `Authorization: Bearer` plus the publishable key on the `apikey` header (wired via a `DefaultChatTransport` in `apps/web/lib/chat/chatRegistry.ts`).

## Supabase SDK Client Pattern

- The shared SDK owns the app-facing Supabase client. `packages/supabase/sdk/client/client.ts` holds a module-level singleton created by `initializeSupabase(options)`.
- Each app calls `initializeSupabase()` exactly once at startup. Web does it at module scope of `apps/web/app/context/AuthContext.tsx` with static `NEXT_PUBLIC_*` env refs.
- SDK methods (auth/chat/storage/templates) resolve the client internally via `getSupabase()`. Never pass a `SupabaseClient` into SDK functions.
- Expo (later) will call `initializeSupabase()` with `storage: AsyncStorage` and `detectSessionInUrl: false`.
- Use `setSupabaseClient()` to inject a custom client (tests, or an `@supabase/ssr` cookie client if SSR auth is ever added) and `resetSupabase()` to clear the registry.

## Editing Guidance

- Make changes as small and localized as possible.
- Prefer existing conventions in the target package over introducing new patterns.
- Update documentation when architecture or data flow changes.
- Avoid touching unrelated files or reverting user changes.

## Useful Root Commands

- `pnpm install`
- `pnpm run dev:web`
- `pnpm run build`
- `pnpm run typecheck`

## Supabase Edge Functions Pattern

- All Edge Functions are located in `packages/supabase/functions/`.
- The `_shared/` folder (prefixed with underscore) contains reusable helpers that get bundled into each function but are not deployed as standalone functions.
- Every function uses the module-worker entry point `export default { fetch: withSupabase({ auth }, handler) }` from `@supabase/server` (aliased in each function's `deno.json`). Do not use bare `Deno.serve()` for new functions.
- Declare the auth mode per function via the `auth` option:
  - `auth: "user"` for signed-in user calls — requires the session access token as `Authorization: Bearer <jwt>` (e.g. `chat`).
  - `auth: ["user", "publishable"]` to accept users via JWT and other callers via the publishable key on the `apikey` header (e.g. the `parse-*` functions). Modes are tried in order; `ctx.authMode` tells you which matched. Note: a request carrying a malformed/expired JWT is rejected immediately and never falls through to `publishable`.
  - `auth: "secret"` for service-to-service calls (secret key on `apikey`), `auth: "secret:<name>"` to pin one named key.
  - `auth: "none"` only for public endpoints or signed webhooks — the handler must verify the provider signature itself.
- Use `ctx.supabase` for queries that must respect RLS (scoped to the caller) and `ctx.supabaseAdmin` for privileged work (bypasses RLS). `ctx.userClaims` / `ctx.jwtClaims` carry the verified JWT identity with no extra network call. Never hand-roll clients from `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`.
- `withSupabase` answers CORS preflights and adds CORS headers before the auth check, so OPTIONS requests never fail auth. Keep the existing `corsHeaders` blocks on responses.
- Platform gateway checks live in `packages/supabase/config.toml`: `chat` keeps the default `verify_jwt = true` (defense-in-depth on top of the in-function JWKS check); the `parse-*` functions set `verify_jwt = false` so apikey-only callers reach the function (credentials are still verified inside by `withSupabase`). The SDK reads auto-provisioned env (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS`, `SUPABASE_JWKS`) — zero config on the platform and in local CLI.
- Frontend calls Edge Functions with plain HTTP (axios / AI SDK transport) against `${supabaseUrl}/functions/v1/<name>`: always send the publishable key on `apikey`, and send the session access token on `Authorization: Bearer` for functions using `auth: "user"`. Never send the publishable key as the bearer token — it is not a JWT and will be rejected.

## Local-First Development & Deployment

### Local Docker stack

- Run the full local stack from `packages/supabase` with `supabase start` (Docker required). `project_id = "packages"` in `config.toml`, so local endpoints are API `http://127.0.0.1:54321`, DB on port `54322`, and Studio on `54323`.
- Edge functions run locally through this stack with hot reload — `[edge_runtime] policy = "per_worker"` in `config.toml`.

### Schema workflow (declarative SQL)

- The schema source of truth is declarative SQL in `packages/supabase/schemas/`. The pg-delta diff engine (`[experimental.pgdelta]` in `config.toml`) compares that desired state against a database to generate migrations; there is no `schema_paths` entry under `[db.migrations]`.
- After editing files in `schemas/`, generate a migration from them: `pnpm --filter @studybot/supabase db:apply-schema` (wraps `scripts/apply-schema.sh`, which runs `supabase db diff --local --file <name>`).
- Apply everything to the local DB with `pnpm --filter @studybot/supabase db:reset`; push pending migrations to the linked hosted project with `pnpm --filter @studybot/supabase db:push`.

### Local function development

- Serve individual functions against the local stack with the `functions:serve:*` scripts in `packages/supabase/package.json` (e.g. `pnpm --filter @studybot/supabase functions:serve:chat`). They require the local Docker stack (`supabase start`) to be running.
- Function secrets (e.g. `OPENROUTER_API_KEY`, `GOOGLE_API_KEY`) live in git-ignored `packages/supabase/functions/.env`.

### Env switching (local vs hosted)

- For local development: `.env.local` is used (`http://127.0.0.1:54321` and local keys in `apps/web/.env.local` and `packages/supabase/.env.local`).
- For hosted cloud: `.env` is used (`https://${PROJ_REF}.supabase.co` and cloud keys in `apps/web/.env` and `packages/supabase/.env`).
- Next.js automatically gives precedence to `.env.local` during local development, while hosted/production environments use `.env`.

### Hosted deployment

- The hosted project ref and credentials are stored in `packages/supabase/.env` (`PROJ_REF = zjpqftkiyzthudeadxdc` and `SUPABASE_ACCESS_TOKEN = <token>`, git-ignored — never hardcode it in the repo, scripts, or docs).
- Deploy every function: `pnpm --filter @studybot/supabase functions:deploy`.
- Deploy one function: `pnpm --filter @studybot/supabase functions:deploy:chat` (also `:pdf`, `:word`, `:excel`, `:powerpoint`, `:text`, `:ingest`).
- Both run `bash packages/supabase/scripts/deploy-functions.sh [name...]`, which reads `PROJ_REF` from the hosted `.env` file and executes `supabase functions deploy <name> --project-ref "$PROJ_REF"` with the workspace-local Supabase CLI. Run it whenever asked to deploy serverless functions.
- Create a new function locally from `packages/supabase`: `supabase functions new <name>`, then add it to `package.json` deploy scripts if it should be deployable on its own.
- Invoke a deployed function (the `PROJ_REF` value comes from the env file):

  ```bash
  curl -L -X POST "https://${PROJ_REF}.supabase.co/functions/v1/<name>" \
    -H "apikey: <publishable key>" \
    -H "Authorization: Bearer <user session access token>" \
    --data '{"name":"Functions"}'
  ```

- Deploys require an authenticated CLI: run `supabase login` once, export `SUPABASE_ACCESS_TOKEN` in the environment, or add `SUPABASE_ACCESS_TOKEN = <token>` to `packages/supabase/.env` (the script picks it up automatically). Create tokens at https://supabase.com/dashboard/account/tokens.

## Notes for Supabase and Env Work

- Keep browser-facing Supabase env access static so Next.js can inline values.
- If edge-function upload or parsing flows fail in the browser, verify CORS preflight behavior before chasing client code.
- Supabase publishable keys are not JWTs; use the session access token for bearer auth when a JWT is required.

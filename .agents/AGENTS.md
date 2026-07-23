# AGENTS.md

This repository is a Turborepo monorepo for StudyBot, an AI-assisted academic productivity platform. Use this file as the working guide for agents and contributors so changes stay aligned with the current architecture.

## Project Scope

The core of the application are these 3 modes:

### Chat:

-  Standard Chat interface for interacting with AI models.
- Provides access to models of all provides such a Open AI, DeepSeek etc.
- This uses RAG, so documents of all types (word, excel etc) can be used in a query.

### Editor mode:

- Generates assignments by taking input from the user.
- Assignments are not detectable by LLM detectors.
- It provides analytics about what portion of the text is LLM generated vs Human generated, and provides you with exact percentages 
- After assignment is done, the content can be exported into any template that you have made.
- It also provides a toggle to turnoff humanization of assignments for specific needs such as for coding assignments. This saves the user credits.

### Templates:

- Contains a web editor to make templates that can be used in editor mode when exporting assignments.
- All created templates are stored and can be viewed or stored at any time.

## Project Shape

- `apps/web` is the primary Next.js app.
- `apps/mobile` is the Expo mobile client.
- `packages/supabase` contains Supabase SDK helpers, migrations, snippets, and edge functions.
- `packages/utils`, `packages/api-client`, `packages/assets`, `packages/types`, and `packages/typescript-config` are shared workspace packages.
- The root `supabase/` folder contains additional Supabase project assets.

## Current Stack

- Next.js, React, TypeScript, Tailwind CSS, Shadcn UI, TipTap, CodeMirror, and Highlight.js on web.
- Expo, React Native, and Expo Router on mobile.
- Supabase for auth, database, storage, and edge functions.
- Vercel AI SDK with OpenRouter and Vercel AI Gateway for model access.
- Zustand for client state management where needed.
- PostHog for analytics and Socket.io where real-time messaging is required.

## Working Rules

- If states needs to be shared for a new set of components then create a sepearte store for them using zustand. Do not use a single store for everything.

- If a type is shared or reused across both web and mobile codebases, keep it in `packages/types`.

- If a type is shared or used within a single codebase (e.g web or app), keep it in that codebase's own types directory, such as `apps/web/types` for web codebase.

- Supabase functions and sdk folders have types directories in their repective roots. Define types there and import them and use them in funcitons and sdk. Use "@:" "../" alias in import object in deno.json of both sdk and functions of supabase and import types using @ alias

- For client-side Next.js code, use static `process.env.NEXT_PUBLIC_*` references rather than dynamic env lookup.

- The web chat path currently points to `/api/chat`; the Supabase chat edge function exists separately and should only be wired in deliberately.

- Always write comments to explain the code that you write and use only // to write them. Do not use multiline comments syntax

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
- Use `getSupabaseClient(req)` for user-authenticated operations (respects RLS).
- Use `getAdminClient()` only for admin tasks that bypass RLS.
- Import the `deno.json` alias `@supabase/supabase-js` for clean imports.
- Frontend calls Edge Functions via `supabase.functions.invoke()`, which automatically sends the user's auth token in the request headers.

## Notes for Supabase and Env Work

- Keep browser-facing Supabase env access static so Next.js can inline values.
- If edge-function upload or parsing flows fail in the browser, verify CORS preflight behavior before chasing client code.
- Supabase publishable keys are not JWTs; use the session access token for bearer auth when a JWT is required.
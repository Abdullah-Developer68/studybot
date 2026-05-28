# AGENTS.md

This repository is a Turborepo monorepo for StudyBot, an AI-assisted academic productivity platform. Use this file as the working guide for agents and contributors so changes stay aligned with the current architecture.

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
- AI SDK with OpenRouter and Vercel AI Gateway for model access.
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

## Editing Guidance

- Make changes as small and localized as possible.
- Prefer existing conventions in the target package over introducing new patterns.
- Update documentation when architecture or data flow changes.
- Avoid touching unrelated files or reverting user changes.

## Useful Root Commands

- `npm install`
- `npm run dev:web`
- `npm run build`
- `npm run typecheck`

## Notes for Supabase and Env Work

- Keep browser-facing Supabase env access static so Next.js can inline values.
- If edge-function upload or parsing flows fail in the browser, verify CORS preflight behavior before chasing client code.
- Supabase publishable keys are not JWTs; use the session access token for bearer auth when a JWT is required.
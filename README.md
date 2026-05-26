# StudyBot

StudyBot is a monorepo for an AI-assisted academic productivity platform. It combines document ingestion, structured writing workflows, template-driven generation, AI content analysis, and export tooling in a single system.

The repository is organized as a Turborepo workspace with a Next.js web application, an Expo mobile application, and shared packages for Supabase, utilities, assets, types, and API client code.

## Architecture Overview

StudyBot uses a monorepo architecture so the web app, mobile app, and shared backend logic can evolve together without duplicating implementation details.

### Application Layer
- `apps/web` contains the primary user experience built with Next.js.
- `apps/mobile` provides the companion mobile experience with Expo.

### Shared Logic Layer
- `packages/utils` centralizes parsing, file handling, and cross-platform helpers.
- `packages/api-client` standardizes request and client behavior.
- `packages/types` keeps shared domain types aligned across all clients.
- `packages/assets` provides common visual assets.

### Backend Layer
- `packages/supabase` contains the Supabase integration surface, including SDK helpers, edge functions, and migrations.
- Supabase handles authentication, persistence, storage, and real-time capabilities.

### AI Layer
- The web application integrates with AI providers through the AI SDK.
- OpenRouter and Vercel AI Gateway provide access to the available AI models.

## Tech Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- Shadcn UI
- TipTap
- CodeMirror and Highlight.js for code rendering
- Zustand and Redux Toolkit for client state where needed

### Mobile
- Expo
- React Native
- Expo Router

### Backend and Platform
- Supabase for authentication, database, storage, and edge functions
- Turborepo for monorepo orchestration
- AI SDK, OpenRouter, and Vercel AI Gateway for model integration
- Socket.io for real-time communication patterns where required
- PostHog for product analytics

### Shared Packages
- `@studybot/supabase` for Supabase SDK helpers and edge-function related logic
- `@studybot/api-client` for shared API client utilities
- `@studybot/utils` for document parsing and shared helpers
- `@studybot/types` for common TypeScript definitions
- `@studybot/assets` for shared media and icons
- `@repo/typescript-config` for shared TypeScript configuration

## Repository Structure

```text
StudyBot-TurboRepo/
├── apps/
│   ├── web/            # Next.js web application
│   └── mobile/         # Expo mobile application
├── packages/
│   ├── api-client/     # Shared API client utilities
│   ├── assets/         # Shared images, icons, and media
│   ├── supabase/       # Supabase SDK, edge functions, migrations, snippets
│   ├── types/          # Shared TypeScript definitions
│   ├── typescript-config/ # Shared TS config presets
│   └── utils/          # Shared helper functions and document parsing
├── supabase/           # Supabase project assets at the repository root
├── turbo.json          # Turborepo pipeline configuration
└── package.json        # Workspace root scripts and configuration
```

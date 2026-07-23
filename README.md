# StudyBot Scope

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

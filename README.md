# StudyBot

StudyBot is an AI-assisted academic productivity and content creation platform that unifies multi-model AI chat, assignment generation, document parsing with RAG, and custom export templates into a single workspace.

## Project Scope

The core of the application revolves around three main modes:

### 1. Chat
- Standard and advanced chat interface for interacting with multi-provider AI models (OpenAI, DeepSeek, Cohere, etc.) via OpenRouter and Vercel AI SDK.
- Retrieval-Augmented Generation (RAG) supporting document uploads and indexing across multiple file formats (PDF, Word, Excel, PowerPoint, Text).
- Resilient background streaming and automated AI thread title generation.

### 2. Editor Mode
- Generates assignments and academic papers from user prompts and research materials.
- Produces natural text resistant to LLM detectors, with granular human-vs-AI analytics and percentage breakdowns.
- Option to toggle off humanization for specific domains (such as coding assignments) to save user credits.
- Direct export into user-created custom templates.

### 3. Templates
- Visual editor to create and manage reusable assignment and document export templates.
- Personal template management stored securely per user.

---

## Architecture Overview

StudyBot is structured as a Turborepo monorepo:

### Application Layer
- `apps/web`: Next.js 14+ web application with App Router, Shadcn UI, Tailwind CSS, TipTap, and Zustand.
- `apps/mobile`: Expo and React Native mobile client using Expo Router.

### Shared Workspace Packages
- `packages/supabase`: Supabase SDK methods, declarative SQL schemas, migrations, and Deno Edge Functions.
- `packages/types`: Shared TypeScript definitions and Zod validation schemas across web and mobile.
- `packages/utils`: Document parsing, file handling, and cross-platform utilities.
- `packages/api-client`: Shared API client and HTTP request helpers.
- `packages/assets`: Shared visual assets, images, and brand media.
- `packages/typescript-config`: Shared TypeScript configuration presets.

---

## Tech Stack

### Frontend & Web
- **Framework**: Next.js (App Router), React, TypeScript
- **UI & Styling**: Tailwind CSS, Shadcn UI, Radix UI
- **Rich Text & Code**: TipTap, CodeMirror, Highlight.js, Shiki
- **State Management**: Zustand
- **AI Streaming**: Vercel AI SDK (`@ai-sdk/react`, `ai`)

### Mobile
- **Framework**: Expo, React Native, Expo Router

### Backend & Platform
- **Database & Auth**: Supabase (PostgreSQL, Supabase Auth with RLS)
- **Serverless**: Supabase Edge Functions (Deno module workers with `@supabase/server`)
- **Model Providers**: OpenRouter, Google Generative AI
- **Orchestration**: Turborepo, pnpm workspaces
- **Analytics**: PostHog

---

## Repository Structure

```text
studybot/
├── apps/
│   ├── web/                    # Next.js web application
│   └── mobile/                 # Expo mobile application
├── packages/
│   ├── api-client/             # Shared API client utilities
│   ├── assets/                 # Shared images, icons, and media
│   ├── supabase/               # Supabase SDK, edge functions, declarative schemas & migrations
│   ├── types/                  # Shared TypeScript definitions and Zod runtime schemas
│   ├── typescript-config/      # Shared TypeScript configuration presets
│   └── utils/                  # Document parsing and shared helper functions
├── turbo.json                  # Turborepo pipeline configuration
└── package.json                # Root workspace scripts and dev dependencies
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm (`corepack enable pnpm` or `npm i -g pnpm`)
- Docker (for local Supabase stack)
- Supabase CLI

### Installation

```bash
pnpm install
```

### Development Scripts

- **Run Web App**:
  ```bash
  pnpm run dev:web
  ```
- **Typecheck Workspace**:
  ```bash
  pnpm run typecheck
  ```
- **Build All Apps & Packages**:
  ```bash
  pnpm run build
  ```

### Supabase Workflow

- **Start Local Supabase Stack**:
  ```bash
  cd packages/supabase && supabase start
  ```
- **Apply Schema Changes (Declarative pg-delta diff)**:
  ```bash
  pnpm --filter @studybot/supabase db:apply-schema
  ```
- **Reset Local Database**:
  ```bash
  pnpm --filter @studybot/supabase db:reset
  ```
- **Serve Local Edge Function (e.g. chat)**:
  ```bash
  pnpm --filter @studybot/supabase functions:serve:chat
  ```
- **Deploy Functions to Hosted Supabase**:
  ```bash
  pnpm --filter @studybot/supabase functions:deploy
  ```

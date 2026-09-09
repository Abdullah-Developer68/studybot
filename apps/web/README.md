# @studybot/web

The primary web application for StudyBot built with Next.js App Router.

## Features

### Multi-Model Chat & RAG
- Chat with various LLMs (Cohere, OpenAI, DeepSeek, Google Gemini) via OpenRouter.
- Multi-session chat registry (`apps/web/lib/chat/chatRegistry.ts`) maintaining in-memory streaming across thread switches.
- Automatic background title generation for new chat threads with animated placeholders in the sidebar.
- RAG document ingestion for PDF, Word, Excel, PowerPoint, and plain text files.

### Editor & Assignment Studio
- TipTap-based rich text editor with Markdown and CodeMirror code block support.
- AI Humanization analytics with granular AI vs Human percentage scores.
- Export directly to customizable user templates.

### Template Management
- Create, view, update, and manage private export templates.

### Secure Client Architecture
- Supabase Authentication (OAuth & Email).
- Static `NEXT_PUBLIC_*` environment resolution.
- Dynamic request-level JWT bearer injection for authenticated Edge Function requests.

---

## Tech Stack

- **Framework**: Next.js (App Router), React, TypeScript
- **UI Components**: Shadcn UI, Radix UI primitives, Lucide Icons
- **Styling**: Tailwind CSS
- **Editor**: TipTap, CodeMirror, Shiki syntax highlighter
- **State Management**: Zustand
- **AI Integration**: `@ai-sdk/react`, `ai` (Vercel AI SDK)
- **Shared Packages**: `@studybot/supabase`, `@studybot/types`, `@studybot/utils`, `@studybot/api-client`

---

## Getting Started

### Development

Run the web app from the root of the monorepo:

```bash
pnpm run dev:web
```

Or from within `apps/web`:

```bash
pnpm dev
```

### Environment Variables

Configure `apps/web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-or-publishable-key
```

---

## Directory Structure

```text
apps/web/
├── app/                        # Next.js App Router (pages, layouts, providers)
│   ├── (auth)/                 # Auth routes (login, signup)
│   ├── (dashboard)/            # Dashboard routes (chat, editor, templates)
│   ├── context/                # React contexts (Auth, Chat)
│   └── providers/              # Application providers (ChatProvider, ThemeProvider)
├── components/                 # React UI components (chat, editor, global, ui)
├── hooks/                      # Custom React hooks (chat, auth, templates)
├── lib/                        # Client libraries & chat registry
├── stores/                     # Zustand state stores
├── types/                      # Web-specific TypeScript interfaces & types
└── utils/                      # Helper and format utilities
```

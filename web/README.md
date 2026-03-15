# StudyBot

A unified platform for content creation, AI analysis, and multi-model AI interactions. StudyBot eliminates the need to constantly switch between different apps and AI services by providing a single interface to work with multiple AI models, manage documents, and create custom templates.

## Features

### Multi-Model AI Support
- Access multiple AI models (Gemini, GPT, etc.) in a single interface
- Unified chat system for different model interactions
- No need to switch between applications

### Rich Text Editor
- TipTap-based editor with advanced formatting
- Support for images, code blocks, lists, and more
- Real-time collaboration-ready architecture

### Document Management
- Upload and parse documents
- Extract text and metadata
- Organize by categories and tags
- Integration with AI analysis

### Templates System
- Create custom reusable templates
- Private template management per user
- Default templates provided to new users
- Template content stored as TipTap JSON

### AI Detection & Analysis
- Text humanization detection
- AI-generated content analysis
- Sentence-level scoring and insights
- Multiple provider support

### Multi-Model Chat
- Access different AI models in dedicated chat sessions
- Upload documents to chat sessions
- History tracking and session management
- Model-specific configurations

### Secure & Private
- Supabase authentication (OAuth support)
- Row-level security (RLS) for data privacy
- User-specific data isolation
- GDPR-compliant

## Tech Stack

### Frontend
- **Web**: Next.js 14+, React, TypeScript
- **Mobile**: React Native (Expo)
- **UI**: Shadcn/ui components, TipTap
- **Styling**: SCSS, Tailwind CSS

### Backend
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Migrations**: Version-controlled SQL migrations

### AI/APIs
- **Models**: Gemini 2.0, GPT (configurable)
- **Detection**: GPTZero, Originality AI, local models
- **Document Processing**: PDF/text extraction

### Packages
- `@studybot/supabase` - Reusable SDK for auth, chat, storage, templates
- `@studybot/network` - API client for server communication
- `@studybot/utils` - Shared utilities

## Project Structure

```
StudyBot/
├── web/                          # Next.js web application
├── mobile/                        # React Native mobile app
├── packages/
│   ├── supabase/                 # Supabase SDK & migrations
│   │   ├── sdk/                  # Source of truth for DB code
│   │   ├── migrations/           # Version-controlled schemas
│   │   └── policies/             # RLS policy references
│   ├── api-client/               # Network request utilities
│   └── utils/                    # Shared helper functions
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables
4. Configure Supabase project

### Development

**Web:**
```bash
cd web
npm run dev
```

**Mobile:**
```bash
cd mobile
npx expo start
```

### Database Migrations

Push migrations to Supabase:
```bash
npx supabase db push
```

## Architecture Highlights

- **Package-first approach**: Reusable SDK logic in packages, consumed by apps
- **Version-controlled database**: All schema changes in migrations
- **RLS policies**: Secure data access at database level
- **Multi-tenant ready**: User-isolated data with proper scoping
- **Monorepo structure**: Shared code and dependencies

## Contributing

- Follow existing code patterns
- Add migrations for schema changes
- Use version-controlled approach for all database modifications
- Test locally before pushing to production
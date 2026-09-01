# StudyBot Shared Packages

This directory contains shared libraries and modules used across StudyBot applications (`apps/web`, `apps/mobile`).

## Package Directory

### `@studybot/supabase` (`packages/supabase/`)
The core Supabase integration layer containing:
- **SDK (`sdk/`)**: App-facing singleton client (`initializeSupabase()`, `getSupabase()`) and domain APIs (auth, chat, storage, templates).
- **Edge Functions (`functions/`)**: Deno serverless workers using `@supabase/server` (`chat`, `parse-pdf`, `parse-word`, `parse-excel`, `parse-powerpoint`, `parse-text`, `ingest-document`).
- **Declarative Schemas (`schemas/`)**: Source-of-truth SQL definitions diffed via Supabase CLI (`pg-delta`) into versioned migrations.
- **Migrations (`migrations/`)**: Applied database change scripts.
- **Scripts (`scripts/`)**: Helpers for schema diffing (`apply-schema.sh`) and deploying Edge Functions (`deploy-functions.sh`).

### `@studybot/types` (`packages/types/`)
- Shared TypeScript definitions and runtime Zod schemas across web, mobile, and SDK boundaries.
- Single source of truth for chat threads, messages, upload payloads, and database row models.

### `@studybot/utils` (`packages/utils/`)
- Cross-platform utility functions, file format parsers, and string transformers.

### `@studybot/api-client` (`packages/api-client/`)
- Standardized HTTP client and request utilities.

### `@studybot/assets` (`packages/assets/`)
- Shared brand assets, images, and static graphics.

### `@repo/typescript-config` (`packages/typescript-config/`)
- Shared TypeScript configuration presets (`base.json`, `nextjs.json`, `react-library.json`).

---

## Supabase Development Workflow

### Local Development
```bash
# Start local Docker Supabase stack
cd packages/supabase && supabase start

# Generate migration from declarative schemas/
pnpm --filter @studybot/supabase db:apply-schema

# Reset local database with fresh migrations & seed data
pnpm --filter @studybot/supabase db:reset

# Serve chat edge function locally
pnpm --filter @studybot/supabase functions:serve:chat
```

### Deployment
```bash
# Deploy all edge functions to hosted project (reads PROJ_REF from .env.local)
pnpm --filter @studybot/supabase functions:deploy

# Deploy a single function
pnpm --filter @studybot/supabase functions:deploy:chat
```

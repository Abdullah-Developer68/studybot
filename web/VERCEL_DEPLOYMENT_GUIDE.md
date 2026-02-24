# Vercel Deployment Guide (StudyBot Web)

This guide is for the current setup where `web` depends on local shared Supabase code via:

- package: `@studybot/supabase`
- source: `packages/supabase`
- dependency in `web/package.json`: `file:../packages/supabase/studybot-supabase-0.1.0.tgz`

---

## 1) One-time setup in Vercel

### A. Import repository
1. Go to Vercel Dashboard → **Add New Project**.
2. Import your Git repository.

### B. Configure project root
Set **Root Directory** to:

- `web`

This is required because Next.js app is inside `web`.

### C. Build settings
Use:

- **Install Command**: `npm install`
- **Build Command**: `npm run build`
- **Output Directory**: leave default for Next.js

### D. Environment variables
Add in Vercel Project Settings → **Environment Variables**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- any other app-specific keys used in `web/.env`

---

## 2) Required workflow when shared package changes

Because `web` uses a tarball dependency, every change in `packages/supabase` must be re-packed and committed.

From project root:

```powershell
Set-Location "packages/supabase"
Remove-Item "studybot-supabase-0.1.0.tgz" -Force
npm pack

Set-Location "../../web"
npm install
```

Then commit all required files:

- `packages/supabase/studybot-supabase-0.1.0.tgz`
- `web/package-lock.json`
- any changed source in `packages/supabase/**`
- any changed web files

If the tarball is not committed, Vercel build can fail.

---

## 3) Pre-deploy checklist

Before pushing to trigger deployment:

1. Run locally in `web`:
   - `npm install`
   - `npm run build`
2. Confirm there is no `Module not found` for `@studybot/supabase`.
3. Confirm env vars are present in Vercel (Preview + Production as needed).
4. Push to your deployment branch (usually `main`).

---

## 4) Troubleshooting

### Error: `Can't resolve '@studybot/supabase'`
Check:

- `web/package.json` has `"@studybot/supabase": "file:../packages/supabase/studybot-supabase-0.1.0.tgz"`
- tarball file exists at `packages/supabase/studybot-supabase-0.1.0.tgz`
- tarball and `web/package-lock.json` are committed
- `web/next.config.mjs` includes:
  - `transpilePackages: ["@studybot/supabase"]`

### Shared code changes not reflected after deploy
You likely forgot to re-run `npm pack` and commit updated tarball.

---

## 5) Recommended long-term improvement

For lower maintenance, move to **npm workspaces** instead of tarballs. That removes manual repacking and is cleaner for web + mobile shared packages.

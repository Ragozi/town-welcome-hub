# Hearth Handbook — Claude Code guidance

## What this is
Closing-gift toolkit for realtors. Public marketing site + authenticated dashboard for creating personalized welcome packets (PDF) for buyers, with admin tools for towns, events, finance, users, invite codes, and a referral system.

Live domain: `hearthhandbook.com` (currently a Coming Soon page at `src/routes/index.tsx`).

## Stack
- **TanStack Start** (file-based routing under `src/routes/`) on **React 19**
- **Tailwind v4** + **shadcn/ui** (`src/components/ui/*`)
- **Supabase** (`@supabase/supabase-js`) for data + auth, fronted by `@lovable.dev/cloud-auth-js`
- **@react-pdf/renderer** for packet PDF generation, served from `src/routes/api/packet-pdf.$slug.tsx`
- **Cloudflare Workers** deploy target via `@cloudflare/vite-plugin`
- Bundled by **Vite 7**, wrapped by `@lovable.dev/vite-tanstack-config`

## Lovable / sync rules — read before editing
- This repo is **bi-directionally synced** with Lovable project `51de65fb-6aa6-413e-a61e-bd6aef25b283`. Both Lovable's agent and your git pushes land on `main`.
- Avoid editing the same file Lovable is actively editing — `git pull --rebase` before every push.
- `vite.config.ts` uses `@lovable.dev/vite-tanstack-config` which already injects `tanstackStart`, `viteReact`, `tailwindcss`, `tsConfigPaths`, `cloudflare`, `componentTagger`, VITE_* env, `@` alias, React/TanStack dedupe, and sandbox detection. **Do not add any of those plugins manually** — see the comment at the top of `vite.config.ts`.
- The custom SSR error wrapper lives at `src/server.ts` (referenced by `tanstackStart.server.entry`).

## Env / secrets
- `.env` (tracked) holds **public** `VITE_*` vars only — safe to commit.
- `.dev.vars` (gitignored, Wrangler convention) holds **server secrets** for local dev.
- Production secrets are managed through Cloudflare/Wrangler, not this repo.

## Commands (bun is primary — `bun.lock` is the source of truth)
```bash
bun install
bun run dev      # vite dev
bun run build    # vite build
bun run lint     # eslint .
bun run format   # prettier --write .
```
`package-lock.json` exists for npm fallback compatibility but bun should be preferred.

## Routes overview
- Public: `/`, `/about`, `/login`, `/sponsor`, `/privacy`, `/terms`, `/p/$slug` (public packet), `/r/$referralSlug` (referral redirect), `/sitemap.xml`, `/api/packet-pdf/$slug`
- Auth-gated (`_authenticated/`): `/dashboard`, `/settings`, `/packets`, `/packets/new`, `/packets/$id`
- Admin (`_authenticated/admin.*`): events, finance, invite-codes, users, towns (list + `$slug/library`)

## Asset conventions
- Brand logos: `src/assets/brand/` (imported in components)
- Public static (favicons, og-image, llms.txt, robots.txt): `public/`
- Loose JPG/PNG files at the repo root (`icon1.jpg`, `social1.jpg`, etc.) are scratch/staging — they're **untracked**. If they're meant for production, move them into `public/` or `src/assets/brand/` before committing.

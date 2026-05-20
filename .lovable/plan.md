
# Consolidated update plan

## 1. Invitations — hover tooltips on row actions

**Where:** `src/routes/_authenticated/admin.users.tsx` (the page that sends/manages user invitations) and `src/routes/_authenticated/admin.invite-codes.tsx` (invite-code copy/revoke icons).

- Wrap the page once in `<TooltipProvider delayDuration={150}>` (shadcn `tooltip` already in repo).
- Wrap each row action in `<Tooltip><TooltipTrigger asChild>…</TooltipTrigger><TooltipContent>…</TooltipContent></Tooltip>`.
- Copy:
  - **Resend invitation** → "Resends the invite email to this user."
  - **Reset password** → "Sets a new password for this user."
  - **Deactivate user** → "Blocks this user from signing in."
  - **Reactivate user** → "Restores this user's ability to sign in."
  - **Delete user** → "Permanently removes this user account."
  - **Copy invite link** (invite-codes) → "Copies the invitation link to your clipboard."
  - **Revoke code** (invite-codes) → "Cancels this invitation code so it can't be used."
- The current row uses a `DropdownMenu`; add tooltips on the trigger (`More actions`) and on each `DropdownMenuItem` via `TooltipTrigger asChild`.

## 2. New user invite emails actually sending

**Diagnose first, then patch.** Current code already calls `supabaseAdmin.auth.admin.inviteUserByEmail(...)` in `adminInviteUser` (src/lib/admin.functions.ts) — so the issue is one of:

1. **No SMTP configured** on the Supabase Auth project → default Supabase email service has very low rate limits and is often filtered. **Most likely cause.**
2. Inviting a user whose email already exists silently no-ops.
3. The `redirectTo` URL isn't on the allow list in Auth settings.

**Fixes:**
- Use `lovable_docs--search_docs` / Cloud Auth: confirm SMTP is set. If not, recommend the user enable Lovable transactional email (`email_domain--setup_email_infra`) or wire a Resend SMTP — surface this clearly in chat (requires user action; agent cannot do SMTP setup silently on their behalf).
- Harden `adminInviteUser`:
  - Detect "user already exists" and return a clear error to the toast.
  - Log the full Supabase error to `debug_logs` via `logDebug` for postmortem.
  - On success, return `invited_at` so the row immediately shows `Pending Invitation`.
- Harden `adminResendInvite` the same way and surface a richer success/error toast.
- UI:
  - Success toast: `"Invitation sent to <email>"` with subtext `"They should receive a setup link within a minute."`
  - Failure toast: `"Could not send invitation"` with the Supabase error message.
  - Add an "Invitation sent <timestamp>" row to the status column so admins can see when the last invite went out (read from `invited_at`).

## 3. Handbook cover — realtor branding

**Files:** `src/lib/pdf/handbook-document.tsx`, `src/lib/handbook.functions.ts`, public landing `src/routes/p.$slug.tsx` (and packet preview already uses the same PDF).

**Data:** `HandbookRealtor` already returns `full_name, brokerage_name, email_public, phone, headshot_url`. Extend it with `brokerage_logo_url` (column already exists on `profiles`).

**PDF cover layout changes (cover page only):**
- Replace the current single-line agent block with a branded card:
  - Left: round headshot (40×40pt) if `headshot_url`, omitted entirely if missing.
  - Right of headshot: name (bold), brokerage name (muted), phone · email (small).
  - Far right: brokerage logo (max 80×40pt, `objectFit: contain`) if `brokerage_logo_url`, omitted if missing.
- Add a thin orange divider above the QR.
- No placeholder shapes when assets are missing — collapse gracefully (no broken image icons; @react-pdf Image with a missing src would crash, so guard with conditional render on truthy URL).

**Digital landing page (`/p/$slug`):** mirror the same realtor card at the top so the buyer sees who sent the packet.

## 4. Download metric tracking

**Status today:** the dashboard sums `packets.pdf_download_count`, but nothing ever increments it. `handbook-pdf-panel.tsx` fires a `logEvent({ event_type: "pdf_downloaded" })` to `packet_events`, so events exist but the column doesn't move.

**Fix (choose one model — recommend total + last_downloaded_at):**
- Migration: add `packets.last_downloaded_at timestamptz`. Keep existing `pdf_download_count`.
- New `createServerFn recordPdfDownload({ slug })`: increments `pdf_download_count`, sets `last_downloaded_at = now()`, also writes the `pdf_downloaded` event (replaces the current direct `logEvent` call). Uses `requireSupabaseAuth` + RLS check (realtor owns packet) when called from dashboard; for public packet downloads, call it from a `/api/public/packet-download` route or anon-safe variant.
- `handbook-pdf-panel.tsx` PDFDownloadLink `onClick` → call `recordPdfDownload` once per click (debounced ~2s to avoid double-fire).
- Dashboard stat already reads `pdf_download_count` so it will start moving. Add a fourth stat tile "Last download" using max `last_downloaded_at`.
- Packet detail page: show `Downloaded N times · last on <date>`.

## 5. Buyer interest tags → business selection rules

**Goal:** centralized, documented scoring so the handbook surfaces businesses that match the buyer's interests, with auditable reasons.

**New module:** `src/lib/business-recommender.ts` (pure function, no I/O).

```ts
export type RecommendReason =
  | { code: "town_match" }
  | { code: "interest_match"; tag: string }
  | { code: "sponsor"; tier: SponsorTier }
  | { code: "verified" }
  | { code: "fallback_essential"; category: string }
  | { code: "manual_pin" };

export type ScoredBusiness = {
  business: Business;
  score: number;
  reasons: RecommendReason[];
};

export function scoreBusinesses(input: {
  businesses: Business[];
  town: Town | null;
  interests: string[];          // packet.interests + lifestyle_tags
  excludedIds: Set<string>;
  pinnedIds?: Set<string>;
}): ScoredBusiness[];
```

**Scoring weights (documented in the file):**
- town/zip match: +50 (baseline gate; non-matching are dropped)
- verified/approved: +15
- sponsor tier: platinum +40, gold +25, silver +10, none +0
- each matching interest tag → category map hit: +20
- subcategory direct hit (e.g. "dog groomer" while buyer has "pet friendly"): +30
- manual pin: +1000

**Interest → category/subcategory map** lives at the top of the file with comments:

```ts
const INTEREST_RULES: Record<string, { categories: string[]; subcategories?: string[]; keywords?: string[] }> = {
  "pet friendly": { categories: ["pets", "veterinary"], subcategories: ["dog groomer", "pet store"], keywords: ["dog", "pet"] },
  biking:         { categories: ["outdoors", "recreation"], subcategories: ["bike shop"], keywords: ["trail", "bike"] },
  "family friendly": { categories: ["parks", "education", "kids"], keywords: ["family", "kid"] },
  coffee:         { categories: ["food-drink"], subcategories: ["coffee shop", "cafe"] },
  restaurants:    { categories: ["food-drink", "restaurants"] },
  outdoors:       { categories: ["parks", "outdoors", "recreation"] },
  fitness:        { categories: ["fitness"], subcategories: ["gym", "yoga"] },
  "kids activities": { categories: ["kids", "parks", "education"] },
  nightlife:      { categories: ["food-drink"], subcategories: ["bar", "brewery"] },
  shopping:       { categories: ["retail", "shopping"] },
  "home services": { categories: ["home-services"] },
};
```

**Wire it into the PDF + landing page:**
- `getHandbookData` already returns flat `businesses` + `packet.interests` + `packet.lifestyle_tags`. After fetching, call `scoreBusinesses(...)` and return:
  - `recommended: ScoredBusiness[]` (top 12, sorted by score desc)
  - keep the full `businesses` list for the directory grid (current behavior)
- `handbook-document.tsx`:
  - Replace "Locals we love" featured block with the top 4 recommended businesses (still mixing sponsor priority via the score, no more pure sponsor filter).
  - Keep the "Local directory" grouped-by-category as a fallback list of everything else.
- Public landing `/p/$slug` shows the same top 12 in a "Picked for you" rail.

**No matches fallback:** if fewer than 4 recommendations, top up from sponsored + essentials (groceries, pharmacy, fuel) until 4.

## 6. Admin visibility for recommendation reasons

- The `recommended` array already carries `reasons[]` from §5.
- `packet_events` already accepts arbitrary `metadata`. On first PDF render or on packet generation, write a single event `event_type = 'pdf_downloaded'` (or a new `recommendations_built` — requires enum value migration) is heavier than needed. Simpler:
  - Add a new column `packets.recommendation_log jsonb` (default `'{}'`), written once when generating, holding `{ businessId: { score, reasons } }`.
  - On the packet detail page, add a collapsible **"Why these businesses?"** panel for the realtor:
    - Lists each business with score + reason chips ("matched town", "interest: pet friendly", "sponsor: platinum", "verified", "fallback: groceries", "manual").
  - Also add an admin-only `/admin/packets/$id/recommendations` quick view (super_admin gate) reading the same JSON for auditing.

## 7. Migration summary

```sql
ALTER TABLE public.packets
  ADD COLUMN IF NOT EXISTS last_downloaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS recommendation_log jsonb NOT NULL DEFAULT '{}'::jsonb;
```

No RLS changes needed — both columns are covered by existing packet policies.

## Out of scope

- Email template redesign.
- Reworking sponsor tiers.
- Changing the cover photo treatment (already addressed last turn).
- Building a separate admin "invitations" list distinct from the existing Users table.

## Open questions

1. Email delivery: should I push you toward enabling **Lovable transactional email** (one-click in Cloud) for invites, or do you want to bring your own SMTP (Resend etc.)? Without one of these, no invitation email will ever reliably arrive.
2. The "Invitations page" in your prompt — confirm you mean **Admin → Users** (Identity & Access Management) row actions? That's where Resend / Deactivate / Delete live. The Invite Codes page has its own actions (Copy link, Revoke) which I'll also tooltip.

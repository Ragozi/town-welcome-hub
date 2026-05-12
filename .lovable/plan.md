# Welcome Home — Realtor Backend & Packet Flow

## Database: keep what we have, add on top

**Recommendation: KEEP the current schema and ADD packet/realtor tables.** The existing `towns`, `categories`, `businesses`, `sponsor_tiers` tables already model exactly what the spec calls "Buyer Landing Page" content (local restaurants, coffee, parks, sponsored businesses with tiers). Throwing them out means re-seeding Ozaukee data and rebuilding the public site.

| | Keep current + extend | Migrate to spec-only |
|---|---|---|
| Pros | Preserves Ozaukee seed data, working `/`, `/towns`, `/$townSlug`, sponsor tiers, PDF route. Lowest risk. | Clean slate matching spec wording exactly. |
| Cons | Slight naming drift (sponsor_tier enum vs Platinum/Gold/Silver — easy rename). | Lose all current data + UI; rebuild landing pages and town directory; ~2x the work for the same end state. |

### New tables to add

- **`profiles`** — `user_id` (FK auth.users), `full_name`, `headshot_url`, `phone`, `email_public`, `brokerage_name`, `brokerage_logo_url`, `social_links jsonb`, `default_town_id`.
- **`user_roles`** — separate table per security best practices: `user_id`, `role` (`admin` | `realtor`). Drives admin UI access.
- **`packets`** — `id`, `realtor_id`, `town_id`, `slug` (short public id e.g. `abc123` for `/p/abc123`), `buyer_first_name`, `buyer_last_name`, `buyer_email`, `address`, `closing_date`, `welcome_note`, `has_kids`, `has_pets`, `interests text[]`, `lifestyle_tags text[]`, `home_photo_url`, `status` (`draft`|`generated`), `pdf_url`, `created_at`.
- **Sponsor tier rename**: extend `sponsor_tier` enum with `platinum`/`gold`/`silver` aliases (keep existing values for back-compat).

### Storage buckets
- `headshots` (public) — realtor photos
- `brokerage-logos` (public)
- `home-photos` (public) — banner image per packet
- `packet-pdfs` (public, signed URLs optional) — generated PDFs

### RLS
- `profiles`: realtor can read/update own row; admins read all.
- `packets`: realtor can CRUD only their own; public SELECT by `slug` only (for `/p/:slug` landing).
- `user_roles`: only admins write; users read own.
- Use `has_role(uuid, app_role)` SECURITY DEFINER helper to avoid recursion.

## Auth: invite-only realtor accounts

- Enable email/password auth, **disable public signup**.
- Add `/login` route (email + password) — redirect to `/dashboard` on success.
- Add `/accept-invite` route — admin emails an invite link via Supabase auth invite flow; realtor sets password and is auto-assigned `realtor` role via DB trigger on first login.
- Admin UI has an "Invite Realtor" form (email + name) → calls a server fn using `supabaseAdmin.auth.admin.inviteUserByEmail()`.
- Optional: Google sign-in for whitelisted invited emails.

## New routes

```
src/routes/
  login.tsx                       public
  accept-invite.tsx               public, reads token from URL
  _authenticated.tsx              guard layout
  _authenticated/
    dashboard.tsx                 cards + recent packets
    packets.index.tsx             list
    packets.new.tsx               4-step wizard
    packets.$id.tsx               edit / regenerate / download
    settings.tsx                  profile + branding
  _authenticated/_admin/
    admin.index.tsx               admin home
    admin.realtors.tsx            invite + list
    admin.sponsors.tsx            CRUD businesses + tier
    admin.towns.tsx               CRUD towns + categories
  p.$slug.tsx                     PUBLIC buyer landing page
  marketing/                      restructure existing index.tsx into
    (keep / as marketing site with new hero copy)
```

## Packet generation flow

1. **Wizard** (4 steps, single route, local state): Buyer Info → Personalization → Branding (pre-filled from profile) → Review.
2. **"Generate Packet"** calls `createPacket` server fn → inserts row, generates short slug (nanoid 8 chars), returns id.
3. **PDF generation**: extend the existing `src/routes/api/pdf.$townSlug.tsx` pattern → new `src/routes/api/pdf.packet.$slug.tsx` server route that renders a personalized PDF (buyer name, home photo, realtor branding, town highlights pulled from `businesses` for that `town_id`, sponsor cards by tier). Upload to `packet-pdfs` bucket, store URL on packet row.
4. **QR code**: render client-side with `qrcode.react` pointing to `https://<domain>/p/<slug>`. No server work needed.
5. **Email buyer**: optional button → uses Lovable Emails (transactional) to send the link; phase 2.

## Buyer landing page `/p/:slug`

Server fn fetches packet by slug (public), joins town + categories + businesses + realtor profile. Renders:
- Hero: home photo banner, "Welcome Home, {Buyer Name}", realtor mini-card.
- Personal note section.
- Sponsored businesses (Platinum top, Gold mid, Silver inline) — reuses existing `BusinessCard` styling.
- Category sections (restaurants, coffee, parks, shopping, services, utilities, emergency).
- Realtor thank-you + referral CTA + contact footer.

Re-uses the SNAPTURE warm cream + WI accent palette already in `styles.css`.

## Marketing site updates

Refit current `/` with the spec's hero copy ("Turn Every Closing Into a Lasting Impression"), add Pricing, Sponsor, Testimonials placeholder sections. Keep `/towns` and `/$townSlug` as proof-of-concept town pages (they double as sponsor inventory marketing for now).

## Admin UI (minimal v1)

Single `_admin` layout gated by `has_role(uid, 'admin')`. Tabs:
- **Realtors** — invite form, list with last-login + packet count.
- **Sponsors** — table of businesses with tier dropdown, coupon text/expiry inline edit.
- **Towns / Categories** — CRUD basics; hero blurb editor.

## Implementation order (suggested phases)

1. Auth + roles + profiles + invite flow + protected dashboard shell.
2. Packets table + wizard + list/edit + QR + buyer landing page.
3. PDF generation server route for packets.
4. Admin realtor + sponsor management.
5. Marketing site refresh (hero copy, pricing, testimonials).
6. Email buyer (Lovable Emails) + analytics.

## Open items before I build

- Confirm admin email so I can seed the first `admin` role in the migration (you?).
- Domain for QR/landing URLs — keep `lovable.app` preview for now or wait for `welcomehome.com`?
- Pricing tiers content — placeholder copy OK for v1?

Once you give the green light (and answer the 3 above), I'll execute Phase 1 + 2 in the first build pass.

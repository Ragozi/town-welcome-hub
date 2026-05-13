## Goal

Turn the "ghost user" Google-signin path into a real consumer account: a signed-in resident or homebuyer who gets a personalized town feed, can save favorites, set interests, and optionally opt into a marketing email list we can monetize later.

Realtor flow (invite code) is unchanged. This plan only adds a parallel `subscriber` role.

---

## 1. Database

**New role**: extend `app_role` enum with `'subscriber'`.

**New table — `subscriber_profiles**` (one row per non-realtor user; keeps consumer fields out of the realtor `profiles` table):

- `user_id` (FK to auth.users, unique)
- `home_town_id` (FK towns, nullable — auto-set from IP, user can override)
- `interest_tags` (text[]) — food, kids, fitness, outdoors, etc.
- `lifestyle_tags` (text[]) — reuses same vocabulary as packets
- `has_kids`, `has_pets` (bool)
- timestamps

**New table — `marketing_subscriptions**` (granular opt-ins, append-only consent log friendly):

- `user_id`
- `topic` (enum: `local_deals`, `new_businesses`, `town_events`, `realtor_recommendations`)
- `opted_in_at`, `opted_out_at` (nullable)
- `source` (text: `signup_prefs`, `footer_link`, etc.) — for compliance audit
- unique `(user_id, topic)` active row

**New table — `saved_items**`:

- `user_id`, `item_type` (`business` | `coupon` | `packet`), `item_id` (uuid), `created_at`
- unique `(user_id, item_type, item_id)`

**Update `handle_new_user` trigger**:

- If `invite_code` present → realtor path (today's behavior).
- Else → insert `subscriber_profiles` row + assign `subscriber` role. No marketing opt-in by default.

**RLS**:

- `subscriber_profiles`: user reads/updates own row; admins all.
- `marketing_subscriptions`: user reads/inserts/updates own; admins read all (for export/segmenting).
- `saved_items`: user CRUD own.

---

## 2. Auth & routing

- `signInWithGoogle()` already works. Drop the "invite required" gate from the public Google button — it now does double duty (existing realtors sign in, new visitors become subscribers).
- Keep the invite-code section on `/login` for new realtors only.
- `useAuth()` exposes `role: 'admin' | 'realtor' | 'subscriber' | null` instead of just `isAdmin`.
- New layout route `_authenticated/me/` for the subscriber dashboard. Realtor dashboard stays at `_authenticated/dashboard`.
- After sign-in, redirect by role: admin → `/admin`, realtor → `/dashboard`, subscriber → `/me` (and on first ever visit → `/me/welcome`).

---

## 3. Coarse location → town

Server function `detect-town`:

- Read `cf-ipcountry` / `cf-ipcity` / `cf-iplongitude` / `cf-iplatitude` headers (Cloudflare provides these on the Worker runtime).
- Call existing `nearest_town(lat, lng)` RPC. Fallback: `town_by_zip` if we have a zip; final fallback: prompt user to pick from a dropdown of `towns`.
- Save result to `subscriber_profiles.home_town_id` on first sign-in. User can change it any time from `/me/settings`.

No browser geolocation API. No permission prompts.

---

## 4. Subscriber UI (`/me`)

- `**/me**` — Town feed. Hero: "Welcome to {town}." Sections: featured sponsors, active coupons (sorted by tier + interest match), new businesses, packets recently published in this town. Filters by saved interest tags.
- `**/me/welcome**` — One-time onboarding screen shown after first signup:
  1. Confirm/change detected town.
  2. Pick interest tags (chips: Food, Kids, Pets, Fitness, Outdoors, Nightlife, Family, Shopping).
  3. Marketing opt-in checkboxes (unchecked by default), each with a one-line description. CAN-SPAM-compliant copy.
  4. "Finish" → writes prefs, redirects to `/me`.
- `**/me/saved**` — Bookmarked businesses, coupons, packets. Heart icons on every card across the site write to `saved_items`.
- `**/me/settings**` — Edit town, tags, marketing opt-ins; "Delete my account & data" button (calls server fn that wipes profile + subscriptions + saved + auth user).

---

## 5. Admin additions

New tab under `/admin`: **Subscribers**.

- Count, growth chart, breakdown by town and by interest tag.
- Marketing list view: filter by topic + town + interests → "Export CSV" (for now, hand-off to whatever sender we pick later).
- No bulk email sending in this phase — explicitly punted per Q4.

---

## 6. Compliance & trust

- Privacy policy page (`/privacy`) — what we collect (email, name, IP-derived town, interests, saved items), why, retention, deletion rights.
- Terms page (`/terms`) — light.
- Footer links to both on every page.
- Marketing opt-in checkboxes default unchecked, with explicit text: "I want emails about [topic]. I can unsubscribe any time."
- Self-serve account deletion in `/me/settings`.
- Every marketing email (when we build sending later) must include unsubscribe link → flips `opted_out_at`.

---

## 7. Out of scope (deliberately)

- Sending any marketing email (no domain, no templates, no scheduler). Just collecting the consented list.
- Browser geolocation / precise location.
- Sponsor pricing model for email placements.
- Realtor "recommendations" matching (subscriber expresses interest in moving → notify their default town's realtors). Future.

---

## Technical detail (for the agent)

**Files to create**

- Migration: enum extension, three tables, RLS, updated trigger.
- `src/routes/_authenticated/me.tsx` (layout), `me.index.tsx`, `me.welcome.tsx`, `me.saved.tsx`, `me.settings.tsx`.
- `src/routes/_authenticated/admin.subscribers.tsx`.
- `src/routes/privacy.tsx`, `src/routes/terms.tsx`.
- `src/lib/subscriber.functions.ts` — `detectTown`, `updatePreferences`, `toggleMarketingOptIn`, `toggleSaved`, `deleteMyAccount`.
- `src/components/save-button.tsx`, `src/components/marketing-opt-in.tsx`.

**Files to edit**

- `src/lib/auth.tsx` — add `role`, expose subscriber profile, drop "Google = realtor only" framing.
- `src/routes/login.tsx` — Google button moves out of the invite-code collapsible, becomes top-level.
- `src/routes/_authenticated.tsx` — post-login role-based redirect helper.
- `src/routes/_authenticated/admin.tsx` — add Subscribers tab.
- `src/components/site-footer.tsx` — privacy + terms links.

**Auth/role helper**: add `useRole()` returning `'admin' | 'realtor' | 'subscriber' | null` so guards stop sprinkling `isAdmin` checks.  
  
Add a coupon tracker and my favorites list in each suers profile. saved section if needed - think through what a personlized space could look like

&nbsp;
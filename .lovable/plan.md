## 1. Remove subscriber accounts (consumer side)

Delete consumer-only routes and code. Realtors and admins remain.

**Delete files**
- `src/routes/_authenticated/me.tsx`
- `src/routes/_authenticated/me.index.tsx`
- `src/routes/_authenticated/me.welcome.tsx`
- `src/routes/_authenticated/me.saved.tsx`
- `src/routes/_authenticated/me.settings.tsx`
- `src/routes/_authenticated/admin.subscribers.tsx` (admin view of subscribers)
- `src/lib/subscriber.functions.ts`

**Edit `src/routes/_authenticated.tsx`**: drop the subscriber branch — no `/me` redirect, no `/me/welcome` onboarding gate, no subscriber nav (Saved / Settings). Header collapses to realtor + admin links only. `homeLink` becomes `/dashboard`.

**Edit `src/lib/auth.tsx`**: remove `subscriber` from `Role`, drop `subscriberProfile` state and its fetch, drop `isSubscriber`. Keep `admin` + `realtor`.

**Edit `src/routes/_authenticated/admin.tsx`**: remove the "Subscribers" tab link.

**Database migration** — update `handle_new_user()` so signups WITHOUT an invite code are rejected (rather than silently becoming a subscriber). New behavior: trigger raises an exception unless a valid invite code is present in `raw_user_meta_data`. The `subscriber` enum value, `subscriber_profiles`, `marketing_subscriptions`, and `saved_items` tables stay in place (data preservation, no destructive drops in this pass) but are no longer written to from app code. Flag: if you'd rather hard-drop those tables, say so and I'll add it.

## 2. Drop Google sign-in

**Edit `src/routes/login.tsx`**: remove the "Continue with Google" button, the `onGoogle` handler, and the divider. Restructure: realtor sign-in (email/password) is the primary form; "I have an invite code" toggle below it for new realtor signups. Update copy from "New here? Sign in with Google…" to realtor-focused.

**Edit `src/lib/auth.tsx`**: remove `signInWithGoogle` from the context type, the provider value, and the implementation.

**Call `supabase--configure_social_auth`** with `providers: []` and `disable_providers: ["google"]` to disable the Google provider in Lovable Cloud auth settings.

## 3. Build a real /sponsor page

New file `src/routes/sponsor.tsx` with proper SEO `head()`. Sections:
1. **Hero** — "Get in front of every new homeowner in your town." Subhead: how listings appear inside packets. CTA "Get listed" → mailto.
2. **Why it works** — 3 bullets: captive audience (every closing in your town), warm intro (presented by the buyer's realtor), zero ad noise (curated, not algorithmic).
3. **Tiers** — render from `sponsor_tiers` table (already publicly readable: `name`, `price_monthly`, `display_priority`, `key`). Show what each tier gets: directory placement priority, featured card vs. plain listing, coupon, photo. Use a static `TIER_BENEFITS` map keyed off `key` for the bullet lists since the table doesn't store them.
4. **What's included visual** — small mock business card showing how a sponsor entry renders inside a packet (reuse styling from `BusinessCard`).
5. **CTA band** — "Claim your category in your town" → `mailto:info@hearthhandbook.com?subject=Sponsor%20listing%20inquiry`.

**Wire it up**:
- `src/components/site-header.tsx`: change the "Get Listed" button from `<a href="/#sponsor">` to `<Link to="/sponsor">`. Add a "Sponsor" nav link too.
- `src/components/site-footer.tsx`: change "Sponsor tiers" anchor to `<Link to="/sponsor">`.
- `src/routes/index.tsx`: the in-page `#sponsor` band's "Get listed" CTA points to `/sponsor` instead of mailto, and we keep the band as a teaser on the home page.
- `src/routes/sitemap[.]xml.ts`: add `/sponsor` entry.
- `public/llms.txt`: add `/sponsor` to the page list.

## 4. About page rewrite (realtor-first)

Remaining consumer copy to fix in `src/routes/about.tsx`:
- Hero subhead: change from "Meet the locals, grab a coupon, and feel at home — wherever you land. Hearth Handbook is a hand-curated, community-first guide built for the people who actually live, work and visit each town we cover." → realtor-pitched: closing-gift product for buyers, made by realtors.
- "By the numbers" panel — replace consumer stats with realtor-relevant ones (Towns covered: 8, Sponsor categories: 12+, Buyers reached: TBD or drop the third stat).
- "Free for residents, forever" card → "Free for buyers, forever" (still true — buyers don't pay, realtors do).
- "Built for Wisconsin, by Wisconsinites" story paragraph: keep the printed-welcome-packet origin (it's true and on-brand) but reframe the destination as "a realtor toolkit so every closing comes with a beautiful welcome."
- Roadmap section stays.
- "Want your town next?" CTA stays but reword for realtors ("Want to bring Hearth Handbook to your county? We'd love to hear from you.").

## 5. Tiny landing tweak

Update home `#sponsor` band CTA href from `mailto:` to `<Link to="/sponsor">` so users can read the pitch first instead of being thrown into their email client.

## Out of scope / flagged
- Subscriber data tables (`subscriber_profiles`, `marketing_subscriptions`, `saved_items`) and the `subscriber` enum value remain in DB. Tell me if you want them dropped — I'll write a destructive migration.
- `validate_invite_code` / `claim_invite_code` RPCs already gate realtor signups; no change needed there.

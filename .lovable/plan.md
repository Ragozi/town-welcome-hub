# Invite-Code Realtor Signup

Lock down `/login` so only people holding a valid invite code from you or Ted can become realtors. Codes are generated in the admin panel, single-use, and consumed atomically at signup. Both Google and email/password are supported once a code is validated.

## User flow

**Realtor receives code via email from admin** → visits `/login` → sees a clean "Have an invite code?" gate.

1. **Already has account** → Sign in with Google or email/password (no code required).
2. **New realtor** → clicks "I have an invite code" → enters code → on valid+unused code, the Google button and email/password signup form unlock.
3. After signup completes, the code is marked consumed (linked to their `user_id`) and the `realtor` role is assigned. Redirect to `/dashboard`.
4. Invalid/expired/consumed code → friendly error, no signup path revealed.

**Public visitors hitting `/login` without a code** see only the sign-in form (for existing realtors) and the "I have an invite code" link. No way to self-promote.

## Admin experience

New tab in `/admin`: **Invite codes**.

- Table of all codes: code string, created by, created date, expires date, status (unused / consumed / expired / revoked), consumed-by realtor name+email.
- "Generate code" button: optional note ("for Sarah at KW Madison"), optional expiry (default 30 days), optional pre-fill email (locks the code to that email if provided). Returns the code + a one-click "Copy invite link" (`/login?code=WH-3F9K2A`).
- Revoke action on unused codes.

## Technical details

### Database (one migration)

New table `realtor_invite_codes`:
- `code` (text, unique, indexed) — format `WH-XXXXXX` (6 alphanumeric, uppercase, ambiguous chars removed)
- `created_by` (uuid, FK to user) — admin who generated it
- `note` (text, nullable) — internal label
- `email_lock` (text, nullable) — if set, only this email can consume
- `expires_at` (timestamptz, nullable)
- `consumed_at` (timestamptz, nullable)
- `consumed_by` (uuid, nullable) — references the resulting user
- `revoked_at` (timestamptz, nullable)
- standard `id`, `created_at`

RLS: admins full access; everyone else no access (validation happens through SECURITY DEFINER RPCs only — codes are never client-readable).

Two SECURITY DEFINER functions:
- `validate_invite_code(code text, email text default null) returns boolean` — returns true if code exists, not consumed/revoked/expired, and email matches `email_lock` (when set). Public callable (anon/authenticated). Used by `/login` to gate the signup UI.
- `consume_invite_code(code text, user_id uuid) returns boolean` — atomic: locks the row, re-validates, marks consumed. Returns true on success.

**Modify `handle_new_user` trigger**: instead of unconditionally assigning `realtor` role, read invite code from `raw_user_meta_data->>'invite_code'`, call `consume_invite_code`. If consumption fails → delete the just-created auth user + raise exception so signup fails atomically. If no code in metadata at all → no role assigned (Google sign-ins of existing realtors keep their role from `user_roles`; brand-new Google users without a code get no role and can't access `/dashboard`).

### Frontend

**`/login` route** (rewrite):
- Top: "Sign in" form (email/password) + "Continue with Google" button — both call existing auth and only succeed if user already exists.
- Below: collapsible "I'm a new realtor with an invite code" section.
- Inside: code input → validate via RPC on submit → on success, reveal "Continue with Google" (passes code in OAuth state) and email/password signup form.
- Support `?code=WH-XXXXXX` URL param for one-click invite links from admin emails.

**Google OAuth integration:**
- Use Lovable Cloud managed Google (`lovable.auth.signInWithOAuth("google", {...})`).
- Pass the validated invite code through `options.data.invite_code` so it lands in `raw_user_meta_data` and the trigger consumes it. (Existing-user sign-ins ignore this — trigger only fires on new user creation.)

**Email/password signup:** call `supabase.auth.signUp({ email, password, options: { data: { invite_code, full_name } } })`.

**`/admin/invite-codes` route:** new tab in admin layout. List + Generate dialog + Revoke action. All operations via existing admin patterns (`supabase` client + RLS).

### Auth provider config
- Enable Google in Lovable Cloud (managed credentials, zero setup).
- Keep email/password enabled.
- Keep `auto_confirm_email: false` (realtors verify email — prevents typos and fake addresses burning invite codes).

### Edge cases handled
- Code consumed but auth.users insert succeeds, trigger fails → trigger raises, transaction rolls back, code stays unconsumed.
- Realtor enters wrong email after Google flow: Google email is authoritative; if `email_lock` is set and Google email doesn't match, signup is rejected and code remains available.
- Admin (you/Ted) signs in: your existing `admin` role in `user_roles` is unaffected. The trigger only adds `realtor` if a code is consumed; it doesn't touch existing roles.

## Out of scope (mention only)
- Bulk code generation / CSV export — easy to add later.
- Auto-emailing the invite from the admin panel — for now you copy the link and paste into your email client.
- Realtor self-service "request access" form — not needed under invite-only model.

## Files touched
- New migration: `realtor_invite_codes` table + RPCs + updated `handle_new_user` trigger.
- New route: `src/routes/_authenticated/admin.invite-codes.tsx`.
- Edit: `src/routes/login.tsx` (full rewrite of the form section).
- Edit: `src/routes/_authenticated/admin.tsx` (add nav tab).
- Edit: `src/lib/auth.tsx` (add `signUpWithCode` + `signInWithGoogle` helpers).
- Lovable Cloud: enable Google provider via `configure_social_auth`.

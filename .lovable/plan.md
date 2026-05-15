## 1. Label & Naming Cleanup

In `src/routes/_authenticated/admin.tsx` strip the emojis and rename the nav links (keep the juicy hover/active gradients, just drop the emoji `<span>`):

- 🔥 Hearth Hub → **Overview**
- 🌈 The Chosen Family → **IAM**
- 🍯 Serving Coin → **Financial Dashboard**
- ☕ Spill the Tea → **Application Log**
- 🎟️ Come Through → **Invitations**

Page titles / headings updated to match in:
- `admin.users.tsx` → heading "Identity & Access Management"
- `admin.finance.tsx` → "Financial Dashboard"
- `admin.events.tsx` → "Application Log"
- `admin.invite-codes.tsx` → "Invitations"

"New packet" → "New Handbook" everywhere it appears:
- `src/routes/_authenticated.tsx` (top nav button)
- `src/routes/_authenticated/packets.index.tsx` (CTA)
- `src/routes/_authenticated/packets.new.tsx` (eyebrow / page title)
- `src/routes/_authenticated/settings.tsx` (placeholder copy)

## 2. Role Model: 4 Tiers

Migration extends the `app_role` enum and re-buckets existing users:

```text
super_admin    (eric@, ted@ — full control, IAM access)
realtor_admin  (manages a brokerage/team)
realtor_agent  (default for invite-code signups; replaces "realtor")
sponsor_user   (business sponsor accounts)
```

- `ALTER TYPE app_role ADD VALUE IF NOT EXISTS` for the 3 new values.
- Backfill: existing `admin` rows → also insert `super_admin`; existing `realtor` rows → also insert `realtor_agent`. Keep legacy values around so RLS doesn't break mid-deploy.
- Update `handle_new_user()` and `claim_invite_code()` to assign `realtor_agent`.
- RLS policies referencing `'admin'` updated to accept `super_admin`/`realtor_admin` where appropriate. IAM-mutating policies (user_roles, invite codes) remain **super_admin only**.

`src/lib/auth.tsx`: extend `Role` union, add `isSuperAdmin`, `isRealtorAdmin`, `isRealtorAgent`, `isSponsor`. Keep `isAdmin = super_admin || realtor_admin` for back-compat. Gate `/admin/users` and `/admin/invite-codes` on `isSuperAdmin` only.

## 3. Server-Side IAM Hardening (`src/lib/admin.functions.ts`)

- New `assertSuperAdmin` used by `adminCreateUser`, `adminSetRole`, `adminResetPassword`, `adminDeleteUser`, `adminInviteUser`, `adminResendInvite`, `adminSetUserActive`.
- `adminListUsers` stays admin-tier; mutations are super-admin only.
- `CreateUserSchema`: replace `is_admin: boolean` with `role: z.enum(["super_admin","realtor_admin","realtor_agent","sponsor_user"])`.
- Switch new-user provisioning to **`auth.admin.inviteUserByEmail(email, { data: { full_name, assigned_role }, redirectTo })`** so Supabase sends the invite email; then upsert profile + assigned role.
- `adminResendInvite({ user_id })` re-issues the invite email via `auth.admin.inviteUserByEmail`.
- **`adminSetUserActive({ user_id, active })`** — calls `auth.admin.updateUserById(id, { ban_duration: active ? "none" : "876000h" })` to deactivate / reactivate. Server prevents self-deactivation and deactivating the last active super admin.
- `adminListUsers` returns extra fields used by the UI: `email_confirmed_at`, `banned_until`, `invited_at`.

## 4. IAM UI (`src/routes/_authenticated/admin.users.tsx`)

- Heading: "Identity & Access Management".
- "New user" dialog (super-admin only):
  - Full name, Email
  - **Role** dropdown (required): Super Admin / Realtor Admin / Realtor Agent / Sponsor User
  - Password field removed; copy: "We'll email an invitation with a setup link."
  - On success: `qc.setQueryData(["admin-users"], prev => [newUser, ...prev])` for instant insert + `invalidateQueries` for reconciliation. Toast success/error.
- Replace single Admin toggle with a **Role** Select per row → `adminSetRole`.
- **Last Sign In** logic:
  - `!confirmed` → "Pending Verification"
  - `confirmed && !last_sign_in_at` → "N/A"
  - else → formatted timestamp
- **Status** column (priority order):
  1. `banned_until > now` → **Disabled**
  2. `invited_at && !confirmed` → **Pending Invitation**
  3. `!confirmed` → **Pending Verification**
  4. else → **Active**
- Row actions menu (super-admin only):
  - **Resend Invitation** (when status is Pending Invitation/Verification)
  - **Reset password**
  - **Deactivate user** / **Reactivate user** (toggles based on current status; confirms before deactivating)
  - **Delete** (server blocks deleting self or last super admin)

## 5. Reactive Updates

All mutations use `useMutation` with `onSuccess: invalidateQueries(["admin-users"])`, plus optimistic insert on create. No manual refresh.

## 6. Acceptance

- Eric & Ted = Super Admin; everyone else `realtor_agent`.
- Only super admins see New User, role dropdown, role Select, deactivate, delete.
- Creating a user emails the invite; row appears immediately.
- Status reflects Disabled / Pending Invitation / Pending Verification / Active.
- Deactivate flips the user's status to Disabled and blocks login until reactivated.
- Last Sign In follows the 3-state rule.
- All tabs and page titles use new names; emojis removed; "New packet" reads "New Handbook" throughout.

## Technical notes

- Deactivation uses Supabase `ban_duration` ("876000h" ≈ 100 years). Reactivation passes `"none"`.
- Supabase's "Invite user" auth template must be enabled; default sender is rate-limited without custom SMTP — failures surface via error toast.
- `ALTER TYPE ADD VALUE` runs in its own statements before any policy changes (non-transactional).
- Legacy `'admin'`/`'realtor'` enum values kept for now; a follow-up migration can drop them once nothing references them.
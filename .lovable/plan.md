# Fix: branding images vanish ~10s after upload

## Root cause

Uploads to the `headshots` / `brokerage-logos` buckets succeed (storage rows exist), but the local form state holding the new public URL gets wiped before the user clicks **Save**.

In `src/routes/_authenticated/settings.tsx`:

```ts
useEffect(() => {
  if (!profile) return;
  setHeadshotUrl(profile.headshot_url ?? "");
  setLogoUrl(profile.brokerage_logo_url ?? "");
  // ...every other field
}, [profile]);
```

`src/lib/auth.tsx` calls `loadProfile()` on every `supabase.auth.onAuthStateChange` event (INITIAL_SESSION, TOKEN_REFRESHED, USER_UPDATED, etc.). Each refetch returns a new `profile` object → effect re-runs → the just-uploaded URL is overwritten with the still-`null` DB value. Picture disappears.

## Fix

Persist the image URL to the profile immediately on successful upload (no Save click required for images), then refresh. This matches user expectation that "uploading = saved" and survives any future profile re-hydration.

### Changes — `src/routes/_authenticated/settings.tsx` only

Update the `upload()` helper to also write the new URL to `profiles` and refresh auth state:

```ts
const upload = async (
  bucket: "headshots" | "brokerage-logos",
  file: File,
  set: (url: string) => void,
) => {
  if (!user) return;
  const ext = file.name.split(".").pop();
  const path = `${user.id}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) {
    toast.error("Upload failed.", { description: error.message });
    return;
  }
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  set(pub.publicUrl);

  // Persist immediately so the URL survives profile re-hydration
  const column = bucket === "headshots" ? "headshot_url" : "brokerage_logo_url";
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ [column]: pub.publicUrl })
    .eq("user_id", user.id);
  if (updateError) {
    toast.error("Saved to storage but couldn't update profile.", { description: updateError.message });
    return;
  }
  await refreshProfile();
  toast.success("Image saved.");
};
```

Also update the "Remove" button in `ImageField` so removal persists too. Pass an `onRemove` prop from the parent that nulls the column in `profiles` and calls `refreshProfile()`, instead of just calling `onUrl("")` which would similarly get wiped/ignored. Concretely:

- Add an `onRemove?: () => Promise<void>` prop to `ImageField`.
- The "Remove" `<button>` calls `onRemove ?? (() => onUrl(""))`.
- In `Settings`, pass `onRemove` for both images that runs the same `profiles.update({ [column]: null })` + `refreshProfile()` flow.

### Out of scope (intentionally)

- The other form fields (name, phone, social links, default town, thank-you message) still use the explicit **Save** button. They're text inputs where the user expects to edit before committing; persist-on-change would be wrong UX. The clobber-on-refetch risk for those is small because the user is actively typing — but if it bites later we can switch the hydration `useEffect` to a one-shot "hydrate on first non-null profile" pattern.

## Verification

1. Upload a headshot → wait 30s on the page → image still shown.
2. Reload the page → image still shown.
3. Check DB: `select headshot_url, brokerage_logo_url from profiles where user_id = '<me>'` → both populated.
4. Click Remove → image clears, DB column becomes null, survives reload.

## Files touched

- `src/routes/_authenticated/settings.tsx` (only)

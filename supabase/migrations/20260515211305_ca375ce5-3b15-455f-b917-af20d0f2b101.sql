-- 1) Lock down packets: remove public SELECT, add owner SELECT
DROP POLICY IF EXISTS "packets publicly readable" ON public.packets;

CREATE POLICY "realtors read own packets"
ON public.packets FOR SELECT
TO authenticated
USING (auth.uid() = realtor_id);

-- 2) Lock down profiles: remove public SELECT, add owner SELECT
DROP POLICY IF EXISTS "profiles publicly readable" ON public.profiles;

CREATE POLICY "users read own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3) Defense-in-depth: explicit no-read for invite codes by non-admins
-- (admins already have ALL via has_role; this denies everyone else)
DROP POLICY IF EXISTS "deny invite code reads to non-admins" ON public.realtor_invite_codes;
CREATE POLICY "deny invite code reads to non-admins"
ON public.realtor_invite_codes FOR SELECT
TO anon, authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- 4) Make packet-pdfs bucket private; PDFs must be served via signed/short-lived token route
UPDATE storage.buckets SET public = false WHERE id = 'packet-pdfs';
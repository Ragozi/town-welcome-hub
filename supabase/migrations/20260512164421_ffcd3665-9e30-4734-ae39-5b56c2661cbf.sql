
-- Drop broad SELECT policies on public buckets (files remain readable by URL via public bucket, just no listing)
DROP POLICY IF EXISTS "public read headshots" ON storage.objects;
DROP POLICY IF EXISTS "public read logos" ON storage.objects;
DROP POLICY IF EXISTS "public read home photos" ON storage.objects;
DROP POLICY IF EXISTS "public read packet pdfs" ON storage.objects;

-- Restrict has_role execution
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

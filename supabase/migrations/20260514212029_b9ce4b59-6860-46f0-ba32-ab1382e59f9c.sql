
-- Ensure storage upload policies cover all buckets, allow admins to upload anywhere,
-- and provide WITH CHECK clauses + SELECT policies for authenticated reads.

-- Drop old narrow policies (recreate cleanly)
DROP POLICY IF EXISTS "users upload own headshots" ON storage.objects;
DROP POLICY IF EXISTS "users update own headshots" ON storage.objects;
DROP POLICY IF EXISTS "users delete own headshots" ON storage.objects;
DROP POLICY IF EXISTS "users upload own logos" ON storage.objects;
DROP POLICY IF EXISTS "users update own logos" ON storage.objects;
DROP POLICY IF EXISTS "users delete own logos" ON storage.objects;
DROP POLICY IF EXISTS "users upload own home photos" ON storage.objects;
DROP POLICY IF EXISTS "users update own home photos" ON storage.objects;
DROP POLICY IF EXISTS "users delete own home photos" ON storage.objects;
DROP POLICY IF EXISTS "users upload own packet pdfs" ON storage.objects;
DROP POLICY IF EXISTS "users update own packet pdfs" ON storage.objects;
DROP POLICY IF EXISTS "users delete own packet pdfs" ON storage.objects;

-- Public read for these public buckets (defensive; bucket public flag covers anon URLs already)
CREATE POLICY "public read user buckets"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id IN ('headshots','brokerage-logos','home-photos','packet-pdfs'));

-- Authenticated users can write to their own folder OR admins can write anywhere
CREATE POLICY "authed insert user buckets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('headshots','brokerage-logos','home-photos','packet-pdfs')
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "authed update user buckets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('headshots','brokerage-logos','home-photos','packet-pdfs')
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  )
  WITH CHECK (
    bucket_id IN ('headshots','brokerage-logos','home-photos','packet-pdfs')
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "authed delete user buckets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('headshots','brokerage-logos','home-photos','packet-pdfs')
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );

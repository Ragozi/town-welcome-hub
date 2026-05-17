
-- Fix mismatched unique index so upserts on (town_id, website) actually work
DROP INDEX IF EXISTS public.scraped_businesses_town_website_idx;
CREATE UNIQUE INDEX scraped_businesses_town_website_idx
  ON public.scraped_businesses (town_id, website)
  WHERE website IS NOT NULL;

-- Verification fields so admins can flag closed/outdated businesses
DO $$ BEGIN
  CREATE TYPE public.business_verification_status AS ENUM ('unknown', 'open', 'possibly_closed', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_status public.business_verification_status NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS verification_note text;

ALTER TABLE public.scraped_businesses
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_status public.business_verification_status NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS verification_note text;

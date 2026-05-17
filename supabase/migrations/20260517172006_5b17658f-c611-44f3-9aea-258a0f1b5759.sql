
-- Track which zip code a scraped result came from, so admins can audit
-- coverage gaps and we can re-query missing zips without re-running everything.
ALTER TABLE public.scraped_businesses
  ADD COLUMN IF NOT EXISTS source_zip text;

CREATE INDEX IF NOT EXISTS scraped_businesses_town_zip_idx
  ON public.scraped_businesses (town_id, source_zip);

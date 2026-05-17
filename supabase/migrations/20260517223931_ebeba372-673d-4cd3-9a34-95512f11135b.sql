ALTER TABLE public.scraped_businesses
  ADD COLUMN IF NOT EXISTS source_zip text,
  ADD COLUMN IF NOT EXISTS source_county text;
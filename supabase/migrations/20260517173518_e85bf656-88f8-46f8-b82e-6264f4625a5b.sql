
-- Track which county a scraped result is anchored to. Lets us answer
-- "what businesses are in <county>?" for categories where buyers reasonably
-- drive across town lines (orthodontist, urgent care, hardware), while zip
-- stays the granularity for hyperlocal categories (coffee, pizza, ice cream).
ALTER TABLE public.scraped_businesses
  ADD COLUMN IF NOT EXISTS source_county text;

CREATE INDEX IF NOT EXISTS scraped_businesses_town_county_idx
  ON public.scraped_businesses (town_id, source_county);

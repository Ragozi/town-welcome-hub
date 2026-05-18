DROP INDEX IF EXISTS public.scraped_businesses_town_website_idx;
ALTER TABLE public.scraped_businesses
  ADD CONSTRAINT scraped_businesses_town_website_key UNIQUE (town_id, website);
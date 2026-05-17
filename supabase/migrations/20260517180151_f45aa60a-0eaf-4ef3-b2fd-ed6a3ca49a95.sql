
-- Fix silent-skip-on-conflict bug in scraped_businesses upserts.
--
-- The previous unique index was on (town_id, lower(website)) — a functional
-- index. Supabase PostgREST's `onConflict: "town_id,website"` cannot target
-- a functional index, so every conflicting upsert threw an error that the
-- handler silently caught and counted as 'skipped'. Result: re-scraping
-- always reported "0 new" because every existing row "failed" to upsert.
--
-- Fix: drop the functional index, normalize existing data to lowercase, and
-- create a plain unique index PostgREST can resolve. Also normalize anything
-- already in the table.
DROP INDEX IF EXISTS public.scraped_businesses_town_website_idx;

UPDATE public.scraped_businesses
SET website = lower(website)
WHERE website IS NOT NULL AND website <> lower(website);

CREATE UNIQUE INDEX IF NOT EXISTS scraped_businesses_town_website_idx
  ON public.scraped_businesses (town_id, website)
  WHERE website IS NOT NULL;

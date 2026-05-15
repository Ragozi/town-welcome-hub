
-- Status enum for scraped businesses
CREATE TYPE public.scraped_business_status AS ENUM ('pending', 'included', 'excluded', 'promoted');

CREATE TABLE public.scraped_businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  town_id uuid NOT NULL REFERENCES public.towns(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'firecrawl_search',
  source_url text,
  source_query text,
  name text NOT NULL,
  address text,
  phone text,
  website text,
  description text,
  logo_url text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.scraped_business_status NOT NULL DEFAULT 'pending',
  excluded_reason text,
  promoted_business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  last_scraped_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX scraped_businesses_town_website_idx
  ON public.scraped_businesses (town_id, lower(website))
  WHERE website IS NOT NULL;

CREATE INDEX scraped_businesses_town_status_idx
  ON public.scraped_businesses (town_id, status);

ALTER TABLE public.scraped_businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage scraped_businesses"
  ON public.scraped_businesses
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE TRIGGER scraped_businesses_touch_updated_at
  BEFORE UPDATE ON public.scraped_businesses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Per-packet exclusions
ALTER TABLE public.packets
  ADD COLUMN IF NOT EXISTS excluded_business_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

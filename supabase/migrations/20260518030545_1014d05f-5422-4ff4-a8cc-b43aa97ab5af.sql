CREATE TYPE public.scrape_filter_rule_type AS ENUM (
  'domain_contains',
  'url_regex',
  'title_regex',
  'url_suffix'
);

CREATE TABLE public.scrape_filter_rules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type     public.scrape_filter_rule_type NOT NULL,
  pattern       text NOT NULL,
  reason_label  text NOT NULL,
  enabled       boolean NOT NULL DEFAULT true,
  notes         text,
  hit_count     integer NOT NULL DEFAULT 0,
  last_hit_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES auth.users(id)
);

CREATE INDEX scrape_filter_rules_enabled_idx ON public.scrape_filter_rules (enabled) WHERE enabled;

ALTER TABLE public.scrape_filter_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage scrape filter rules"
  ON public.scrape_filter_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER scrape_filter_rules_touch_updated_at
  BEFORE UPDATE ON public.scrape_filter_rules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.increment_filter_rule_hits(rule_ids uuid[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.scrape_filter_rules
     SET hit_count = hit_count + 1, last_hit_at = now()
   WHERE id = ANY(rule_ids);
$$;

INSERT INTO public.scrape_filter_rules (rule_type, pattern, reason_label, notes) VALUES
  ('domain_contains', 'yelp',                  'aggregator: yelp',                'Review aggregator'),
  ('domain_contains', 'tripadvisor',           'aggregator: tripadvisor',         'Travel/review aggregator'),
  ('domain_contains', 'yellowpages',           'aggregator: yellowpages',         'Directory aggregator'),
  ('domain_contains', 'mapquest',              'aggregator: mapquest',            'Map aggregator'),
  ('domain_contains', 'allmenus',              'aggregator: allmenus',            'Restaurant aggregator'),
  ('domain_contains', 'foursquare',            'aggregator: foursquare',          'Check-in aggregator'),
  ('domain_contains', 'citysearch',            'aggregator: citysearch',          'Local listing aggregator'),
  ('domain_contains', 'niche',                 'aggregator: niche',               'School/places listicle'),
  ('domain_contains', 'thumbtack',             'aggregator: thumbtack',           'Service aggregator'),
  ('domain_contains', 'angi.com',              'aggregator: angi',                'Home services aggregator'),
  ('domain_contains', 'angieslist',            'aggregator: angieslist',          'Home services aggregator'),
  ('domain_contains', 'facebook',              'aggregator: facebook',            'Social'),
  ('domain_contains', 'instagram',             'aggregator: instagram',           'Social'),
  ('domain_contains', 'twitter',               'aggregator: twitter',             'Social'),
  ('domain_contains', 'x.com',                 'aggregator: x',                   'Social'),
  ('domain_contains', 'linkedin',              'aggregator: linkedin',            'Social'),
  ('domain_contains', 'pinterest',             'aggregator: pinterest',           'Social'),
  ('domain_contains', 'tiktok',                'aggregator: tiktok',              'Social'),
  ('domain_contains', 'reddit',                'aggregator: reddit',              'Forum'),
  ('domain_contains', 'nextdoor',              'aggregator: nextdoor',            'Neighborhood forum'),
  ('domain_contains', 'quora',                 'aggregator: quora',               'Q&A forum'),
  ('domain_contains', 'youtube',               'aggregator: youtube',             'Video — not a business site'),
  ('domain_contains', 'google.',               'aggregator: google',              'Google cached snippet'),
  ('domain_contains', 'bing.com',              'aggregator: bing',                'Bing snippet'),
  ('domain_contains', 'duckduckgo.com',        'aggregator: duckduckgo',          'DuckDuckGo'),
  ('domain_contains', 'healthgrades',          'aggregator: healthgrades',        'Healthcare aggregator'),
  ('domain_contains', 'zocdoc',                'aggregator: zocdoc',              'Healthcare aggregator'),
  ('domain_contains', 'vitals.com',            'aggregator: vitals',              'Healthcare aggregator'),
  ('domain_contains', 'ratemds',               'aggregator: ratemds',             'Healthcare aggregator'),
  ('domain_contains', 'wellness.com',          'aggregator: wellness',            'Healthcare aggregator'),
  ('domain_contains', 'solvhealth',            'aggregator: solvhealth',          'Urgent care aggregator'),
  ('domain_contains', 'carelulu',              'aggregator: carelulu',            'Daycare aggregator'),
  ('domain_contains', 'fertilityiq',           'aggregator: fertilityiq',         'Fertility aggregator'),
  ('domain_contains', 'opentable',             'aggregator: opentable',           'Restaurant booking'),
  ('domain_contains', 'doordash',              'aggregator: doordash',            'Delivery aggregator'),
  ('domain_contains', 'ubereats',              'aggregator: ubereats',            'Delivery aggregator'),
  ('domain_contains', 'grubhub',               'aggregator: grubhub',             'Delivery aggregator'),
  ('domain_contains', 'seamless',              'aggregator: seamless',            'Delivery aggregator'),
  ('domain_contains', 'menupages',             'aggregator: menupages',           'Menu aggregator'),
  ('domain_contains', 'tripsavvy',             'aggregator: tripsavvy',           'Travel content'),
  ('domain_contains', 'privateschoolreview',   'aggregator: privateschoolreview', 'School aggregator'),
  ('domain_contains', 'greatschools',          'aggregator: greatschools',        'School aggregator'),
  ('domain_contains', 'preschoolfinder',       'aggregator: preschoolfinder',     'School aggregator'),
  ('domain_contains', 'redfin.com',            'aggregator: redfin',              'Real estate listicle'),
  ('domain_contains', 'zillow.com',            'aggregator: zillow',              'Real estate listicle'),
  ('domain_contains', 'realtor.com',           'aggregator: realtor',             'Real estate listicle'),
  ('domain_contains', 'expertise.com',         'aggregator: expertise',           'Generic listicle generator'),
  ('url_regex',       '\.gov([/?#:]|$)',       'government: .gov',                'US gov sites'),
  ('url_regex',       '\.us([/?#:]|$)',        'government: .us',                 'US state sites'),
  ('url_regex',       'walgreens\.com/(locator|store)',  'chain_locator: walgreens', 'Walgreens store locator'),
  ('url_regex',       'cvs\.com/store',                  'chain_locator: cvs',       'CVS store locator'),
  ('url_regex',       'riteaid\.com/locations',          'chain_locator: riteaid',   'Rite Aid locations'),
  ('url_regex',       'walmart\.com/store',              'chain_locator: walmart',   'Walmart store locator'),
  ('url_regex',       'target\.com/sl',                  'chain_locator: target',    'Target store locator'),
  ('url_regex',       'wellsfargo\.com/locator',         'chain_locator: wellsfargo','Wells Fargo locator'),
  ('url_regex',       'chase\.com/(atm|branch)',         'chain_locator: chase',     'Chase locator'),
  ('url_regex',       'bankofamerica\.com/locator',      'chain_locator: bofa',      'BoA locator'),
  ('url_regex',       'mcdonalds\.com/us/en-us/location','chain_locator: mcd',       'McDonalds locator'),
  ('url_suffix',      '.pdf',                  'pdf_url',                         'PDF document'),
  ('title_regex',     '^\s*\[pdf\]',           'title: [PDF]',                    'Result title starts with [PDF]'),
  ('title_regex',     '^(\s*\d{4}\s+)?(the\s+)?(\d+\s+)?(best\s+places|top\s+\d+|the\s+best|\d+\s+best|best\s+\d+)\b', 'title: listicle', 'Listicle title pattern'),
  ('title_regex',     '\b(directory|listings?\s+for|county\s+licensed|find\s+a\s+(doctor|dentist|provider))\b', 'title: directory', 'Directory page title');
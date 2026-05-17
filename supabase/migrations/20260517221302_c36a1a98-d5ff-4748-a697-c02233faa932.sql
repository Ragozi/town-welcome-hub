
CREATE TABLE public.core_business_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_slug text NOT NULL,
  subcategory text,
  label text NOT NULL,
  min_expected integer NOT NULL DEFAULT 1,
  is_critical boolean NOT NULL DEFAULT true,
  synonyms text[] NOT NULL DEFAULT '{}',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX core_business_categories_uniq
  ON public.core_business_categories (category_slug, COALESCE(subcategory, ''));

ALTER TABLE public.core_business_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage core business categories"
  ON public.core_business_categories
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

INSERT INTO public.core_business_categories
  (category_slug, subcategory, label, min_expected, is_critical, synonyms, display_order)
VALUES
  ('restaurants', 'pizza',       'Pizza',         1, true,  ARRAY['pizza','pizzeria','slice'], 10),
  ('restaurants', 'bakery',      'Bakery',        1, true,  ARRAY['bakery','bake shop','patisserie'], 20),
  ('restaurants', 'ice_cream',   'Ice Cream',     1, true,  ARRAY['ice cream','gelato','custard','frozen yogurt'], 30),
  ('restaurants', 'family',      'Family dining', 2, true,  ARRAY['diner','family restaurant','grill'], 40),
  ('coffee',      NULL,          'Coffee shop',   1, true,  ARRAY['coffee','cafe','espresso','roaster'], 50),
  ('shopping',    'grocery',     'Grocery',       1, true,  ARRAY['grocery','supermarket','market','iga','piggly'], 60),
  ('shopping',    'hardware',    'Hardware',      1, true,  ARRAY['hardware','ace','true value','lumber'], 70),
  ('services',    'auto_repair', 'Auto repair',   1, true,  ARRAY['auto repair','mechanic','tire','muffler'], 80),
  ('services',    'hair_salon',  'Hair salon',    1, false, ARRAY['salon','barber','hair'], 90),
  ('services',    'bank',        'Bank/Credit Union', 1, true, ARRAY['bank','credit union','federal savings'], 100),
  ('health',      'pharmacy',    'Pharmacy',      1, true,  ARRAY['pharmacy','drug store','walgreens','cvs'], 110),
  ('health',      'urgent_care', 'Urgent care',   1, true,  ARRAY['urgent care','walk-in clinic','immediate care'], 120),
  ('health',      'dentist',     'Dentist',       1, true,  ARRAY['dental','dentist','orthodontic'], 130),
  ('health',      'gym',         'Gym/Fitness',   1, false, ARRAY['gym','fitness','crossfit','yoga'], 140),
  ('services',    'daycare',     'Daycare',       1, false, ARRAY['daycare','child care','preschool','learning center'], 150);

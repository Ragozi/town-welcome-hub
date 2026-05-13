
-- 1. Extend role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'subscriber';

-- 2. Marketing topic enum
DO $$ BEGIN
  CREATE TYPE public.marketing_topic AS ENUM (
    'local_deals',
    'new_businesses',
    'town_events',
    'realtor_recommendations'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Saved item type enum
DO $$ BEGIN
  CREATE TYPE public.saved_item_type AS ENUM ('business', 'coupon', 'packet');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4. subscriber_profiles
CREATE TABLE IF NOT EXISTS public.subscriber_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  home_town_id uuid REFERENCES public.towns(id) ON DELETE SET NULL,
  interest_tags text[] NOT NULL DEFAULT '{}',
  lifestyle_tags text[] NOT NULL DEFAULT '{}',
  has_kids boolean NOT NULL DEFAULT false,
  has_pets boolean NOT NULL DEFAULT false,
  onboarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriber_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscribers read own profile"
  ON public.subscriber_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "subscribers insert own profile"
  ON public.subscriber_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subscribers update own profile"
  ON public.subscriber_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins manage subscriber profiles"
  ON public.subscriber_profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_subscriber_profiles_updated_at
  BEFORE UPDATE ON public.subscriber_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5. marketing_subscriptions
CREATE TABLE IF NOT EXISTS public.marketing_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic public.marketing_topic NOT NULL,
  opted_in_at timestamptz NOT NULL DEFAULT now(),
  opted_out_at timestamptz,
  source text NOT NULL DEFAULT 'signup_prefs',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic)
);
ALTER TABLE public.marketing_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own subscriptions"
  ON public.marketing_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "users insert own subscriptions"
  ON public.marketing_subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own subscriptions"
  ON public.marketing_subscriptions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own subscriptions"
  ON public.marketing_subscriptions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "admins read all subscriptions"
  ON public.marketing_subscriptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. saved_items (also doubles as coupon redemption tracker)
CREATE TABLE IF NOT EXISTS public.saved_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_type public.saved_item_type NOT NULL,
  item_id uuid NOT NULL,
  notes text,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_type, item_id)
);
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own saved items"
  ON public.saved_items FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins read all saved items"
  ON public.saved_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_saved_items_user ON public.saved_items(user_id, item_type);
CREATE INDEX IF NOT EXISTS idx_subscriber_profiles_town ON public.subscriber_profiles(home_town_id);

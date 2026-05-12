
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'realtor');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email_public text,
  phone text,
  headshot_url text,
  brokerage_name text,
  brokerage_logo_url text,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_town_id uuid REFERENCES public.towns(id) ON DELETE SET NULL,
  thank_you_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles publicly readable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Packets
CREATE TYPE public.packet_status AS ENUM ('draft', 'generated');

CREATE TABLE public.packets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  town_id uuid REFERENCES public.towns(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE,
  buyer_first_name text NOT NULL,
  buyer_last_name text,
  buyer_email text,
  address text NOT NULL,
  closing_date date,
  welcome_note text,
  has_kids boolean NOT NULL DEFAULT false,
  has_pets boolean NOT NULL DEFAULT false,
  interests text[] NOT NULL DEFAULT '{}',
  lifestyle_tags text[] NOT NULL DEFAULT '{}',
  home_photo_url text,
  status public.packet_status NOT NULL DEFAULT 'draft',
  pdf_url text,
  pdf_download_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX packets_realtor_idx ON public.packets(realtor_id);
ALTER TABLE public.packets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "packets publicly readable" ON public.packets FOR SELECT USING (true);
CREATE POLICY "realtors insert own packets" ON public.packets FOR INSERT TO authenticated WITH CHECK (auth.uid() = realtor_id);
CREATE POLICY "realtors update own packets" ON public.packets FOR UPDATE TO authenticated USING (auth.uid() = realtor_id) WITH CHECK (auth.uid() = realtor_id);
CREATE POLICY "realtors delete own packets" ON public.packets FOR DELETE TO authenticated USING (auth.uid() = realtor_id);
CREATE POLICY "admins manage packets" ON public.packets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER packets_touch BEFORE UPDATE ON public.packets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto profile + realtor role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email_public)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'realtor')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('headshots', 'headshots', true),
  ('brokerage-logos', 'brokerage-logos', true),
  ('home-photos', 'home-photos', true),
  ('packet-pdfs', 'packet-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (public read, owner-write per user folder)
CREATE POLICY "public read headshots" ON storage.objects FOR SELECT USING (bucket_id = 'headshots');
CREATE POLICY "users upload own headshots" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'headshots' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users update own headshots" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'headshots' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users delete own headshots" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'headshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "public read logos" ON storage.objects FOR SELECT USING (bucket_id = 'brokerage-logos');
CREATE POLICY "users upload own logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'brokerage-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users update own logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'brokerage-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users delete own logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'brokerage-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "public read home photos" ON storage.objects FOR SELECT USING (bucket_id = 'home-photos');
CREATE POLICY "users upload own home photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'home-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users update own home photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'home-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users delete own home photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'home-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "public read packet pdfs" ON storage.objects FOR SELECT USING (bucket_id = 'packet-pdfs');
CREATE POLICY "users upload own packet pdfs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'packet-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users update own packet pdfs" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'packet-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users delete own packet pdfs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'packet-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

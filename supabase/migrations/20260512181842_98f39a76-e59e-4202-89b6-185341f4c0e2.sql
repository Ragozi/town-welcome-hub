-- Enums
CREATE TYPE public.packet_event_type AS ENUM (
  'pdf_generated','pdf_downloaded','qr_scanned','landing_view',
  'business_click','referral_click','sponsor_click','share_click'
);

CREATE TYPE public.packet_event_source AS ENUM (
  'qr','direct','referral','search','unknown'
);

CREATE TYPE public.packet_event_device AS ENUM ('mobile','tablet','desktop','unknown');

-- Packets: archived_at for soft-archive
ALTER TABLE public.packets ADD COLUMN archived_at TIMESTAMPTZ;

-- Profiles: referral_slug
ALTER TABLE public.profiles ADD COLUMN referral_slug TEXT UNIQUE;

-- Backfill referral_slug for existing profiles using a short random suffix of user_id
UPDATE public.profiles
SET referral_slug = 'r-' || substr(replace(user_id::text,'-',''), 1, 8)
WHERE referral_slug IS NULL;

-- Events table
CREATE TABLE public.packet_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_id UUID REFERENCES public.packets(id) ON DELETE SET NULL,
  realtor_id UUID,
  town_id UUID REFERENCES public.towns(id) ON DELETE SET NULL,
  event_type public.packet_event_type NOT NULL,
  source public.packet_event_source NOT NULL DEFAULT 'unknown',
  utm JSONB NOT NULL DEFAULT '{}'::jsonb,
  referrer TEXT,
  user_agent TEXT,
  ip_country TEXT,
  ip_region TEXT,
  ip_city TEXT,
  device public.packet_event_device NOT NULL DEFAULT 'unknown',
  session_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_packet_events_packet ON public.packet_events(packet_id);
CREATE INDEX idx_packet_events_realtor ON public.packet_events(realtor_id);
CREATE INDEX idx_packet_events_town ON public.packet_events(town_id);
CREATE INDEX idx_packet_events_type_created ON public.packet_events(event_type, created_at DESC);
CREATE INDEX idx_packet_events_created ON public.packet_events(created_at DESC);
CREATE INDEX idx_packet_events_session ON public.packet_events(session_id);

ALTER TABLE public.packet_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (anonymous landing-page logging)
CREATE POLICY "anyone can insert packet_events"
  ON public.packet_events FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Admins can read everything
CREATE POLICY "admins read packet_events"
  ON public.packet_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Realtors read their own events
CREATE POLICY "realtors read own packet_events"
  ON public.packet_events FOR SELECT TO authenticated
  USING (realtor_id = auth.uid());

-- Daily aggregate view
CREATE VIEW public.packet_event_daily AS
SELECT
  date_trunc('day', created_at)::date AS day,
  event_type,
  realtor_id,
  town_id,
  source,
  device,
  count(*)::int AS count
FROM public.packet_events
GROUP BY 1,2,3,4,5,6;

-- Allow realtors/admins to read the view (RLS on base table still applies)
GRANT SELECT ON public.packet_event_daily TO anon, authenticated;
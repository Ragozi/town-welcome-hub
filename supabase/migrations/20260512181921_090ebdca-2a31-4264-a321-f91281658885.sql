-- Recreate view with security_invoker
DROP VIEW IF EXISTS public.packet_event_daily;
CREATE VIEW public.packet_event_daily
WITH (security_invoker = true) AS
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

GRANT SELECT ON public.packet_event_daily TO anon, authenticated;

-- Tighten the anon insert policy to only the public-page event types
DROP POLICY IF EXISTS "anyone can insert packet_events" ON public.packet_events;

CREATE POLICY "public can insert tracking events"
  ON public.packet_events FOR INSERT TO anon, authenticated
  WITH CHECK (
    event_type IN (
      'landing_view','qr_scanned','business_click',
      'referral_click','sponsor_click','share_click','pdf_downloaded'
    )
  );

-- Server-side admin client (service role) bypasses RLS for pdf_generated.

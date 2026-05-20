ALTER TABLE public.packets
  ADD COLUMN IF NOT EXISTS last_downloaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS recommendation_log jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE public.debug_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  function_name text NOT NULL,
  status text NOT NULL,
  message text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_id uuid,
  duration_ms integer
);

CREATE INDEX idx_debug_logs_created_at ON public.debug_logs (created_at DESC);
CREATE INDEX idx_debug_logs_event_type ON public.debug_logs (event_type);
CREATE INDEX idx_debug_logs_status ON public.debug_logs (status);

ALTER TABLE public.debug_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read debug logs"
  ON public.debug_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "admins delete debug logs"
  ON public.debug_logs FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

ALTER TABLE public.debug_logs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.debug_logs;

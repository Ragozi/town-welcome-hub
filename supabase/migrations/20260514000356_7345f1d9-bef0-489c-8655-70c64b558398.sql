
CREATE TABLE public.sponsor_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  town text,
  category text,
  tier_key text,
  website text,
  message text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sponsor_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a sponsor inquiry"
  ON public.sponsor_inquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view sponsor inquiries"
  ON public.sponsor_inquiries FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update sponsor inquiries"
  ON public.sponsor_inquiries FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete sponsor inquiries"
  ON public.sponsor_inquiries FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX sponsor_inquiries_created_at_idx ON public.sponsor_inquiries (created_at DESC);

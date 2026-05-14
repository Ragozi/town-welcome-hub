-- Sponsor subscriptions: track monthly recurring revenue from sponsors
CREATE TABLE public.sponsor_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL,
  contact_email TEXT,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  tier_key TEXT,
  monthly_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- active | paused | cancelled
  started_on DATE NOT NULL DEFAULT CURRENT_DATE,
  ended_on DATE,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sponsor_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage sponsor subscriptions"
  ON public.sponsor_subscriptions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER sponsor_subscriptions_touch
  BEFORE UPDATE ON public.sponsor_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Expenses: ad hoc and recurring business expenses
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL, -- domain | hosting | advertising | software | contractor | other
  vendor TEXT,
  description TEXT,
  amount NUMERIC(10,2) NOT NULL,
  occurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_interval TEXT, -- monthly | yearly | null
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage expenses"
  ON public.expenses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER expenses_touch
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_expenses_occurred_on ON public.expenses(occurred_on DESC);
CREATE INDEX idx_sponsor_subs_status ON public.sponsor_subscriptions(status);

-- Invite codes table
CREATE TABLE public.realtor_invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  note text,
  email_lock text,
  expires_at timestamptz,
  consumed_at timestamptz,
  consumed_by uuid,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_realtor_invite_codes_code ON public.realtor_invite_codes(code);

ALTER TABLE public.realtor_invite_codes ENABLE ROW LEVEL SECURITY;

-- Only admins manage codes from the client
CREATE POLICY "admins manage invite codes"
ON public.realtor_invite_codes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Public validation function (no table exposure)
CREATE OR REPLACE FUNCTION public.validate_invite_code(_code text, _email text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.realtor_invite_codes
    WHERE code = upper(trim(_code))
      AND consumed_at IS NULL
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
      AND (email_lock IS NULL OR lower(email_lock) = lower(coalesce(_email, '')))
  );
$$;

GRANT EXECUTE ON FUNCTION public.validate_invite_code(text, text) TO anon, authenticated;

-- Atomic consumption (called from trigger only)
CREATE OR REPLACE FUNCTION public.consume_invite_code(_code text, _user_id uuid, _email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.realtor_invite_codes%ROWTYPE;
BEGIN
  SELECT * INTO _row
  FROM public.realtor_invite_codes
  WHERE code = upper(trim(_code))
  FOR UPDATE;

  IF NOT FOUND THEN RETURN false; END IF;
  IF _row.consumed_at IS NOT NULL THEN RETURN false; END IF;
  IF _row.revoked_at IS NOT NULL THEN RETURN false; END IF;
  IF _row.expires_at IS NOT NULL AND _row.expires_at <= now() THEN RETURN false; END IF;
  IF _row.email_lock IS NOT NULL AND lower(_row.email_lock) <> lower(coalesce(_email, '')) THEN RETURN false; END IF;

  UPDATE public.realtor_invite_codes
  SET consumed_at = now(), consumed_by = _user_id
  WHERE id = _row.id;

  RETURN true;
END;
$$;

-- Updated handle_new_user: only assign realtor role if a valid invite code is consumed
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code text;
  _ok boolean;
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email_public)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email)
  ON CONFLICT (user_id) DO NOTHING;

  _code := NEW.raw_user_meta_data->>'invite_code';

  IF _code IS NOT NULL AND length(trim(_code)) > 0 THEN
    _ok := public.consume_invite_code(_code, NEW.id, NEW.email);
    IF NOT _ok THEN
      RAISE EXCEPTION 'Invalid or already-used invite code';
    END IF;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'realtor')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

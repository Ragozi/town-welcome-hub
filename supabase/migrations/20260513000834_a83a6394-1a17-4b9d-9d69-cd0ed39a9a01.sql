
CREATE OR REPLACE FUNCTION public.claim_invite_code(_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _ok boolean;
BEGIN
  IF _uid IS NULL THEN RETURN false; END IF;

  -- Refuse if user already has any role
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid) THEN
    RETURN false;
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _uid;

  _ok := public.consume_invite_code(_code, _uid, _email);
  IF NOT _ok THEN RETURN false; END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'realtor')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_invite_code(text) TO authenticated;

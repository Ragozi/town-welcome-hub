
-- Update functions that referenced the old enum literals.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _code text;
  _ok boolean;
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email_public)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email)
  ON CONFLICT (user_id) DO NOTHING;

  -- If this user was provisioned by an admin (invite_user_by_email),
  -- the assigned_role metadata key tells us what role to attach. We skip
  -- the realtor invite-code flow entirely in that case.
  IF NEW.raw_user_meta_data ? 'assigned_role' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, (NEW.raw_user_meta_data->>'assigned_role')::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN NEW;
  END IF;

  _code := NEW.raw_user_meta_data->>'invite_code';

  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RAISE EXCEPTION 'Signup requires a valid realtor invite code.';
  END IF;

  _ok := public.consume_invite_code(_code, NEW.id, NEW.email);
  IF NOT _ok THEN
    RAISE EXCEPTION 'Invalid or already-used invite code';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'realtor_agent')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_invite_code(_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _ok boolean;
BEGIN
  IF _uid IS NULL THEN RETURN false; END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid) THEN
    RETURN false;
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _uid;

  _ok := public.consume_invite_code(_code, _uid, _email);
  IF NOT _ok THEN RETURN false; END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'realtor_agent')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$function$;

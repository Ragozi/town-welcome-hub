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

  _code := NEW.raw_user_meta_data->>'invite_code';

  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RAISE EXCEPTION 'Signup requires a valid realtor invite code.';
  END IF;

  _ok := public.consume_invite_code(_code, NEW.id, NEW.email);
  IF NOT _ok THEN
    RAISE EXCEPTION 'Invalid or already-used invite code';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'realtor')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;
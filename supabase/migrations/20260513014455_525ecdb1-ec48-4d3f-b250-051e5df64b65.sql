
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

  IF _code IS NOT NULL AND length(trim(_code)) > 0 THEN
    _ok := public.consume_invite_code(_code, NEW.id, NEW.email);
    IF NOT _ok THEN
      RAISE EXCEPTION 'Invalid or already-used invite code';
    END IF;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'realtor')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Subscriber path: anyone signing up without an invite gets a consumer account
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'subscriber'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.subscriber_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

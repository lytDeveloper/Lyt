-- update_user_role가 기존 roles 배열을 유지하면서 새 역할을 병합하도록 개선
-- 규칙: fan 1개 + 비팬 1개(brand|artist|creative)만 허용

begin;

CREATE OR REPLACE FUNCTION public.update_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  incoming_roles text[] := ARRAY[]::text[];
  current_roles text[] := ARRAY[]::text[];
  result_roles text[] := ARRAY[]::text[];
  role text;
  has_fan boolean := false;
  nonfan_role text := NULL;
  incoming_nonfan text := NULL;
  fan_label constant text := 'fan';
  nonfan_labels constant text[] := ARRAY['brand', 'artist', 'creative'];
BEGIN
  IF TG_NARGS > 0 THEN
    BEGIN
      incoming_roles := COALESCE(TG_ARGV[0]::text[], ARRAY[]::text[]);
    EXCEPTION
      WHEN others THEN
        incoming_roles := ARRAY[TG_ARGV[0]];
    END;
  END IF;

  SELECT array_remove(COALESCE(roles, ARRAY[]::text[]), 'customer')
  INTO current_roles
  FROM public.profiles
  WHERE id = NEW.profile_id
  FOR UPDATE;

  has_fan := fan_label = ANY(current_roles);
  SELECT r INTO nonfan_role
  FROM unnest(current_roles) AS r
  WHERE r = ANY(nonfan_labels)
  LIMIT 1;

  IF array_length(incoming_roles, 1) IS NOT NULL THEN
    FOREACH role IN ARRAY incoming_roles LOOP
      IF role = fan_label THEN
        has_fan := true;
      ELSIF role = ANY(nonfan_labels) THEN
        incoming_nonfan := role;
      END IF;
    END LOOP;
  END IF;

  IF incoming_nonfan IS NOT NULL THEN
    nonfan_role := incoming_nonfan;
  END IF;

  IF has_fan THEN
    result_roles := result_roles || fan_label;
  END IF;

  IF nonfan_role IS NOT NULL THEN
    result_roles := result_roles || nonfan_role;
  END IF;

  UPDATE public.profiles
  SET roles = result_roles,
      updated_at = NOW()
  WHERE id = NEW.profile_id;

  RETURN NEW;
END;
$function$;

commit;


-- profiles.roles 컬럼 및 update_user_role 트리거 함수 개선
-- 1) role -> roles 컬럼명 변경 및 기본값/데이터 정리
-- 2) update_user_role 함수가 text[] 인자를 받아 배열 저장
-- 3) profile_* 트리거를 roles 배열 인자 기반으로 재정의

begin;

-- 1. role 컬럼을 roles로 변경 (이미 변경되었다면 스킵)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'roles'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN role TO roles;
  END IF;
END $$;

-- 1-1. 기본값 및 NULL 데이터 정리
ALTER TABLE public.profiles
  ALTER COLUMN roles SET DEFAULT ARRAY[]::text[];

UPDATE public.profiles
SET roles = COALESCE(roles, ARRAY[]::text[])
WHERE roles IS NULL;

-- 2. update_user_role 함수를 배열 기반으로 재정의
CREATE OR REPLACE FUNCTION public.update_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_roles text[] := ARRAY[]::text[];
BEGIN
  IF TG_NARGS > 0 THEN
    BEGIN
      v_roles := COALESCE(TG_ARGV[0]::text[], ARRAY[]::text[]);
    EXCEPTION
      WHEN others THEN
        -- 단일 문자열이 넘어온 경우에도 호환되도록 배열로 변환
        v_roles := ARRAY[TG_ARGV[0]];
    END;
  END IF;

  UPDATE public.profiles
  SET roles = v_roles,
      updated_at = NOW()
  WHERE id = NEW.profile_id;

  RETURN NEW;
END;
$function$;

-- 3. profile_* 트리거 갱신 (INSERT 시 roles 배열 지정)
DROP TRIGGER IF EXISTS trg_brand_profile_insert_set_role ON public.profile_brands;
CREATE TRIGGER trg_brand_profile_insert_set_role
AFTER INSERT ON public.profile_brands
FOR EACH ROW
EXECUTE FUNCTION public.update_user_role('{"brand"}');

DROP TRIGGER IF EXISTS trg_artist_profile_insert_set_role ON public.profile_artists;
CREATE TRIGGER trg_artist_profile_insert_set_role
AFTER INSERT ON public.profile_artists
FOR EACH ROW
EXECUTE FUNCTION public.update_user_role('{"artist"}');

DROP TRIGGER IF EXISTS trg_creative_profile_insert_set_role ON public.profile_creatives;
CREATE TRIGGER trg_creative_profile_insert_set_role
AFTER INSERT ON public.profile_creatives
FOR EACH ROW
EXECUTE FUNCTION public.update_user_role('{"creative"}');

DROP TRIGGER IF EXISTS trg_fan_profile_insert_set_role ON public.profile_fans;
CREATE TRIGGER trg_fan_profile_insert_set_role
AFTER INSERT ON public.profile_fans
FOR EACH ROW
EXECUTE FUNCTION public.update_user_role('{"fan"}');

commit;


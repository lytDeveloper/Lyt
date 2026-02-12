-- profiles.role을 text 배열로 변경 및 자동 업데이트 마이그레이션
-- 활성화된 프로필들의 role을 자동으로 profiles.role 배열에 저장

begin;

-- 1. profiles.role 컬럼을 text[]로 변경
-- 먼저 임시 컬럼을 만들어서 데이터를 변환
DO $$
BEGIN
  -- 임시 컬럼 생성 (이미 존재하면 스킵)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'role_temp'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN role_temp text[];
    
    -- 기존 role 값을 배열로 변환하여 임시 컬럼에 저장
    UPDATE public.profiles 
    SET role_temp = CASE 
      WHEN role IS NULL THEN ARRAY[]::text[]
      ELSE ARRAY[role::text]::text[]
    END;
    
    -- 기존 컬럼 삭제
    ALTER TABLE public.profiles DROP COLUMN role;
    
    -- 임시 컬럼을 role로 이름 변경
    ALTER TABLE public.profiles RENAME COLUMN role_temp TO role;
  END IF;
END $$;

-- 기본값 설정
ALTER TABLE public.profiles 
  ALTER COLUMN role SET DEFAULT ARRAY[]::text[];

-- 2. 활성화된 프로필들의 role을 계산하여 profiles.role을 업데이트하는 함수
CREATE OR REPLACE FUNCTION public.update_profiles_role(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_roles text[] := ARRAY[]::text[];
BEGIN
  -- 활성화된 팬 프로필 확인
  IF EXISTS (
    SELECT 1 FROM public.profile_fans 
    WHERE profile_id = p_user_id AND is_active = true
  ) THEN
    v_roles := array_append(v_roles, 'fan');
  END IF;

  -- 활성화된 브랜드 프로필 확인
  IF EXISTS (
    SELECT 1 FROM public.profile_brands 
    WHERE profile_id = p_user_id AND is_active = true
  ) THEN
    v_roles := array_append(v_roles, 'brand');
  END IF;

  -- 활성화된 아티스트 프로필 확인
  IF EXISTS (
    SELECT 1 FROM public.profile_artists 
    WHERE profile_id = p_user_id AND is_active = true
  ) THEN
    v_roles := array_append(v_roles, 'artist');
  END IF;

  -- 활성화된 크리에이티브 프로필 확인
  IF EXISTS (
    SELECT 1 FROM public.profile_creatives 
    WHERE profile_id = p_user_id AND is_active = true
  ) THEN
    v_roles := array_append(v_roles, 'creative');
  END IF;

  -- profiles 테이블 업데이트
  UPDATE public.profiles
  SET role = v_roles, updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

-- 3. 각 profile_* 테이블에 트리거 추가하여 is_active 변경 시 role 자동 업데이트

-- profile_fans 트리거
CREATE OR REPLACE FUNCTION public.trg_update_role_on_fan_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- is_active가 변경되었거나 새로 삽입된 경우
  IF (TG_OP = 'INSERT' AND COALESCE(NEW.is_active, true)) OR
     (TG_OP = 'UPDATE' AND (OLD.is_active IS DISTINCT FROM NEW.is_active)) THEN
    PERFORM public.update_profiles_role(NEW.profile_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_role_on_fan_change ON public.profile_fans;
CREATE TRIGGER trg_update_role_on_fan_change
  AFTER INSERT OR UPDATE OF is_active ON public.profile_fans
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_update_role_on_fan_change();

-- profile_brands 트리거
CREATE OR REPLACE FUNCTION public.trg_update_role_on_brand_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND COALESCE(NEW.is_active, true)) OR
     (TG_OP = 'UPDATE' AND (OLD.is_active IS DISTINCT FROM NEW.is_active)) THEN
    PERFORM public.update_profiles_role(NEW.profile_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_role_on_brand_change ON public.profile_brands;
CREATE TRIGGER trg_update_role_on_brand_change
  AFTER INSERT OR UPDATE OF is_active ON public.profile_brands
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_update_role_on_brand_change();

-- profile_artists 트리거
CREATE OR REPLACE FUNCTION public.trg_update_role_on_artist_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND COALESCE(NEW.is_active, true)) OR
     (TG_OP = 'UPDATE' AND (OLD.is_active IS DISTINCT FROM NEW.is_active)) THEN
    PERFORM public.update_profiles_role(NEW.profile_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_role_on_artist_change ON public.profile_artists;
CREATE TRIGGER trg_update_role_on_artist_change
  AFTER INSERT OR UPDATE OF is_active ON public.profile_artists
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_update_role_on_artist_change();

-- profile_creatives 트리거
CREATE OR REPLACE FUNCTION public.trg_update_role_on_creative_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND COALESCE(NEW.is_active, true)) OR
     (TG_OP = 'UPDATE' AND (OLD.is_active IS DISTINCT FROM NEW.is_active)) THEN
    PERFORM public.update_profiles_role(NEW.profile_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_role_on_creative_change ON public.profile_creatives;
CREATE TRIGGER trg_update_role_on_creative_change
  AFTER INSERT OR UPDATE OF is_active ON public.profile_creatives
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_update_role_on_creative_change();

-- 4. 기존 데이터에 대해 role 업데이트 (모든 사용자)
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  FOR v_user_id IN SELECT DISTINCT id FROM public.profiles LOOP
    PERFORM public.update_profiles_role(v_user_id);
  END LOOP;
END $$;

commit;

-- 완료 메시지
DO $$ 
BEGIN
  RAISE NOTICE 'profiles.role을 text[] 배열로 변경하고 자동 업데이트 트리거가 설정되었습니다.';
  RAISE NOTICE '활성화된 프로필들의 role이 자동으로 profiles.role 배열에 저장됩니다.';
END $$;


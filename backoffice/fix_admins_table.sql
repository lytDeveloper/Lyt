-- ============================================
-- admins 테이블 수정 스크립트
-- ============================================

-- 1. user_id 컬럼이 없는 경우 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'admins' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.admins 
    ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'user_id 컬럼이 추가되었습니다.';
  ELSE
    RAISE NOTICE 'user_id 컬럼이 이미 존재합니다.';
  END IF;
END $$;

-- 2. 기존 admins 레코드의 user_id 업데이트 (이메일 기준으로 auth.users에서 찾기)
UPDATE public.admins a
SET user_id = (
  SELECT id 
  FROM auth.users 
  WHERE email = a.email 
  LIMIT 1
)
WHERE user_id IS NULL;

-- 3. user_id가 NULL인 레코드가 있는지 확인
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM public.admins
  WHERE user_id IS NULL;
  
  IF null_count > 0 THEN
    RAISE WARNING 'user_id가 NULL인 레코드가 %개 있습니다. 수동으로 업데이트가 필요합니다.', null_count;
    
    -- NULL인 레코드 정보 출력
    RAISE NOTICE '=== user_id가 NULL인 레코드 목록 ===';
    FOR rec IN 
      SELECT id, email, role 
      FROM public.admins 
      WHERE user_id IS NULL
    LOOP
      RAISE NOTICE 'ID: %, Email: %, Role: %', rec.id, rec.email, rec.role;
    END LOOP;
  ELSE
    RAISE NOTICE '모든 레코드의 user_id가 정상적으로 업데이트되었습니다.';
  END IF;
END $$;

-- 4. user_id NOT NULL 제약조건 추가 (모든 값이 채워진 후)
DO $$ 
BEGIN
  -- 먼저 NOT NULL 제약조건이 있는지 확인
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_schema = 'public' 
      AND tc.table_name = 'admins'
      AND ccu.column_name = 'user_id'
      AND tc.constraint_type = 'NOT NULL'
  ) THEN
    -- NULL 값이 없으면 NOT NULL 제약조건 추가
    IF NOT EXISTS (SELECT 1 FROM public.admins WHERE user_id IS NULL) THEN
      ALTER TABLE public.admins 
      ALTER COLUMN user_id SET NOT NULL;
      
      RAISE NOTICE 'user_id 컬럼에 NOT NULL 제약조건이 추가되었습니다.';
    ELSE
      RAISE WARNING 'NULL 값이 있어서 NOT NULL 제약조건을 추가할 수 없습니다.';
    END IF;
  END IF;
END $$;

-- 5. 최종 확인
SELECT 
  id,
  user_id,
  email,
  role,
  CASE 
    WHEN user_id IS NULL THEN '❌ user_id 없음'
    ELSE '✅ 정상'
  END as status
FROM public.admins
ORDER BY created_at DESC;


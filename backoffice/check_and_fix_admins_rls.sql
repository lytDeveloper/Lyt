-- ============================================
-- admins 테이블 RLS 정책 확인 및 수정 스크립트
-- ============================================

-- 1. 현재 RLS 상태 확인
SELECT 
  tablename,
  rowsecurity as "RLS 활성화 여부"
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'admins';

-- 2. 현재 RLS 정책 목록 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'admins';

-- 3. RLS가 활성화되어 있고 정책이 없는 경우, 정책 생성
-- 관리자는 자신의 레코드 또는 모든 레코드를 읽을 수 있어야 함

-- 옵션 1: 모든 인증된 사용자가 admins 테이블을 읽을 수 있도록 (백오피스용)
-- 주의: 이 정책은 모든 인증된 사용자가 admins 테이블을 읽을 수 있게 합니다.
-- 보안이 중요한 경우 옵션 2를 사용하세요.

DO $$
BEGIN
  -- RLS가 활성화되어 있는지 확인
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename = 'admins' 
      AND rowsecurity = true
  ) THEN
    -- SELECT 정책이 없으면 생성
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'admins' 
        AND cmd = 'SELECT'
    ) THEN
      -- 모든 인증된 사용자가 admins 테이블을 읽을 수 있도록 정책 생성
      CREATE POLICY "Allow authenticated users to read admins"
        ON public.admins
        FOR SELECT
        TO authenticated
        USING (true);
      
      RAISE NOTICE 'SELECT 정책이 생성되었습니다.';
    ELSE
      RAISE NOTICE 'SELECT 정책이 이미 존재합니다.';
    END IF;
    
    -- INSERT 정책 (필요한 경우)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'admins' 
        AND cmd = 'INSERT'
    ) THEN
      CREATE POLICY "Allow authenticated users to insert admins"
        ON public.admins
        FOR INSERT
        TO authenticated
        WITH CHECK (true);
      
      RAISE NOTICE 'INSERT 정책이 생성되었습니다.';
    END IF;
    
    -- UPDATE 정책 (필요한 경우)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'admins' 
        AND cmd = 'UPDATE'
    ) THEN
      CREATE POLICY "Allow authenticated users to update admins"
        ON public.admins
        FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true);
      
      RAISE NOTICE 'UPDATE 정책이 생성되었습니다.';
    END IF;
    
    -- DELETE 정책 (필요한 경우)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'admins' 
        AND cmd = 'DELETE'
    ) THEN
      CREATE POLICY "Allow authenticated users to delete admins"
        ON public.admins
        FOR DELETE
        TO authenticated
        USING (true);
      
      RAISE NOTICE 'DELETE 정책이 생성되었습니다.';
    END IF;
  ELSE
    RAISE NOTICE 'RLS가 활성화되어 있지 않습니다. RLS를 활성화하려면 다음 명령을 실행하세요:';
    RAISE NOTICE 'ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;';
  END IF;
END $$;

-- 옵션 2: 자신의 user_id와 일치하는 레코드만 읽을 수 있도록 (더 안전한 방법)
-- 주의: 옵션 1을 실행했다면 먼저 삭제하고 이 정책을 적용하세요.

/*
-- 기존 정책 삭제 (필요한 경우)
DROP POLICY IF EXISTS "Allow authenticated users to read admins" ON public.admins;

-- 자신의 user_id와 일치하는 레코드만 읽을 수 있도록 정책 생성
CREATE POLICY "Users can read their own admin record"
  ON public.admins
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
*/

-- 4. 최종 확인
SELECT 
  'RLS 상태' as check_type,
  CASE 
    WHEN rowsecurity THEN '✅ 활성화됨'
    ELSE '❌ 비활성화됨'
  END as status
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'admins';

SELECT 
  '정책 개수' as check_type,
  COUNT(*)::text || '개' as status
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'admins';

-- 5. 테스트 쿼리 (인증된 사용자로 실행)
-- SELECT * FROM public.admins WHERE user_id = auth.uid();


-- ============================================
-- 사용자 제재 및 관리자 권한 시스템 마이그레이션
-- ============================================

-- 1. public.profiles 테이블에 컬럼 추가
-- ============================================

-- last_access 컬럼 추가 (최근 접속일)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'last_access'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN last_access TIMESTAMPTZ;
    
    RAISE NOTICE 'last_access 컬럼이 추가되었습니다.';
  ELSE
    RAISE NOTICE 'last_access 컬럼이 이미 존재합니다.';
  END IF;
END $$;

-- banned_until 컬럼 추가 (제재 만료일)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'banned_until'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN banned_until TIMESTAMPTZ;
    
    RAISE NOTICE 'banned_until 컬럼이 추가되었습니다.';
  ELSE
    RAISE NOTICE 'banned_until 컬럼이 이미 존재합니다.';
  END IF;
END $$;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_profiles_last_access ON public.profiles(last_access);
CREATE INDEX IF NOT EXISTS idx_profiles_banned_until ON public.profiles(banned_until);

-- ============================================
-- 2. public.admins 테이블에 permissions 컬럼 추가
-- ============================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'admins' 
    AND column_name = 'permissions'
  ) THEN
    ALTER TABLE public.admins 
    ADD COLUMN permissions TEXT[] DEFAULT ARRAY[]::TEXT[];
    
    RAISE NOTICE 'permissions 컬럼이 추가되었습니다.';
  ELSE
    RAISE NOTICE 'permissions 컬럼이 이미 존재합니다.';
  END IF;
END $$;

-- 기존 관리자들에게 기본 권한 부여 (슈퍼 관리자는 모든 권한)
DO $$
BEGIN
  -- 슈퍼 관리자에게 모든 권한 부여
  UPDATE public.admins
  SET permissions = ARRAY[
    'user_management',
    'content_management',
    'statistics_view',
    'approval_management',
    'admin_management',
    'system_settings',
    'log_view'
  ]
  WHERE role = 'super_admin' AND (permissions IS NULL OR array_length(permissions, 1) IS NULL);
  
  -- 일반 관리자에게 기본 권한 부여
  UPDATE public.admins
  SET permissions = ARRAY[
    'user_management',
    'statistics_view',
    'approval_management'
  ]
  WHERE role = 'admin' AND (permissions IS NULL OR array_length(permissions, 1) IS NULL);
  
  RAISE NOTICE '기존 관리자들에게 기본 권한이 부여되었습니다.';
END $$;

-- ============================================
-- 3. admin_activity_logs 테이블 생성
-- ============================================

CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.admins(id) ON DELETE CASCADE,
  target_admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_id ON public.admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_target_admin_id ON public.admin_activity_logs(target_admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at ON public.admin_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_action ON public.admin_activity_logs(action);

-- RLS 활성화
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- 관리자는 자신의 활동 로그 조회 가능
CREATE POLICY "Admins can view their own activity logs"
ON public.admin_activity_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = auth.uid()
  )
);

-- 관리자는 활동 로그 생성 가능
CREATE POLICY "Admins can insert activity logs"
ON public.admin_activity_logs FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = auth.uid()
  )
);

-- ============================================
-- 4. profiles 테이블 업데이트 권한 (관리자가 제재할 수 있도록)
-- ============================================

-- 관리자는 profiles 테이블의 banned_until 업데이트 가능
CREATE POLICY "Admins can update profiles banned_until"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = auth.uid()
    AND 'user_management' = ANY(permissions)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = auth.uid()
    AND 'user_management' = ANY(permissions)
  )
);

-- ============================================
-- 완료 메시지
-- ============================================
DO $$ 
BEGIN
  RAISE NOTICE '사용자 제재 및 관리자 권한 시스템 마이그레이션이 완료되었습니다.';
  RAISE NOTICE '변경 사항:';
  RAISE NOTICE '  - public.profiles에 last_access, banned_until 컬럼 추가';
  RAISE NOTICE '  - public.admins에 permissions 컬럼 추가';
  RAISE NOTICE '  - admin_activity_logs 테이블 생성';
END $$;


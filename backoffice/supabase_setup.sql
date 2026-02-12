-- ============================================
-- 백오피스 데이터베이스 설정 스크립트
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;



-- 1. 관리자 테이블 생성
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 관리자 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON public.admins(user_id);
CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins(email);

-- 관리자 테이블 업데이트 트리거        @@@@@@@@@@@@@@@@@@@@@추후 
CREATE TRIGGER update_admins_updated_at
BEFORE UPDATE ON public.admins
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 관리자 테이블 RLS 활성화
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 관리자만 조회 가능
CREATE POLICY "Admins can view all admins"
ON public.admins FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = auth.uid()
  )
);

-- 슈퍼 관리자만 추가 가능
CREATE POLICY "Super admins can insert admins"
ON public.admins FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- 슈퍼 관리자만 업데이트 가능
CREATE POLICY "Super admins can update admins"
ON public.admins FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- 슈퍼 관리자만 삭제 가능
CREATE POLICY "Super admins can delete admins"
ON public.admins FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- ============================================
-- 2. profile_brands 테이블에 승인 상태 추가 (브랜드만 승인 절차 적용)
-- ============================================

-- approval_status 컬럼 추가 (이미 존재하면 에러 무시)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profile_brands' 
    AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE public.profile_brands 
    ADD COLUMN approval_status TEXT DEFAULT 'pending' 
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- approved_at 컬럼 추가 (승인/거절 날짜)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profile_brands' 
    AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE public.profile_brands 
    ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;
END $$;

-- approved_by 컬럼 추가 (승인한 관리자 ID)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profile_brands' 
    AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE public.profile_brands 
    ADD COLUMN approved_by UUID REFERENCES public.admins(id);
  END IF;
END $$;

-- 승인 상태 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_profile_brands_approval_status 
ON public.profile_brands(approval_status);

-- ============================================
-- 3. profile_creatives / profile_fans 승인 컬럼 제거 보정 (과거 스키마 호환)
-- ============================================

-- 과거에 존재했을 수 있는 컬럼들을 안전하게 드롭 (이미 없으면 무시)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profile_creatives'
      AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE public.profile_creatives DROP COLUMN approval_status;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profile_creatives'
      AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE public.profile_creatives DROP COLUMN approved_at;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profile_creatives'
      AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE public.profile_creatives DROP COLUMN approved_by;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profile_fans'
      AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE public.profile_fans DROP COLUMN approval_status;
  END IF;
END $$;

-- ============================================
-- 4. 관리자용 뷰 생성 (모든 프로필 조회용)
-- ============================================

-- auth.users.email을 가져오는 함수 생성
CREATE OR REPLACE FUNCTION get_auth_email(user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT email FROM auth.users WHERE id = user_id;
$$;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION get_auth_email(UUID) TO authenticated;

-- 모든 사용자 통합 뷰
CREATE OR REPLACE VIEW public.admin_all_users AS
SELECT 
  'artist' as user_type,
  pa.profile_id,
  pa.artist_name as display_name,
  pa.activity_field as category,
  pa.created_at,
  'approved' as approval_status,
  get_auth_email(pa.profile_id) as email
FROM public.profile_artists pa

UNION ALL

SELECT 
  'brand' as user_type,
  pb.profile_id,
  pb.brand_name as display_name,
  COALESCE(pb.activity_field, pb.category) as category,
  pb.created_at,
  pb.approval_status as approval_status,
  get_auth_email(pb.profile_id) as email
FROM public.profile_brands pb

UNION ALL

SELECT 
  'creative' as user_type,
  pc.profile_id,
  pc.nickname as display_name,
  NULL as category,
  pc.created_at,
  'approved' as approval_status,
  get_auth_email(pc.profile_id) as email
FROM public.profile_creatives pc

UNION ALL

SELECT 
  'fan' as user_type,
  pf.profile_id,
  pp.nickname as display_name,
  NULL as category,
  pf.created_at,
  'approved' as approval_status,
  get_auth_email(pf.profile_id) as email
FROM public.profile_fans pf
JOIN public.profiles pp ON pf.profile_id = pp.id;

GRANT SELECT ON public.admin_all_users TO authenticated;

-- 참고: PostgreSQL에서는 RLS를 VIEW에 직접 적용할 수 없습니다.
-- 접근 제어는 기초 테이블의 RLS로 보장되며,
-- 이미 profile_* 테이블에 "Admins can view ..." 정책을 정의했습니다.

-- ============================================
-- 5. 관리자 RLS 우회 정책 (모든 프로필 테이블)
-- ============================================

-- 관리자는 모든 아티스트 조회 가능
CREATE POLICY "Admins can view all artists"
ON public.profile_artists FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = auth.uid()
  )
);

-- 관리자는 모든 브랜드 조회 가능
CREATE POLICY "Admins can view all brands"
ON public.profile_brands FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = auth.uid()
  )
);

-- 관리자는 모든 크리에이티브 조회 가능
CREATE POLICY "Admins can view all creatives"
ON public.profile_creatives FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = auth.uid()
  )
);

-- 관리자는 브랜드 승인 상태 업데이트 가능
CREATE POLICY "Admins can update brand approval status"
ON public.profile_brands FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = auth.uid()
  )
);

-- 관리자는 모든 팬 조회 가능
CREATE POLICY "Admins can view all fans"
ON public.profile_fans FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = auth.uid()
  )
);

-- ============================================
-- 완료 메시지
-- ============================================
DO $$ 
BEGIN
  RAISE NOTICE '백오피스 데이터베이스 설정이 완료되었습니다.';
  RAISE NOTICE '다음 단계: admins 테이블에 관리자 계정을 추가하세요.';
  RAISE NOTICE 'INSERT INTO public.admins (user_id, email, role) VALUES (''your-user-id'', ''admin@example.com'', ''super_admin'');';
END $$;


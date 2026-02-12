-- 관리자 프로필 삭제 RLS 정책 마이그레이션
-- 관리자가 profile_artists, profile_brands, profile_creatives, profile_fans 테이블에서 프로필을 삭제할 수 있도록 함

-- ============================================
-- 1. profile_artists DELETE 정책
-- ============================================

-- 기존 정책이 있으면 삭제
DROP POLICY IF EXISTS "Admins can delete artists" ON public.profile_artists;

-- 관리자는 아티스트 프로필 삭제 가능
CREATE POLICY "Admins can delete artists"
ON public.profile_artists FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE profile_id = auth.uid()
    AND ('user_management' = ANY(permissions) OR role = 'super_admin')
  )
);

-- ============================================
-- 2. profile_brands DELETE 정책
-- ============================================

-- 기존 정책이 있으면 삭제
DROP POLICY IF EXISTS "Admins can delete brands" ON public.profile_brands;

-- 관리자는 브랜드 프로필 삭제 가능
CREATE POLICY "Admins can delete brands"
ON public.profile_brands FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE profile_id = auth.uid()
    AND ('user_management' = ANY(permissions) OR role = 'super_admin')
  )
);

-- ============================================
-- 3. profile_creatives DELETE 정책
-- ============================================

-- 기존 정책이 있으면 삭제
DROP POLICY IF EXISTS "Admins can delete creatives" ON public.profile_creatives;

-- 관리자는 크리에이티브 프로필 삭제 가능
CREATE POLICY "Admins can delete creatives"
ON public.profile_creatives FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE profile_id = auth.uid()
    AND ('user_management' = ANY(permissions) OR role = 'super_admin')
  )
);

-- ============================================
-- 4. profile_fans DELETE 정책
-- ============================================

-- 기존 정책이 있으면 삭제
DROP POLICY IF EXISTS "Admins can delete fans" ON public.profile_fans;

-- 관리자는 팬 프로필 삭제 가능
CREATE POLICY "Admins can delete fans"
ON public.profile_fans FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE profile_id = auth.uid()
    AND ('user_management' = ANY(permissions) OR role = 'super_admin')
  )
);

-- ============================================
-- 5. profiles 테이블 DELETE 정책 (필요한 경우)
-- ============================================

-- 주의: profiles 테이블은 일반적으로 삭제하지 않습니다.
-- 프로필 삭제는 profile_* 테이블에서만 수행하고, profiles.roles만 업데이트합니다.
-- 하지만 혹시 모를 상황을 대비해 정책을 추가할 수 있습니다.

-- 관리자는 profiles 테이블 업데이트 가능 (roles 업데이트용)
-- 이미 user_ban_and_admin_permissions_migration.sql에 UPDATE 정책이 있으므로
-- 여기서는 DELETE 정책만 필요시 추가

-- ============================================
-- 완료 메시지
-- ============================================
DO $$ 
BEGIN
  RAISE NOTICE '관리자 프로필 삭제 RLS 정책 마이그레이션이 완료되었습니다.';
  RAISE NOTICE '관리자는 이제 profile_artists, profile_brands, profile_creatives, profile_fans 테이블에서 프로필을 삭제할 수 있습니다.';
END $$;


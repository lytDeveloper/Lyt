-- ============================================
-- inquiries 테이블 RLS 정책 수정: super_admin 역할 허용
-- ============================================
-- 문제: inquiries 테이블의 UPDATE/SELECT 정책이 inquiry_management 권한만 체크하여
--      super_admin 역할을 가진 관리자가 문의를 업데이트할 수 없었음
-- 해결: RLS 정책에 super_admin 역할 체크 추가
-- ============================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Admins can update inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Admins can view all inquiries" ON public.inquiries;

-- 수정된 정책 생성: super_admin 역할 또는 inquiry_management 권한 체크
CREATE POLICY "Admins can view all inquiries"
ON public.inquiries FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE profile_id = auth.uid()
    AND (
      'inquiry_management' = ANY(permissions)
      OR role = 'super_admin'
    )
  )
);

CREATE POLICY "Admins can update inquiries"
ON public.inquiries FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE profile_id = auth.uid()
    AND (
      'inquiry_management' = ANY(permissions)
      OR role = 'super_admin'
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE profile_id = auth.uid()
    AND (
      'inquiry_management' = ANY(permissions)
      OR role = 'super_admin'
    )
  )
);

-- 완료 메시지
DO $$ 
BEGIN
  RAISE NOTICE 'inquiries 테이블 RLS 정책이 수정되었습니다.';
  RAISE NOTICE '변경 사항:';
  RAISE NOTICE '  - super_admin 역할을 가진 관리자도 문의 조회 및 업데이트 가능';
  RAISE NOTICE '  - inquiry_management 권한 또는 super_admin 역할 체크';
END $$;

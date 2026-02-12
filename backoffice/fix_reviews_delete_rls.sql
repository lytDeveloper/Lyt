-- 리뷰 삭제 RLS 정책 수정
-- 24시간 제한을 제거하여 사용자가 자신이 작성한 리뷰를 언제든지 삭제할 수 있도록 함

-- ============================================
-- 1. 기존 DELETE 정책 삭제
-- ============================================
DROP POLICY IF EXISTS "Users can delete own reviews" ON public.reviews;

-- ============================================
-- 2. 새로운 DELETE 정책 생성 (24시간 제한 제거)
-- ============================================
CREATE POLICY "Users can delete own reviews"
ON public.reviews
FOR DELETE
TO public
USING (auth.uid() = reviewer_id);

-- ============================================
-- 3. UPDATE 정책도 확인 (24시간 제한이 있지만, 이는 유지)
-- ============================================
-- UPDATE 정책은 24시간 제한을 유지하는 것이 일반적이므로 그대로 둡니다.
-- 필요시 아래 주석을 해제하여 수정할 수 있습니다:

-- DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
-- CREATE POLICY "Users can update own reviews"
-- ON public.reviews
-- FOR UPDATE
-- TO public
-- USING (auth.uid() = reviewer_id)
-- WITH CHECK (auth.uid() = reviewer_id);



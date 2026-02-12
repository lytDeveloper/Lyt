-- =====================================================
-- user_activities RLS 정책 수정
-- 배지 획득 등 활동 기록 시 403 에러 해결
-- =====================================================

-- 기존 삽입 정책 모두 삭제
DROP POLICY IF EXISTS "Users can insert own activities" ON user_activities;
DROP POLICY IF EXISTS "Service role can insert activities" ON user_activities;
DROP POLICY IF EXISTS "Anyone can insert activities" ON user_activities;
DROP POLICY IF EXISTS "Authenticated users can insert activities" ON user_activities;

-- 새로운 통합 삽입 정책: 인증된 사용자는 자신의 활동을 기록할 수 있음
-- 또한 다른 사용자에게 활동을 기록해야 하는 경우도 허용 (예: 댓글 알림, 팔로우 알림 등)
CREATE POLICY "Authenticated users can insert activities" ON user_activities
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 추가: 자신의 활동 또는 자신이 생성한 활동을 허용하는 더 명확한 정책
-- 이 정책은 위 정책과 OR 조건으로 작동하므로, 하나만 만족해도 삽입 가능
-- 주석 처리: 위의 정책으로 충분함
-- CREATE POLICY "Users can insert own activities v2" ON user_activities
--   FOR INSERT WITH CHECK (auth.uid() = user_id);

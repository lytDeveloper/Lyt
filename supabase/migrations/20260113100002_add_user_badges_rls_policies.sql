-- =====================================================
-- user_badges 테이블 RLS 정책 추가
-- 배지 자동 부여 시스템을 위한 RLS 정책
-- =====================================================

-- 기존 정책이 있으면 삭제 (안전하게)
DROP POLICY IF EXISTS "Users can view own badges" ON user_badges;
DROP POLICY IF EXISTS "Users can view any badges" ON user_badges;
DROP POLICY IF EXISTS "Users can insert own badges" ON user_badges;
DROP POLICY IF EXISTS "Service can insert badges" ON user_badges;

-- 1. 모든 사용자의 배지를 조회할 수 있음 (프로필 페이지에서 다른 사용자 배지 표시)
CREATE POLICY "Users can view any badges" ON user_badges
  FOR SELECT USING (true);

-- 2. 자신의 배지만 삽입 가능
CREATE POLICY "Users can insert own badges" ON user_badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. 서비스에서 배지 삽입 가능 (다른 사용자에게 배지 부여 시 필요)
-- 이 정책은 인증된 사용자가 다른 사용자에게 배지를 부여할 수 있게 함
-- 실제 비즈니스 로직은 서비스 레이어에서 제어
CREATE POLICY "Service can insert badges" ON user_badges
  FOR INSERT WITH CHECK (true);

-- 4. 자신의 배지 삭제 가능 (필요시)
CREATE POLICY "Users can delete own badges" ON user_badges
  FOR DELETE USING (auth.uid() = user_id);


-- =====================================================
-- badges 테이블 RLS 확인 및 추가
-- =====================================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Anyone can view badges" ON badges;

-- 모든 사용자가 배지 목록 조회 가능
CREATE POLICY "Anyone can view badges" ON badges
  FOR SELECT USING (true);


-- =====================================================
-- user_activities에 대한 추가 정책
-- 다른 사용자의 활동을 기록할 수 있도록 (예: 댓글 알림)
-- =====================================================

-- 기존 "Service role can insert activities" 정책 이름이 혼동을 줄 수 있으므로
-- 명확한 이름으로 변경
DROP POLICY IF EXISTS "Service role can insert activities" ON user_activities;
DROP POLICY IF EXISTS "Anyone can insert activities" ON user_activities;

-- 인증된 사용자는 누구에게나 활동 기록 생성 가능
-- (비즈니스 로직은 서비스 레이어에서 제어)
CREATE POLICY "Authenticated users can insert activities" ON user_activities
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);


-- =====================================================
-- lounge_comments 카운트용 함수 (소통왕 배지 체크용)
-- =====================================================
CREATE OR REPLACE FUNCTION count_user_comments(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM lounge_comments
    WHERE author_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

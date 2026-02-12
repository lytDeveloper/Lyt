-- ============================================================================
-- 연결 메이커 배지 RLS 우회 RPC 함수
-- 문제: checkLinkMakerBadge에서 receiver의 auth context로 sender의 다른 요청 조회 불가
-- 해결: SECURITY DEFINER RPC 함수로 RLS 우회
-- ============================================================================

-- 특정 사용자가 보낸 대화 요청 중 accepted 상태인 고유 수신자 수 반환
CREATE OR REPLACE FUNCTION get_accepted_talk_request_count(p_sender_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT receiver_id)
  INTO v_count
  FROM talk_requests
  WHERE sender_id = p_sender_id
    AND status = 'accepted';
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 인증된 사용자에게 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION get_accepted_talk_request_count(UUID) TO authenticated;

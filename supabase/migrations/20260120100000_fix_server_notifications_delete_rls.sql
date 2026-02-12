-- ============================================
-- server_notifications 삭제 RLS 문제 해결
-- ============================================
-- 문제: DELETE 요청이 204를 반환하지만 실제로 삭제되지 않음
--      RLS 정책이 직접 DELETE를 차단하고 있음
-- 해결: SECURITY DEFINER RPC 함수로 관리자 확인 후 삭제
-- ============================================

-- 관리자용 server_notifications 삭제 함수
CREATE OR REPLACE FUNCTION delete_server_notification_for_admin(
  p_notification_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN := FALSE;
  v_deleted_count INTEGER;
BEGIN
  -- 현재 사용자 확인
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- 관리자 권한 확인 (super_admin 또는 notification_management 권한)
  SELECT EXISTS (
    SELECT 1 FROM admins
    WHERE profile_id = v_user_id
    AND (
      role = 'super_admin'
      OR role = 'admin'
      OR 'notification_management' = ANY(permissions)
    )
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient permissions'
    );
  END IF;

  -- 알림 삭제
  DELETE FROM server_notifications
  WHERE id = p_notification_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Notification not found'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count
  );
END;
$$;

-- 함수 권한 설정
GRANT EXECUTE ON FUNCTION delete_server_notification_for_admin(UUID) TO authenticated;

-- 함수 설명
COMMENT ON FUNCTION delete_server_notification_for_admin IS
'관리자가 server_notifications를 삭제하기 위한 RPC 함수. SECURITY DEFINER로 RLS를 우회합니다.';

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE 'server_notifications 삭제 RPC 함수가 생성되었습니다.';
  RAISE NOTICE '사용법: SELECT delete_server_notification_for_admin(notification_id)';
END $$;

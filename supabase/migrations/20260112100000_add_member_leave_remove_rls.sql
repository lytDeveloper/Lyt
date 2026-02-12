-- ============================================================================
-- Migration: 프로젝트/협업 멤버 나가기 및 추방 RLS 정책
-- 날짜: 2026-01-12
-- 목적: 멤버 본인의 나가기(status='left')와 리더의 추방(status='removed') 허용
-- ============================================================================

-- ============================================================================
-- user_notifications 타입 제약 조건 업데이트 (member_removed 추가)
-- ============================================================================

ALTER TABLE user_notifications DROP CONSTRAINT IF EXISTS user_notifications_type_check;
ALTER TABLE user_notifications ADD CONSTRAINT user_notifications_type_check CHECK (
  type = ANY (ARRAY[
    'proposal'::text, 'invitation'::text, 'message'::text, 'deadline'::text,
    'application'::text, 'status_change'::text, 'withdrawal'::text, 'follow'::text,
    'like'::text, 'partnership_inquiry'::text, 'proposal_accepted'::text,
    'proposal_rejected'::text, 'application_accepted'::text, 'application_rejected'::text,
    'talk_request'::text, 'talk_request_accepted'::text, 'talk_request_rejected'::text,
    'question'::text, 'answer'::text,  -- Q&A 알림 타입
    'member_removed'::text  -- 멤버 추방 알림 타입 추가
  ])
);

-- ============================================================================
-- kick_chat_participant_by_entity - 프로젝트/협업 리더가 멤버를 채팅방에서 제거
-- 프로젝트/협업 리더 권한으로 채팅방에서 멤버 제거 가능
-- ============================================================================

CREATE OR REPLACE FUNCTION public.kick_chat_participant_by_entity(
  p_entity_type text,
  p_entity_id uuid,
  p_target_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_room_id uuid;
  v_is_leader boolean := false;
BEGIN
  -- 프로젝트/협업 리더인지 확인
  IF p_entity_type = 'project' THEN
    SELECT EXISTS(
      SELECT 1 FROM project_members
      WHERE project_id = p_entity_id
      AND user_id = auth.uid()
      AND is_leader = true
      AND status = 'active'
    ) INTO v_is_leader;

    -- 채팅방 ID 조회
    SELECT id INTO v_room_id FROM chat_rooms
    WHERE project_id = p_entity_id LIMIT 1;

  ELSIF p_entity_type = 'collaboration' THEN
    SELECT EXISTS(
      SELECT 1 FROM collaboration_members
      WHERE collaboration_id = p_entity_id
      AND user_id = auth.uid()
      AND is_leader = true
      AND status = 'active'
    ) INTO v_is_leader;

    -- 채팅방 ID 조회
    SELECT id INTO v_room_id FROM chat_rooms
    WHERE collaboration_id = p_entity_id LIMIT 1;
  END IF;

  IF NOT v_is_leader THEN
    RAISE EXCEPTION '권한 없음';
  END IF;

  IF v_room_id IS NULL THEN
    -- 채팅방이 없으면 그냥 리턴
    RETURN;
  END IF;

  -- 채팅방에서 참여자 제거
  DELETE FROM chat_participants
  WHERE room_id = v_room_id AND user_id = p_target_user_id;
END;
$function$;

-- 함수 권한 부여
GRANT EXECUTE ON FUNCTION public.kick_chat_participant_by_entity(text, uuid, uuid) TO authenticated;

-- ============================================================================
-- project_members 테이블 RLS 정책
-- ============================================================================

-- 기존 UPDATE 정책이 있다면 삭제
DROP POLICY IF EXISTS "project_members_update_self" ON project_members;
DROP POLICY IF EXISTS "project_members_update_leader" ON project_members;

-- 본인 나가기 정책: 본인의 멤버십을 'left' 상태로 변경 가능
CREATE POLICY "project_members_update_self"
ON project_members
FOR UPDATE
USING (
  user_id = auth.uid()
  AND status = 'active'
)
WITH CHECK (
  user_id = auth.uid()
  AND (status = 'left' OR status = 'active')
);

-- 리더의 멤버 관리 정책: 리더는 다른 멤버의 상태를 변경하거나 리더 권한을 이전할 수 있음
CREATE POLICY "project_members_update_leader"
ON project_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_members.project_id
    AND pm.user_id = auth.uid()
    AND pm.is_leader = true
    AND pm.status = 'active'
  )
)
WITH CHECK (
  -- 리더는 모든 멤버의 상태를 변경할 수 있음
  status IN ('active', 'inactive', 'left', 'removed')
);

-- ============================================================================
-- collaboration_members 테이블 RLS 정책
-- ============================================================================

-- 기존 UPDATE 정책이 있다면 삭제
DROP POLICY IF EXISTS "collaboration_members_update_self" ON collaboration_members;
DROP POLICY IF EXISTS "collaboration_members_update_leader" ON collaboration_members;

-- 본인 나가기 정책: 본인의 멤버십을 'left' 상태로 변경 가능
CREATE POLICY "collaboration_members_update_self"
ON collaboration_members
FOR UPDATE
USING (
  user_id = auth.uid()
  AND status = 'active'
)
WITH CHECK (
  user_id = auth.uid()
  AND (status = 'left' OR status = 'active')
);

-- 리더의 멤버 관리 정책: 리더는 다른 멤버의 상태를 변경하거나 리더 권한을 이전할 수 있음
CREATE POLICY "collaboration_members_update_leader"
ON collaboration_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM collaboration_members cm
    WHERE cm.collaboration_id = collaboration_members.collaboration_id
    AND cm.user_id = auth.uid()
    AND cm.is_leader = true
    AND cm.status = 'active'
  )
)
WITH CHECK (
  -- 리더는 모든 멤버의 상태를 변경할 수 있음
  status IN ('active', 'inactive', 'left', 'removed')
);

-- ============================================================================
-- 코멘트 추가
-- ============================================================================

COMMENT ON POLICY "project_members_update_self" ON project_members IS
'멤버 본인이 프로젝트에서 나갈 수 있도록 허용 (status를 left로 변경)';

COMMENT ON POLICY "project_members_update_leader" ON project_members IS
'리더가 다른 멤버를 추방하거나 리더 권한을 이전할 수 있도록 허용';

COMMENT ON POLICY "collaboration_members_update_self" ON collaboration_members IS
'멤버 본인이 협업에서 나갈 수 있도록 허용 (status를 left로 변경)';

COMMENT ON POLICY "collaboration_members_update_leader" ON collaboration_members IS
'리더가 다른 멤버를 추방하거나 리더 권한을 이전할 수 있도록 허용';

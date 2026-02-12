-- =====================================================
-- Fix: 초대 수락 시 position NULL 처리
-- 문제: invitations.position이 NULL일 때 project_members/collaboration_members.position이 NOT NULL 제약으로 에러 발생
-- 해결: COALESCE를 사용하여 NULL인 경우 기본값 '멤버' 제공
-- =====================================================

-- 초대 수락 시 자동 멤버 추가 함수 (수정: position NULL 처리)
CREATE OR REPLACE FUNCTION handle_invitation_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_target_type TEXT;
  v_target_id UUID;
  v_chat_room_id UUID;
  v_position TEXT;
BEGIN
  -- 수락 상태로 변경된 경우에만 처리
  IF NEW.status = 'accepted' AND OLD.status <> 'accepted' THEN
    v_target_type := NEW.invitation_type;
    v_target_id := NEW.target_id;
    
    -- position이 NULL인 경우 기본값 '멤버' 사용
    v_position := COALESCE(NEW.position, '멤버');

    IF v_target_type = 'project' THEN
      -- 프로젝트 멤버로 추가
      INSERT INTO project_members (
        project_id, user_id, position, responsibilities, status, is_leader, joined_date
      )
      VALUES (
        v_target_id, NEW.receiver_id, v_position, NEW.responsibilities, 'active', false, NOW()
      )
      ON CONFLICT (project_id, user_id) DO UPDATE SET status = 'active', joined_date = NOW();

      -- 프로젝트 채팅방에 추가
      SELECT id INTO v_chat_room_id FROM chat_rooms WHERE project_id = v_target_id LIMIT 1;
      IF v_chat_room_id IS NOT NULL THEN
        INSERT INTO chat_participants (room_id, user_id, joined_at)
        VALUES (v_chat_room_id, NEW.receiver_id, NOW())
        ON CONFLICT (room_id, user_id) DO NOTHING;
      END IF;

    ELSIF v_target_type = 'collaboration' THEN
      -- 협업 멤버로 추가
      INSERT INTO collaboration_members (
        collaboration_id, user_id, position, responsibilities, status, is_leader, joined_date
      )
      VALUES (
        v_target_id, NEW.receiver_id, v_position, NEW.responsibilities, 'active', false, NOW()
      )
      ON CONFLICT (collaboration_id, user_id) DO UPDATE SET status = 'active', joined_date = NOW();

      -- 협업 채팅방에 추가
      SELECT id INTO v_chat_room_id FROM chat_rooms WHERE collaboration_id = v_target_id LIMIT 1;
      IF v_chat_room_id IS NOT NULL THEN
        INSERT INTO chat_participants (room_id, user_id, joined_at)
        VALUES (v_chat_room_id, NEW.receiver_id, NOW())
        ON CONFLICT (room_id, user_id) DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE 'handle_invitation_accepted 함수 수정 완료: position NULL 처리 추가 (기본값: 멤버)';
END $$;

-- 채팅방 생성 DB 함수
-- 문제: 클라이언트에서 채팅방 생성 + 참여자 추가 + 초기 메시지 삽입이 원자적이지 않아 RLS 실패
-- 해결: SECURITY DEFINER 함수로 원자적 처리

CREATE OR REPLACE FUNCTION create_chat_room_with_participants(
  p_type TEXT,
  p_title TEXT,
  p_created_by UUID,
  p_participants UUID[],
  p_owner_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_collaboration_id UUID DEFAULT NULL,
  p_include_initial_message BOOLEAN DEFAULT TRUE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id UUID;
  v_owner UUID;
  v_participant UUID;
BEGIN
  -- owner 결정: p_owner_id가 주어지면 사용, 아니면 p_created_by 사용
  v_owner := COALESCE(p_owner_id, p_created_by);

  -- 1. 채팅방 생성
  INSERT INTO chat_rooms (type, title, created_by, project_id, collaboration_id)
  VALUES (p_type, p_title, v_owner, p_project_id, p_collaboration_id)
  RETURNING id INTO v_room_id;

  -- 2. 참여자 추가 (중복 제거)
  FOREACH v_participant IN ARRAY p_participants
  LOOP
    INSERT INTO chat_participants (room_id, user_id, role)
    VALUES (
      v_room_id,
      v_participant,
      (CASE WHEN v_participant = v_owner THEN 'owner' ELSE 'member' END)::chat_participant_role
    )
    ON CONFLICT (room_id, user_id) DO NOTHING;
  END LOOP;

  -- 3. 초기 시스템 메시지 (옵션)
  IF p_include_initial_message THEN
    INSERT INTO chat_messages (room_id, sender_id, content, type, attachments)
    VALUES (v_room_id, v_owner, '대화가 시작되었습니다.', 'system', '[]'::jsonb);
  END IF;

  RETURN v_room_id;
END;
$$;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION create_chat_room_with_participants(TEXT, TEXT, UUID, UUID[], UUID, UUID, UUID, BOOLEAN) TO authenticated;

-- 함수 설명 추가
COMMENT ON FUNCTION create_chat_room_with_participants IS '채팅방 생성, 참여자 추가, 초기 메시지 삽입을 원자적으로 처리하는 함수. RLS를 우회하여 includeCreator=false 케이스도 처리 가능.';

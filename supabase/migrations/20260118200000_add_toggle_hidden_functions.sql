-- Migration: Add toggle_hidden_in_manage function to bypass RLS infinite recursion
-- Date: 2026-01-18
-- Purpose: Provide security definer functions to toggle is_hidden_in_manage column

-- ============================================================================
-- toggle_project_hidden_in_manage - 프로젝트 숨김 상태 토글
-- ============================================================================

CREATE OR REPLACE FUNCTION public.toggle_project_hidden_in_manage(
  p_project_id uuid,
  p_is_hidden boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  -- 사용자가 해당 프로젝트의 멤버인지 확인
  IF NOT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id
    AND user_id = v_user_id
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION '프로젝트 멤버가 아닙니다';
  END IF;

  -- 숨김 상태 업데이트
  UPDATE project_members
  SET is_hidden_in_manage = p_is_hidden
  WHERE project_id = p_project_id
  AND user_id = v_user_id;
END;
$function$;

-- 함수 권한 부여
GRANT EXECUTE ON FUNCTION public.toggle_project_hidden_in_manage(uuid, boolean) TO authenticated;

-- ============================================================================
-- toggle_collaboration_hidden_in_manage - 협업 숨김 상태 토글
-- ============================================================================

CREATE OR REPLACE FUNCTION public.toggle_collaboration_hidden_in_manage(
  p_collaboration_id uuid,
  p_is_hidden boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  -- 사용자가 해당 협업의 멤버인지 확인
  IF NOT EXISTS (
    SELECT 1 FROM collaboration_members
    WHERE collaboration_id = p_collaboration_id
    AND user_id = v_user_id
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION '협업 멤버가 아닙니다';
  END IF;

  -- 숨김 상태 업데이트
  UPDATE collaboration_members
  SET is_hidden_in_manage = p_is_hidden
  WHERE collaboration_id = p_collaboration_id
  AND user_id = v_user_id;
END;
$function$;

-- 함수 권한 부여
GRANT EXECUTE ON FUNCTION public.toggle_collaboration_hidden_in_manage(uuid, boolean) TO authenticated;

-- ============================================================================
-- 코멘트 추가
-- ============================================================================

COMMENT ON FUNCTION public.toggle_project_hidden_in_manage(uuid, boolean) IS
'프로젝트의 ManageAll 숨김 상태를 토글합니다. SECURITY DEFINER로 RLS를 우회합니다.';

COMMENT ON FUNCTION public.toggle_collaboration_hidden_in_manage(uuid, boolean) IS
'협업의 ManageAll 숨김 상태를 토글합니다. SECURITY DEFINER로 RLS를 우회합니다.';

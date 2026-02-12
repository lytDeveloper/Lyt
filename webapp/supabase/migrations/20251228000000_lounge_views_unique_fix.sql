-- =====================================================
-- Lounge Views Unique Fix Migration
-- Description: NULL 포함 UNIQUE 제약으로 인한 중복 조회 row 문제 해결
-- - 기존 중복 데이터 정리(최신 1건만 유지)
-- - 잘못된 UNIQUE 제약 제거
-- - project / collaboration 각각에 대해 partial unique index 생성
-- - track_lounge_view 함수의 ON CONFLICT 타겟 수정
-- =====================================================

-- 1) 기존 데이터 중복 정리 (최신 1건만 유지)
WITH ranked_project AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY project_id, user_id ORDER BY created_at DESC) AS rn
  FROM lounge_views
  WHERE project_id IS NOT NULL
    AND collaboration_id IS NULL
),
ranked_collab AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY collaboration_id, user_id ORDER BY created_at DESC) AS rn
  FROM lounge_views
  WHERE collaboration_id IS NOT NULL
    AND project_id IS NULL
),
to_delete AS (
  SELECT id FROM ranked_project WHERE rn > 1
  UNION ALL
  SELECT id FROM ranked_collab WHERE rn > 1
)
DELETE FROM lounge_views lv
USING to_delete d
WHERE lv.id = d.id;

-- 2) 기존 UNIQUE 제약 제거 (NULL 때문에 중복을 막지 못함)
ALTER TABLE lounge_views
  DROP CONSTRAINT IF EXISTS lounge_views_unique;

-- 3) 올바른 유니크 보장을 위한 partial unique index 생성
-- 프로젝트 조회: (project_id, user_id) 조합은 collaboration_id가 NULL일 때만 유니크
CREATE UNIQUE INDEX IF NOT EXISTS lounge_views_unique_project_user
  ON lounge_views(project_id, user_id)
  WHERE project_id IS NOT NULL AND collaboration_id IS NULL;

-- 협업 조회: (collaboration_id, user_id) 조합은 project_id가 NULL일 때만 유니크
CREATE UNIQUE INDEX IF NOT EXISTS lounge_views_unique_collab_user
  ON lounge_views(collaboration_id, user_id)
  WHERE collaboration_id IS NOT NULL AND project_id IS NULL;

-- 4) upsert 함수 수정: partial unique index에 맞춘 ON CONFLICT 타겟 사용
CREATE OR REPLACE FUNCTION track_lounge_view(
  p_user_id UUID,
  p_project_id UUID DEFAULT NULL,
  p_collaboration_id UUID DEFAULT NULL,
  p_actor_role TEXT DEFAULT NULL,
  p_actor_profile_id UUID DEFAULT NULL,
  p_actor_name TEXT DEFAULT NULL,
  p_actor_avatar_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_inserted BOOLEAN := FALSE;
BEGIN
  -- 입력값 검증: 프로젝트 또는 협업 중 하나만 있어야 함
  IF (p_project_id IS NULL AND p_collaboration_id IS NULL) OR
     (p_project_id IS NOT NULL AND p_collaboration_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Must provide exactly one of project_id or collaboration_id';
  END IF;

  IF p_project_id IS NOT NULL THEN
    INSERT INTO lounge_views (
      user_id, project_id, collaboration_id,
      actor_role, actor_profile_id, actor_name, actor_avatar_url
    )
    VALUES (
      p_user_id, p_project_id, NULL,
      p_actor_role, p_actor_profile_id, p_actor_name, p_actor_avatar_url
    )
    ON CONFLICT (project_id, user_id) WHERE collaboration_id IS NULL DO NOTHING
    RETURNING TRUE INTO v_inserted;
  ELSE
    INSERT INTO lounge_views (
      user_id, project_id, collaboration_id,
      actor_role, actor_profile_id, actor_name, actor_avatar_url
    )
    VALUES (
      p_user_id, NULL, p_collaboration_id,
      p_actor_role, p_actor_profile_id, p_actor_name, p_actor_avatar_url
    )
    ON CONFLICT (collaboration_id, user_id) WHERE project_id IS NULL DO NOTHING
    RETURNING TRUE INTO v_inserted;
  END IF;

  RETURN COALESCE(v_inserted, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



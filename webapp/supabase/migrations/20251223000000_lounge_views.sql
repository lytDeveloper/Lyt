-- =====================================================
-- Lounge Views Table Migration
-- Description: 프로젝트/협업 조회자 추적을 위한 lounge_views 테이블 생성
-- =====================================================

-- 1. lounge_views 테이블 생성
CREATE TABLE IF NOT EXISTS lounge_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  collaboration_id UUID REFERENCES collaborations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Actor snapshot 필드 (조회 시점의 프로필 정보)
  actor_role TEXT,                    -- 'brand' | 'artist' | 'creative' | 'fan'
  actor_profile_id UUID,
  actor_name TEXT,
  actor_avatar_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- 프로젝트 또는 협업 중 하나만 설정 가능
  CONSTRAINT lounge_views_entity_check CHECK (
    (project_id IS NOT NULL AND collaboration_id IS NULL) OR
    (project_id IS NULL AND collaboration_id IS NOT NULL)
  ),

  -- 같은 사용자가 같은 항목을 여러 번 조회해도 1회로 카운트 (UNIQUE)
  CONSTRAINT lounge_views_unique UNIQUE (project_id, collaboration_id, user_id)
);

-- 2. 성능을 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_lounge_views_project
  ON lounge_views(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lounge_views_collab
  ON lounge_views(collaboration_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lounge_views_user
  ON lounge_views(user_id, created_at DESC);

-- 3. Row Level Security 활성화
ALTER TABLE lounge_views ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책 생성
DROP POLICY IF EXISTS "Anyone can view views" ON lounge_views;
CREATE POLICY "Anyone can view views"
  ON lounge_views FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own views" ON lounge_views;
CREATE POLICY "Users can insert their own views"
  ON lounge_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. 조회 기록용 upsert 함수 생성
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

  -- 삽입 시도, 이미 존재하면 무시 (UPSERT)
  INSERT INTO lounge_views (
    user_id, project_id, collaboration_id,
    actor_role, actor_profile_id, actor_name, actor_avatar_url
  )
  VALUES (
    p_user_id, p_project_id, p_collaboration_id,
    p_actor_role, p_actor_profile_id, p_actor_name, p_actor_avatar_url
  )
  ON CONFLICT (project_id, collaboration_id, user_id) DO NOTHING
  RETURNING TRUE INTO v_inserted;

  RETURN COALESCE(v_inserted, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

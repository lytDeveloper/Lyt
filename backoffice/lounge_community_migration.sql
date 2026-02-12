-- =====================================================
-- Community Tab Migration for Lounge
-- Description: Creates tables, views, functions, and RLS policies
--              for real-time community features
-- =====================================================

-- 1. Create lounge_likes table (if not exists)
CREATE TABLE IF NOT EXISTS lounge_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  collaboration_id UUID REFERENCES collaborations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_canceled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT lounge_likes_entity_check CHECK (
    (project_id IS NOT NULL AND collaboration_id IS NULL) OR
    (project_id IS NULL AND collaboration_id IS NOT NULL)
  ),
  CONSTRAINT lounge_likes_unique UNIQUE (project_id, collaboration_id, user_id)
);

-- Ensure column exists when running against existing environments
ALTER TABLE lounge_likes
  ADD COLUMN IF NOT EXISTS is_canceled BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Create lounge_comments table
CREATE TABLE IF NOT EXISTS lounge_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  collaboration_id UUID REFERENCES collaborations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT lounge_comments_entity_check CHECK (
    (project_id IS NOT NULL AND collaboration_id IS NULL) OR
    (project_id IS NULL AND collaboration_id IS NOT NULL)
  )
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lounge_likes_project
  ON lounge_likes(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lounge_likes_collab
  ON lounge_likes(collaboration_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lounge_likes_user
  ON lounge_likes(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lounge_comments_project
  ON lounge_comments(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lounge_comments_collab
  ON lounge_comments(collaboration_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lounge_comments_user
  ON lounge_comments(user_id, created_at DESC);

-- 4. Create community_activity_feed view
CREATE OR REPLACE VIEW community_activity_feed AS
SELECT
  'like' as activity_type,
  ll.id,
  ll.created_at,
  ll.user_id,
  p.name as user_name,
  p.profile_image_url as user_avatar,
  COALESCE(ll.project_id, ll.collaboration_id) as entity_id,
  CASE
    WHEN ll.project_id IS NOT NULL THEN 'project'
    ELSE 'collaboration'
  END as entity_type,
  COALESCE(proj.title, collab.title) as entity_title,
  COALESCE(proj.cover_image_url, collab.cover_image_url) as entity_image
FROM lounge_likes ll
LEFT JOIN profiles p ON ll.user_id = p.id
LEFT JOIN projects proj ON ll.project_id = proj.id
LEFT JOIN collaborations collab ON ll.collaboration_id = collab.id
WHERE ll.is_canceled = FALSE

UNION ALL

SELECT
  'comment' as activity_type,
  lc.id,
  lc.created_at,
  lc.user_id,
  p.name as user_name,
  p.profile_image_url as user_avatar,
  COALESCE(lc.project_id, lc.collaboration_id) as entity_id,
  CASE
    WHEN lc.project_id IS NOT NULL THEN 'project'
    ELSE 'collaboration'
  END as entity_type,
  COALESCE(proj.title, collab.title) as entity_title,
  COALESCE(proj.cover_image_url, collab.cover_image_url) as entity_image
FROM lounge_comments lc
LEFT JOIN profiles p ON lc.user_id = p.id
LEFT JOIN projects proj ON lc.project_id = proj.id
LEFT JOIN collaborations collab ON lc.collaboration_id = collab.id

ORDER BY created_at DESC
LIMIT 50;

-- 5. Create toggle_lounge_like function
CREATE OR REPLACE FUNCTION toggle_lounge_like(
  p_user_id UUID,
  p_project_id UUID DEFAULT NULL,
  p_collaboration_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_like lounge_likes%ROWTYPE;
BEGIN
  -- Validate input: must have exactly one entity ID
  IF (p_project_id IS NULL AND p_collaboration_id IS NULL) OR
     (p_project_id IS NOT NULL AND p_collaboration_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Must provide exactly one of project_id or collaboration_id';
  END IF;

  -- Fetch existing like (active or canceled)
  SELECT *
    INTO v_like
    FROM lounge_likes
   WHERE user_id = p_user_id
     AND (
       (project_id = p_project_id AND p_project_id IS NOT NULL) OR
       (collaboration_id = p_collaboration_id AND p_collaboration_id IS NOT NULL)
     )
   LIMIT 1;

  IF FOUND THEN
    IF v_like.is_canceled THEN
      -- Re-like: reactivate without changing created_at
      UPDATE lounge_likes
         SET is_canceled = FALSE
       WHERE id = v_like.id;
      RETURN TRUE;
    ELSE
      -- Cancel like
      UPDATE lounge_likes
         SET is_canceled = TRUE
       WHERE id = v_like.id;
      RETURN FALSE;
    END IF;
  ELSE
    -- First like
    INSERT INTO lounge_likes (user_id, project_id, collaboration_id, is_canceled)
    VALUES (p_user_id, p_project_id, p_collaboration_id, FALSE);
    RETURN TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Enable Row Level Security
ALTER TABLE lounge_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lounge_comments ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS Policies for lounge_likes
DROP POLICY IF EXISTS "Anyone can view likes" ON lounge_likes;
CREATE POLICY "Anyone can view likes"
  ON lounge_likes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own likes" ON lounge_likes;
CREATE POLICY "Users can insert their own likes"
  ON lounge_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own likes" ON lounge_likes;
CREATE POLICY "Users can delete their own likes"
  ON lounge_likes FOR DELETE
  USING (auth.uid() = user_id);

-- 8. Create RLS Policies for lounge_comments
DROP POLICY IF EXISTS "Anyone can view comments" ON lounge_comments;
CREATE POLICY "Anyone can view comments"
  ON lounge_comments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own comments" ON lounge_comments;
CREATE POLICY "Users can insert their own comments"
  ON lounge_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments" ON lounge_comments;
CREATE POLICY "Users can delete their own comments"
  ON lounge_comments FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own comments" ON lounge_comments;
CREATE POLICY "Users can update their own comments"
  ON lounge_comments FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- Migration Complete
-- =====================================================
-- Tables: lounge_likes, lounge_comments
-- View: community_activity_feed
-- Function: toggle_lounge_like()
-- RLS: Enabled with appropriate policies
-- =====================================================

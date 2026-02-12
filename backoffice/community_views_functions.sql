-- =====================================================
-- Community Tab Views & Functions
-- Description: Creates views and functions for community features
--              (Tables lounge_likes and lounge_comments already exist)
-- =====================================================

-- 1. Create community_activity_feed view
CREATE OR REPLACE VIEW community_activity_feed AS
SELECT
  'like' as activity_type,
  ll.id,
  ll.created_at,
  ll.user_id,
  p.nickname as user_name,
  p.avatar_url as user_avatar,
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
  lc.author_id as user_id,
  p.nickname as user_name,
  p.avatar_url as user_avatar,
  COALESCE(lc.project_id, lc.collaboration_id) as entity_id,
  CASE
    WHEN lc.project_id IS NOT NULL THEN 'project'
    ELSE 'collaboration'
  END as entity_type,
  COALESCE(proj.title, collab.title) as entity_title,
  COALESCE(proj.cover_image_url, collab.cover_image_url) as entity_image
FROM lounge_comments lc
LEFT JOIN profiles p ON lc.author_id = p.id
LEFT JOIN projects proj ON lc.project_id = proj.id
LEFT JOIN collaborations collab ON lc.collaboration_id = collab.id

ORDER BY created_at DESC
LIMIT 50;

-- Ensure is_canceled column exists for soft-toggle behavior
ALTER TABLE lounge_likes
  ADD COLUMN IF NOT EXISTS is_canceled BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Create toggle_lounge_like function
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

-- =====================================================
-- Migration Complete
-- =====================================================
-- View: community_activity_feed
-- Function: toggle_lounge_like()
-- =====================================================

-- Migration: Add Comment Threading and Like System
-- Purpose: Enable nested replies and comment likes for community detail page
-- Date: 2025-12-05

-- ========================================
-- 1. Add Threading Support to Comments
-- ========================================

-- Add parent_id column for threaded replies
ALTER TABLE lounge_comments
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES lounge_comments(id) ON DELETE CASCADE;

-- Add denormalized like_count for performance
ALTER TABLE lounge_comments
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0 NOT NULL;

-- Create index for efficient parent lookup
CREATE INDEX IF NOT EXISTS idx_lounge_comments_parent ON lounge_comments(parent_id, created_at DESC);

-- ========================================
-- 2. Create Comment Likes Table
-- ========================================

CREATE TABLE IF NOT EXISTS lounge_comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID REFERENCES lounge_comments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT lounge_comment_likes_unique UNIQUE (comment_id, user_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_lounge_comment_likes_comment ON lounge_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_lounge_comment_likes_user ON lounge_comment_likes(user_id);

-- ========================================
-- 3. RLS Policies for Comment Likes
-- ========================================

ALTER TABLE lounge_comment_likes ENABLE ROW LEVEL SECURITY;

-- Anyone can view comment likes
CREATE POLICY "Anyone can view comment likes" ON lounge_comment_likes
FOR SELECT USING (true);

-- Users can insert their own comment likes
CREATE POLICY "Users can insert their own comment likes" ON lounge_comment_likes
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comment likes
CREATE POLICY "Users can delete their own comment likes" ON lounge_comment_likes
FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- 4. Toggle Comment Like Function
-- ========================================

CREATE OR REPLACE FUNCTION toggle_lounge_comment_like(p_user_id UUID, p_comment_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Check if like already exists
  SELECT EXISTS (
    SELECT 1 FROM lounge_comment_likes
    WHERE user_id = p_user_id AND comment_id = p_comment_id
  ) INTO v_exists;

  IF v_exists THEN
    -- Unlike: Delete like record
    DELETE FROM lounge_comment_likes
    WHERE user_id = p_user_id AND comment_id = p_comment_id;

    -- Decrement like_count (defensive: prevent negative values)
    UPDATE lounge_comments
    SET like_count = GREATEST(like_count - 1, 0)
    WHERE id = p_comment_id;

    RETURN FALSE; -- Unliked
  ELSE
    -- Like: Insert like record
    INSERT INTO lounge_comment_likes (user_id, comment_id)
    VALUES (p_user_id, p_comment_id);

    -- Increment like_count
    UPDATE lounge_comments
    SET like_count = like_count + 1
    WHERE id = p_comment_id;

    RETURN TRUE; -- Liked
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 5. Update Existing Comments (Backfill)
-- ========================================

-- Calculate existing like counts for comments (if lounge_comment_likes data exists)
-- This is optional and only runs if you already have data

-- Uncomment below if needed:
-- UPDATE lounge_comments c
-- SET like_count = (
--   SELECT COUNT(*)
--   FROM lounge_comment_likes l
--   WHERE l.comment_id = c.id
-- );

-- ========================================
-- Migration Complete
-- ========================================

-- Verification Queries (run separately to test):
-- SELECT * FROM lounge_comments WHERE parent_id IS NOT NULL; -- Check threaded comments
-- SELECT * FROM lounge_comment_likes; -- Check likes
-- SELECT toggle_lounge_comment_like('user-uuid', 'comment-uuid'); -- Test toggle function

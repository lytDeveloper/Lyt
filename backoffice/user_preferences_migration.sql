-- Migration: User Preferences for Hide/Block Functionality
-- Description: Creates tables to store user preferences for hiding/blocking projects, collaborations, and partners
-- Author: Bridge Development Team
-- Date: 2025-01-18

-- =====================================================
-- 1. Create user_project_preferences table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_project_preferences (
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  is_hidden BOOLEAN DEFAULT false NOT NULL,
  is_blocked BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (profile_id, project_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_project_pref_user_hidden
  ON public.user_project_preferences(profile_id, is_hidden)
  WHERE is_hidden = true;

CREATE INDEX IF NOT EXISTS idx_user_project_pref_user_blocked
  ON public.user_project_preferences(profile_id, is_blocked)
  WHERE is_blocked = true;

CREATE INDEX IF NOT EXISTS idx_user_project_pref_project
  ON public.user_project_preferences(project_id);

-- Add comments
COMMENT ON TABLE public.user_project_preferences IS 'Stores user preferences for hiding/blocking projects';
COMMENT ON COLUMN public.user_project_preferences.is_hidden IS 'User has hidden this project from their feed';
COMMENT ON COLUMN public.user_project_preferences.is_blocked IS 'User has permanently blocked this project';

-- =====================================================
-- 2. Create user_collaboration_preferences table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_collaboration_preferences (
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  collaboration_id UUID NOT NULL REFERENCES public.collaborations(id) ON DELETE CASCADE,
  is_hidden BOOLEAN DEFAULT false NOT NULL,
  is_blocked BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (profile_id, collaboration_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_collab_pref_user_hidden
  ON public.user_collaboration_preferences(profile_id, is_hidden)
  WHERE is_hidden = true;

CREATE INDEX IF NOT EXISTS idx_user_collab_pref_user_blocked
  ON public.user_collaboration_preferences(profile_id, is_blocked)
  WHERE is_blocked = true;

CREATE INDEX IF NOT EXISTS idx_user_collab_pref_collaboration
  ON public.user_collaboration_preferences(collaboration_id);

-- Add comments
COMMENT ON TABLE public.user_collaboration_preferences IS 'Stores user preferences for hiding/blocking collaborations';
COMMENT ON COLUMN public.user_collaboration_preferences.is_hidden IS 'User has hidden this collaboration from their feed';
COMMENT ON COLUMN public.user_collaboration_preferences.is_blocked IS 'User has permanently blocked this collaboration';

-- =====================================================
-- 3. Create user_partner_preferences table
-- =====================================================
-- Note: Partners is a VIEW combining artists and creatives
-- We'll store the profile_id directly
CREATE TABLE IF NOT EXISTS public.user_partner_preferences (
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_hidden BOOLEAN DEFAULT false NOT NULL,
  is_blocked BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (profile_id, partner_id),
  -- Ensure user cannot hide/block themselves
  CONSTRAINT check_not_self CHECK (profile_id != partner_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_partner_pref_user_hidden
  ON public.user_partner_preferences(profile_id, is_hidden)
  WHERE is_hidden = true;

CREATE INDEX IF NOT EXISTS idx_user_partner_pref_user_blocked
  ON public.user_partner_preferences(profile_id, is_blocked)
  WHERE is_blocked = true;

CREATE INDEX IF NOT EXISTS idx_user_partner_pref_partner
  ON public.user_partner_preferences(partner_id);

-- Add comments
COMMENT ON TABLE public.user_partner_preferences IS 'Stores user preferences for hiding/blocking partners (artists/creatives)';
COMMENT ON COLUMN public.user_partner_preferences.is_hidden IS 'User has hidden this partner from their feed';
COMMENT ON COLUMN public.user_partner_preferences.is_blocked IS 'User has permanently blocked this partner';

-- =====================================================
-- 4. Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE public.user_project_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_collaboration_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_partner_preferences ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. Create RLS Policies - user_project_preferences
-- =====================================================
-- Users can view only their own preferences
CREATE POLICY "Users can view own project preferences"
  ON public.user_project_preferences
  FOR SELECT
  USING (auth.uid() = profile_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own project preferences"
  ON public.user_project_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own project preferences"
  ON public.user_project_preferences
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete own project preferences"
  ON public.user_project_preferences
  FOR DELETE
  USING (auth.uid() = profile_id);

-- =====================================================
-- 6. Create RLS Policies - user_collaboration_preferences
-- =====================================================
CREATE POLICY "Users can view own collaboration preferences"
  ON public.user_collaboration_preferences
  FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own collaboration preferences"
  ON public.user_collaboration_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own collaboration preferences"
  ON public.user_collaboration_preferences
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can delete own collaboration preferences"
  ON public.user_collaboration_preferences
  FOR DELETE
  USING (auth.uid() = profile_id);

-- =====================================================
-- 7. Create RLS Policies - user_partner_preferences
-- =====================================================
CREATE POLICY "Users can view own partner preferences"
  ON public.user_partner_preferences
  FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own partner preferences"
  ON public.user_partner_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own partner preferences"
  ON public.user_partner_preferences
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can delete own partner preferences"
  ON public.user_partner_preferences
  FOR DELETE
  USING (auth.uid() = profile_id);

-- =====================================================
-- 8. Create helper functions for updated_at trigger
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to auto-update updated_at
CREATE TRIGGER update_user_project_preferences_updated_at
  BEFORE UPDATE ON public.user_project_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_collaboration_preferences_updated_at
  BEFORE UPDATE ON public.user_collaboration_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_partner_preferences_updated_at
  BEFORE UPDATE ON public.user_partner_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 9. Grant permissions
-- =====================================================
-- Grant authenticated users access to these tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_project_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_collaboration_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_partner_preferences TO authenticated;

-- =====================================================
-- Migration Complete
-- =====================================================
-- To apply this migration:
-- 1. Open Supabase SQL Editor
-- 2. Copy and paste this entire file
-- 3. Execute the SQL
-- 4. Verify tables and policies are created successfully

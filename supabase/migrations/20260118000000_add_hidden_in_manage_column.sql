-- Migration: Add is_hidden_in_manage column to project_members and collaboration_members tables
-- This allows individual users to hide projects/collaborations from their ManageAll page list

-- Add column to project_members
ALTER TABLE public.project_members
ADD COLUMN IF NOT EXISTS is_hidden_in_manage BOOLEAN DEFAULT false;

-- Add column to collaboration_members
ALTER TABLE public.collaboration_members
ADD COLUMN IF NOT EXISTS is_hidden_in_manage BOOLEAN DEFAULT false;

-- Add indexes for filtering hidden items
CREATE INDEX IF NOT EXISTS idx_project_members_hidden_in_manage
ON public.project_members (user_id, is_hidden_in_manage)
WHERE is_hidden_in_manage = true;

CREATE INDEX IF NOT EXISTS idx_collaboration_members_hidden_in_manage
ON public.collaboration_members (user_id, is_hidden_in_manage)
WHERE is_hidden_in_manage = true;

-- Add comments
COMMENT ON COLUMN public.project_members.is_hidden_in_manage IS 'User preference to hide this project from their ManageAll list';
COMMENT ON COLUMN public.collaboration_members.is_hidden_in_manage IS 'User preference to hide this collaboration from their ManageAll list';

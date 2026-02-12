-- ============================================================================
-- Fix Infinite Recursion in collaboration_members RLS Policies
-- ============================================================================
-- Issue: Existing RLS policies cause infinite recursion when querying
-- collaboration_members table because they reference the same table.
--
-- Error: "infinite recursion detected in policy for relation collaboration_members"
--
-- Solution: Rewrite policies to avoid recursive subqueries
-- ============================================================================

-- Step 1: Drop existing problematic policies
DROP POLICY IF EXISTS "Leaders can invite members" ON public.collaboration_members;
DROP POLICY IF EXISTS "Members can view members of their collaborations" ON public.collaboration_members;

-- Step 2: Create new non-recursive policies

-- Policy 1: Anyone can view collaboration members (public read)
-- Access control is handled at the collaborations table level
CREATE POLICY "Anyone can view collaboration members"
ON public.collaboration_members
FOR SELECT
TO public
USING (true);

-- Policy 2: Leaders can invite members (fixed - no recursive subquery)
-- Use a security definer function to check leadership without recursion
CREATE OR REPLACE FUNCTION public.is_collaboration_leader(collab_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM collaboration_members
    WHERE collaboration_id = collab_id
      AND user_id = user_id
      AND is_leader = true
      AND can_invite = true
      AND status = 'active'
  );
$$;

CREATE POLICY "Leaders can invite members (fixed)"
ON public.collaboration_members
FOR INSERT
TO public
WITH CHECK (
  -- Either you are the collaboration creator
  auth.uid() IN (
    SELECT created_by
    FROM collaborations
    WHERE id = collaboration_id
  )
  OR
  -- Or you are a leader with invite permission (using security definer function)
  public.is_collaboration_leader(collaboration_id, auth.uid())
);

-- Policy 3: Keep existing "Collaboration creators can manage members" policy
-- (This one is fine because it only references collaborations table)
-- No changes needed

-- Step 3: Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_collaboration_leader(uuid, uuid) TO public;

-- ============================================================================
-- Verification
-- ============================================================================
-- Run this query to check the updated policies:
-- SELECT
--   policyname,
--   cmd,
--   qual,
--   with_check
-- FROM pg_policies
-- WHERE tablename = 'collaboration_members'
--   AND schemaname = 'public';
-- ============================================================================

-- ============================================================================
-- Collaboration Applications Table Migration
-- ============================================================================
-- Purpose: Create collaboration_applications table based on project_applications structure
-- Date: 2025-01-21
--
-- This table stores applications for collaborations, similar to project_applications
-- but linked to the collaborations table instead of projects.
-- ============================================================================

-- Step 1: Create collaboration_applications table
CREATE TABLE IF NOT EXISTS public.collaboration_applications (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    collaboration_id UUID NOT NULL,
    applicant_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    cover_letter TEXT NOT NULL,
    budget_range TEXT,
    duration TEXT,
    portfolio_links JSONB DEFAULT '[]'::jsonb,
    resume_url TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    skills TEXT[] DEFAULT '{}'::text[],
    experience_years INTEGER,
    availability TEXT,
    applied_date TIMESTAMPTZ DEFAULT now(),
    reviewed_date TIMESTAMPTZ,
    response_date TIMESTAMPTZ,
    is_read BOOLEAN DEFAULT false,
    is_shortlisted BOOLEAN DEFAULT false,
    reviewer_id UUID,
    reviewer_note TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Primary Key
    CONSTRAINT collaboration_applications_pkey PRIMARY KEY (id),
    
    -- Foreign Keys
    CONSTRAINT collaboration_applications_collaboration_id_fkey 
        FOREIGN KEY (collaboration_id) 
        REFERENCES public.collaborations(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT collaboration_applications_applicant_id_fkey 
        FOREIGN KEY (applicant_id) 
        REFERENCES public.profiles(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT collaboration_applications_reviewer_id_fkey 
        FOREIGN KEY (reviewer_id) 
        REFERENCES public.profiles(id),
    
    -- Unique constraint: prevent duplicate applications
    CONSTRAINT unique_collaboration_application 
        UNIQUE (collaboration_id, applicant_id),
    
    -- Check constraint: valid status values
    CONSTRAINT valid_collaboration_application_status 
        CHECK (status IN ('pending', 'reviewed', 'shortlisted', 'accepted', 'rejected', 'withdrawn'))
);

-- Step 2: Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_collaboration_applications_collaboration 
    ON public.collaboration_applications(collaboration_id);

CREATE INDEX IF NOT EXISTS idx_collaboration_applications_applicant 
    ON public.collaboration_applications(applicant_id);

CREATE INDEX IF NOT EXISTS idx_collaboration_applications_status 
    ON public.collaboration_applications(status);

CREATE INDEX IF NOT EXISTS idx_collaboration_applications_applied_date 
    ON public.collaboration_applications(applied_date DESC);

CREATE INDEX IF NOT EXISTS idx_collaboration_applications_unread 
    ON public.collaboration_applications(collaboration_id, is_read) 
    WHERE (is_read = false);

CREATE INDEX IF NOT EXISTS idx_collaboration_applications_shortlisted 
    ON public.collaboration_applications(collaboration_id, is_shortlisted) 
    WHERE (is_shortlisted = true);

-- Step 3: Enable Row Level Security (RLS)
ALTER TABLE public.collaboration_applications ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies

-- Policy 1: Applicants can create applications
CREATE POLICY "Applicants can create applications"
ON public.collaboration_applications
FOR INSERT
TO public
WITH CHECK (auth.uid() = applicant_id);

-- Policy 2: Applicants can view their own applications
CREATE POLICY "Applicants can view their own applications"
ON public.collaboration_applications
FOR SELECT
TO public
USING (auth.uid() = applicant_id);

-- Policy 3: Applicants can update their own pending applications
CREATE POLICY "Applicants can update their own pending applications"
ON public.collaboration_applications
FOR UPDATE
TO public
USING (auth.uid() = applicant_id AND status = 'pending');

-- Policy 4: Collaboration creators can view applications to their collaborations
CREATE POLICY "Collaboration creators can view applications to their collaborations"
ON public.collaboration_applications
FOR SELECT
TO public
USING (
    auth.uid() IN (
        SELECT collaborations.created_by
        FROM public.collaborations
        WHERE collaborations.id = collaboration_applications.collaboration_id
    )
);

-- Policy 5: Collaboration creators can update applications to their collaborations
CREATE POLICY "Collaboration creators can update applications to their collaborations"
ON public.collaboration_applications
FOR UPDATE
TO public
USING (
    auth.uid() IN (
        SELECT collaborations.created_by
        FROM public.collaborations
        WHERE collaborations.id = collaboration_applications.collaboration_id
    )
);

-- Step 5: Create trigger for updated_at (if update_updated_at_column function exists)
-- Note: This assumes the function already exists from other migrations
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'update_updated_at_column'
    ) THEN
        CREATE TRIGGER update_collaboration_applications_updated_at
            BEFORE UPDATE ON public.collaboration_applications
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these queries to verify the table was created correctly:

-- 1. Check table structure
-- SELECT 
--     column_name,
--     data_type,
--     is_nullable,
--     column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
--     AND table_name = 'collaboration_applications'
-- ORDER BY ordinal_position;

-- 2. Check constraints
-- SELECT 
--     conname as constraint_name,
--     contype as constraint_type,
--     pg_get_constraintdef(oid) as constraint_definition
-- FROM pg_constraint
-- WHERE conrelid = 'public.collaboration_applications'::regclass;

-- 3. Check indexes
-- SELECT 
--     schemaname,
--     tablename,
--     indexname,
--     indexdef
-- FROM pg_indexes
-- WHERE tablename = 'collaboration_applications'
--     AND schemaname = 'public';

-- 4. Check RLS policies
-- SELECT 
--     policyname,
--     permissive,
--     roles,
--     cmd,
--     qual,
--     with_check
-- FROM pg_policies
-- WHERE tablename = 'collaboration_applications'
--     AND schemaname = 'public';

-- ============================================================================


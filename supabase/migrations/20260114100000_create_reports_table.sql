-- Create reports table for user reporting system
-- This stores all user-submitted reports for review by admins

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Report type: inappropriate_content, fraud, copyright, communication, other
    report_type TEXT NOT NULL,
    
    -- Specific reason selected by user
    reason TEXT NOT NULL,
    
    -- Target type: user, message, project, collaboration, profile, chat_room
    target_type TEXT NOT NULL,
    
    -- Target ID (references different tables based on target_type)
    target_id UUID NOT NULL,
    
    -- Display name of the target (for easier admin review)
    target_name TEXT,
    
    -- User's description of the issue
    description TEXT,
    
    -- URL for evidence/reference
    evidence_url TEXT,
    
    -- Array of attachment URLs
    attachments TEXT[],
    
    -- Status: pending, reviewing, resolved, dismissed
    status TEXT NOT NULL DEFAULT 'pending',
    
    -- Admin notes (internal)
    admin_notes TEXT,
    
    -- Admin who resolved the report
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Timestamp when resolved
    resolved_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_target_type ON public.reports(target_type);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);

-- Add RLS policies
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create reports"
    ON public.reports
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
    ON public.reports
    FOR SELECT
    TO authenticated
    USING (auth.uid() = reporter_id);

-- Super admins can view all reports
CREATE POLICY "Admins can view all reports"
    ON public.reports
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admins
            WHERE profile_id = auth.uid()
        )
    );

-- Super admins can update reports
CREATE POLICY "Admins can update reports"
    ON public.reports
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admins
            WHERE profile_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admins
            WHERE profile_id = auth.uid()
        )
    );

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION update_reports_updated_at();

-- Grant permissions
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT UPDATE ON public.reports TO authenticated;

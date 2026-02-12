-- Create feedbacks table for user feedback system
-- This stores all user-submitted feedback (bug reports, feature requests, etc) for review by admins

CREATE TABLE IF NOT EXISTS public.feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Feedback type: 버그 제보, 기능 개선 제안, 기타
    feedback_type TEXT NOT NULL,

    -- Satisfaction rating (1-5 scale)
    satisfaction_rating NUMERIC NOT NULL CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),

    -- User email for response (optional)
    email TEXT,

    -- Feedback title and content
    title TEXT NOT NULL,
    content TEXT NOT NULL,

    -- Status: pending, in_progress, resolved, rejected
    status TEXT NOT NULL DEFAULT 'pending',

    -- Admin who handled the feedback
    responder_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Timestamp when handled
    responded_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id ON public.feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON public.feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_feedback_type ON public.feedbacks(feedback_type);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON public.feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_responder_id ON public.feedbacks(responder_id);

-- Add RLS policies
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Users can create feedbacks
CREATE POLICY "Users can create feedbacks"
    ON public.feedbacks
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedbacks
CREATE POLICY "Users can view own feedbacks"
    ON public.feedbacks
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Admins with feedback_management permission or super_admin role can view all feedbacks
CREATE POLICY "Admins can view all feedbacks"
    ON public.feedbacks
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admins
            WHERE profile_id = auth.uid()
            AND (
                'feedback_management' = ANY(permissions)
                OR role = 'super_admin'
            )
        )
    );

-- Admins with feedback_management permission or super_admin role can update feedbacks
CREATE POLICY "Admins can update feedbacks"
    ON public.feedbacks
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admins
            WHERE profile_id = auth.uid()
            AND (
                'feedback_management' = ANY(permissions)
                OR role = 'super_admin'
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admins
            WHERE profile_id = auth.uid()
            AND (
                'feedback_management' = ANY(permissions)
                OR role = 'super_admin'
            )
        )
    );

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_feedbacks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_feedbacks_updated_at
    BEFORE UPDATE ON public.feedbacks
    FOR EACH ROW
    EXECUTE FUNCTION update_feedbacks_updated_at();

-- Grant permissions
GRANT SELECT, INSERT ON public.feedbacks TO authenticated;
GRANT UPDATE ON public.feedbacks TO authenticated;

-- Completion message
DO $$
BEGIN
  RAISE NOTICE 'feedbacks 테이블이 생성되었습니다.';
  RAISE NOTICE '기능:';
  RAISE NOTICE '  - 사용자는 자신의 피드백을 생성하고 조회할 수 있습니다';
  RAISE NOTICE '  - 사용자는 답변받을 이메일 주소를 선택적으로 입력할 수 있습니다';
  RAISE NOTICE '  - feedback_management 권한 또는 super_admin 역할을 가진 관리자는 모든 피드백을 조회하고 업데이트할 수 있습니다';
  RAISE NOTICE '  - satisfaction_rating은 1-5 범위로 제한됩니다';
END $$;

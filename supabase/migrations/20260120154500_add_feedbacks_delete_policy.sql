-- Add DELETE policy for feedbacks table
-- This allows admins with feedback_management permission or super_admin role to delete feedbacks

CREATE POLICY "Admins can delete feedbacks"
    ON public.feedbacks
    FOR DELETE
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

-- Grant DELETE permission
GRANT DELETE ON public.feedbacks TO authenticated;

-- Completion message
DO $$
BEGIN
  RAISE NOTICE 'feedbacks 테이블에 DELETE 정책이 추가되었습니다.';
  RAISE NOTICE '  - feedback_management 권한 또는 super_admin 역할을 가진 관리자는 피드백을 삭제할 수 있습니다';
END $$;

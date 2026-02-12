-- Allow anonymous users on the landing (login) page to submit signup inquiries
-- Safely relax RLS only for a very narrow case: subject/inquiry_type fixed

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'inquiries'
          AND policyname = 'Anon users can insert signup inquiries'
    ) THEN
        CREATE POLICY "Anon users can insert signup inquiries" ON public.inquiries
        FOR INSERT
        TO anon
        WITH CHECK (
            auth.role() = 'anon'
            AND user_id IS NULL
            AND inquiry_type = 'account'
            AND subject = '가입 문의'
        );
    END IF;
END
$$;

-- Allow anonymous users from landing page to submit general inquiries
-- This extends the existing anon policy to support landing page contact form

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'inquiries'
          AND policyname = 'Anon users can insert landing inquiries'
    ) THEN
        CREATE POLICY "Anon users can insert landing inquiries" ON public.inquiries
        FOR INSERT
        TO anon
        WITH CHECK (
            auth.role() = 'anon'
            AND user_id IS NULL
            AND inquiry_type = 'general'
            AND subject = '랜딩페이지 문의'
        );
    END IF;
END
$$;

-- Fix homepage_slider_images RLS policy to allow super_admin
-- 기존 정책은 content_management 권한만 확인했지만,
-- 프론트엔드 코드에서는 super_admin도 허용하므로 RLS 정책도 동일하게 수정

DROP POLICY IF EXISTS "Admins can manage homepage slider images" ON public.homepage_slider_images;

CREATE POLICY "Admins can manage homepage slider images"
ON public.homepage_slider_images
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admins
    WHERE admins.profile_id = auth.uid()
    AND (
      admins.role = 'super_admin'
      OR 'content_management' = ANY(admins.permissions)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admins
    WHERE admins.profile_id = auth.uid()
    AND (
      admins.role = 'super_admin'
      OR 'content_management' = ANY(admins.permissions)
    )
  )
);

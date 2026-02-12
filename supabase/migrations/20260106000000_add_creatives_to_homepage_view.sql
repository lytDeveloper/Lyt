-- Add creatives to homepage_new_brands_artists view
-- 홈페이지에 새로운 크리에이티브도 표시되도록 뷰 수정

DROP VIEW IF EXISTS homepage_new_brands_artists;

CREATE OR REPLACE VIEW homepage_new_brands_artists AS
-- 브랜드 (승인된 것만)
SELECT
    pb.profile_id AS id,
    pb.brand_name AS name,
    'brand'::text AS role,
    pb.logo_image_url,
    pb.activity_field AS category_field,
    pb.created_at
FROM public.profile_brands pb
WHERE pb.is_active = true AND pb.approval_status = 'approved'

UNION ALL

-- 아티스트 (파트너로 분류)
SELECT
    pa.profile_id AS id,
    pa.artist_name AS name,
    'partner'::text AS role,
    pa.logo_image_url,
    pa.activity_field AS category_field,
    pa.created_at
FROM public.profile_artists pa
WHERE pa.is_active = true

UNION ALL

-- 크리에이티브 (파트너로 분류)
SELECT
    pc.profile_id AS id,
    pc.nickname AS name,
    'partner'::text AS role,
    pc.profile_image_url AS logo_image_url,
    pc.activity_field AS category_field,
    pc.created_at
FROM public.profile_creatives pc
WHERE pc.is_active = true;

-- 뷰에 대한 RLS 정책 (필요시)
COMMENT ON VIEW homepage_new_brands_artists IS '홈페이지 신규 브랜드/아티스트/크리에이티브 목록';

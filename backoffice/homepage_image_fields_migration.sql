-- 홈페이지 관리 테이블에 이미지 필드 추가
-- 실행일: 2024

-- 급상승 프로젝트에 이미지 URL 추가
ALTER TABLE homepage_trending_projects
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 추천 프로필에 이미지 URL 추가
ALTER TABLE homepage_recommended_profiles
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 새로운 브랜드/아티스트에 이미지 URL 추가
ALTER TABLE homepage_new_brands
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Bridge Magazine에 이미지 URL 추가
ALTER TABLE homepage_magazines
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 기존 데이터의 색상 필드는 유지되며, 이미지가 없을 때 fallback으로 사용됩니다.












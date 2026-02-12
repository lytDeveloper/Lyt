-- 매거진 테이블 수정: tag -> sub_title 변경, description 필드 추가

-- 1. tag 컬럼을 sub_title로 변경
ALTER TABLE homepage_magazines RENAME COLUMN tag TO sub_title;

-- 2. description 컬럼 추가
ALTER TABLE homepage_magazines ADD COLUMN IF NOT EXISTS description TEXT;

-- 완료!
-- 매거진 섹션은 이제:
-- - title (제목)
-- - sub_title (부제목)
-- - description (설명)
-- - image_url (이미지)
-- 을 사용합니다.
-- 이미지는 Supabase Storage의 homepage-images/magazines/ 폴더에 저장됩니다.


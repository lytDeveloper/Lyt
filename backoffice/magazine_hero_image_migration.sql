-- 매거진 테이블 hero 이미지 추가 마이그레이션
-- 기존 image_url을 thumbnail_url로 변경하고, 새로운 image_url(hero 이미지용) 추가

-- 1. 기존 image_url을 thumbnail_url로 이름 변경
ALTER TABLE homepage_magazines RENAME COLUMN image_url TO thumbnail_url;

-- 2. 새로운 image_url 컬럼 추가 (hero 이미지용, 세로로 긴 이미지)
ALTER TABLE homepage_magazines ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 완료!
-- 매거진 섹션은 이제:
-- - title (제목)
-- - sub_title (부제목)  
-- - description (설명)
-- - thumbnail_url (카드용 썸네일 이미지)
-- - image_url (상세 페이지용 hero 이미지, 세로 스크롤)
-- 을 사용합니다.
-- 이미지는 Supabase Storage의 homepage-images/magazines/ 폴더에 저장됩니다.


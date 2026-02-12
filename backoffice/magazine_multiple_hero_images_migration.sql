-- homepage_magazines 테이블의 image_url 컬럼을 TEXT[]로 변경하여 여러 세로 이미지 지원

-- 이 마이그레이션은 image_url을 단일 URL에서 배열로 변경합니다.
-- 기존 데이터는 자동으로 배열의 첫 번째 요소로 변환됩니다.

-- 1. 기존 데이터 백업용 임시 컬럼 생성
ALTER TABLE homepage_magazines ADD COLUMN IF NOT EXISTS image_url_backup TEXT;

-- 2. 기존 데이터를 백업 컬럼에 복사
UPDATE homepage_magazines SET image_url_backup = image_url WHERE image_url IS NOT NULL;

-- 3. 기존 image_url 컬럼 삭제
ALTER TABLE homepage_magazines DROP COLUMN IF EXISTS image_url;

-- 4. TEXT[] 타입의 새 image_url 컬럼 생성 (기본값 빈 배열)
ALTER TABLE homepage_magazines ADD COLUMN image_url TEXT[] DEFAULT '{}';

-- 5. 백업된 데이터를 배열 형태로 복원
UPDATE homepage_magazines 
SET image_url = ARRAY[image_url_backup] 
WHERE image_url_backup IS NOT NULL AND image_url_backup != '';

-- 6. 백업 컬럼 삭제
ALTER TABLE homepage_magazines DROP COLUMN IF EXISTS image_url_backup;

-- 완료!
-- 이제 관리자가 여러 세로 이미지를 업로드하여 긴 매거진 페이지를 만들 수 있습니다.
-- 이미지들은 순서대로 세로로 연결되어 표시됩니다.


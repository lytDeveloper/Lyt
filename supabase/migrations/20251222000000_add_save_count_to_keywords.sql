-- activity_field_keywords 테이블에 save_count 컬럼 추가
-- 새 키워드 입력 시 0으로 시작, 이후 입력 시 +1
-- save_count >= 5인 키워드만 검색 결과에 표시됨

ALTER TABLE activity_field_keywords
ADD COLUMN IF NOT EXISTS save_count integer DEFAULT 0 NOT NULL;

-- 기존 데이터는 save_count를 5로 설정 (검색 가능하도록)
UPDATE activity_field_keywords
SET save_count = 5
WHERE save_count = 0;

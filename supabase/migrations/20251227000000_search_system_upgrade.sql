-- =====================================================
-- Search System Upgrade Migration
-- =====================================================
-- Description: 검색 시스템 고도화 - 실시간 인기 검색어, 순위 변동, 최근 본 콘텐츠 서버 저장
-- Created: 2025-12-27
-- =====================================================

-- 1. 검색어 정규화 함수
CREATE OR REPLACE FUNCTION normalize_search_query(query TEXT)
RETURNS TEXT AS $$
BEGIN
  -- 소문자 변환, 앞뒤 공백 제거, 연속 공백을 단일 공백으로
  RETURN LOWER(TRIM(REGEXP_REPLACE(query, '\s+', ' ', 'g')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- 2. search_queries 테이블 (모든 검색 기록)
CREATE TABLE IF NOT EXISTS search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 검색어 정보
  query TEXT NOT NULL,
  normalized_query TEXT NOT NULL,

  -- 사용자 정보 (로그인 사용자만 기록)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 검색 컨텍스트
  search_type VARCHAR(50) NOT NULL DEFAULT 'all',

  -- 검색 결과
  result_count INTEGER DEFAULT 0,
  clicked_result_id UUID,
  clicked_result_type VARCHAR(50),

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 제약조건
  CONSTRAINT valid_search_type CHECK (search_type IN ('project', 'partner', 'collaboration', 'all')),
  CONSTRAINT valid_clicked_result_type CHECK (clicked_result_type IS NULL OR clicked_result_type IN ('project', 'partner', 'collaboration'))
);

-- search_queries 인덱스
CREATE INDEX IF NOT EXISTS idx_search_queries_normalized ON search_queries(normalized_query);
CREATE INDEX IF NOT EXISTS idx_search_queries_created ON search_queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_queries_user ON search_queries(user_id, created_at DESC);
-- 최근 검색어 조회용 복합 인덱스 (partial index 대신 일반 인덱스 사용)
CREATE INDEX IF NOT EXISTS idx_search_queries_recent ON search_queries(normalized_query, created_at DESC);

-- search_queries RLS
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own search queries"
  ON search_queries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search queries"
  ON search_queries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own search queries"
  ON search_queries FOR UPDATE
  USING (auth.uid() = user_id);


-- 3. trending_searches 테이블 (실시간 인기 검색어 캐싱)
CREATE TABLE IF NOT EXISTS trending_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 검색어 정보
  query TEXT NOT NULL,
  normalized_query TEXT NOT NULL UNIQUE,

  -- 시간별 검색 횟수
  search_count_1h INTEGER DEFAULT 0,
  search_count_24h INTEGER DEFAULT 0,
  search_count_7d INTEGER DEFAULT 0,

  -- 순위 정보
  rank_current INTEGER,
  rank_previous INTEGER,
  rank_change INTEGER DEFAULT 0,

  -- 트렌드 플래그
  is_rising BOOLEAN DEFAULT false,  -- 🔥 급상승 (순위 5단계 이상 상승)
  is_new BOOLEAN DEFAULT false,     -- NEW 배지 (24시간 이내 첫 등장)

  -- 타임스탬프
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_searched_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- trending_searches 인덱스
CREATE INDEX IF NOT EXISTS idx_trending_rank ON trending_searches(rank_current) WHERE rank_current IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trending_1h ON trending_searches(search_count_1h DESC);
CREATE INDEX IF NOT EXISTS idx_trending_rising ON trending_searches(is_rising) WHERE is_rising = true;
CREATE INDEX IF NOT EXISTS idx_trending_new ON trending_searches(is_new) WHERE is_new = true;

-- trending_searches RLS (모든 사용자 조회 가능)
ALTER TABLE trending_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view trending searches"
  ON trending_searches FOR SELECT
  USING (true);


-- 4. user_recently_viewed 테이블 (최근 본 콘텐츠)
CREATE TABLE IF NOT EXISTS user_recently_viewed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 사용자 정보
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 콘텐츠 정보
  item_id UUID NOT NULL,
  item_type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT,
  subtitle TEXT,

  -- 타임스탬프
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 제약조건
  CONSTRAINT valid_item_type CHECK (item_type IN ('project', 'partner', 'collaboration')),
  CONSTRAINT unique_user_item UNIQUE (user_id, item_id, item_type)
);

-- user_recently_viewed 인덱스
CREATE INDEX IF NOT EXISTS idx_recently_viewed_user ON user_recently_viewed(user_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_type ON user_recently_viewed(user_id, item_type, viewed_at DESC);

-- user_recently_viewed RLS
ALTER TABLE user_recently_viewed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recently viewed"
  ON user_recently_viewed FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recently viewed"
  ON user_recently_viewed FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recently viewed"
  ON user_recently_viewed FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recently viewed"
  ON user_recently_viewed FOR DELETE
  USING (auth.uid() = user_id);


-- 5. 실시간 검색어 업데이트 함수
CREATE OR REPLACE FUNCTION update_trending_searches()
RETURNS void AS $$
DECLARE
  min_search_count INTEGER := 3;  -- 최소 검색 횟수
BEGIN
  -- Step 1: 최근 1시간 검색어 집계하여 trending_searches 업데이트
  INSERT INTO trending_searches (query, normalized_query, search_count_1h, last_searched_at, first_seen_at)
  SELECT
    MAX(query) as query,  -- 원본 검색어 (가장 최근 것)
    normalized_query,
    COUNT(*) as count_1h,
    MAX(created_at) as last_searched,
    MIN(created_at) as first_seen
  FROM search_queries
  WHERE created_at > NOW() - INTERVAL '1 hour'
  GROUP BY normalized_query
  HAVING COUNT(*) >= min_search_count
  ON CONFLICT (normalized_query)
  DO UPDATE SET
    query = EXCLUDED.query,
    search_count_1h = EXCLUDED.search_count_1h,
    last_searched_at = EXCLUDED.last_searched_at,
    last_updated_at = NOW();

  -- Step 2: 24시간 검색 횟수 업데이트
  UPDATE trending_searches t
  SET search_count_24h = COALESCE((
    SELECT COUNT(*)
    FROM search_queries sq
    WHERE sq.normalized_query = t.normalized_query
      AND sq.created_at > NOW() - INTERVAL '24 hours'
  ), 0);

  -- Step 3: 7일 검색 횟수 업데이트
  UPDATE trending_searches t
  SET search_count_7d = COALESCE((
    SELECT COUNT(*)
    FROM search_queries sq
    WHERE sq.normalized_query = t.normalized_query
      AND sq.created_at > NOW() - INTERVAL '7 days'
  ), 0);

  -- Step 4: 순위 계산 (1시간 검색 횟수 기준)
  WITH ranked AS (
    SELECT
      id,
      ROW_NUMBER() OVER (ORDER BY search_count_1h DESC, last_searched_at DESC) as new_rank
    FROM trending_searches
    WHERE search_count_1h > 0
  )
  UPDATE trending_searches t
  SET
    rank_previous = rank_current,
    rank_current = r.new_rank,
    rank_change = COALESCE(rank_current, 999) - r.new_rank
  FROM ranked r
  WHERE t.id = r.id;

  -- Step 5: 검색 횟수 0인 항목 순위 제거
  UPDATE trending_searches
  SET rank_current = NULL, rank_previous = rank_current, rank_change = 0
  WHERE search_count_1h = 0;

  -- Step 6: 급상승 검색어 판정 (순위 5단계 이상 상승 또는 신규 진입 후 10위 이내)
  UPDATE trending_searches
  SET is_rising = (
    (rank_change >= 5) OR
    (rank_previous IS NULL AND rank_current IS NOT NULL AND rank_current <= 10)
  )
  WHERE rank_current IS NOT NULL;

  -- Step 7: 신규 검색어 판정 (24시간 이내 처음 등장 + 20위 이내)
  UPDATE trending_searches
  SET is_new = (
    first_seen_at > NOW() - INTERVAL '24 hours'
    AND rank_current IS NOT NULL
    AND rank_current <= 20
  );

  -- Step 8: 오래된 trending 데이터 정리 (7일 이상 검색 없음)
  DELETE FROM trending_searches
  WHERE last_searched_at < NOW() - INTERVAL '7 days'
    AND search_count_7d = 0;

END;
$$ LANGUAGE plpgsql;


-- 6. 오래된 검색 기록 정리 함수
CREATE OR REPLACE FUNCTION cleanup_old_search_queries()
RETURNS void AS $$
BEGIN
  -- 30일 이상 된 검색 쿼리 삭제
  DELETE FROM search_queries
  WHERE created_at < NOW() - INTERVAL '30 days';

  -- 90일 이상 된 최근 본 콘텐츠 삭제
  DELETE FROM user_recently_viewed
  WHERE viewed_at < NOW() - INTERVAL '90 days';

  -- 사용자별 최근 본 콘텐츠 타입당 최대 20개 유지
  DELETE FROM user_recently_viewed
  WHERE id IN (
    SELECT id FROM (
      SELECT id,
        ROW_NUMBER() OVER (PARTITION BY user_id, item_type ORDER BY viewed_at DESC) as rn
      FROM user_recently_viewed
    ) ranked
    WHERE rn > 20
  );
END;
$$ LANGUAGE plpgsql;


-- 7. 기존 search_history 데이터를 search_queries로 마이그레이션
INSERT INTO search_queries (user_id, query, normalized_query, search_type, created_at)
SELECT
  user_id,
  query,
  normalize_search_query(query) as normalized_query,
  COALESCE(search_type, 'all') as search_type,
  created_at
FROM search_history
WHERE query IS NOT NULL AND LENGTH(TRIM(query)) >= 2
ON CONFLICT DO NOTHING;


-- 8. 초기 trending_searches 데이터 생성
SELECT update_trending_searches();


-- 9. pg_cron 스케줄 설정 (Supabase에서 pg_cron 활성화 필요)
-- 참고: Supabase Dashboard > Database > Extensions에서 pg_cron 활성화 후 실행
-- SELECT cron.schedule('update-trending-searches', '*/5 * * * *', 'SELECT update_trending_searches()');
-- SELECT cron.schedule('cleanup-old-searches', '0 0 * * *', 'SELECT cleanup_old_search_queries()');


-- 10. 권한 설정
GRANT SELECT ON trending_searches TO anon;
GRANT SELECT ON trending_searches TO authenticated;
GRANT ALL ON trending_searches TO service_role;

GRANT SELECT, INSERT, UPDATE ON search_queries TO authenticated;
GRANT ALL ON search_queries TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON user_recently_viewed TO authenticated;
GRANT ALL ON user_recently_viewed TO service_role;

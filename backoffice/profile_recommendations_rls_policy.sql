-- ================================================================
-- RLS 정책: profile_artists 및 profile_creatives 테이블
-- 목적: Step7_Recommendation 페이지에서 추천 데이터를 조회할 수 있도록 설정
-- ================================================================

-- 기존 정책 제거 (있다면)
DROP POLICY IF EXISTS "Anyone can view artists" ON profile_artists;
DROP POLICY IF EXISTS "Anyone can view creatives" ON profile_creatives;
DROP POLICY IF EXISTS "Authenticated users can view artists" ON profile_artists;
DROP POLICY IF EXISTS "Authenticated users can view creatives" ON profile_creatives;

-- ================================================================
-- 옵션 1: 모든 사용자가 조회 가능 (추천)
-- 추천 시스템의 경우 일반적으로 모든 사용자가 아티스트/크리에이티브를
-- 볼 수 있어야 하므로 이 옵션을 권장합니다.
-- ================================================================

CREATE POLICY "Anyone can view artists"
ON profile_artists
FOR SELECT
USING (true);

CREATE POLICY "Anyone can view creatives"
ON profile_creatives
FOR SELECT
USING (true);

-- ================================================================
-- 옵션 2: 인증된 사용자만 조회 가능
-- 더 엄격한 보안이 필요한 경우 아래 정책을 대신 사용하세요.
-- 위의 옵션 1 정책을 주석 처리하고 아래 주석을 해제하세요.
-- ================================================================

-- CREATE POLICY "Authenticated users can view artists"
-- ON profile_artists
-- FOR SELECT
-- TO authenticated
-- USING (true);

-- CREATE POLICY "Authenticated users can view creatives"
-- ON profile_creatives
-- FOR SELECT
-- TO authenticated
-- USING (true);

-- ================================================================
-- RLS 활성화 확인
-- RLS가 활성화되어 있지 않다면 활성화합니다.
-- ================================================================

ALTER TABLE profile_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_creatives ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- 적용 후 테스트
-- ================================================================
-- 다음 쿼리로 정책이 제대로 적용되었는지 확인하세요:
--
-- SELECT * FROM profile_artists LIMIT 10;
-- SELECT * FROM profile_creatives LIMIT 10;
--
-- 데이터가 반환되면 RLS 정책이 올바르게 설정된 것입니다.
-- ================================================================

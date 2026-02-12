-- 중복 is_active=true 비팬 프로필 정리
-- 목적: 한 사용자가 여러 비팬 프로필(brand, artist, creative)에서 동시에 is_active=true인 경우 정리
-- 규칙: 가장 최근 수정된 프로필만 is_active=true 유지, 나머지는 false로 변경

-- =====================================================
-- 1. 먼저 중복 프로필 확인 (dry run)
-- =====================================================

-- 이 쿼리로 중복 프로필을 확인할 수 있습니다:
/*
SELECT
  p.id,
  p.nickname,
  b.brand_name,
  b.is_active as brand_active,
  b.updated_at as brand_updated,
  a.artist_name,
  a.is_active as artist_active,
  a.updated_at as artist_updated,
  c.nickname as creative_name,
  c.is_active as creative_active,
  c.updated_at as creative_updated
FROM profiles p
LEFT JOIN profile_brands b ON b.profile_id = p.id
LEFT JOIN profile_artists a ON a.profile_id = p.id
LEFT JOIN profile_creatives c ON c.profile_id = p.id
WHERE (
  CASE WHEN b.is_active = true THEN 1 ELSE 0 END +
  CASE WHEN a.is_active = true THEN 1 ELSE 0 END +
  CASE WHEN c.is_active = true THEN 1 ELSE 0 END
) > 1;
*/

-- =====================================================
-- 2. 중복 프로필 정리 (가장 최근 프로필만 유지)
-- =====================================================

-- 각 사용자별로 가장 최근에 업데이트된 프로필 타입을 결정
WITH latest_profile AS (
  SELECT
    user_id,
    profile_type,
    updated_at
  FROM (
    SELECT
      profile_id as user_id,
      'brand' as profile_type,
      COALESCE(updated_at, created_at) as updated_at
    FROM profile_brands
    WHERE is_active = true

    UNION ALL

    SELECT
      profile_id as user_id,
      'artist' as profile_type,
      COALESCE(updated_at, created_at) as updated_at
    FROM profile_artists
    WHERE is_active = true

    UNION ALL

    SELECT
      profile_id as user_id,
      'creative' as profile_type,
      COALESCE(updated_at, created_at) as updated_at
    FROM profile_creatives
    WHERE is_active = true
  ) all_active
),
-- 중복 활성 프로필이 있는 사용자만 선택
duplicate_users AS (
  SELECT user_id
  FROM latest_profile
  GROUP BY user_id
  HAVING COUNT(*) > 1
),
-- 각 중복 사용자별 가장 최근 프로필 결정
keep_active AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    profile_type
  FROM latest_profile
  WHERE user_id IN (SELECT user_id FROM duplicate_users)
  ORDER BY user_id, updated_at DESC NULLS LAST
)
-- 정리 대상 출력 (실제 업데이트 전 확인용)
SELECT
  du.user_id,
  p.nickname,
  ka.profile_type as keep_active_type,
  CASE WHEN ka.profile_type != 'brand' AND EXISTS(SELECT 1 FROM profile_brands WHERE profile_id = du.user_id AND is_active = true)
       THEN 'will deactivate brand' ELSE '' END as brand_action,
  CASE WHEN ka.profile_type != 'artist' AND EXISTS(SELECT 1 FROM profile_artists WHERE profile_id = du.user_id AND is_active = true)
       THEN 'will deactivate artist' ELSE '' END as artist_action,
  CASE WHEN ka.profile_type != 'creative' AND EXISTS(SELECT 1 FROM profile_creatives WHERE profile_id = du.user_id AND is_active = true)
       THEN 'will deactivate creative' ELSE '' END as creative_action
FROM duplicate_users du
JOIN profiles p ON p.id = du.user_id
JOIN keep_active ka ON ka.user_id = du.user_id;

-- =====================================================
-- 3. 실제 정리 실행 (위 쿼리 결과 확인 후 실행)
-- =====================================================

-- 중복 사용자의 brand 프로필 비활성화 (최신 프로필이 brand가 아닌 경우)
UPDATE profile_brands
SET is_active = false, updated_at = NOW()
WHERE profile_id IN (
  WITH latest_profile AS (
    SELECT
      user_id,
      profile_type,
      updated_at
    FROM (
      SELECT profile_id as user_id, 'brand' as profile_type, COALESCE(updated_at, created_at) as updated_at FROM profile_brands WHERE is_active = true
      UNION ALL
      SELECT profile_id as user_id, 'artist' as profile_type, COALESCE(updated_at, created_at) as updated_at FROM profile_artists WHERE is_active = true
      UNION ALL
      SELECT profile_id as user_id, 'creative' as profile_type, COALESCE(updated_at, created_at) as updated_at FROM profile_creatives WHERE is_active = true
    ) all_active
  ),
  duplicate_users AS (
    SELECT user_id FROM latest_profile GROUP BY user_id HAVING COUNT(*) > 1
  ),
  keep_active AS (
    SELECT DISTINCT ON (user_id) user_id, profile_type
    FROM latest_profile
    WHERE user_id IN (SELECT user_id FROM duplicate_users)
    ORDER BY user_id, updated_at DESC NULLS LAST
  )
  SELECT user_id FROM keep_active WHERE profile_type != 'brand'
)
AND is_active = true;

-- 중복 사용자의 artist 프로필 비활성화 (최신 프로필이 artist가 아닌 경우)
UPDATE profile_artists
SET is_active = false, updated_at = NOW()
WHERE profile_id IN (
  WITH latest_profile AS (
    SELECT
      user_id,
      profile_type,
      updated_at
    FROM (
      SELECT profile_id as user_id, 'brand' as profile_type, COALESCE(updated_at, created_at) as updated_at FROM profile_brands WHERE is_active = true
      UNION ALL
      SELECT profile_id as user_id, 'artist' as profile_type, COALESCE(updated_at, created_at) as updated_at FROM profile_artists WHERE is_active = true
      UNION ALL
      SELECT profile_id as user_id, 'creative' as profile_type, COALESCE(updated_at, created_at) as updated_at FROM profile_creatives WHERE is_active = true
    ) all_active
  ),
  duplicate_users AS (
    SELECT user_id FROM latest_profile GROUP BY user_id HAVING COUNT(*) > 1
  ),
  keep_active AS (
    SELECT DISTINCT ON (user_id) user_id, profile_type
    FROM latest_profile
    WHERE user_id IN (SELECT user_id FROM duplicate_users)
    ORDER BY user_id, updated_at DESC NULLS LAST
  )
  SELECT user_id FROM keep_active WHERE profile_type != 'artist'
)
AND is_active = true;

-- 중복 사용자의 creative 프로필 비활성화 (최신 프로필이 creative가 아닌 경우)
UPDATE profile_creatives
SET is_active = false, updated_at = NOW()
WHERE profile_id IN (
  WITH latest_profile AS (
    SELECT
      user_id,
      profile_type,
      updated_at
    FROM (
      SELECT profile_id as user_id, 'brand' as profile_type, COALESCE(updated_at, created_at) as updated_at FROM profile_brands WHERE is_active = true
      UNION ALL
      SELECT profile_id as user_id, 'artist' as profile_type, COALESCE(updated_at, created_at) as updated_at FROM profile_artists WHERE is_active = true
      UNION ALL
      SELECT profile_id as user_id, 'creative' as profile_type, COALESCE(updated_at, created_at) as updated_at FROM profile_creatives WHERE is_active = true
    ) all_active
  ),
  duplicate_users AS (
    SELECT user_id FROM latest_profile GROUP BY user_id HAVING COUNT(*) > 1
  ),
  keep_active AS (
    SELECT DISTINCT ON (user_id) user_id, profile_type
    FROM latest_profile
    WHERE user_id IN (SELECT user_id FROM duplicate_users)
    ORDER BY user_id, updated_at DESC NULLS LAST
  )
  SELECT user_id FROM keep_active WHERE profile_type != 'creative'
)
AND is_active = true;

-- =====================================================
-- 4. 정리 결과 확인
-- =====================================================

-- 정리 후 중복 프로필이 없는지 확인:
/*
SELECT
  p.id,
  p.nickname,
  (SELECT is_active FROM profile_brands WHERE profile_id = p.id) as brand_active,
  (SELECT is_active FROM profile_artists WHERE profile_id = p.id) as artist_active,
  (SELECT is_active FROM profile_creatives WHERE profile_id = p.id) as creative_active
FROM profiles p
WHERE (
  COALESCE((SELECT COUNT(*) FROM profile_brands WHERE profile_id = p.id AND is_active = true), 0) +
  COALESCE((SELECT COUNT(*) FROM profile_artists WHERE profile_id = p.id AND is_active = true), 0) +
  COALESCE((SELECT COUNT(*) FROM profile_creatives WHERE profile_id = p.id AND is_active = true), 0)
) > 1;
-- 결과가 0건이면 정상
*/

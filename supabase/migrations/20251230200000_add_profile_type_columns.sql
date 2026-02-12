-- 프로필별 데이터 분리를 위한 profile_type 컬럼 추가
-- 목적: 프로필 전환 시 알림, 채팅, 초대 등이 각 프로필에 귀속되도록 함

-- =====================================================
-- 1. user_notifications 테이블
-- =====================================================

-- 수신자/발신자의 프로필 타입 컬럼 추가
ALTER TABLE user_notifications
  ADD COLUMN IF NOT EXISTS receiver_profile_type TEXT,
  ADD COLUMN IF NOT EXISTS sender_profile_type TEXT;

-- 인덱스 추가 (프로필 타입별 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_user_notifications_receiver_profile
  ON user_notifications(receiver_id, receiver_profile_type);

COMMENT ON COLUMN user_notifications.receiver_profile_type IS '수신자의 프로필 타입 (brand, artist, creative, fan)';
COMMENT ON COLUMN user_notifications.sender_profile_type IS '발신자의 프로필 타입 (brand, artist, creative, fan)';

-- =====================================================
-- 2. chat_participants 테이블
-- =====================================================

-- 참여자의 프로필 타입 컬럼 추가
ALTER TABLE chat_participants
  ADD COLUMN IF NOT EXISTS profile_type TEXT;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_chat_participants_profile
  ON chat_participants(user_id, profile_type);

COMMENT ON COLUMN chat_participants.profile_type IS '채팅 참여 시점의 프로필 타입';

-- =====================================================
-- 3. invitations 테이블
-- =====================================================

-- 발신자/수신자의 프로필 타입 컬럼 추가
ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS sender_profile_type TEXT,
  ADD COLUMN IF NOT EXISTS receiver_profile_type TEXT;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_invitations_sender_profile
  ON invitations(sender_id, sender_profile_type);

CREATE INDEX IF NOT EXISTS idx_invitations_receiver_profile
  ON invitations(receiver_id, receiver_profile_type);

COMMENT ON COLUMN invitations.sender_profile_type IS '초대 발신자의 프로필 타입';
COMMENT ON COLUMN invitations.receiver_profile_type IS '초대 수신자의 프로필 타입';

-- =====================================================
-- 4. project_applications 테이블 (존재하는 경우)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_applications') THEN
    ALTER TABLE project_applications
      ADD COLUMN IF NOT EXISTS applicant_profile_type TEXT;

    CREATE INDEX IF NOT EXISTS idx_project_applications_profile
      ON project_applications(applicant_id, applicant_profile_type);
  END IF;
END $$;

-- =====================================================
-- 5. collaboration_applications 테이블 (존재하는 경우)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collaboration_applications') THEN
    ALTER TABLE collaboration_applications
      ADD COLUMN IF NOT EXISTS applicant_profile_type TEXT;

    CREATE INDEX IF NOT EXISTS idx_collaboration_applications_profile
      ON collaboration_applications(applicant_id, applicant_profile_type);
  END IF;
END $$;

-- =====================================================
-- 6. 기존 데이터 마이그레이션 전략
-- =====================================================

-- ⚠️ 중요: 기존 데이터는 NULL로 유지하는 것이 안전합니다.
--
-- 이유:
-- 1. 사용자가 fan + nonfan 프로필을 동시에 보유할 수 있음
-- 2. 알림 생성 시점의 "어떤 프로필로 받았어야 하는지" 알 수 없음
-- 3. NULL은 모든 프로필에서 보이므로 기존 알림이 누락되지 않음
--
-- 프론트엔드 필터링 로직:
-- - fan 프로필: 모든 알림 표시 (profile_type 필터 없이)
-- - nonfan 프로필: 해당 타입 알림 + NULL 알림 표시
--
-- 따라서 기존 데이터 UPDATE는 생략합니다.
-- 새로 생성되는 알림만 알림 생성 시점에 올바른 profile_type이 설정됩니다.

-- =====================================================
-- 7. 알림 타입별 profile_type 결정 가이드 (참고용)
-- =====================================================

-- 새 알림 생성 시 아래 기준으로 profile_type 설정:
--
-- | 알림 타입 (type)       | receiver_profile_type      | 설명                    |
-- |----------------------|---------------------------|------------------------|
-- | invitation           | 수신자의 활성 nonfan 프로필  | 초대는 nonfan으로 수신    |
-- | application          | 수신자의 활성 nonfan 프로필  | 지원 관련 알림           |
-- | application_accepted | 발신자의 활성 nonfan 프로필  | 지원 수락 알림           |
-- | message              | 채팅방 참여 시 프로필        | 채팅 관련               |
-- | follow               | 팔로우 받은 프로필          | 프로필 소유자로서 수신    |
-- | like                 | 콘텐츠 작성 시 프로필        | 해당 콘텐츠 작성자로서    |
-- | talk_request         | 수신자의 활성 nonfan 프로필  | 대화 요청               |

-- 초대 테이블만 마이그레이션 (초대는 명확히 nonfan 프로필 간 발생)
-- sender_profile_type: 초대 발신자 (보통 brand)
UPDATE invitations inv
SET sender_profile_type = (
  SELECT
    CASE
      WHEN EXISTS(SELECT 1 FROM profile_brands WHERE profile_id = inv.sender_id AND is_active = true) THEN 'brand'
      WHEN EXISTS(SELECT 1 FROM profile_artists WHERE profile_id = inv.sender_id AND is_active = true) THEN 'artist'
      WHEN EXISTS(SELECT 1 FROM profile_creatives WHERE profile_id = inv.sender_id AND is_active = true) THEN 'creative'
      ELSE NULL
    END
)
WHERE sender_profile_type IS NULL;

-- receiver_profile_type: 초대 수신자 (보통 artist/creative)
UPDATE invitations inv
SET receiver_profile_type = (
  SELECT
    CASE
      WHEN EXISTS(SELECT 1 FROM profile_brands WHERE profile_id = inv.receiver_id AND is_active = true) THEN 'brand'
      WHEN EXISTS(SELECT 1 FROM profile_artists WHERE profile_id = inv.receiver_id AND is_active = true) THEN 'artist'
      WHEN EXISTS(SELECT 1 FROM profile_creatives WHERE profile_id = inv.receiver_id AND is_active = true) THEN 'creative'
      ELSE NULL
    END
)
WHERE receiver_profile_type IS NULL;

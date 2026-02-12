-- ============================================================================
-- Notification Settings Enhancement Migration
-- 푸시 알림 전역 설정 및 방해금지 모드를 위한 테이블 생성
-- ============================================================================

-- 1. 푸시/방해금지 설정 테이블 생성
CREATE TABLE IF NOT EXISTS "public"."user_push_settings" (
  "user_id" UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "push_enabled" BOOLEAN NOT NULL DEFAULT true,
  "quiet_mode_enabled" BOOLEAN NOT NULL DEFAULT false,
  "quiet_start_time" TIME NOT NULL DEFAULT '22:00',
  "quiet_end_time" TIME NOT NULL DEFAULT '08:00',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. RLS 활성화
ALTER TABLE "public"."user_push_settings" ENABLE ROW LEVEL SECURITY;

-- 3. RLS 정책: 사용자는 자신의 설정만 조회/수정 가능
CREATE POLICY "Users can view own push settings" 
  ON "public"."user_push_settings"
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push settings" 
  ON "public"."user_push_settings"
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push settings" 
  ON "public"."user_push_settings"
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- 4. 인덱스 (user_id는 PK이므로 자동 인덱싱됨)

-- 5. 권한 부여
GRANT SELECT, INSERT, UPDATE ON "public"."user_push_settings" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."user_push_settings" TO service_role;

-- 6. UserNotificationType에 추가할 새로운 타입들을 위한 기본 설정
-- (user_notification_settings 테이블에 저장되며, 미존재시 기본값 true로 처리)
-- 신규 타입: project_update, project_complete, mention, group_message, security, marketing

COMMENT ON TABLE "public"."user_push_settings" IS '사용자별 푸시 알림 전역 설정 및 방해금지 모드 설정';
COMMENT ON COLUMN "public"."user_push_settings"."push_enabled" IS '푸시 알림 전역 ON/OFF';
COMMENT ON COLUMN "public"."user_push_settings"."quiet_mode_enabled" IS '방해금지 모드 ON/OFF';
COMMENT ON COLUMN "public"."user_push_settings"."quiet_start_time" IS '방해금지 시작 시간 (HH:MM)';
COMMENT ON COLUMN "public"."user_push_settings"."quiet_end_time" IS '방해금지 종료 시간 (HH:MM)';

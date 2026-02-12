-- ============================================================================
-- Scheduled Activity Reminders Cron Job
-- 매일 아침 9시(KST)에 마감 임박 및 초대 대기 알림을 체크하는 스케줄러
-- ============================================================================

-- pg_cron extension 활성화 (이미 활성화되어 있을 수 있음)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 기존 스케줄 제거 (있다면)
SELECT cron.unschedule('scheduled-activity-reminders')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'scheduled-activity-reminders'
);

-- 매일 아침 9시(KST = UTC+9, 즉 UTC 00:00)에 Edge Function 호출
-- Supabase에서 pg_cron은 Edge Function을 직접 호출하지 못하므로
-- 대신 pg_net을 사용하여 HTTP 요청을 보내거나
-- 또는 외부 스케줄러(GitHub Actions, Cloud Scheduler 등)를 사용해야 함

-- 옵션 1: pg_net을 사용한 HTTP 호출 (pg_net extension 필요)
-- CREATE EXTENSION IF NOT EXISTS pg_net;
-- SELECT cron.schedule(
--   'scheduled-activity-reminders',
--   '0 0 * * *', -- 매일 UTC 00:00 (KST 09:00)
--   $$
--   SELECT net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/scheduled-activity-reminders',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- 옵션 2: 데이터베이스 트리거 기반 (권장)
-- 대신 직접 user_activities 테이블에 삽입하는 함수 생성

-- 마감 임박 프로젝트 체크 함수
CREATE OR REPLACE FUNCTION check_deadline_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  now_ts TIMESTAMPTZ := NOW();
  in_24h TIMESTAMPTZ := NOW() + INTERVAL '24 hours';
  today_date DATE := CURRENT_DATE;
  project_rec RECORD;
  collab_rec RECORD;
BEGIN
  -- 프로젝트 마감 임박 체크
  FOR project_rec IN
    SELECT id, title, created_by, deadline
    FROM projects
    WHERE status IN ('open', 'in_progress')
      AND deadline IS NOT NULL
      AND deadline >= now_ts
      AND deadline <= in_24h
  LOOP
    -- 오늘 이미 알림을 보냈는지 확인
    IF NOT EXISTS (
      SELECT 1 FROM user_activities
      WHERE user_id = project_rec.created_by
        AND activity_type = 'workflow_deadline_approaching'
        AND related_entity_id = project_rec.id
        AND created_at::date = today_date
    ) THEN
      INSERT INTO user_activities (
        user_id, activity_type, related_entity_type, related_entity_id,
        title, description, metadata
      ) VALUES (
        project_rec.created_by,
        'workflow_deadline_approaching',
        'project',
        project_rec.id,
        '프로젝트 마감이 임박했습니다',
        project_rec.title,
        jsonb_build_object(
          'deadline', project_rec.deadline,
          'hours_remaining', EXTRACT(EPOCH FROM (project_rec.deadline - now_ts)) / 3600
        )
      );
    END IF;
  END LOOP;

  -- 협업 마감 임박 체크
  FOR collab_rec IN
    SELECT id, title, created_by, deadline
    FROM collaborations
    WHERE status IN ('open', 'in_progress')
      AND deadline IS NOT NULL
      AND deadline >= now_ts
      AND deadline <= in_24h
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM user_activities
      WHERE user_id = collab_rec.created_by
        AND activity_type = 'workflow_deadline_approaching'
        AND related_entity_id = collab_rec.id
        AND created_at::date = today_date
    ) THEN
      INSERT INTO user_activities (
        user_id, activity_type, related_entity_type, related_entity_id,
        title, description, metadata
      ) VALUES (
        collab_rec.created_by,
        'workflow_deadline_approaching',
        'collaboration',
        collab_rec.id,
        '협업 마감이 임박했습니다',
        collab_rec.title,
        jsonb_build_object(
          'deadline', collab_rec.deadline,
          'hours_remaining', EXTRACT(EPOCH FROM (collab_rec.deadline - now_ts)) / 3600
        )
      );
    END IF;
  END LOOP;
END;
$$;

-- 초대 대기 체크 함수
CREATE OR REPLACE FUNCTION check_invitation_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  two_days_ago TIMESTAMPTZ := NOW() - INTERVAL '2 days';
  today_date DATE := CURRENT_DATE;
  inv_rec RECORD;
BEGIN
  -- 프로젝트 초대 대기 체크
  FOR inv_rec IN
    SELECT pi.id, pi.invitee_id, pi.project_id, pi.sent_date, p.title
    FROM project_invitations pi
    JOIN projects p ON p.id = pi.project_id
    WHERE pi.status = 'pending'
      AND pi.sent_date <= two_days_ago
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM user_activities
      WHERE user_id = inv_rec.invitee_id
        AND activity_type = 'invitation_pending_reminder'
        AND related_entity_id = inv_rec.project_id
        AND created_at::date = today_date
    ) THEN
      INSERT INTO user_activities (
        user_id, activity_type, related_entity_type, related_entity_id,
        title, description, metadata
      ) VALUES (
        inv_rec.invitee_id,
        'invitation_pending_reminder',
        'project',
        inv_rec.project_id,
        '응답 대기 중인 프로젝트 초대가 있습니다',
        inv_rec.title,
        jsonb_build_object(
          'invitation_id', inv_rec.id,
          'sent_date', inv_rec.sent_date,
          'days_pending', EXTRACT(DAY FROM (NOW() - inv_rec.sent_date))
        )
      );
    END IF;
  END LOOP;

  -- 협업 초대 대기 체크
  FOR inv_rec IN
    SELECT ci.id, ci.invitee_id, ci.collaboration_id, ci.sent_date, c.title
    FROM collaboration_invitations ci
    JOIN collaborations c ON c.id = ci.collaboration_id
    WHERE ci.status = 'pending'
      AND ci.sent_date <= two_days_ago
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM user_activities
      WHERE user_id = inv_rec.invitee_id
        AND activity_type = 'invitation_pending_reminder'
        AND related_entity_id = inv_rec.collaboration_id
        AND created_at::date = today_date
    ) THEN
      INSERT INTO user_activities (
        user_id, activity_type, related_entity_type, related_entity_id,
        title, description, metadata
      ) VALUES (
        inv_rec.invitee_id,
        'invitation_pending_reminder',
        'collaboration',
        inv_rec.collaboration_id,
        '응답 대기 중인 협업 초대가 있습니다',
        inv_rec.title,
        jsonb_build_object(
          'invitation_id', inv_rec.id,
          'sent_date', inv_rec.sent_date,
          'days_pending', EXTRACT(DAY FROM (NOW() - inv_rec.sent_date))
        )
      );
    END IF;
  END LOOP;
END;
$$;

-- 모든 리마인더를 실행하는 통합 함수
CREATE OR REPLACE FUNCTION run_scheduled_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM check_deadline_reminders();
  PERFORM check_invitation_reminders();
END;
$$;

-- pg_cron 스케줄 등록 (매일 UTC 00:00 = KST 09:00)
-- 주의: pg_cron은 Supabase Pro 플랜 이상에서만 사용 가능
-- Free 플랜에서는 외부 스케줄러(GitHub Actions 등)를 사용해야 함

-- SELECT cron.schedule(
--   'scheduled-activity-reminders',
--   '0 0 * * *',
--   'SELECT run_scheduled_reminders();'
-- );

-- 코멘트: 위 스케줄러를 활성화하려면 주석을 해제하세요.
-- Supabase Dashboard > SQL Editor에서 직접 실행하거나
-- 마이그레이션 적용 후 수동으로 활성화할 수 있습니다.

COMMENT ON FUNCTION run_scheduled_reminders() IS '매일 실행하여 마감 임박 및 초대 대기 알림을 user_activities에 기록';

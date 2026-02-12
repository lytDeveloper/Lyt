-- ============================================================================
-- 마감 임박 알림 Cron Job 업데이트
-- 1. 프로젝트/협업 마감 임박 → 전체 멤버에게 알림
-- 2. 워크플로우 스텝 마감 임박 → personInCharge에게 알림
-- ============================================================================

-- 마감 임박 프로젝트/협업 체크 함수 (전체 멤버에게 알림)
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
  member_rec RECORD;
  step_rec RECORD;
BEGIN
  -- ===============================================================
  -- 1. 프로젝트 마감 임박 체크 (전체 멤버에게 알림)
  -- ===============================================================
  FOR project_rec IN
    SELECT id, title, created_by, deadline
    FROM projects
    WHERE status IN ('open', 'in_progress')
      AND deadline IS NOT NULL
      AND deadline >= now_ts
      AND deadline <= in_24h
  LOOP
    -- 프로젝트 생성자에게 알림
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
        project_rec.title || ' 마감이 임박했어요',
        '',
        jsonb_build_object(
          'deadline', project_rec.deadline,
          'hours_remaining', EXTRACT(EPOCH FROM (project_rec.deadline - now_ts)) / 3600,
          'project_title', project_rec.title
        )
      );
    END IF;

    -- 프로젝트 멤버들에게 알림
    FOR member_rec IN
      SELECT user_id FROM project_members
      WHERE project_id = project_rec.id
        AND status = 'active'
        AND user_id != project_rec.created_by
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM user_activities
        WHERE user_id = member_rec.user_id
          AND activity_type = 'workflow_deadline_approaching'
          AND related_entity_id = project_rec.id
          AND created_at::date = today_date
      ) THEN
        INSERT INTO user_activities (
          user_id, activity_type, related_entity_type, related_entity_id,
          title, description, metadata
        ) VALUES (
          member_rec.user_id,
          'workflow_deadline_approaching',
          'project',
          project_rec.id,
          project_rec.title || ' 마감이 임박했어요',
          '',
          jsonb_build_object(
            'deadline', project_rec.deadline,
            'hours_remaining', EXTRACT(EPOCH FROM (project_rec.deadline - now_ts)) / 3600,
            'project_title', project_rec.title
          )
        );
      END IF;
    END LOOP;
  END LOOP;

  -- ===============================================================
  -- 2. 협업 마감 임박 체크 (전체 멤버에게 알림)
  -- ===============================================================
  FOR collab_rec IN
    SELECT id, title, created_by, deadline
    FROM collaborations
    WHERE status IN ('open', 'in_progress')
      AND deadline IS NOT NULL
      AND deadline >= now_ts
      AND deadline <= in_24h
  LOOP
    -- 협업 생성자에게 알림
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
        collab_rec.title || ' 마감이 임박했어요',
        '',
        jsonb_build_object(
          'deadline', collab_rec.deadline,
          'hours_remaining', EXTRACT(EPOCH FROM (collab_rec.deadline - now_ts)) / 3600,
          'collaboration_title', collab_rec.title
        )
      );
    END IF;

    -- 협업 멤버들에게 알림
    FOR member_rec IN
      SELECT user_id FROM collaboration_members
      WHERE collaboration_id = collab_rec.id
        AND status = 'active'
        AND user_id != collab_rec.created_by
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM user_activities
        WHERE user_id = member_rec.user_id
          AND activity_type = 'workflow_deadline_approaching'
          AND related_entity_id = collab_rec.id
          AND created_at::date = today_date
      ) THEN
        INSERT INTO user_activities (
          user_id, activity_type, related_entity_type, related_entity_id,
          title, description, metadata
        ) VALUES (
          member_rec.user_id,
          'workflow_deadline_approaching',
          'collaboration',
          collab_rec.id,
          collab_rec.title || ' 마감이 임박했어요',
          '',
          jsonb_build_object(
            'deadline', collab_rec.deadline,
            'hours_remaining', EXTRACT(EPOCH FROM (collab_rec.deadline - now_ts)) / 3600,
            'collaboration_title', collab_rec.title
          )
        );
      END IF;
    END LOOP;
  END LOOP;

  -- ===============================================================
  -- 3. 워크플로우 스텝 마감 임박 체크 (personInCharge에게 알림)
  -- 프로젝트의 workflow_steps JSONB 배열에서 deadline이 있는 스텝 체크
  -- ===============================================================
  FOR step_rec IN
    SELECT 
      p.id as project_id,
      p.title as project_title,
      (step->>'name') as step_name,
      (step->>'personInCharge') as person_in_charge,
      (step->>'deadline')::timestamptz as step_deadline
    FROM projects p,
    LATERAL jsonb_array_elements(COALESCE(p.workflow_steps, '[]'::jsonb)) AS step
    WHERE p.status IN ('open', 'in_progress')
      AND step->>'deadline' IS NOT NULL
      AND (step->>'isCompleted')::boolean IS NOT TRUE
      AND (step->>'personInCharge') IS NOT NULL
      AND (step->>'deadline')::timestamptz >= now_ts
      AND (step->>'deadline')::timestamptz <= in_24h
  LOOP
    IF step_rec.person_in_charge IS NOT NULL AND step_rec.person_in_charge != '' THEN
      IF NOT EXISTS (
        SELECT 1 FROM user_activities
        WHERE user_id = step_rec.person_in_charge
          AND activity_type = 'workflow_deadline_approaching'
          AND related_entity_id = step_rec.project_id
          AND metadata->>'step_name' = step_rec.step_name
          AND created_at::date = today_date
      ) THEN
        INSERT INTO user_activities (
          user_id, activity_type, related_entity_type, related_entity_id,
          title, description, metadata
        ) VALUES (
          step_rec.person_in_charge,
          'workflow_deadline_approaching',
          'project',
          step_rec.project_id,
          step_rec.project_title || '에서 작업 ' || step_rec.step_name || ' 마감이 임박했어요',
          step_rec.step_name,
          jsonb_build_object(
            'deadline', step_rec.step_deadline,
            'hours_remaining', EXTRACT(EPOCH FROM (step_rec.step_deadline - now_ts)) / 3600,
            'project_title', step_rec.project_title,
            'step_name', step_rec.step_name,
            'is_workflow_step', true
          )
        );
      END IF;
    END IF;
  END LOOP;

  -- 협업 워크플로우 스텝 마감 임박 체크
  FOR step_rec IN
    SELECT 
      c.id as collaboration_id,
      c.title as collaboration_title,
      (step->>'name') as step_name,
      (step->>'personInCharge') as person_in_charge,
      (step->>'deadline')::timestamptz as step_deadline
    FROM collaborations c,
    LATERAL jsonb_array_elements(COALESCE(c.workflow_steps, '[]'::jsonb)) AS step
    WHERE c.status IN ('open', 'in_progress')
      AND step->>'deadline' IS NOT NULL
      AND (step->>'isCompleted')::boolean IS NOT TRUE
      AND (step->>'personInCharge') IS NOT NULL
      AND (step->>'deadline')::timestamptz >= now_ts
      AND (step->>'deadline')::timestamptz <= in_24h
  LOOP
    IF step_rec.person_in_charge IS NOT NULL AND step_rec.person_in_charge != '' THEN
      IF NOT EXISTS (
        SELECT 1 FROM user_activities
        WHERE user_id = step_rec.person_in_charge
          AND activity_type = 'workflow_deadline_approaching'
          AND related_entity_id = step_rec.collaboration_id
          AND metadata->>'step_name' = step_rec.step_name
          AND created_at::date = today_date
      ) THEN
        INSERT INTO user_activities (
          user_id, activity_type, related_entity_type, related_entity_id,
          title, description, metadata
        ) VALUES (
          step_rec.person_in_charge,
          'workflow_deadline_approaching',
          'collaboration',
          step_rec.collaboration_id,
          step_rec.collaboration_title || '에서 작업 ' || step_rec.step_name || ' 마감이 임박했어요',
          step_rec.step_name,
          jsonb_build_object(
            'deadline', step_rec.step_deadline,
            'hours_remaining', EXTRACT(EPOCH FROM (step_rec.step_deadline - now_ts)) / 3600,
            'collaboration_title', step_rec.collaboration_title,
            'step_name', step_rec.step_name,
            'is_workflow_step', true
          )
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION check_deadline_reminders() IS '마감 임박 알림: 프로젝트/협업 전체 멤버 + 워크플로우 스텝 personInCharge';

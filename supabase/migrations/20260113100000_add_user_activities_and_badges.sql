-- =====================================================
-- 사용자 활동 기록 시스템 및 배지 자동 할당 마이그레이션
-- =====================================================

-- 1. user_activities 테이블 (활동 로그)
CREATE TABLE IF NOT EXISTS public.user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- 활동 유형
  activity_type TEXT NOT NULL,
  -- 유형 목록:
  -- 프로젝트/협업: project_completed, collaboration_completed, workflow_deadline_approaching,
  --               workflow_step_completed, workflow_step_updated, member_added, file_shared
  -- 커뮤니티: comment_received, reply_received, cheer_received, invitation_pending_reminder,
  --          talk_request_accepted, partnership_inquiry_accepted
  -- 피드백/평판: review_received, new_follower, profile_views_spike
  -- 성취: badge_earned

  -- 관련 엔티티 정보
  related_entity_type TEXT, -- 'project', 'collaboration', 'review', 'user', 'badge', etc.
  related_entity_id UUID,

  -- 활동 내용
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT now(),

  -- 읽음 상태
  is_read BOOLEAN DEFAULT false
);

-- user_activities 인덱스
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_created ON user_activities(user_id, created_at DESC);

-- user_activities RLS
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activities" ON user_activities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activities" ON user_activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activities" ON user_activities
  FOR UPDATE USING (auth.uid() = user_id);

-- 서비스 역할도 활동 삽입 가능하도록
CREATE POLICY "Service role can insert activities" ON user_activities
  FOR INSERT WITH CHECK (true);


-- 2. user_login_streaks 테이블 (로그인 스트릭)
CREATE TABLE IF NOT EXISTS public.user_login_streaks (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_login_date DATE NOT NULL DEFAULT CURRENT_DATE,
  streak_start_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- user_login_streaks RLS
ALTER TABLE user_login_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streak" ON user_login_streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streak" ON user_login_streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streak" ON user_login_streaks
  FOR UPDATE USING (auth.uid() = user_id);


-- 3. profile_views 테이블 (프로필 조회수 추적)
CREATE TABLE IF NOT EXISTS public.profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- NULL = 익명
  viewed_at TIMESTAMPTZ DEFAULT now()
);

-- profile_views 인덱스
CREATE INDEX IF NOT EXISTS idx_profile_views_profile ON profile_views(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_at ON profile_views(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_views_profile_date ON profile_views(profile_id, viewed_at DESC);

-- 하루에 같은 viewer가 같은 profile을 여러 번 봐도 한 번만 카운트하기 위한 unique constraint
-- PostgreSQL에서 date 타입으로 캐스팅하여 unique 제약조건 생성
CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_views_unique_daily
  ON profile_views(profile_id, viewer_id, (viewed_at::date))
  WHERE viewer_id IS NOT NULL;

-- profile_views RLS
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profile owners can view their stats" ON profile_views
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Anyone can insert profile views" ON profile_views
  FOR INSERT WITH CHECK (true);


-- 4. 배지 마스터 데이터 삽입 (기존 badges 테이블 사용)
-- 기존 배지가 없는 경우에만 삽입
INSERT INTO badges (id, name, icon, description) VALUES
  ('badge-connector', '연결고리', 'link', 'SSO 로그인을 완료했습니다')
ON CONFLICT (id) DO NOTHING;

INSERT INTO badges (id, name, icon, description) VALUES
  ('badge-profile', '프로필 완성', 'person_check', '온보딩을 완료하고 프로필을 만들었습니다')
ON CONFLICT (id) DO NOTHING;

INSERT INTO badges (id, name, icon, description) VALUES
  ('badge-communicator', '소통왕', 'chat', '커뮤니티에서 10개 이상의 댓글을 작성했습니다')
ON CONFLICT (id) DO NOTHING;

INSERT INTO badges (id, name, icon, description) VALUES
  ('badge-project-master', '프로젝트 마스터', 'task_alt', '첫 번째 프로젝트를 성공적으로 완료했습니다')
ON CONFLICT (id) DO NOTHING;

INSERT INTO badges (id, name, icon, description) VALUES
  ('badge-collab-master', '협업 마스터', 'handshake', '첫 번째 협업을 성공적으로 완료했습니다')
ON CONFLICT (id) DO NOTHING;

INSERT INTO badges (id, name, icon, description) VALUES
  ('badge-link-maker', '연결 메이커', 'hub', '3명 이상의 파트너와 대화를 시작했습니다')
ON CONFLICT (id) DO NOTHING;

INSERT INTO badges (id, name, icon, description) VALUES
  ('badge-explorer', '기능 탐험가', 'explore', '프로젝트와 협업을 각각 1개 이상 완료했습니다')
ON CONFLICT (id) DO NOTHING;

INSERT INTO badges (id, name, icon, description) VALUES
  ('badge-persistent', '꾸준함의 힘', 'local_fire_department', '7일 연속으로 앱에 접속했습니다')
ON CONFLICT (id) DO NOTHING;

INSERT INTO badges (id, name, icon, description) VALUES
  ('badge-collector', '배지 수집가', 'emoji_events', '5개 이상의 배지를 획득했습니다')
ON CONFLICT (id) DO NOTHING;

INSERT INTO badges (id, name, icon, description) VALUES
  ('badge-representative', '대표유저', 'star', '20개 이상의 프로젝트/협업에 참여했습니다')
ON CONFLICT (id) DO NOTHING;


-- 5. 일별 프로필 조회수 집계 뷰 (성능 최적화용)
CREATE OR REPLACE VIEW profile_view_daily_stats AS
SELECT
  profile_id,
  viewed_at::date AS view_date,
  COUNT(*) AS daily_views
FROM profile_views
GROUP BY profile_id, viewed_at::date;


-- 6. 활동 기록 삽입 함수 (서비스에서 사용)
CREATE OR REPLACE FUNCTION insert_user_activity(
  p_user_id UUID,
  p_activity_type TEXT,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_related_entity_type TEXT DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO user_activities (
    user_id,
    activity_type,
    title,
    description,
    related_entity_type,
    related_entity_id,
    metadata
  ) VALUES (
    p_user_id,
    p_activity_type,
    p_title,
    p_description,
    p_related_entity_type,
    p_related_entity_id,
    p_metadata
  ) RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7. 로그인 스트릭 업데이트 함수
CREATE OR REPLACE FUNCTION update_login_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_existing RECORD;
  v_today DATE := CURRENT_DATE;
  v_diff_days INTEGER;
  v_new_streak INTEGER;
BEGIN
  -- 기존 스트릭 조회
  SELECT * INTO v_existing
  FROM user_login_streaks
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    -- 첫 로그인 - 새 레코드 생성
    INSERT INTO user_login_streaks (
      user_id, current_streak, longest_streak, last_login_date, streak_start_date
    ) VALUES (
      p_user_id, 1, 1, v_today, v_today
    );
    RETURN 1;
  END IF;

  -- 날짜 차이 계산
  v_diff_days := v_today - v_existing.last_login_date;

  IF v_diff_days = 0 THEN
    -- 오늘 이미 로그인
    RETURN v_existing.current_streak;
  ELSIF v_diff_days = 1 THEN
    -- 연속 로그인
    v_new_streak := v_existing.current_streak + 1;

    UPDATE user_login_streaks SET
      current_streak = v_new_streak,
      longest_streak = GREATEST(longest_streak, v_new_streak),
      last_login_date = v_today,
      updated_at = now()
    WHERE user_id = p_user_id;

    RETURN v_new_streak;
  ELSE
    -- 스트릭 끊김 - 리셋
    UPDATE user_login_streaks SET
      current_streak = 1,
      last_login_date = v_today,
      streak_start_date = v_today,
      updated_at = now()
    WHERE user_id = p_user_id;

    RETURN 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 8. 프로필 조회 기록 함수 (중복 방지 포함)
CREATE OR REPLACE FUNCTION record_profile_view(
  p_profile_id UUID,
  p_viewer_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  -- 자기 자신 조회는 기록하지 않음
  IF p_profile_id = p_viewer_id THEN
    RETURN FALSE;
  END IF;

  -- 중복 방지하며 삽입 시도
  INSERT INTO profile_views (profile_id, viewer_id)
  VALUES (p_profile_id, p_viewer_id)
  ON CONFLICT DO NOTHING;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 9. 프로필 조회수 급증 체크 함수
-- 오늘 조회수가 지난 7일 평균의 3배 이상이고 최소 10명 이상이면 급증으로 판단
CREATE OR REPLACE FUNCTION check_profile_views_spike(p_profile_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_seven_days_ago DATE := CURRENT_DATE - INTERVAL '7 days';
  v_today_views INTEGER;
  v_week_views INTEGER;
  v_avg_daily NUMERIC;
BEGIN
  -- 오늘 조회수
  SELECT COUNT(*) INTO v_today_views
  FROM profile_views
  WHERE profile_id = p_profile_id
    AND viewed_at::date = v_today;

  -- 지난 7일 조회수 (오늘 제외)
  SELECT COUNT(*) INTO v_week_views
  FROM profile_views
  WHERE profile_id = p_profile_id
    AND viewed_at::date >= v_seven_days_ago
    AND viewed_at::date < v_today;

  -- 일평균 계산
  v_avg_daily := v_week_views::NUMERIC / 7;

  -- 급증 판단: 오늘 >= 평균 * 3 AND 최소 10명
  RETURN v_today_views >= (v_avg_daily * 3) AND v_today_views >= 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

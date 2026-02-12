-- ============================================================================
-- BridgeApp Database Refactoring Proposal
-- Class Table Inheritance Pattern for Projects & Collaborations
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 상위 엔티티: activities (공통 필드 통합)
-- ----------------------------------------------------------------------------
CREATE TABLE activities (
  -- 기본 식별자
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_type VARCHAR(20) NOT NULL, -- 'project' or 'collaboration'
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- 기본 정보
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,

  -- 예산 정보 (공통)
  budget_min DECIMAL(12,2),
  budget_max DECIMAL(12,2),
  budget_currency VARCHAR(3) DEFAULT 'KRW',

  -- 일정 정보 (공통)
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  duration_months INTEGER,

  -- 상태 (공통)
  status VARCHAR(20) NOT NULL DEFAULT 'open',

  -- 요구사항 (공통)
  required_skills JSONB DEFAULT '[]',
  team_size INTEGER,
  min_experience_years INTEGER,

  -- 근무 정보 (공통)
  work_type VARCHAR(20) NOT NULL,
  location VARCHAR(200),

  -- 미디어 (공통)
  image_url TEXT,
  images JSONB DEFAULT '[]',
  video_url TEXT,

  -- 추가 정보 (공통)
  tags JSONB DEFAULT '[]',
  requirements TEXT,

  -- 통계 (공통)
  view_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0,
  application_count INTEGER DEFAULT 0,

  -- 플래그 (공통)
  is_featured BOOLEAN DEFAULT false,
  is_urgent BOOLEAN DEFAULT false,
  is_remote_friendly BOOLEAN DEFAULT false,
  visibility VARCHAR(20) DEFAULT 'public',

  -- 타임스탬프 (공통)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,

  -- 제약조건
  CONSTRAINT valid_activity_type CHECK (activity_type IN ('project', 'collaboration')),
  CONSTRAINT valid_budget CHECK (budget_max IS NULL OR budget_min IS NULL OR budget_max >= budget_min),
  CONSTRAINT valid_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'open', 'in_progress', 'completed', 'cancelled', 'on_hold')),
  CONSTRAINT valid_work_type CHECK (work_type IN ('remote', 'onsite', 'hybrid')),
  CONSTRAINT valid_visibility CHECK (visibility IN ('public', 'private', 'invited_only'))
);

-- 인덱스
CREATE INDEX idx_activities_type ON activities(activity_type);
CREATE INDEX idx_activities_creator ON activities(creator_id);
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_category ON activities(category);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);

-- ----------------------------------------------------------------------------
-- 2. 하위 엔티티: project_details (프로젝트 특화 필드)
-- ----------------------------------------------------------------------------
CREATE TABLE project_details (
  activity_id UUID PRIMARY KEY REFERENCES activities(id) ON DELETE CASCADE,

  -- 프로젝트 전용 예산
  budget_type VARCHAR(20) NOT NULL DEFAULT 'negotiable',

  -- 프로젝트 전용 일정
  deadline TIMESTAMP WITH TIME ZONE,

  -- 프로젝트 전용 계약/지불 정보
  deliverables TEXT,
  payment_terms TEXT,
  contract_type VARCHAR(50),

  -- 프로젝트 전용 통계
  proposal_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0, -- projects 테이블에만 있던 필드

  CONSTRAINT valid_budget_type CHECK (budget_type IN ('fixed', 'hourly', 'negotiable', 'equity'))
);

-- 인덱스
CREATE INDEX idx_project_details_deadline ON project_details(deadline);

-- ----------------------------------------------------------------------------
-- 3. 하위 엔티티: collaboration_details (협업 특화 필드)
-- ----------------------------------------------------------------------------
CREATE TABLE collaboration_details (
  activity_id UUID PRIMARY KEY REFERENCES activities(id) ON DELETE CASCADE,

  -- 협업 전용 유형
  collaboration_type VARCHAR(30) NOT NULL,

  -- 협업 전용 예산
  budget_range TEXT, -- "500만원~1000만원" 같은 텍스트

  -- 협업 전용 일정
  timeline VARCHAR(100), -- "3개월 예상" 같은 텍스트

  -- 협업 전용 팀 정보
  current_team_size INTEGER DEFAULT 1,

  -- 협업 전용 목표/결과
  goals TEXT,
  expected_outcome TEXT,
  profit_sharing TEXT,

  -- 협업 전용 통계
  invitation_count INTEGER DEFAULT 0,

  CONSTRAINT valid_collaboration_type CHECK (collaboration_type IN ('project_based', 'long_term', 'one_time', 'partnership')),
  CONSTRAINT valid_team_size CHECK (current_team_size <= (
    SELECT team_size FROM activities WHERE id = activity_id
  ) OR (SELECT team_size FROM activities WHERE id = activity_id) IS NULL)
);

-- 인덱스
CREATE INDEX idx_collaboration_details_type ON collaboration_details(collaboration_type);

-- ----------------------------------------------------------------------------
-- 4. 통합 View: 편리한 조회를 위한 뷰
-- ----------------------------------------------------------------------------

-- 프로젝트 통합 뷰
CREATE VIEW projects_view AS
SELECT
  a.*,
  pd.budget_type,
  pd.deadline,
  pd.deliverables,
  pd.payment_terms,
  pd.contract_type,
  pd.proposal_count
FROM activities a
INNER JOIN project_details pd ON a.id = pd.activity_id
WHERE a.activity_type = 'project';

-- 협업 통합 뷰
CREATE VIEW collaborations_view AS
SELECT
  a.*,
  cd.collaboration_type,
  cd.budget_range,
  cd.timeline,
  cd.current_team_size,
  cd.goals,
  cd.expected_outcome,
  cd.profit_sharing,
  cd.invitation_count
FROM activities a
INNER JOIN collaboration_details cd ON a.id = cd.activity_id
WHERE a.activity_type = 'collaboration';

-- 전체 활동 통합 뷰 (Explore 페이지용)
CREATE VIEW all_activities_view AS
SELECT
  a.id,
  a.activity_type,
  a.creator_id,
  a.title,
  a.description,
  a.category,
  a.status,
  a.image_url,
  a.tags,
  a.view_count,
  a.bookmark_count,
  a.application_count,
  a.is_featured,
  a.is_urgent,
  a.created_at,
  a.published_at,
  -- 타입별 특화 필드 (NULL 가능)
  pd.deadline,
  pd.budget_type,
  cd.collaboration_type,
  cd.current_team_size
FROM activities a
LEFT JOIN project_details pd ON a.id = pd.activity_id AND a.activity_type = 'project'
LEFT JOIN collaboration_details cd ON a.id = cd.activity_id AND a.activity_type = 'collaboration'
WHERE a.visibility = 'public' AND a.status IN ('open', 'in_progress');

-- ----------------------------------------------------------------------------
-- 5. 트리거: activity_type에 따른 자동 검증
-- ----------------------------------------------------------------------------

-- 프로젝트는 반드시 project_details를 가져야 함
CREATE OR REPLACE FUNCTION validate_project_details()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.activity_type = 'project' THEN
    IF NOT EXISTS (SELECT 1 FROM project_details WHERE activity_id = NEW.id) THEN
      RAISE EXCEPTION 'Project must have project_details';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 협업은 반드시 collaboration_details를 가져야 함
CREATE OR REPLACE FUNCTION validate_collaboration_details()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.activity_type = 'collaboration' THEN
    IF NOT EXISTS (SELECT 1 FROM collaboration_details WHERE activity_id = NEW.id) THEN
      RAISE EXCEPTION 'Collaboration must have collaboration_details';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 적용 (선택사항 - 엄격한 검증을 원할 경우)
-- CREATE CONSTRAINT TRIGGER check_project_details
--   AFTER INSERT OR UPDATE ON activities
--   DEFERRABLE INITIALLY DEFERRED
--   FOR EACH ROW
--   EXECUTE FUNCTION validate_project_details();

-- CREATE CONSTRAINT TRIGGER check_collaboration_details
--   AFTER INSERT OR UPDATE ON activities
--   DEFERRABLE INITIALLY DEFERRED
--   FOR EACH ROW
--   EXECUTE FUNCTION validate_collaboration_details();

-- ----------------------------------------------------------------------------
-- 6. 마이그레이션: 기존 데이터 이전
-- ----------------------------------------------------------------------------

-- Step 1: 기존 projects 데이터를 activities + project_details로 이전
INSERT INTO activities (
  id, activity_type, creator_id, title, description, category,
  budget_min, budget_max, budget_currency,
  start_date, end_date, duration_months,
  status, required_skills, team_size, min_experience_years,
  work_type, location, image_url, images, video_url, tags, requirements,
  view_count, bookmark_count, application_count,
  is_featured, is_urgent, is_remote_friendly, visibility,
  created_at, updated_at, published_at, closed_at
)
SELECT
  id, 'project', creator_id, title, description, category,
  budget_min, budget_max, budget_currency,
  start_date, end_date, duration_months,
  status, required_skills, team_size, min_experience_years,
  work_type, location, image_url, images, video_url, tags, requirements,
  view_count, bookmark_count, application_count,
  is_featured, is_urgent, is_remote_friendly, visibility,
  created_at, updated_at, published_at, closed_at
FROM projects;

INSERT INTO project_details (
  activity_id, budget_type, deadline, deliverables, payment_terms,
  contract_type, proposal_count, bookmark_count
)
SELECT
  id, budget_type, deadline, deliverables, payment_terms,
  contract_type, proposal_count, bookmark_count
FROM projects;

-- Step 2: 기존 collaborations 데이터를 activities + collaboration_details로 이전
INSERT INTO activities (
  id, activity_type, creator_id, title, description, category,
  budget_min, budget_max, budget_currency,
  start_date, end_date, duration_months,
  status, required_skills, team_size, min_experience_years,
  work_type, location, image_url, images, video_url, tags, requirements,
  view_count, bookmark_count, application_count,
  is_featured, is_urgent, is_remote_friendly, visibility,
  created_at, updated_at, published_at, closed_at
)
SELECT
  id, 'collaboration', creator_id, title, description, category,
  budget_min, budget_max, budget_currency,
  start_date, end_date, duration_months,
  status, required_skills, team_size, min_experience_years,
  work_type, location, image_url, images, video_url, tags, requirements,
  view_count, bookmark_count, application_count,
  is_featured, is_urgent, is_remote_friendly, visibility,
  created_at, updated_at, published_at, closed_at
FROM collaborations;

INSERT INTO collaboration_details (
  activity_id, collaboration_type, budget_range, timeline,
  current_team_size, goals, expected_outcome, profit_sharing, invitation_count
)
SELECT
  id, collaboration_type, budget_range, timeline,
  current_team_size, goals, expected_outcome, profit_sharing, invitation_count
FROM collaborations;

-- Step 3: 기존 테이블 백업 및 삭제 (신중하게!)
-- ALTER TABLE projects RENAME TO projects_backup;
-- ALTER TABLE collaborations RENAME TO collaborations_backup;

-- ----------------------------------------------------------------------------
-- 7. 사용자 선호도 테이블 통합
-- ----------------------------------------------------------------------------

-- 기존: user_project_preferences, user_collaboration_preferences
-- 통합: user_activity_preferences

CREATE TABLE user_activity_preferences (
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'hidden',
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  PRIMARY KEY (profile_id, activity_id),
  CONSTRAINT valid_preference_status CHECK (status IN ('hidden', 'blocked', 'bookmarked', 'applied'))
);

CREATE INDEX idx_user_activity_prefs_profile ON user_activity_preferences(profile_id);
CREATE INDEX idx_user_activity_prefs_activity ON user_activity_preferences(activity_id);
CREATE INDEX idx_user_activity_prefs_status ON user_activity_preferences(status);

-- 기존 데이터 마이그레이션
INSERT INTO user_activity_preferences (profile_id, activity_id, status, reason, created_at, updated_at)
SELECT profile_id, project_id, status, reason, created_at, updated_at
FROM user_project_preferences;

INSERT INTO user_activity_preferences (profile_id, activity_id, status, reason, created_at, updated_at)
SELECT profile_id, collaboration_id, status, reason, created_at, updated_at
FROM user_collaboration_preferences;

-- ============================================================================
-- 장점 요약
-- ============================================================================
-- ✅ 1. 데이터 중복 제거 (85% 공통 필드 통합)
-- ✅ 2. 통합 검색/필터링 용이 (all_activities_view)
-- ✅ 3. 타입별 데이터 무결성 보장 (NOT NULL 제약)
-- ✅ 4. 확장성 (새로운 activity_type 추가 가능)
-- ✅ 5. 일관된 통계/분석 (view_count, bookmark_count 등)
-- ✅ 6. 사용자 선호도 관리 단순화
-- ✅ 7. View를 통한 하위 호환성 (기존 쿼리 유지 가능)

-- ============================================================================
-- 단점 및 고려사항
-- ============================================================================
-- ⚠️ 1. JOIN 비용 (매번 activities + details 조인 필요)
-- ⚠️ 2. 마이그레이션 복잡도 (기존 데이터 이전 + 코드 변경)
-- ⚠️ 3. 트랜잭션 관리 (두 테이블에 동시 삽입)
-- ⚠️ 4. 쿼리 복잡도 증가 (단순 SELECT도 JOIN 필요)
-- ⚠️ 5. ORM 복잡도 (Supabase 클라이언트에서 관계 처리)

-- ============================================================================
-- 권장 사항
-- ============================================================================
-- 1. View를 통한 점진적 마이그레이션
-- 2. 성능 테스트 (JOIN 비용 vs 중복 제거 이득)
-- 3. 애플리케이션 레이어에서 추상화 (Service Layer)
-- 4. 백업 필수 (projects_backup, collaborations_backup 유지)

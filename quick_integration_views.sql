-- ============================================================================
-- BridgeApp Quick Integration Views
-- 마이그레이션 없이 통합 조회 지원
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Explore 페이지: 전체 활동 통합 조회
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW explore_all_activities AS
SELECT
  p.id,
  'project' as activity_type,
  p.created_by as creator_id,
  p.title,
  p.description,
  p.category,
  p.status,
  p.cover_image_url as image_url,
  p.tags,
  p.view_count,
  p.bookmark_count,
  p.application_count,
  p.is_featured,
  p.is_urgent,
  p.created_at,
  p.published_at,
  -- 프로젝트 특화
  p.deadline,
  p.budget_min,
  p.budget_max,
  NULL::text as collaboration_type,
  NULL::integer as current_team_size
FROM projects p
WHERE p.visibility = 'public'

UNION ALL

SELECT
  c.id,
  'collaboration' as activity_type,
  c.created_by as creator_id,
  c.title,
  c.description,
  c.category,
  c.status,
  c.cover_image_url as image_url,
  c.tags,
  c.view_count,
  c.bookmark_count,
  c.application_count,
  c.is_featured,
  c.is_urgent,
  c.created_at,
  c.published_at,
  -- 협업 특화
  NULL::timestamp as deadline,
  c.budget_min,
  c.budget_max,
  c.collaboration_type,
  c.current_team_size
FROM collaborations c
WHERE c.visibility = 'public';

-- 인덱스 (기존 테이블에 이미 존재)
-- CREATE INDEX IF NOT EXISTS idx_projects_visibility_status ON projects(visibility, status);
-- CREATE INDEX IF NOT EXISTS idx_collaborations_visibility_status ON collaborations(visibility, status);

-- 사용 예시:
-- SELECT * FROM explore_all_activities
-- WHERE status = 'open'
-- ORDER BY created_at DESC
-- LIMIT 20;

-- ----------------------------------------------------------------------------
-- 2. 알림 시스템: 모든 제안/초대 통합 조회
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW user_all_notifications AS
-- 1. 프로젝트 제안 (Proposals)
SELECT
  pp.id,
  'proposal' as notification_type,
  pp.project_id as activity_id,
  'project' as activity_type,
  pp.sender_id,
  pp.receiver_id,
  pp.status,
  pp.message,
  pp.sent_date,
  pp.viewed_date,
  pp.response_date,
  pp.is_read,
  pp.is_starred,
  pp.created_at,
  -- 프로젝트 정보 (JOIN)
  p.title as activity_title,
  p.cover_image_url as activity_image,
  -- 발신자 정보 (JOIN)
  sender.nickname as sender_name,
  sender.avatar_url as sender_avatar,
  -- 제안 특화
  pp.budget_range as offered_budget,
  pp.duration as offered_timeline,
  pp.position as offered_role,
  NULL::text as question,
  NULL::text as compensation
FROM project_proposals pp
JOIN projects p ON pp.project_id = p.id
JOIN profiles sender ON pp.sender_id = sender.id

UNION ALL

-- 2. 협업 초대 (Invitations)
SELECT
  ci.id,
  'invitation' as notification_type,
  ci.collaboration_id as activity_id,
  'collaboration' as activity_type,
  ci.inviter_id as sender_id,
  ci.invitee_id as receiver_id,
  ci.status,
  ci.message,
  ci.sent_date,
  ci.viewed_date,
  ci.response_date,
  ci.is_read,
  ci.is_starred,
  ci.created_at,
  -- 협업 정보 (JOIN)
  c.title as activity_title,
  c.cover_image_url as activity_image,
  -- 발신자 정보 (JOIN)
  inviter.nickname as sender_name,
  inviter.avatar_url as sender_avatar,
  -- 초대 특화
  NULL::text as offered_budget,
  NULL::text as offered_timeline,
  ci.position as offered_role,
  ci.question,
  ci.compensation
FROM collaboration_invitations ci
JOIN collaborations c ON ci.collaboration_id = c.id
JOIN profiles inviter ON ci.inviter_id = inviter.id

UNION ALL

-- 3. 프로젝트 지원 (Applications)
SELECT
  pa.id,
  'application' as notification_type,
  pa.project_id as activity_id,
  'project' as activity_type,
  pa.applicant_id as sender_id,
  p.created_by as receiver_id,
  pa.status,
  pa.cover_letter as message,
  pa.created_at as sent_date,
  pa.reviewed_date as viewed_date,
  pa.response_date,
  pa.is_read,
  false as is_starred,
  pa.created_at,
  -- 프로젝트 정보
  p.title as activity_title,
  p.cover_image_url as activity_image,
  -- 지원자 정보
  applicant.nickname as sender_name,
  applicant.avatar_url as sender_avatar,
  -- 특화 필드 (NULL)
  NULL::text as offered_budget,
  NULL::text as offered_timeline,
  NULL::text as offered_role,
  NULL::text as question,
  NULL::text as compensation
FROM project_applications pa
JOIN projects p ON pa.project_id = p.id
JOIN profiles applicant ON pa.applicant_id = applicant.id

UNION ALL

-- 4. 협업 지원 (Applications)
SELECT
  ca.id,
  'application' as notification_type,
  ca.collaboration_id as activity_id,
  'collaboration' as activity_type,
  ca.applicant_id as sender_id,
  c.created_by as receiver_id,
  ca.status,
  ca.cover_letter as message,
  ca.created_at as sent_date,
  ca.reviewed_date as viewed_date,
  ca.response_date,
  ca.is_read,
  false as is_starred,
  ca.created_at,
  -- 협업 정보
  c.title as activity_title,
  c.cover_image_url as activity_image,
  -- 지원자 정보
  applicant.nickname as sender_name,
  applicant.avatar_url as sender_avatar,
  -- 특화 필드 (NULL)
  NULL::text as offered_budget,
  NULL::text as offered_timeline,
  NULL::text as offered_role,
  NULL::text as question,
  NULL::text as compensation
FROM collaboration_applications ca
JOIN collaborations c ON ca.collaboration_id = c.id
JOIN profiles applicant ON ca.applicant_id = applicant.id

UNION ALL

-- 5. 채팅 메시지 (Chat Messages)
SELECT
  m.id,
  'message' as notification_type,
  m.room_id as activity_id,
  'chat' as activity_type,
  m.sender_id,
  p.user_id as receiver_id,
  'sent' as status,
  m.content as message,
  m.created_at as sent_date,
  NULL::timestamp as viewed_date,
  NULL::timestamp as response_date,
  CASE WHEN m.created_at <= p.last_read_at THEN true ELSE false END as is_read,
  false as is_starred,
  m.created_at,
  -- 채팅방 정보 (채팅방 제목이 없으면 '채팅방'으로 표시)
  COALESCE(r.title, '채팅방') as activity_title,
  NULL::text as activity_image,
  -- 발신자 정보
  sender.nickname as sender_name,
  sender.avatar_url as sender_avatar,
  -- 특화 필드 (NULL)
  NULL::text as offered_budget,
  NULL::text as offered_timeline,
  NULL::text as offered_role,
  NULL::text as question,
  NULL::text as compensation
FROM chat_messages m
JOIN chat_rooms r ON m.room_id = r.id
JOIN chat_participants p ON m.room_id = p.room_id
JOIN profiles sender ON m.sender_id = sender.id
WHERE m.sender_id != p.user_id; -- 자신이 보낸 메시지는 제외

-- 사용 예시 (특정 사용자의 모든 알림):
-- SELECT * FROM user_all_notifications
-- WHERE receiver_id = $user_id
-- ORDER BY sent_date DESC;

-- 사용 예시 (읽지 않은 알림 수):
-- SELECT COUNT(*) FROM user_all_notifications
-- WHERE receiver_id = $user_id AND is_read = false;

-- ----------------------------------------------------------------------------
-- 3. 통계 View: 활동별 통계
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW activity_statistics AS
SELECT
  id,
  'project' as type,
  title,
  view_count,
  bookmark_count,
  application_count,
  (SELECT COUNT(*) FROM project_proposals WHERE project_id = p.id) as proposal_count,
  (SELECT COUNT(*) FROM project_proposals WHERE project_id = p.id AND status = 'accepted') as accepted_count,
  created_at,
  published_at
FROM projects p

UNION ALL

SELECT
  id,
  'collaboration' as type,
  title,
  view_count,
  bookmark_count,
  application_count,
  (SELECT COUNT(*) FROM collaboration_invitations WHERE collaboration_id = c.id) as invitation_count,
  (SELECT COUNT(*) FROM collaboration_invitations WHERE collaboration_id = c.id AND status = 'accepted') as accepted_count,
  created_at,
  published_at
FROM collaborations c;

-- 사용 예시 (인기 활동 Top 10):
-- SELECT * FROM activity_statistics
-- ORDER BY view_count DESC
-- LIMIT 10;

-- ----------------------------------------------------------------------------
-- 4. 사용자 대시보드: 내가 생성한 모든 활동
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW user_created_activities AS
SELECT
  p.id,
  'project' as type,
  p.created_by as creator_id,
  p.title,
  p.description,
  p.status,
  p.cover_image_url,
  p.view_count,
  p.application_count,
  p.created_at,
  p.updated_at,
  p.published_at,
  -- 통계
  (SELECT COUNT(*) FROM project_proposals WHERE project_id = p.id) as response_count,
  (SELECT COUNT(*) FROM project_proposals WHERE project_id = p.id AND status = 'pending') as pending_count
FROM projects p

UNION ALL

SELECT
  c.id,
  'collaboration' as type,
  c.created_by as creator_id,
  c.title,
  c.description,
  c.status,
  c.cover_image_url,
  c.view_count,
  c.application_count,
  c.created_at,
  c.updated_at,
  c.published_at,
  -- 통계
  (SELECT COUNT(*) FROM collaboration_invitations WHERE collaboration_id = c.id) as response_count,
  (SELECT COUNT(*) FROM collaboration_invitations WHERE collaboration_id = c.id AND status = 'pending') as pending_count
FROM collaborations c;

-- 사용 예시 (내가 만든 모든 활동):
-- SELECT * FROM user_created_activities
-- WHERE creator_id = $user_id
-- ORDER BY created_at DESC;

-- ----------------------------------------------------------------------------
-- 5. 검색 View: 전체 텍스트 검색 지원
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW searchable_activities AS
SELECT
  id,
  'project' as type,
  title,
  description,
  category,
  tags,
  to_tsvector('korean', title || ' ' || description) as search_vector
FROM projects
WHERE visibility = 'public'

UNION ALL

SELECT
  id,
  'collaboration' as type,
  title,
  description,
  category,
  tags,
  to_tsvector('korean', title || ' ' || description) as search_vector
FROM collaborations
WHERE visibility = 'public';

-- 사용 예시 (전체 텍스트 검색):
-- SELECT * FROM searchable_activities
-- WHERE search_vector @@ to_tsquery('korean', '디자인 & 패션');

-- ----------------------------------------------------------------------------
-- 6. Row Level Security (RLS) 고려사항
-- ----------------------------------------------------------------------------
-- 주의: View는 기본적으로 RLS를 우회합니다.
-- security_invoker 옵션을 사용하여 호출자의 권한으로 실행하도록 설정하세요.

-- 예시:
-- ALTER VIEW user_all_notifications SET (security_invoker = on);

-- 또는 View에서 직접 필터링:
-- CREATE OR REPLACE VIEW my_notifications AS
-- SELECT * FROM user_all_notifications
-- WHERE receiver_id = auth.uid(); -- Supabase auth 함수 사용

-- ============================================================================
-- 사용 가이드
-- ============================================================================

-- 1. Explore 페이지
-- GET /api/explore?category=패션&status=open
-- SELECT * FROM explore_all_activities
-- WHERE category = '패션' AND status = 'open'
-- ORDER BY is_featured DESC, created_at DESC
-- LIMIT 20 OFFSET 0;

-- 2. 알림 페이지
-- GET /api/notifications
-- SELECT * FROM user_all_notifications
-- WHERE receiver_id = current_user_id
-- ORDER BY sent_date DESC;

-- 3. 대시보드
-- GET /api/my-activities
-- SELECT * FROM user_created_activities
-- WHERE creator_id = current_user_id;

-- 4. 통계
-- GET /api/stats
-- SELECT
--   type,
--   COUNT(*) as total,
--   SUM(view_count) as total_views
-- FROM activity_statistics
-- GROUP BY type;

-- ============================================================================
-- 성능 최적화 팁
-- ============================================================================

-- 1. 자주 사용하는 필터에 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_projects_category_status ON projects(category, status) WHERE visibility = 'public';
CREATE INDEX IF NOT EXISTS idx_collaborations_category_status ON collaborations(category, status) WHERE visibility = 'public';

-- 2. 알림 조회 최적화
CREATE INDEX IF NOT EXISTS idx_project_proposals_receiver ON project_proposals(receiver_id, sent_date DESC);
CREATE INDEX IF NOT EXISTS idx_collaboration_invitations_invitee ON collaboration_invitations(invitee_id, sent_date DESC);

-- 3. Materialized View 고려 (대용량 데이터 시)
-- CREATE MATERIALIZED VIEW mv_activity_statistics AS
-- SELECT ... FROM activity_statistics;
--
-- CREATE UNIQUE INDEX ON mv_activity_statistics(id, type);
--
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_activity_statistics;

-- ============================================================================
-- 마이그레이션 경로 (나중에 필요시)
-- ============================================================================

-- Step 1: View로 시작 (지금)
-- Step 2: 성능 모니터링 (3개월)
-- Step 3: 데이터 증가 시 activities 테이블 통합 고려
-- Step 4: Materialized View 또는 실제 테이블 통합

-- 현재 데이터 규모 (< 100건)에서는 View만으로 충분합니다!

-- =====================================================
-- Mock Data Migration for Projects and Collaborations
-- =====================================================
--
-- IMPORTANT: Replace 'YOUR_BRAND_PROFILE_ID' with actual brand profile_id
-- IMPORTANT: Replace 'YOUR_PARTNER_PROFILE_ID' with actual artist/creative profile_id
--
-- This migration inserts sample data for development and testing purposes.
-- =====================================================

-- Sample Projects (3 examples out of 10)
INSERT INTO projects (
  id,
  created_by,
  title,
  description,
  category,
  status,
  cover_image,
  brand_name,
  budget,
  deadline,
  tags,
  capacity,
  workflow_steps,
  team,
  files,
  created_at
) VALUES
-- Project 1: 패션 모델 섭외
(
  gen_random_uuid(),
  (SELECT id FROM profiles WHERE 'brand' = ANY(roles) LIMIT 1),
  '2025 S/S 컬렉션 모델 섭외',
  '봄/여름 시즌 패션쇼를 위한 전문 모델을 찾고 있습니다.',
  '패션',
  '진행중',
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800',
  '룩스 패션',
  '1,000만원',
  '2025-12-20',
  ARRAY['모델', '패션쇼', '컬렉션'],
  10,
  '[
    {"name": "컨셉 기획", "detail": "컨셉 기획 작업을 진행합니다.", "personInCharge": "김지연", "completed": true, "completedAt": "2025-01-10", "deadline": "2025-12-20"},
    {"name": "모델 섭외", "detail": "모델 섭외 작업을 진행합니다.", "personInCharge": "김지연", "completed": true, "completedAt": "2025-01-10", "deadline": "2025-12-20"},
    {"name": "촬영 준비", "detail": "촬영 준비 작업을 진행합니다.", "personInCharge": "김지연", "completed": true, "completedAt": "2025-01-10", "deadline": "2025-12-20"},
    {"name": "최종 확정", "detail": "최종 확정 작업을 진행합니다.", "personInCharge": "김지연", "completed": false, "completedAt": null, "deadline": "2025-12-20"}
  ]'::jsonb,
  '{
    "leaderId": "u1",
    "leaderName": "김지연",
    "leaderAvatar": "https://i.pravatar.cc/150?img=1",
    "leaderField": "패션 디렉터",
    "totalMembers": 10,
    "members": []
  }'::jsonb,
  '[
    {"id": "1", "name": "컬렉션 모델 섭외 안내서.pdf", "url": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800", "type": "pdf", "size": 1000, "uploadedAt": "2025-01-10", "uploadedBy": "김지연"}
  ]'::jsonb,
  '2025-01-10'
),
-- Project 2: 뷰티 광고 촬영
(
  gen_random_uuid(),
  (SELECT id FROM profiles WHERE 'brand' = ANY(roles) LIMIT 1),
  '신제품 화장품 광고 촬영',
  '새로 출시되는 립스틱 라인 광고 촬영을 위한 뷰티 크리에이터를 모집합니다.',
  '뷰티',
  '진행중',
  'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
  '글로우 코스메틱',
  '500만원',
  '2025-12-15',
  ARRAY['광고', '촬영', '화장품'],
  10,
  '[
    {"name": "컨셉 기획", "detail": "컨셉 기획 작업을 진행합니다.", "personInCharge": "김지연", "completed": true, "completedAt": "2025-01-10", "deadline": "2025-12-20"},
    {"name": "촬영 진행", "detail": "촬영 진행 작업을 진행합니다.", "personInCharge": "김지연", "completed": true, "completedAt": "2025-01-10", "deadline": "2025-12-20"},
    {"name": "편집 작업", "detail": "편집 작업을 진행합니다.", "personInCharge": "김지연", "completed": false, "completedAt": null, "deadline": "2025-12-20"},
    {"name": "최종 검토", "detail": "최종 검토 작업을 진행합니다.", "personInCharge": "김지연", "completed": false, "completedAt": null, "deadline": "2025-12-20"}
  ]'::jsonb,
  '{
    "leaderId": "u2",
    "leaderName": "Sarah Kim",
    "leaderAvatar": "https://i.pravatar.cc/150?img=5",
    "leaderField": "메이크업 아티스트",
    "totalMembers": 10,
    "members": []
  }'::jsonb,
  '[
    {"id": "1", "name": "립스틱 라인 광고 촬영 안내서.pdf", "url": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800", "type": "pdf", "size": 1000, "uploadedAt": "2025-01-10", "uploadedBy": "김지연"}
  ]'::jsonb,
  '2025-01-09'
),
-- Project 3: 음악 앨범 커버 아트
(
  gen_random_uuid(),
  (SELECT id FROM profiles WHERE 'brand' = ANY(roles) LIMIT 1),
  '앨범 커버 아트워크 제작',
  '신곡 발매를 앞두고 창의적인 앨범 커버 디자인이 필요합니다.',
  '음악',
  '대기중',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800',
  '뮤직웨이브 엔터',
  '400만원',
  '2025-12-25',
  ARRAY['앨범커버', '디자인', '아트워크'],
  3,
  '[
    {"name": "컨셉 기획", "detail": "컨셉 기획 작업을 진행합니다.", "personInCharge": "김지연", "completed": false, "completedAt": null, "deadline": "2025-12-20"},
    {"name": "디자인 작업", "detail": "디자인 작업을 진행합니다.", "personInCharge": "김지연", "completed": false, "completedAt": null, "deadline": "2025-12-20"},
    {"name": "피드백 반영", "detail": "피드백 반영 작업을 진행합니다.", "personInCharge": "김지연", "completed": false, "completedAt": null, "deadline": "2025-12-20"},
    {"name": "최종 확정", "detail": "최종 확정 작업을 진행합니다.", "personInCharge": "김지연", "completed": false, "completedAt": null, "deadline": "2025-12-20"}
  ]'::jsonb,
  '{
    "leaderId": "u3",
    "leaderName": "박현수",
    "leaderAvatar": "https://i.pravatar.cc/150?img=12",
    "leaderField": "그래픽 디자이너",
    "totalMembers": 3,
    "members": []
  }'::jsonb,
  '[
    {"id": "1", "name": "앨범 커버 디자인 브리프.pdf", "url": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800", "type": "pdf", "size": 1000, "uploadedAt": "2025-01-10", "uploadedBy": "김지연"},
    {"id": "2", "name": "무드보드 레퍼런스.png", "url": "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800", "type": "image", "size": 1000, "uploadedAt": "2025-01-10", "uploadedBy": "김지연"}
  ]'::jsonb,
  '2025-01-08'
);

-- Sample Collaborations (3 examples out of 6)
INSERT INTO collaborations (
  id,
  created_by,
  title,
  collabo_type,
  brief_description,
  category,
  status,
  cover_image,
  main_keyword,
  capacity,
  tags,
  description,
  requirements,
  benefits,
  team,
  files,
  activities,
  created_at
) VALUES
-- Collaboration 1: 크리에이터 네트워크
(
  gen_random_uuid(),
  (SELECT id FROM profiles WHERE roles && ARRAY['artist', 'creative'] LIMIT 1),
  '크리에이터 콜라보 네트워크',
  '장기 협업',
  '다양한 분야의 크리에이터들과 함께하는 장기 협업 프로젝트입니다.',
  '패션',
  '진행중',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
  '콘텐츠',
  12,
  ARRAY['크리에이터', '네트워크', '콘텐츠'],
  '다양한 분야의 크리에이터들과 협업하여 장기적인 네트워크를 구축하고 함께 성장하는 프로젝트입니다. 각자의 전문성을 살려 시너지를 창출합니다.',
  '["콘텐츠 제작 경력 1년 이상", "소셜미디어 활동 경험", "정기적인 미팅 참여 가능", "장기 협업 의지"]'::jsonb,
  '["네트워킹 기회 제공", "크로스 프로모션 지원", "공동 프로젝트 참여 기회", "스킬 공유 및 성장"]'::jsonb,
  '{
    "leaderId": "m1",
    "leaderName": "Sarah Kim",
    "leaderAvatar": "https://i.pravatar.cc/150?img=5",
    "leaderField": "메이크업 아티스트",
    "totalMembers": 8,
    "members": []
  }'::jsonb,
  '[
    {"id": "1", "name": "크리에이터 콜라보 네트워크 프로젝트 안내서.pdf", "url": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800", "type": "pdf", "size": 1000, "uploadedAt": "2025-01-10", "uploadedBy": "김지연"}
  ]'::jsonb,
  '[
    {"id": "c1-a1", "title": "첫 번째 정기 미팅", "description": "팀 소개 및 협업 방향 논의", "date": "2024.01.20", "participants": 6},
    {"id": "c1-a2", "title": "콘텐츠 기획 워크샵", "description": "공동 콘텐츠 제작 아이디어 브레인스토밍", "date": "2024.01.25", "participants": 7},
    {"id": "c1-a3", "title": "크로스 프로모션 시작", "description": "멤버들 간 상호 홍보 활동 개시", "date": "2024.02.01", "participants": 8}
  ]'::jsonb,
  '2025-01-10'
),
-- Collaboration 2: 브랜드 앰버서더
(
  gen_random_uuid(),
  (SELECT id FROM profiles WHERE roles && ARRAY['artist', 'creative'] LIMIT 1),
  '브랜드 앰버서더 그룹',
  '단기 협업',
  '뷰티 브랜드의 공식 앰버서더로 활동하며 제품을 홍보합니다.',
  '뷰티',
  '진행중',
  'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800',
  '마케팅',
  8,
  ARRAY['브랜딩', '엠버서더', '마케팅'],
  '신제품 출시에 맞춰 브랜드 앰버서더로 활동하며 SNS를 통한 제품 홍보 및 리뷰를 진행합니다.',
  '["뷰티 분야 인플루언서", "팔로워 5,000명 이상", "월 2회 이상 콘텐츠 제작 가능", "브랜드 이미지와 부합하는 콘텐츠 스타일"]'::jsonb,
  '["제품 무상 제공", "정기적인 신제품 체험 기회", "활동비 지원", "포트폴리오 구축"]'::jsonb,
  '{
    "leaderId": "m2",
    "leaderName": "김지연",
    "leaderAvatar": "https://i.pravatar.cc/150?img=1",
    "leaderField": "패션 디렉터",
    "totalMembers": 5,
    "members": []
  }'::jsonb,
  '[
    {"id": "1", "name": "브랜드 앰버서더 운영 가이드.pdf", "url": "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800", "type": "pdf", "size": 1000, "uploadedAt": "2025-01-10", "uploadedBy": "김지연"}
  ]'::jsonb,
  '[
    {"id": "c2-a1", "title": "첫 번째 정기 미팅", "description": "팀 소개 및 협업 방향 논의", "date": "2024.01.20", "participants": 3},
    {"id": "c2-a2", "title": "콘텐츠 기획 워크샵", "description": "공동 콘텐츠 제작 아이디어 브레인스토밍", "date": "2024.01.25", "participants": 4},
    {"id": "c2-a3", "title": "크로스 프로모션 시작", "description": "멤버들 간 상호 홍보 활동 개시", "date": "2024.02.01", "participants": 5}
  ]'::jsonb,
  '2025-01-09'
),
-- Collaboration 3: 음악 프로듀서 컬렉티브
(
  gen_random_uuid(),
  (SELECT id FROM profiles WHERE roles && ARRAY['artist', 'creative'] LIMIT 1),
  '음악 프로듀서 컬렉티브',
  '장기 협업',
  '음악 프로듀서들의 협업 커뮤니티로 함께 성장합니다.',
  '음악',
  '대기중',
  'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800',
  '프로듀싱',
  15,
  ARRAY['프로듀싱', '음악', '커뮤니티'],
  '다양한 장르의 음악 프로듀서들이 모여 서로의 작업을 공유하고 협업 프로젝트를 진행합니다.',
  '["음악 프로듀싱 경력 보유", "DAW 활용 능력", "월 1회 이상 정기 모임 참여", "협업 프로젝트 참여 의지"]'::jsonb,
  '["프로듀서 네트워킹", "장비 및 스튜디오 공유", "협업 프로젝트 기회", "음악 산업 인사이트 공유"]'::jsonb,
  '{
    "leaderId": "m3",
    "leaderName": "David Park",
    "leaderAvatar": "https://i.pravatar.cc/150?img=13",
    "leaderField": "음악 프로듀서",
    "totalMembers": 10,
    "members": []
  }'::jsonb,
  '[
    {"id": "1", "name": "프로듀서 컬렉티브 운영 매뉴얼.pdf", "url": "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800", "type": "pdf", "size": 1000, "uploadedAt": "2025-01-09", "uploadedBy": "David Park"}
  ]'::jsonb,
  '[
    {"id": "c3-a1", "title": "첫 번째 정기 미팅", "description": "팀 소개 및 협업 방향 논의", "date": "2024.01.20", "participants": 7},
    {"id": "c3-a2", "title": "콘텐츠 기획 워크샵", "description": "공동 콘텐츠 제작 아이디어 브레인스토밍", "date": "2024.01.25", "participants": 8},
    {"id": "c3-a3", "title": "크로스 프로모션 시작", "description": "멤버들 간 상호 홍보 활동 개시", "date": "2024.02.01", "participants": 10}
  ]'::jsonb,
  '2025-01-08'
);

-- Note: partner_stats data should be added after real artist/creative profiles are created through onboarding
-- The mock partner data from partnerService.ts is not migrated because it requires actual profile_artists/profile_creatives records

# 🔍 Proposal & Invitation 통합 분석
## projects/collaborations 통합 필요성 재고

---

## 📊 1. 중복도 분석

### project_proposals vs collaboration_invitations

| 필드 그룹 | project_proposals | collaboration_invitations | 중복도 |
|-----------|-------------------|---------------------------|--------|
| **기본 식별** | id, project_id, sender_id, receiver_id | id, collaboration_id, inviter_id, invitee_id | 100% (이름만 다름) |
| **상태 관리** | status | status | 100% |
| **내용** | message, comment | message | 75% |
| **조건** | offered_budget, offered_timeline, offered_role, offered_responsibilities | role, responsibilities, compensation | 70% (구조 유사) |
| **타임라인** | sent_date, viewed_date, response_date, expiry_date | sent_date, viewed_date, response_date, expiry_date | 100% |
| **플래그** | is_read, is_starred | is_read, is_starred | 100% |
| **응답** | rejection_reason, acceptance_note | rejection_reason, acceptance_note | 100% |
| **특화 필드** | attachments | question, question_date, answer, answer_date | 0% (서로 다름) |

**전체 중복도: 약 75%**

---

## 🎯 2. 핵심 통찰: 4개 테이블의 의존 관계

```
현재 구조:
┌─────────────┐          ┌──────────────────────┐
│  projects   │─────────>│ project_proposals    │
└─────────────┘          └──────────────────────┘
                         (브랜드 → 파트너 제안)

┌─────────────────┐      ┌──────────────────────────┐
│ collaborations  │─────>│ collaboration_invitations│
└─────────────────┘      └──────────────────────────┘
                         (파트너 → 파트너 초대)
```

**문제:**
- projects + collaborations 통합도: 85%
- proposals + invitations 통합도: 75%
- **총 4개 테이블이 서로 강하게 결합**

---

## 💡 3. 통합 시나리오 비교

### 📌 Option A: 전체 통합 (Most Aggressive)

```
activities (통합)
    ├── project_details
    ├── collaboration_details
    └── activity_interactions (통합)
            ├── proposal_details
            └── invitation_details
```

#### SQL 구조:
```sql
-- 상위: 활동
CREATE TABLE activities (
  id UUID PRIMARY KEY,
  activity_type VARCHAR(20), -- 'project' or 'collaboration'
  creator_id UUID,
  title TEXT,
  -- ... 공통 필드
);

-- 상위: 상호작용 (제안/초대)
CREATE TABLE activity_interactions (
  id UUID PRIMARY KEY,
  activity_id UUID REFERENCES activities(id),
  interaction_type VARCHAR(20), -- 'proposal' or 'invitation'
  sender_id UUID,
  receiver_id UUID,
  status VARCHAR(20),
  message TEXT,
  -- ... 공통 필드 (타임라인, 플래그, 응답 등)
);

-- 하위: 제안 상세
CREATE TABLE proposal_details (
  interaction_id UUID PRIMARY KEY REFERENCES activity_interactions(id),
  offered_budget DECIMAL(12,2),
  offered_timeline VARCHAR(100),
  attachments JSONB
);

-- 하위: 초대 상세
CREATE TABLE invitation_details (
  interaction_id UUID PRIMARY KEY REFERENCES activity_interactions(id),
  question TEXT,
  answer TEXT,
  compensation VARCHAR(200)
);
```

**✅ 장점:**
1. **완전한 아키텍처 일관성**
2. **통합 알림 시스템**
   ```sql
   -- 사용자의 모든 제안/초대를 한 번에 조회
   SELECT * FROM activity_interactions
   WHERE receiver_id = $user_id
   ORDER BY sent_date DESC;
   ```
3. **통합 통계**
   ```sql
   -- 전체 응답률 분석
   SELECT
     COUNT(*) FILTER (WHERE status = 'accepted') * 100.0 / COUNT(*) as acceptance_rate
   FROM activity_interactions;
   ```
4. **확장성**: 새로운 interaction_type 추가 용이
   - 예: 'application' (지원), 'recommendation' (추천)

**❌ 단점:**
1. **과도한 추상화**: 비즈니스 로직이 복잡해짐
2. **JOIN 지옥**:
   ```sql
   -- 프로젝트 제안 상세 조회
   SELECT * FROM activities a
   JOIN activity_interactions ai ON a.id = ai.activity_id
   JOIN proposal_details pd ON ai.id = pd.interaction_id
   WHERE ai.interaction_type = 'proposal';
   ```
3. **마이그레이션 비용**: 4개 테이블 → 6개 테이블
4. **타입 안전성 약화**: 런타임에 타입 체크 필요

---

### 📌 Option B: 부분 통합 (Balanced)

```
activities (통합)
    ├── project_details
    └── collaboration_details

activity_proposals (통합)
    ├── proposal_details
    └── invitation_details
```

#### SQL 구조:
```sql
-- activities는 위와 동일

-- 제안/초대 통합
CREATE TABLE activity_proposals (
  id UUID PRIMARY KEY,
  activity_id UUID REFERENCES activities(id),
  activity_type VARCHAR(20), -- 'project' or 'collaboration' (denormalized)
  proposal_type VARCHAR(20), -- 'brand_to_partner' or 'partner_to_partner'

  sender_id UUID,
  receiver_id UUID,
  status VARCHAR(20),
  message TEXT,

  -- 공통 조건
  role VARCHAR(100),
  responsibilities TEXT,

  -- 타임라인 (공통)
  sent_date TIMESTAMP,
  viewed_date TIMESTAMP,
  response_date TIMESTAMP,
  expiry_date TIMESTAMP,

  -- 플래그 (공통)
  is_read BOOLEAN,
  is_starred BOOLEAN,

  -- 응답 (공통)
  rejection_reason TEXT,
  acceptance_note TEXT,

  -- 타입별 특화 (JSONB로 유연하게)
  proposal_specifics JSONB, -- { budget, timeline, attachments } or { question, answer, compensation }

  created_at TIMESTAMP,
  updated_at TIMESTAMP,

  CONSTRAINT valid_proposal_type CHECK (proposal_type IN ('brand_to_partner', 'partner_to_partner'))
);
```

**✅ 장점:**
1. **균형잡힌 추상화**: 과하지 않음
2. **통합 알림/조회**: 한 테이블에서 모든 제안 관리
3. **적절한 JOIN**: activities + activity_proposals만
4. **JSONB 활용**: 타입별 특화 필드를 유연하게 처리

**❌ 단점:**
1. **JSONB 의존**: 타입 안전성 부분적 약화
2. **스키마 모호성**: proposal_specifics 구조가 런타임에 결정

---

### 📌 Option C: 상위만 통합 (Conservative)

```
activities (통합)
    ├── project_details
    └── collaboration_details

project_proposals (분리)
collaboration_invitations (분리)
```

#### SQL 구조:
```sql
-- activities는 통합

-- 제안/초대는 그대로 유지
CREATE TABLE project_proposals (
  id UUID PRIMARY KEY,
  activity_id UUID REFERENCES activities(id), -- project_id 대신
  -- 기존 구조 그대로
);

CREATE TABLE collaboration_invitations (
  id UUID PRIMARY KEY,
  activity_id UUID REFERENCES activities(id), -- collaboration_id 대신
  -- 기존 구조 그대로
);
```

**✅ 장점:**
1. **비즈니스 로직 분리**: 제안과 초대는 다른 워크플로우
2. **명확한 타입 안전성**: 각 테이블이 명확한 스키마
3. **점진적 마이그레이션**: activities만 먼저 통합

**❌ 단점:**
1. **통합 조회 복잡**:
   ```sql
   -- 모든 제안/초대 조회 시 UNION 필요
   SELECT *, 'proposal' as type FROM project_proposals WHERE receiver_id = $user
   UNION ALL
   SELECT *, 'invitation' as type FROM collaboration_invitations WHERE invitee_id = $user;
   ```
2. **알림 시스템**: 두 테이블 모두 폴링 필요

---

### 📌 Option D: 현재 구조 유지 + View (Pragmatic)

```
projects (분리)
collaborations (분리)
project_proposals (분리)
collaboration_invitations (분리)

+ View로 통합 조회 지원
```

#### SQL 구조:
```sql
-- 기존 4개 테이블 유지

-- 통합 조회용 View
CREATE VIEW all_user_notifications AS
SELECT
  id,
  'proposal' as type,
  project_id as activity_id,
  sender_id,
  receiver_id,
  status,
  message,
  sent_date,
  is_read,
  created_at
FROM project_proposals
UNION ALL
SELECT
  id,
  'invitation' as type,
  collaboration_id as activity_id,
  inviter_id as sender_id,
  invitee_id as receiver_id,
  status,
  message,
  sent_date,
  is_read,
  created_at
FROM collaboration_invitations;
```

**✅ 장점:**
1. **제로 마이그레이션**: 기존 코드 그대로
2. **리스크 최소**: 검증된 구조 유지
3. **유연성**: View로 필요한 통합만 제공

**❌ 단점:**
1. **코드 중복**: 4개 테이블 각각 CRUD 구현
2. **확장성 제한**: 새로운 타입 추가 시 테이블 2개씩 증가

---

## 🔄 4. projects/collaborations 통합 필요성 **재고**

### 🎯 핵심 질문: "proposals/invitations도 통합해야 한다면, projects/collaborations 통합은 필수인가?"

#### 시나리오별 결론:

| 선택 | activities 통합 | proposals/invitations 통합 | 일관성 | 복잡도 |
|------|----------------|----------------------------|--------|--------|
| **A** | ✅ 통합 | ✅ 통합 (6테이블) | ⭐⭐⭐⭐⭐ | 🔥🔥🔥🔥 |
| **B** | ✅ 통합 | ✅ 부분통합 (4테이블) | ⭐⭐⭐⭐ | 🔥🔥🔥 |
| **C** | ✅ 통합 | ❌ 분리 (4테이블) | ⭐⭐⭐ | 🔥🔥 |
| **D** | ❌ 분리 | ❌ 분리 + View (4테이블) | ⭐⭐ | 🔥 |

---

## 💡 5. 비즈니스 로직 관점 분석

### 🔍 근본적 차이점 검토

#### projects vs collaborations
- **목적**: 브랜드 주도 프로젝트 vs 파트너 협업
- **워크플로우**: 유사 (모집 → 진행 → 완료)
- **필드**: 85% 동일
- **사용자 관점**: 둘 다 "참여 가능한 활동"

**결론: 사용자에게는 사실상 같은 개념**

#### proposals vs invitations
- **방향**: 브랜드→파트너 vs 파트너→파트너
- **워크플로우**: 유사 (제안 → 수락/거절)
- **필드**: 75% 동일
- **사용자 관점**: 둘 다 "받은 제안"

**결론: 사용자에게는 사실상 같은 개념**

### 📱 UI/UX 관점

#### 사용자가 보는 화면:
```
🔔 알림
├── 프로젝트 제안 (5건)
├── 협업 초대 (3건)
└── [모두 보기]

🔍 탐색
├── 프로젝트 (123개)
├── 협업 (45개)
└── [전체 보기]
```

**현재 분리된 구조:**
- 알림: UNION 쿼리 2개
- 탐색: UNION 쿼리 2개
- 상세 조회: 조건부 라우팅

**통합 구조:**
- 알림: 단일 쿼리 1개
- 탐색: 단일 쿼리 1개 + WHERE type
- 상세 조회: 조건부 JOIN

---

## 🎯 6. 최종 권장사항

### 상황별 추천:

#### 🏢 **현재 MVP 단계** → Option D (현재 구조 + View)
**이유:**
- 데이터 규모 작음 (수백~수천 건)
- 개발 리소스 제한적
- 빠른 기능 개발 우선
- 마이그레이션 리스크 회피

**적용 방법:**
```sql
-- 1. 통합 알림 View
CREATE VIEW user_all_notifications AS ...;

-- 2. 통합 탐색 View
CREATE VIEW explore_all_activities AS ...;

-- 3. 기존 테이블은 그대로
```

---

#### 🚀 **스케일업 준비 단계** → Option C (activities 통합)
**이유:**
- 데이터 증가 예상 (수만 건 이상)
- 통합 검색/필터 성능 중요
- proposals/invitations는 비즈니스 로직 차이 유지

**마이그레이션 전략:**
1. Phase 1: activities 통합 (3개월)
2. Phase 2: 성능 모니터링 (3개월)
3. Phase 3: 필요시 proposals 통합 검토

---

#### 🏆 **엔터프라이즈급** → Option B (부분 통합)
**이유:**
- 대규모 데이터 (10만 건 이상)
- 복잡한 알림/추천 시스템
- 다양한 interaction_type 확장 예정

**구조:**
```
activities (3 tables)
activity_proposals (3 tables)
총 6 tables
```

---

## 📊 7. 의사결정 플로우차트

```
데이터 규모가 1만 건 미만인가?
    ├─ Yes → 현재 구조 유지 (Option D)
    └─ No ↓

통합 검색 성능이 중요한가?
    ├─ Yes → activities 통합 검토 (Option C)
    └─ No → 현재 구조 유지 (Option D)

proposals/invitations 워크플로우가 완전히 다른가?
    ├─ Yes → proposals 분리 유지 (Option C)
    └─ No → proposals 통합 검토 (Option B)

새로운 interaction_type 추가 예정인가? (예: application, referral)
    ├─ Yes → 전체 통합 (Option A or B)
    └─ No → 부분 통합 (Option C)
```

---

## 🎬 8. 실전 적용 시나리오

### 현재 BridgeApp 상황 분석:

**데이터:**
- projects: 8개
- collaborations: 5개
- proposals/invitations: 추정 < 100개

**기능:**
- Explore 페이지: 통합 조회 필요
- 알림 시스템: 통합 조회 필요
- 상세 페이지: 분리 관리

**팀:**
- 개발자: 소규모
- 우선순위: MVP 기능 완성

### 📌 **최종 추천: Option D → (필요시) Option C**

#### Step 1: 즉시 적용 (1주)
```sql
-- View만 추가
CREATE VIEW explore_all_activities AS ...;
CREATE VIEW user_all_notifications AS ...;
```

#### Step 2: 모니터링 (3개월)
- 데이터 증가율 체크
- 쿼리 성능 측정
- 사용자 피드백 수집

#### Step 3: 재평가
- 데이터 > 10,000건 → Option C 검토
- 데이터 < 10,000건 → Option D 유지

---

## ✅ 결론

### 통합 필요성 판단:

| 질문 | 답변 | 영향 |
|------|------|------|
| proposals/invitations 통합이 필요한가? | **아니오** (75% 유사하지만 워크플로우 다름) | proposals는 분리 유지 |
| projects/collaborations 통합이 필요한가? | **나중에** (현재는 View로 충분, 스케일 시 검토) | 점진적 접근 |
| 4개 테이블 전체 통합이 필요한가? | **아니오** (과도한 추상화, ROI 낮음) | 현재 구조 유지 |

### 핵심 인사이트:
> **"통합은 목적이 아니라 수단이다. 비즈니스 가치와 개발 리소스를 고려한 점진적 접근이 최선이다."**

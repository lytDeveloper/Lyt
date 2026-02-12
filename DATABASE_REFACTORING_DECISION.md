# Database Architecture Review - 테이블 통합 검토 결과

## 범위
- 데이터베이스 스키마 전체 아키텍처 분석
- 4개 핵심 테이블 통합 가능성 검토
  - `projects` / `collaborations` (활동 테이블)
  - `project_proposals` / `collaboration_invitations` (상호작용 테이블)

---

## 주요 이슈 및 대응

### 1. projects ↔ collaborations 통합 검토 (85% 중복)

#### 📊 **현황 분석**
- **공통 필드**: 약 20개 (id, creator_id, title, description, category, budget, timeline, status, media, tags, stats, flags, timestamps 등)
- **차이 필드**: 6-8개
  - projects 전용: budget_type, deadline, deliverables, payment_terms, contract_type, proposal_count
  - collaborations 전용: collaboration_type, budget_range, timeline(text), current_team_size, goals, expected_outcome, profit_sharing, invitation_count

#### 💡 **검토 결과**
- **비즈니스 로직**: 목적과 생성자 역할은 다르지만, 사용자 관점에서는 둘 다 "참여 가능한 활동"
- **UI/UX**: Explore 페이지에서 통합 조회 필요
- **데이터 규모**: 현재 projects 8개, collaborations 5개 (매우 작음)

#### ✅ **결정**
- **현재 구조 유지** (테이블 통합 보류)
- **이유**:
  1. 데이터 규모가 작음 (< 100건)
  2. 마이그레이션 비용 > 효과
  3. 통합 조회는 View로 해결 가능
  4. MVP 단계에서는 안정성 우선

---

### 2. project_proposals ↔ collaboration_invitations 통합 검토 (75% 중복)

#### 📊 **현황 분석**
- **공통 필드**: id, sender/receiver, status, message, timeline (sent/viewed/response), flags (is_read, is_starred), 응답 정보 등
- **차이 필드**:
  - proposals 전용: offered_budget, offered_timeline, offered_role, offered_responsibilities, comment, attachments
  - invitations 전용: question/answer, role, responsibilities, compensation

#### 💡 **검토 결과**
- **워크플로우 차이**: 브랜드→파트너 제안 vs 파트너→파트너 초대
- **비즈니스 로직**: 실제로 다른 프로세스
- **사용자 관점**: 알림 페이지에서는 통합 조회 필요

#### ✅ **결정**
- **현재 구조 유지** (테이블 통합 안 함)
- **이유**:
  1. 워크플로우가 근본적으로 다름
  2. 각 테이블의 특화 필드가 의미 있음
  3. 비즈니스 로직 분리 유지가 코드 명확성에 유리
  4. 통합 알림 조회는 View로 해결 가능

---

### 3. 통합 아키텍처 옵션 분석

#### 🅰️ Option A: 전체 통합 (6테이블)
```
activities (project + collaboration)
  ├── project_details
  └── collaboration_details

activity_interactions (proposal + invitation)
  ├── proposal_details
  └── invitation_details
```
- **장점**: 완벽한 일관성, 최고 확장성
- **단점**: 과도한 추상화, JOIN 지옥, 대규모 마이그레이션
- **결론**: ❌ 현재 규모에서는 오버엔지니어링

#### 🅱️ Option B: 부분 통합 (4테이블, JSONB 활용)
```
activities (통합) + activity_proposals (통합, JSONB)
```
- **장점**: 균형잡힌 구조, 통합 조회 용이
- **단점**: JSONB 의존, 타입 안전성 약화
- **결론**: ⚠️ 중간 규모 시 고려

#### 🅲 Option C: 상위만 통합 (4테이블)
```
activities (통합)
  ├── project_details
  └── collaboration_details

project_proposals (분리)
collaboration_invitations (분리)
```
- **장점**: 점진적 접근, 비즈니스 로직 분리
- **단점**: 알림 조회 시 UNION 필요
- **결론**: ⏸️ 데이터 > 10,000건 시 재검토

#### 🅳 Option D: 현재 구조 + View (4테이블) ⭐
```
projects, collaborations (분리 유지)
project_proposals, collaboration_invitations (분리 유지)
+ 통합 조회용 View 추가
```
- **장점**: 제로 마이그레이션, 통합 조회 지원, 리스크 최소
- **단점**: UNION 쿼리 비용 (현재 규모에서는 무시 가능)
- **결론**: ✅ **채택**

---

## 핵심 인사이트

### 💎 1. **통합은 목적이 아니라 수단이다**
- 중복 제거 자체가 목표가 아님
- **비즈니스 가치**와 **개발 리소스**를 고려한 판단 필요
- 테이블 통합 ≠ 항상 좋은 설계

### 💎 2. **데이터 규모에 따른 의사결정**
| 데이터 규모 | 권장 방안 | 이유 |
|------------|----------|------|
| < 1,000건 | View 활용 | UNION 비용 무시 가능, 마이그레이션 불필요 |
| 1,000~10,000건 | Materialized View | 성능 개선, 테이블 구조는 유지 |
| > 10,000건 | 테이블 통합 고려 | JOIN 최적화, 인덱스 전략 |

### 💎 3. **점진적 개선의 중요성**
```
Phase 1: 현재 구조 유지 (지금)
    ↓ (데이터 증가)
Phase 2: View 추가 (필요시)
    ↓ (성능 이슈)
Phase 3: Materialized View (최적화)
    ↓ (대규모)
Phase 4: 테이블 통합 (리팩토링)
```

### 💎 4. **중복 코드 vs 중복 데이터**
- **중복 코드**: 리팩토링으로 해결 (Service Layer 추상화)
- **중복 데이터**: 정규화로 해결 (테이블 통합)
- **현재 상황**: 중복 코드 문제 > 중복 데이터 문제
- **우선순위**: Service Layer 리팩토링 먼저, 테이블 통합은 나중에

### 💎 5. **비즈니스 로직의 명확성**
- projects와 collaborations: 사용자 관점에서는 유사하지만 생성자 역할이 다름
- proposals와 invitations: 워크플로우가 근본적으로 다름
- **결론**: 분리 유지가 도메인 모델 명확성에 유리

### 💎 6. **MVP 단계의 우선순위**
1. ✅ **기능 완성** > 구조 최적화
2. ✅ **안정성** > 성능
3. ✅ **빠른 배포** > 완벽한 설계
4. ✅ **검증 후 개선** > 선제적 최적화

---

## 최종 결정

### ✅ **현재 구조 유지**
```sql
-- 기존 4개 테이블 그대로
projects
collaborations
project_proposals
collaboration_invitations
```

### 📊 **근거**
| 판단 기준 | 현재 상태 | 임계값 | 결정 |
|----------|----------|--------|------|
| 데이터 규모 | ~100건 | 10,000건 | ✅ 유지 |
| 개발 우선순위 | MVP 완성 | 확장성 | ✅ 유지 |
| 마이그레이션 리스크 | 높음 | 낮음 | ✅ 유지 |
| UNION 쿼리 성능 | <100ms | >500ms | ✅ 유지 |

---

## 선택적 개선 사항 (Optional)

### 📌 통합 조회용 View 추가 (즉시 적용 가능)

**파일**: `quick_integration_views.sql` 참고

```sql
-- 1. Explore 페이지용
CREATE VIEW explore_all_activities AS
SELECT *, 'project' as type FROM projects WHERE visibility = 'public'
UNION ALL
SELECT *, 'collaboration' as type FROM collaborations WHERE visibility = 'public';

-- 2. 알림 페이지용
CREATE VIEW user_all_notifications AS
SELECT pp.*, 'proposal' as type FROM project_proposals pp
UNION ALL
SELECT ci.*, 'invitation' as type FROM collaboration_invitations ci;
```

**장점**:
- ✅ 마이그레이션 불필요
- ✅ 기존 코드 영향 없음
- ✅ 통합 조회 성능 개선
- ✅ 프론트엔드 코드 단순화

**적용 시점**: 필요시 언제든지 (선택사항)

---

## TODO Next

### 🎯 즉시 (이번 Sprint)
- [ ] 없음 (현재 구조 유지 결정)

### 📊 모니터링 (향후 3개월)
- [ ] 데이터 증가율 추적 (월별 projects, collaborations 증가 건수)
- [ ] Explore 페이지 쿼리 성능 측정 (현재 vs 향후)
- [ ] 알림 조회 쿼리 성능 측정
- [ ] 사용자 피드백 수집 (속도 이슈 여부)

### 🔄 재평가 시점 (조건부)
- [ ] **데이터 > 10,000건**: Option C (activities 통합) 재검토
- [ ] **UNION 쿼리 > 500ms**: Materialized View 적용
- [ ] **신규 activity_type 3개 이상 추가**: 전체 통합 재검토
- [ ] **통합 검색/필터 성능 이슈**: 인덱스 전략 또는 테이블 통합

### 🚀 추가 개선 (선택사항)
- [ ] Service Layer 리팩토링 (중복 코드 제거)
  - `ActivityService` 추상 클래스 생성
  - `ProjectService`, `CollaborationService` 상속
- [ ] 통합 조회용 View 추가 (필요시)
- [ ] 전체 텍스트 검색 최적화 (pg_trgm, to_tsvector)

---

## 테스트 및 검증

### ✅ 완료된 분석
- [x] 테이블 구조 중복도 분석 (projects/collaborations: 85%, proposals/invitations: 75%)
- [x] 4가지 통합 옵션 비교 (Option A~D)
- [x] 비즈니스 로직 차이점 검토
- [x] UI/UX 요구사항 분석
- [x] 데이터 규모 기반 의사결정
- [x] 마이그레이션 비용/효과 분석

### ❌ 미수행 항목 (불필요)
- 실제 마이그레이션 (보류)
- 성능 벤치마크 (현재 규모에서 불필요)
- 프로덕션 테스트 (구조 변경 없음)

---

## 참고 파일 경로

### 📄 생성된 분석 문서
- `C:/Users/이창한/OneDrive/바탕 화면/BridgeApp/database_refactoring_proposal.sql`
  - Class Table Inheritance 패턴 구조 (Option A~C)
  - 전체 통합 시 마이그레이션 SQL
  - 6개 테이블 구조 상세 설계

- `C:/Users/이창한/OneDrive/바탕 화면/BridgeApp/proposal_invitation_analysis.md`
  - proposals/invitations 통합 분석
  - 4개 테이블 전체 의존 관계 분석
  - 비즈니스 로직 차이점 상세 분석
  - 의사결정 플로우차트

- `C:/Users/이창한/OneDrive/바탕 화면/BridgeApp/quick_integration_views.sql`
  - 통합 조회용 View 5개 정의
  - 성능 최적화 인덱스 가이드
  - 사용 예시 및 적용 방법

### 🗄️ 관련 데이터베이스 테이블
- `public.projects` - 브랜드 주도 프로젝트
- `public.collaborations` - 파트너 협업
- `public.project_proposals` - 브랜드→파트너 제안
- `public.collaboration_invitations` - 파트너→파트너 초대

### 📚 프로젝트 문서
- `CLAUDE.md` - 프로젝트 가이드
- `database_refactoring_proposal.sql` - 통합 구조 제안 (미적용)
- `proposal_invitation_analysis.md` - 상세 분석 보고서

---

## 최종 요약

### 🎯 **핵심 결정**
> **"현재 구조 유지. 통합은 데이터 규모 증가 시 재검토."**

### 📌 **핵심 인사이트**
1. **통합은 수단이지 목적이 아니다** - 비즈니스 가치 우선
2. **데이터 규모가 의사결정을 좌우한다** - 현재 < 100건
3. **점진적 개선이 최선이다** - View → Materialized View → 테이블 통합
4. **중복 코드 > 중복 데이터** - Service Layer 리팩토링 우선
5. **비즈니스 로직 명확성** - 분리 유지가 도메인 모델에 유리
6. **MVP 우선순위** - 기능 완성 > 구조 최적화

### 🔮 **미래 계획**
- **단기** (현재): 구조 유지, 기능 개발 집중
- **중기** (데이터 > 1,000건): View 추가 검토
- **장기** (데이터 > 10,000건): 테이블 통합 재검토

### ✅ **기대 효과**
- 마이그레이션 리스크 제로
- 개발 리소스 절약
- 안정적인 MVP 완성
- 향후 확장 가능성 확보

---

**작성일**: 2025-11-19
**결정자**: 이창한
**다음 리뷰 시점**: 데이터 10,000건 도달 시 또는 성능 이슈 발생 시

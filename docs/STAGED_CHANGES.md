# Staged Changes 상세 요약

> **브랜치**: `staging` (origin/staging와 동기화됨)  
> **일시**: 2026-02-11  
> **총 변경**: 67개 파일, +1,457 lines, -2,230 lines

---

## 목차
1. [문서 및 설정](#1-문서-및-설정)
2. [임시 파일 삭제](#2-임시-파일-삭제)
3. [Supabase Edge Function](#3-supabase-edge-function)
4. [웹앱 - 컴포넌트](#4-웹앱---컴포넌트)
5. [웹앱 - Hooks](#5-웹앱---hooks)
6. [웹앱 - 페이지](#6-웹앱---페이지)
7. [웹앱 - 서비스](#7-웹앱---서비스)
8. [라우팅](#8-라우팅)

---

## 1. 문서 및 설정

### AGENTS.md
- **변경 유형**: 수정 (1줄)
- **내용**: 파일 끝 newline 포맷 정리

### CLAUDE.md
- **변경 유형**: 수정 (대규모)
- **주요 변경**:
  - 한글 → 영어 문서화 (Development Constitution)
  - **Codex MCP Integration** 섹션 추가:
    - `gpt-5.2-codex`, `gpt-5.3-codex` 모델 사용법
    - `reasoning_effort` 설정 (`low`, `medium`, `high`, `xhigh`)
    - Tier별 권장 설정 및 사용 예제
  - Execution Brief 작성 언어 규칙 명시: **한글로 작성** 필수

### docs/.bkit-memory.json (신규)
- **내용**: bkit 세션 메타데이터
- sessionCount: 11, lastSession: 2026-02-10, platform: claude, level: Starter

### docs/.pdca-status.json (신규)
- **내용**: PDCA 파이프라인 상태
- version: 2.0, currentPhase: 1, level: Dynamic
- activeFeatures: [], primaryFeature: null

---

## 2. 임시 파일 삭제

다음 **27개** `tmpclaude-*-cwd` 파일 삭제 (임시 작업 디렉터리 참조용 파일):
- tmpclaude-0649-cwd ~ tmpclaude-fa72-cwd

---

## 3. Supabase Edge Function

### supabase/functions/explore-feed/index.ts
- **변경 유형**: 수정 (94줄 변경)

#### API 확장
- `activeTab?: "projects" | "collaborations" | "partners"` 추가
- `fetchMode?: "full" | "active-only"` 추가

#### active-only 모드
- `fetchMode: "active-only"` 시 **현재 탭에 해당하는 데이터만** 조회
- 불필요한 탭 데이터 fetch 제거 → 초기 로딩 성능 개선

#### Projects/Collaborations 쿼리 최적화
- **SELECT 필드 축소**: 리스트 카드에 필요한 최소 필드만 조회
  - `project_members` JOIN 제거
  - `collaboration_members` JOIN 제거
- **첫 페이지 cap**: "내 프로젝트/협업" unlimited → `limit` 적용
- featured 항목 limit: `Math.min(5, featuredLimit)` 로 조정

#### Partners 커서 로직
- `partnersCursor` 계산 방식 변경: partners + brands 통합
- `hasMorePartners` 계산: partners와 brands 모두 limit 여부 반영

---

## 4. 웹앱 - 컴포넌트

### 삭제된 컴포넌트
| 파일 | 라인 수 | 설명 |
|------|---------|------|
| ImageUploader.tsx | 138 | 이미지 업로드 공통 컴포넌트 |
| PrefetchLink.tsx | 42 | Prefetch 지원 링크 컴포넌트 |
| EditModeToolbar.tsx | 117 | 편집 모드 툴바 |
| ProfilePreviewCard.tsx | 177 | 온보딩 프로필 미리보기 카드 |
| ProjectCreationCompleteModal.tsx | 142 | 프로젝트 생성 완료 모달 |

### webapp/src/components/common/index.ts
- **추가**: `Header` 컴포넌트 export

### CollaborationCard.tsx
- **teamHelpers 의존성 제거**: `getLeader`, `getLeaderName`, `getLeaderId` 제거
- **리더 기준 변경**: `members` 기반 → `createdBy` 기반 (리스트 카드 최적화)
- **표시 로직**: `display.displayName` 우선, 없으면 빈 문자열/리더
- **차단 시**: `collaboration.createdBy` 대상으로 block

### BottomNavigationBar.tsx
- **Explore prefetch 변경**: `prefetchQuery` → `prefetchInfiniteQuery`
- **QueryKey**: `['explore', 'projects', '전체', statuses, '']`
- **fetchExploreBatch 파라미터**: `activeTab: 'projects'`, `fetchMode: 'active-only'`, limit 3/10 조건부

---

## 5. 웹앱 - Hooks

### 삭제된 Hooks
| 파일 | 라인 수 | 설명 |
|------|---------|------|
| useNetworkStatus.ts | 86 | 네트워크 상태 감지 |
| useProfileDisplay.ts | 299 | 프로필 표시 로직 |
| useRealtimeHealth.ts | 148 | Realtime 연결 상태 |
| useScrollRestoration.ts | 52 | 스크롤 복원 |
| useSelfHealing.ts | 139 | 자가 치유 로직 |

### useExploreFeed.ts
- **파라미터 추가**: `activeTab: ExploreFeedTab` (4번째 인자)
- **상수**: `FIRST_PAGE_LIMIT=3`, `NEXT_PAGE_LIMIT=10`
- **QueryKey**: `['explore', activeTab, category, statuses, searchQuery]`
- **fetchMode**: `'active-only'` 고정
- **캐시**: `staleTime` 5분, `gcTime` 10분
- **prefetch 변경**: `prefetchOtherCategories` → `prefetchTab(tab)`
- **초기화 제거**: `useEffect` 기반 query reset 로직 삭제

---

## 6. 웹앱 - 페이지

### Explore.tsx
- **탭 전환**: `handleTabChange` 추가, 탭 변경 시 검색어 초기화
- **ManageAll prefetch**: 마운트 시 즉시 → **Manage 패널 열 때** 지연 prefetch
- **탭별 prefetch**: `requestIdleCallback` + 1.8초 간격으로 다른 탭 prefetch
- **로딩 UI**: `showInitialLoadingState = isLoading || isCurrentTabFetchingWithoutData`
- **effectiveStatuses**: `selectedStatuses` 없으면 기본 `STATUSES` 사용

### PartnerSearchPage.tsx
- **effectiveStatuses**: Explore와 동일 로직 추가
- **useExploreFeed**: 4번째 인자 `'partners'` 고정

### MyProfile.tsx
- **수익 관리 메뉴**:
  - 기존 "상점" 메뉴 → "수익 관리"로 변경
  - subtitle: "라잇 포인트, 프로젝트 정산 관리"
  - action: `navigate('/profile/revenue')`
- **상점 메뉴**: 주석 처리 (추후 복구 가능)

### 신규 페이지

#### ProjectSettlementDistributionPage.tsx (144줄)
- **경로**: `/project-settlement/:id/distribution`
- 프로젝트 정산 수익 분배 설정 UI
- Slider로 참여자별 기여도(%) 설정, 총 100% 검증
- Mock 파트너 데이터 사용

#### RevenueManagementPage.tsx (315줄)
- **경로**: `/profile/revenue`
- 수익 관리 메인 화면
- Gauge 차트 (목표 대비 달성률)
- 탭: "최근 수익·지출 내역", "결제 수단"
- Mock 거래 내역 데이터

#### RevenueHistoryPage.tsx (92줄)
- **경로**: `/profile/revenue/history`
- 수익 내역 리스트 (날짜, 제목, 금액, 상태)
- Mock MOCK_HISTORY 데이터

---

## 7. 웹앱 - 서비스

### 삭제된 서비스
- **artistService.ts** (115줄)

### collaborationService.ts
- **타입 분리**: `collaborationService.types.ts`로 이동
  - `CollaborationListOptions`, `Collaboration`, `CollaborationApplication`, `CollaborationInvitation`
  - `CreateCollaborationInput`, `PaginationOptions`, `TeamInfo`, `TeamMember`

### projectService.ts
- **타입 분리**: `projectService.types.ts`로 이동
  - `Project`, `ProjectApplication`, `ProjectListOptions`, `TeamInfo`, `TeamMember`

### collaborationService.types.ts (신규, 136줄)
- 협업 관련 타입 정의 전용 모듈

### projectService.types.ts (신규, 101줄)
- 프로젝트 관련 타입 정의 전용 모듈

### community/memberDisplay.ts (신규, 42줄)
- `getMemberNameFromMaps`, `getMemberAvatarFromMaps` 함수
- communityService 클래스 내 private 메서드 → 모듈 export로 분리

### communityService.ts
- `getMemberNameFromMaps`, `getMemberAvatarFromMaps` → `memberDisplay` 모듈 import

### message/timeUtils.ts (신규, 34줄)
- `formatTime(dateString)`: 상대 시간 포맷 (방금 전, N분/시간/일 전, 날짜)
- `getKstNowIsoWithOffset()`: KST ISO 문자열 생성

### messageService.ts
- `formatTime`, `getKstNowIsoWithOffset` → `message/timeUtils` import
- 인라인 구현 제거

### exploreService.ts
- **타입 추가**: `ExploreFeedTab`, `ExploreFetchMode`
- **FetchExploreBatchOptions 확장**: `activeTab`, `fetchMode`
- **enrichEdgeFunctionData 최적화**:
  - project_members/collaboration_members JOIN 제거
  - `createdBy` 기반 리더 표시
  - partners VIEW 배치 조회 제거, displayInfoMap만 사용
  - collaboration `members` 빌드 제거 (리스트 카드에서 미사용)
- **fallbackFetchExplore**: `activeTab`, `fetchMode` 지원, 활성 탭만 fetch

---

## 8. 라우팅

### main.tsx
- **추가 라우트**:
  - `/profile/revenue` → LazyRevenueManagementPage
  - `/profile/revenue/history` → LazyRevenueHistoryPage
  - `/project-settlement/:id/distribution` → LazyProjectSettlementDistributionPage

### lazyPages.tsx
- `LazyRevenueManagementPage`
- `LazyRevenueHistoryPage`
- `LazyProjectSettlementDistributionPage`

---

## 변경 요약 by 영역

| 영역 | 추가 | 수정 | 삭제 |
|------|------|------|------|
| 문서/설정 | 2 | 2 | 0 |
| 임시 파일 | 0 | 0 | 27 |
| Edge Function | 0 | 1 | 0 |
| 컴포넌트 | 0 | 3 | 5 |
| Hooks | 0 | 1 | 5 |
| 페이지 | 3 | 4 | 0 |
| 서비스 | 4 | 5 | 1 |
| 라우팅 | 0 | 2 | 0 |

---

## 주요 테마

1. **Explore 피드 성능 최적화**
   - 탭별 활성 데이터만 fetch (active-only)
   - 첫 페이지 limit 축소 (3 → 10)
   - JOIN 제거로 쿼리 경량화

2. **수익 관리 기능 도입**
   - 수익 관리, 수익 내역, 프로젝트 정산 분배 페이지 추가
   - MyProfile "상점" → "수익 관리"로 전환

3. **타입 및 모듈 분리**
   - collaborationService.types, projectService.types
   - message/timeUtils, community/memberDisplay

4. **코드 정리**
   - 미사용 컴포넌트/훅/서비스 삭제
   - 임시 cwd 파일 제거

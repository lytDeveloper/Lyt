# 알림 시스템 가이드

BridgeApp은 **두 가지 독립적인 알림 시스템**을 사용합니다:

## 1. 서버 알림 (Server Notifications) ✅ 구현 완료

**목적**: 관리자 → 유저 (앱 공지, 업데이트, 점검 안내)

### 관리 (백오피스)
- **파일**: `backoffice/src/api/serverNotifications.ts`
- **페이지**: `backoffice/src/pages/Notifications.tsx`
- **기능**: 목록 조회, 검색(제목/본문), 유형 필터, 활성 필터, 생성/수정/삭제, 미리보기
- **필드**:
  - 제목, 본문(Markdown 가능)
  - 유형: `announcement` | `version_update` | `maintenance`
  - 대상(audiences): `all` | `creator` | `brand` | `admin` (복수 선택)
  - 언어(locale), 기간(starts_at/ends_at), 활성, 우선순위, 링크 URL
  - 버전 범위(app_min_version/app_max_version)

### 웹앱 노출 (GlobalNoticeModal)
- **파일**:
  - `webapp/src/services/serverNotificationService.ts`
  - `webapp/src/hooks/useServerNotifications.ts`
  - `webapp/src/components/GlobalNoticeModal.tsx`
- **노출 규칙**:
  - 앱 로드 시 활성 공지 조회
  - 앱 버전 비교 (min_version/max_version 체크)
  - 쿠키 확인 후 모달 팝업
  - 다시 보지 않기: `notif_dismissed_{id}` 쿠키 (기본 90일)
  - `version_update`: 현재 버전이 최소 버전 미만이면 노출

### 데이터베이스
- **테이블**: `public.notification`
- **뷰**: `public.active_notifications` (is_active=true & 기간 내)
- **RLS**: 읽기만 허용 (쓰기는 admin만)

### 환경 변수
- `VITE_APP_VERSION`: 현재 앱 버전 (예: 1.4.0)

---

## 2. 유저 알림 (User Notifications) ⚠️ 2단계 구현 예정

**목적**: 유저 ↔ 유저 (제안, 초대, 메시지, 기한 임박)

### 계획된 기능
- **파일** (stub):
  - `webapp/src/types/userNotification.ts`
  - `webapp/src/services/userNotificationService.ts`
- **알림 타입**:
  - `proposal`: 프로젝트 제안 (`project_proposals` 테이블)
  - `invitation`: 협업 초대 (`collaboration_invitations` 테이블)
  - `message`: 채팅 메시지 (`chat_messages` 테이블)
  - `deadline`: 기한 임박 알림
  - `application`: 프로젝트 지원, 협업 지원 알림 (`project_applications`, `collaboration_applications` 테이블)
  - `status_change`: 상태 변경 (제안 수락/거절 등)

### UI
- Header 알림 벨 아이콘 (읽지 않은 알림 개수 뱃지)
- NotificationModal (드롭다운 형태, 현재는 mock 데이터)

### 데이터베이스
- **통합 뷰**: `user_all_notifications` (`quick_integration_views.sql` - 미적용)
- **개별 테이블**:
  - `project_proposals` (✅ 구현됨)
  - `collaboration_invitations` (✅ 구현됨)
  - `chat_messages` (✅ 구현됨)
  - `project_applications`, (✅ 구현됨)
  - `collaboration_applications` (✅ 구현됨)

### 실시간 기능
- Supabase Realtime 구독
- 새 제안/초대/메시지 즉시 알림
- 읽음 상태 실시간 동기화

### 구현 체크리스트
- [ ] `user_all_notifications` 뷰 적용
- [ ] `userNotificationService.ts` 구현
- [ ] NotificationModal 실제 데이터 연결
- [ ] Header 알림 벨 아이콘 추가
- [ ] Supabase Realtime 구독 설정
- [ ] 읽음/별표 기능 구현

---

## 시스템 비교

| 항목 | 서버 알림 (Server) | 유저 알림 (User) |
|------|-------------------|-----------------|
| 방향 | Admin → Users | User ↔ User |
| 목적 | 공지, 업데이트, 점검 | 제안, 초대, 메시지 |
| 테이블 | `notification` | `project_proposals`, `collaboration_invitations`, `chat_messages`, `project_applications`, `collaboration_applications` |
| UI | GlobalNoticeModal (팝업) | NotificationModal (드롭다운) |
| 해제 방식 | 쿠키 (클라이언트) | `is_read` 플래그 (서버) |
| 실시간 | ❌ | ✅ Realtime 구독 |
| 상태 | ✅ 구현 완료 | ⚠️ 2단계 예정 |

---

## 샘플 시드
- 서비스 점검 안내 (전체)
- 앱 업데이트 안내 (creator)
- 신규 기능 소개 (brand)















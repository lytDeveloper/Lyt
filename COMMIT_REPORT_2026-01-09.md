# 📋 2026-01-09 커밋 정리

## 범위
- `webapp/src/components/common/DatePickerModal.tsx` (신규)
- `webapp/src/components/common/DefaultImageConfirmDialog.tsx` (신규)
- `webapp/src/components/common/CreateChatModal.tsx`
- `webapp/src/components/common/LazyImage.tsx`
- `webapp/src/components/common/InvitationDetailModal.tsx`
- `webapp/src/components/messages/MessageRoom.tsx`
- `webapp/src/components/notification/InAppNotificationBanner.tsx`
- `webapp/src/pages/common/BrandArtistCollection.tsx`
- `webapp/src/pages/explore/CreateProjectStep2.tsx`
- `webapp/src/pages/lounge/CommunityDetail.tsx`
- `webapp/src/pages/onboarding/*` (다수)
- `webapp/src/stores/onboarding/*` (전체 리팩토링)
- `webapp/src/services/messageService.ts`
- `webapp/src/services/profileQueryService.ts` (신규)
- `webapp/src/services/profileService.ts`
- `webapp/src/services/projectService.ts`
- `webapp/src/services/reviewService.ts`
- `webapp/src/constants/brandCreatorTypes.ts` (신규)
- `webapp/src/hooks/useDefaultImages.tsx` (파일명 변경)
- `webapp/src/hooks/useOnboardingStep.ts`
- `webapp/src/utils/notificationHelper.ts`
- `webapp/src/utils/signedUrl.ts`
- `webapp/src/index.css`
- `supabase/migrations/20260109000000_create_chat_room_function.sql` (신규)
- `supabase/migrations/20251216000000_remote_schema.sql`
- `backoffice/src/api/homepage.ts`

---

## 주요 이슈 및 대응

### 1. 새로운 공통 컴포넌트 추가
- **DatePickerModal.tsx** (492줄 추가)
  - 날짜 선택 모달 컴포넌트 신규 생성
  - 캘린더 뷰, 년도/월 선택 기능
  - 최소 날짜 제한 기능
  - 오늘 날짜 하이라이트
  - 모바일 친화적 UI

- **DefaultImageConfirmDialog.tsx** (127줄 추가)
  - 기본 이미지 사용 확인 다이얼로그 컴포넌트
  - 앱 디자인 시스템에 맞춘 스타일
  - StatusChangeConfirmDialog 스타일 참고

- **brandCreatorTypes.ts** (234줄 추가)
  - 브랜드/크리에이터 타입 상수 정의
  - 카테고리 및 타입 매핑 상수

---

### 2. 온보딩 스토어 대규모 리팩토링
- **resetOnboardingStores.ts** (43줄 수정)
  - 온보딩 스토어 초기화 로직 개선

- **useArtistOnboardingStore.ts** (29줄 수정)
  - 아티스트 온보딩 스토어 로직 개선

- **useBrandOnboardingStore.ts** (51줄 수정)
  - 브랜드 온보딩 스토어 로직 개선

- **useCommonOnboardingStore.ts** (78줄 수정)
  - 공통 온보딩 스토어 로직 개선

- **useCreativeOnboardingStore.ts** (29줄 수정)
  - 크리에이터 온보딩 스토어 로직 개선

- **useFanOnboardingStore.ts** (37줄 수정)
  - 팬 온보딩 스토어 로직 개선

---

### 3. 온보딩 페이지 개선
- **Step1_ArtistName.tsx** (32줄 수정)
  - 아티스트 이름 입력 페이지 개선

- **Step1_NameInput.tsx** (56줄 수정)
  - 브랜드 이름 입력 페이지 개선

- **Step2_Details.tsx** (28줄 수정)
  - 브랜드 상세 정보 입력 페이지 개선

- **Step3_Images.tsx** (4줄 수정)
  - 이미지 업로드 페이지 개선

- **Step4_Collaboration.tsx** (2줄 수정)
  - 협업 정보 입력 페이지 개선

- **Step6_Complete.tsx** (8줄 수정)
  - 완료 페이지 개선

- **Step1_CreativeImage.tsx** (34줄 수정)
  - 크리에이터 이미지 업로드 페이지 개선

- **Step1_FanImage.tsx** (34줄 수정)
  - 팬 이미지 업로드 페이지 개선

---

### 4. 메시지 및 채팅 기능 개선
- **create_chat_room_function.sql** (59줄 추가)
  - 채팅방 생성 함수 마이그레이션 추가
  - Supabase 함수로 채팅방 생성 로직 구현

- **CreateChatModal.tsx** (5줄 수정)
  - 채팅 생성 모달 개선

- **MessageRoom.tsx** (35줄 수정)
  - 메시지 룸 컴포넌트 개선

- **messageService.ts** (175줄 수정)
  - 메시지 서비스 대규모 리팩토링
  - 코드 간소화 및 최적화

---

### 5. 프로필 및 리뷰 서비스 개선
- **profileQueryService.ts** (93줄 추가)
  - 프로필 쿼리 서비스 신규 생성
  - 프로필 관련 쿼리 로직 분리

- **profileService.ts** (2줄 수정)
  - 프로필 서비스 개선

- **reviewService.ts** (10줄 수정)
  - 리뷰 서비스 개선

- **projectService.ts** (4줄 수정)
  - 프로젝트 서비스 개선

---

### 6. UI 컴포넌트 개선
- **LazyImage.tsx** (16줄 수정)
  - 지연 로딩 이미지 컴포넌트 개선

- **BrandArtistCollection.tsx** (96줄 수정 → 25줄 삭제)
  - 브랜드/아티스트 컬렉션 페이지 개선
  - 사용하지 않는 코드 제거 (expand 기능 제거)
  - 린트 수정 (e97ee30 커밋)

- **CreateProjectStep2.tsx** (146줄 수정)
  - 프로젝트 생성 2단계 페이지 개선

- **CommunityDetail.tsx** (25줄 수정)
  - 커뮤니티 상세 페이지 개선

- **ProjectCard.tsx** (1줄 수정)
  - 프로젝트 카드 컴포넌트 개선

- **InAppNotificationBanner.tsx** (25줄 수정)
  - 인앱 알림 배너 개선

---

### 7. 유틸리티 및 훅 개선
- **useDefaultImages.tsx** (파일명 변경: .ts → .tsx, 59줄 수정)
  - 기본 이미지 훅 파일 확장자 변경
  - 로직 개선

- **useOnboardingStep.ts** (12줄 수정)
  - 온보딩 스텝 훅 개선

- **notificationHelper.ts** (18줄 수정)
  - 알림 헬퍼 유틸리티 개선

- **signedUrl.ts** (18줄 수정)
  - 서명된 URL 유틸리티 개선

---

### 8. 스타일 및 설정 개선
- **index.css** (11줄 수정)
  - 전역 스타일 개선

- **homepage.ts** (34줄 수정)
  - 홈페이지 API 개선

---

### 9. 데이터베이스 마이그레이션
- **20251216000000_remote_schema.sql** (10줄 수정)
  - 원격 스키마 마이그레이션 업데이트

---

## 통계
- **총 변경 파일**: 42개
- **추가된 줄**: 1,839줄
- **삭제된 줄**: 492줄
- **순 증가**: 1,347줄

---

## 테스트 및 검증
- 린트 검사 완료 (e97ee30 커밋)
- 온보딩 플로우 테스트 필요
- 메시지 기능 테스트 필요
- 프로필 쿼리 서비스 통합 테스트 필요

---

## TODO Next
- 새로운 DatePickerModal 컴포넌트 사용처 확인 및 테스트
- DefaultImageConfirmDialog 통합 테스트
- 온보딩 스토어 리팩토링 후 플로우 검증
- 메시지 서비스 리팩토링 후 기능 검증
- 프로필 쿼리 서비스 사용처 확인
- 채팅방 생성 함수 Supabase 배포 확인

---

### 참고 파일 경로
- 신규 컴포넌트: `webapp/src/components/common/DatePickerModal.tsx`, `DefaultImageConfirmDialog.tsx`
- 신규 상수: `webapp/src/constants/brandCreatorTypes.ts`
- 신규 서비스: `webapp/src/services/profileQueryService.ts`
- 신규 마이그레이션: `supabase/migrations/20260109000000_create_chat_room_function.sql`
- 주요 리팩토링: `webapp/src/stores/onboarding/*`, `webapp/src/services/messageService.ts`



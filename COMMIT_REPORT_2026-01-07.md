# 📋 2026-01-07 커밋 정리

## 범위
- `webapp/src/pages/profile/ArchivePage.tsx`
- `webapp/src/pages/profile/WrittenReviewsPage.tsx`
- `webapp/src/pages/profile/MyProfile.tsx`
- `webapp/src/pages/manage/ManageAll.tsx`
- `webapp/src/components/manage/ItemCard.tsx`
- `webapp/src/components/manage/StatusDropdownMenu.tsx`
- `webapp/src/components/settings/BlockedAccountManagement.tsx`
- `webapp/src/pages/settings/CustomerSupportPage.tsx`
- `webapp/src/pages/common/MagazineDetail.tsx`
- `webapp/src/pages/common/Home.tsx`
- `webapp/src/components/home/CollaborationSection.tsx`
- `webapp/src/components/navigation/BottomNavigationBar.tsx`
- `webapp/src/pages/profile/components/CareerTab.tsx`
- `webapp/src/pages/profile/components/PortfolioTab.tsx`
- `webapp/src/components/explore/*` (다수)
- `webapp/src/services/reviewService.ts`
- `webapp/src/services/imageUploadService.ts`
- `webapp/src/utils/thumbnailGenerator.ts`
- `supabase/migrations/20250107000000_fix_reviews_delete_rls.sql`
- `backoffice/fix_reviews_delete_rls.sql`

---

## 주요 이슈 및 대응

### 1. 아카이브 및 리뷰 기능 대규모 개선 (커밋: 6a4f32a)
- **기능 추가**: 
  - 리뷰 템플릿 시스템 추가 (`reviewTemplates.ts`, `ReviewTemplateCard.tsx`)
  - 단일 리뷰 편집 모달 추가 (`SingleReviewEditModal.tsx`)
  - 상태 변경 확인 다이얼로그 추가 (`StatusChangeConfirmDialog.tsx`)
  - 상태 드롭다운 메뉴 컴포넌트 추가 (`StatusDropdownMenu.tsx`)
  - 애니메이션 아이템 카드 추가 (`AnimatedItemCard.tsx`)
  - 썸네일 생성 유틸리티 추가 (`thumbnailGenerator.ts`)
  - 이미지 크기 상수 정의 (`imageSizes.ts`)

- **로직 개선**:
  - `ArchivePage`: 아카이브 데이터 표시 및 관리 로직 개선
  - `WrittenReviewsPage`: 작성한 리뷰 관리 기능 강화 (249줄 추가/수정)
  - `ItemCard`: 아이템 카드 UI/UX 개선 (150줄 수정)
  - `ReviewModal`: 리뷰 모달 로직 간소화
  - `ReviewCard`: 리뷰 카드 컴포넌트 개선
  - `useMyProfileData`: 프로필 데이터 훅 로직 개선 (187줄 수정)
  - `useArchiveData`: 아카이브 데이터 훅 개선
  - `reviewService`: 리뷰 서비스 기능 확장 (115줄 추가)
  - `imageUploadService`: 이미지 업로드 서비스 추가 (176줄)
  - `signedUrl`: 서명된 URL 유틸리티 개선 (129줄 수정)

- **DB 마이그레이션**:
  - 리뷰 삭제 RLS 정책 수정 (`fix_reviews_delete_rls.sql`)
  - Activity Field Keywords 시퀀스 수정

- **UI 변경**:
  - `LazyImage`: 이미지 로딩 컴포넌트 최적화
  - `ActivityFieldKeywordPicker`: 키워드 선택기 개선
  - `ManageAll`: 관리 페이지 UI 개선 (137줄 수정)

**통계**: 32개 파일 변경, 2,548줄 추가, 454줄 삭제

---

### 2. UI/UX 스타일 개선 (커밋: b480b3e)
- **스타일 수정**:
  - 전체적으로 `boxShadow` 스타일 통일 및 개선
  - 차단 아이콘 추가 (`hide.png`)
  - 차단 아이콘 이미지 업데이트 (`block.png`)

- **영향받은 컴포넌트**:
  - `CollaborationCard`, `FileCard`, `PartnerCard`, `ProjectCard`, `TeamMemberCard`
  - `CommunityCard`, `MagazineCard`, `FeaturedMagazineCard`
  - `TargetBrandCard`
  - `BottomNavigationBar`
  - `BlockedAccountManagement`
  - `Explore`, `ExploreCollaborationCreate`, `ExploreCollaborationDetail`, `ExploreProjectDetail`
  - `ArchivePage`, `MyProfile`
  - `CreateProjectStep1`

---

### 3. 프로필 페이지 개선 (커밋: c53d593, 05f0ec0)
- **아이콘 추가**:
  - `CareerTab`: 커리어 탭 아이콘 추가
  - `PortfolioTab`: 포트폴리오 탭 아이콘 추가
  - `ArchivePage`: 빈 상태 아이콘 수정

- **레이아웃 수정**:
  - `Home`: 카테고리 패딩값 수정
  - `CollaborationSection`: 함께할 아티스트 아이콘 수정
  - `BottomNavigationBar`: 네비게이션 아이콘 업데이트

---

### 4. 매거진 상세 페이지 스타일 수정 (커밋: e099c56)
- **UI 개선**:
  - `MagazineDetail`: 좋아요/싫어요 버튼 스타일 수정

---

### 5. 관리 페이지 개선 (커밋: 202bf0c)
- **UI 수정**:
  - `ManageAll`: 빈 상태에서 파트너십 문의 타이틀 숨김 처리
  - 텍스트 수정

- **사용 가이드 이미지 추가**:
  - `CustomerSupportPage`: 사용 가이드 이미지 6개 추가 (`manual1.png` ~ `manual6.png`)

---

### 6. 고객 지원 페이지 개선 (커밋: b23fa0a)
- **콘텐츠 업데이트**:
  - `CustomerSupportPage`: 사용 가이드 이미지 추가 및 텍스트 수정
  - 사용 가이드 이미지 파일 업데이트

---

### 7. 충돌 해결 및 린트 수정 (커밋: 9480a05, 6029375, e780de9)
- **충돌 해결**:
  - `ManageAll.tsx`: 머지 충돌 해결
  - `ArchivePage.tsx`: 머지 충돌 해결
  - `MyProfile.tsx`: 머지 충돌 해결
  - `WrittenReviewsPage.tsx`: 충돌 해결

- **린트 수정**:
  - `BlockedAccountManagement.tsx`: 린트 오류 수정 (2줄 삭제)

---

## 테스트 및 검증
- 로컬 환경에서 UI 컴포넌트 테스트
- 린트 검사 완료
- 머지 충돌 해결 및 검증
- 빌드 확인

---

## TODO Next
- 리뷰 템플릿 시스템 사용자 테스트
- 이미지 업로드 및 썸네일 생성 기능 검증
- 아카이브 및 리뷰 페이지 통합 테스트
- DB 마이그레이션 적용 확인

---

### 참고 파일 경로
- 주요 변경 파일: `webapp/src/pages/profile/`, `webapp/src/components/manage/`, `webapp/src/services/`
- 마이그레이션: `supabase/migrations/20250107000000_fix_reviews_delete_rls.sql`
- 스크립트: `backoffice/scripts/applyReviewsDeleteRLSFix.js`



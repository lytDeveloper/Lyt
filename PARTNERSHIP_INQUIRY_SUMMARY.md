# 파트너십 문의 페이지 구현 및 개선 작업 요약

## 범위
- `webapp/src/pages/inquiry/PartnershipInquiryPage.tsx`
- `webapp/src/pages/inquiry/steps/CreatePartnershipInquiryStep1.tsx`
- `webapp/src/pages/inquiry/steps/CreatePartnershipInquiryStep2.tsx`
- `webapp/src/pages/inquiry/steps/CreatePartnershipInquiryStep3.tsx`
- `webapp/src/components/inquiry/TargetBrandCard.tsx`
- `webapp/src/components/notification/ActionSuccessModal.tsx`
- `webapp/src/stores/usePartnershipStore.ts`
- `webapp/src/services/partnershipService.ts`

---

## 주요 이슈 및 대응

### 1. UI/UX 개선 - Step 컴포넌트 디자인 통일
- **UI 변경**: Step1, Step2, Step3의 제목을 박스 내부로 이동
- **UI 변경**: 모든 Step 박스에 하단 그림자 추가 (`boxShadow: '0 2px 8px rgba(0,0,0,0.05)'`)
- **로직 개선**: Step1에도 이전 버튼 추가 (Step1에서는 뒤로 가기, Step2/3에서는 이전 단계로 이동)

### 2. Step2 프로젝트 정보 옵션 수정
- **로직 개선**: 프로젝트 유형 옵션을 카테고리 기반에서 독립적인 8개 옵션으로 변경
  - 브랜드 콜라보레이션, 제품 개발, 마케팅 캠페인, 이벤트 기획, 콘텐츠 제작, 기술 협력, 유통 파트너쉽, 기타
- **로직 개선**: 예산 규모 옵션을 스크린샷 기준으로 6개 옵션으로 수정
  - 1천만원 미만, 1천만원 - 5천만원, 5천만원 - 1억원, 1억원 - 5억원, 5억원 - 10억원, 예산 협의
- **로직 개선**: 프로젝트 기간 옵션을 스크린샷 기준으로 6개 옵션으로 수정
  - 1개월 이내, 1-3개월, 3-6개월, 6개월-1년, 1년 이상, 기간 협의
- **타입 수정**: `usePartnershipStore`의 `projectType` 타입을 `ProjectCategory | '전체' | ''`에서 `string`으로 변경하여 새로운 옵션과 호환

### 3. TargetBrandCard 레이아웃 개선
- **UI 변경**: 브랜드명 바로 오른쪽에 인증 체크마크 배치
- **UI 변경**: 카드 오른쪽 영역에 평점(⭐ + 숫자)과 프로젝트 수를 2행으로 배치
- **UI 변경**: 브랜드명이 길 경우 `textOverflow: ellipsis` 및 `whiteSpace: nowrap` 적용

### 4. 페이지 배경색 통일
- **UI 변경**: `PartnershipInquiryPage`의 전체 배경색을 `#F9FAFB`에서 `#fff`로 변경
- **UI 변경**: 헤더와 콘텐츠 영역의 배경색을 흰색으로 통일하여 일관성 있는 디자인 적용

### 5. ActionSuccessModal 디자인 개선
- **UI 변경**: 모달의 `borderRadius`를 `16px`에서 `24px`로 증가
- **UI 변경**: 아이콘 배경 제거, 아이콘 색상을 짙은 회색(`#374151`)으로 변경
- **UI 변경**: 메시지 폰트 크기를 `18px`에서 `20px`로 증가, 굵기 `700` 유지
- **UI 변경**: 확인 버튼 높이를 `48px`에서 `52px`로 증가, `borderRadius`를 `25px`로 조정
- **UI 변경**: 버튼 색상을 `#2563EB`로 명시적 지정, 호버 효과 개선

### 6. 데이터베이스 제약 조건 수정
- **에러 수정**: `user_notifications` 테이블의 `type` 체크 제약 조건에 `partnership_inquiry` 타입 추가
- **에러 수정**: 기존 데이터에 존재하던 추가 타입들(`proposal_accepted`, `proposal_rejected`, `application_accepted`, `application_rejected`)도 제약 조건에 포함하여 데이터 무결성 보장

---

## 테스트 및 검증
- 로컬 개발 환경에서 3단계 문의 작성 플로우 테스트 완료
- Step 간 이동 시 입력 데이터 유지 확인 (Zustand store 활용)
- Step1에서 이전 버튼 클릭 시 뒤로 가기 동작 확인
- Step2에서 새로운 프로젝트 유형/예산/기간 옵션 선택 동작 확인
- TargetBrandCard 레이아웃 및 정보 표시 확인
- 문의 제출 후 ActionSuccessModal 표시 확인
- Supabase 데이터베이스 제약 조건 수정 후 알림 생성 정상 동작 확인
- 린트 검사 통과 (TypeScript 타입 오류 없음)

---

## TODO Next
- [ ] 문의 제출 후 브랜드 유저에게 알림이 정상적으로 전달되는지 확인
- [ ] 파일 업로드 기능 테스트 (partnership-attachments 버킷 존재 여부 확인)
- [ ] 모바일 반응형 디자인 검증
- [ ] 문의 내역 조회 페이지 구현 (브랜드 유저가 받은 문의 확인)

---

### 참고 파일 경로
- `webapp/src/pages/inquiry/PartnershipInquiryPage.tsx` - 메인 페이지 컴포넌트
- `webapp/src/pages/inquiry/steps/CreatePartnershipInquiryStep1.tsx` - 기본 정보 입력 단계
- `webapp/src/pages/inquiry/steps/CreatePartnershipInquiryStep2.tsx` - 프로젝트 정보 선택 단계
- `webapp/src/pages/inquiry/steps/CreatePartnershipInquiryStep3.tsx` - 상세 내용 작성 단계
- `webapp/src/components/inquiry/TargetBrandCard.tsx` - 대상 브랜드 정보 카드
- `webapp/src/components/notification/ActionSuccessModal.tsx` - 성공 모달 컴포넌트
- `webapp/src/stores/usePartnershipStore.ts` - 문의 작성 상태 관리 스토어
- `webapp/src/services/partnershipService.ts` - 문의 생성 서비스
- `webapp/supabase/migrations/20251202123000_partnership_inquiry_notification.sql` - DB 트리거 및 RLS 정책




















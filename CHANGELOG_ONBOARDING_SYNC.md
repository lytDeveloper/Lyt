# 온보딩 Step 상태 동기화 작업 요약

## 범위
- `webapp/src/hooks/useMultiSelect.ts`
- `webapp/src/hooks/useImageUpload.ts`
- `webapp/src/pages/onboarding/brand/Step1_NameInput.tsx`
- `webapp/src/pages/onboarding/brand/Step2_Details.tsx`
- `webapp/src/pages/onboarding/brand/Step4_Collaboration.tsx`
- `webapp/src/pages/onboarding/brand/Step5_BusinessInfo.tsx`
- `webapp/src/pages/onboarding/artist/Step1_ArtistName.tsx`
- `webapp/src/pages/onboarding/artist/Step3_AdditionalInfo.tsx`
- `webapp/src/pages/onboarding/creative/Step1_CreativeImage.tsx`
- `webapp/src/pages/onboarding/creative/Step3_acquisition_source.tsx`
- `webapp/src/pages/onboarding/fan/Step2_Persona.tsx`
- `webapp/src/pages/onboarding/fan/Step4_PreferredRegions.tsx`

---

## 주요 이슈 및 대응

### 1. 커스텀 Hook 상태 동기화 문제
- **문제**: `useMultiSelect`와 `useImageUpload` hook에서 `initial` prop이 변경되어도 내부 state가 업데이트되지 않음
- **해결**: `useEffect`를 추가하여 `initial` prop 변경 시 내부 state를 동기화하도록 수정
  - `useMultiSelect`: `initial` prop 변경 시 `selected` state 업데이트
  - `useImageUpload`: `initialCoverFile`, `initialLogoFile` prop 변경 시 각각의 file state 업데이트

### 2. Brand Role Step 상태 동기화
- **문제**: 이전 단계로 돌아갔을 때 입력했던 내용이 사라지는 현상
- **해결**: 각 Step 파일에 `useEffect` 추가하여 store 값 변경 시 로컬 state 동기화
  - `Step1_NameInput`: `storedBrandName`, `storedBusinessNumber` 동기화
  - `Step2_Details`: `storedCategory`, `storedPreferredCreatorTypes` 동기화
  - `Step4_Collaboration`: `monthlyBudget` 동기화
  - `Step5_BusinessInfo`: `storedWebsiteUrl`, `storedSnsChannel`, `storedContactInfo` 동기화

### 3. Artist Role Step 상태 동기화
- **문제**: 이전 단계로 돌아갔을 때 입력했던 내용이 사라지는 현상
- **해결**: 각 Step 파일에 `useEffect` 추가
  - `Step1_ArtistName`: `storedName`, `storedField` 동기화
  - `Step3_AdditionalInfo`: `storedKeywords`, `storedBio`, `storedPortfolioUrl` 동기화

### 4. Creative Role Step 상태 동기화
- **문제**: 이전 단계로 돌아갔을 때 입력했던 내용이 사라지는 현상
- **해결**: 각 Step 파일에 `useEffect` 추가
  - `Step1_CreativeImage`: `nickname` 동기화
  - `Step3_acquisition_source`: `acquisitionSource` 동기화 (기타 옵션 처리 로직 포함)

### 5. Fan Role Step 상태 동기화
- **문제**: 이전 단계로 돌아갔을 때 입력했던 내용이 사라지는 현상
- **해결**: 각 Step 파일에 `useEffect` 추가
  - `Step2_Persona`: `persona` 동기화
  - `Step4_PreferredRegions`: `preferredRegions`, `notificationPreferences` 동기화

---

## 테스트 및 검증
- 모든 파일에 대해 lint 검사 완료 (에러 없음)
- `useEffect` 의존성 배열을 올바르게 설정하여 무한 루프 방지
- store 값이 `null` 또는 `undefined`인 경우 빈 문자열 또는 빈 배열로 처리

---

## TODO Next
- 실제 사용자 시나리오에서 이전 단계로 돌아갔을 때 입력값이 정상적으로 유지되는지 확인
- 이미지 파일의 경우 File 객체 참조 비교로 인한 동기화 이슈가 없는지 확인
- 배열 값의 경우 깊은 비교가 필요한지 검토 (현재는 참조 비교로 처리)

---

### 참고 파일 경로
- Hook 파일: `webapp/src/hooks/useMultiSelect.ts`, `webapp/src/hooks/useImageUpload.ts`
- Brand Step 파일: `webapp/src/pages/onboarding/brand/Step*.tsx`
- Artist Step 파일: `webapp/src/pages/onboarding/artist/Step*.tsx`
- Creative Step 파일: `webapp/src/pages/onboarding/creative/Step*.tsx`
- Fan Step 파일: `webapp/src/pages/onboarding/fan/Step*.tsx`


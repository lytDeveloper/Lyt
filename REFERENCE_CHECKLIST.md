# REFERENCE_CHECKLIST.md

이 문서는 **체크리스트 및 규칙 모음**입니다.  
기본 규칙은 [CLAUDE.md](./CLAUDE.md)를 참고하세요.

---

## 📱 앱스토어 / 플레이스토어 출시 현황

### ✅ 필수 항목 (Critical) - 모두 완료

| 항목 | 상태 |
|------|------|
| 개인정보 처리방침 페이지 | ✅ 완료 |
| 이용약관 페이지 | ✅ 완료 |
| 앱 이름 변경 | ✅ 완료 |
| 앱 아이콘/스플래시 | ✅ 완료 |
| Android targetSdkVersion | ✅ 완료 |
| cleartext 트래픽 비활성화 | ✅ 완료 |
| 심사용 테스트 계정 | ✅ 완료 |
| 스크린샷 준비 | ✅ 완료 |
| 앱 설명문 작성 | ✅ 완료 |

### 🟡 권장 항목 (Recommended)

| 항목 | 상태 |
|------|------|
| 신고/차단 시스템 | ✅ 완료 |
| 에러 모니터링 | ✅ 완료 |
| 성능 최적화 | ✅ 완료 |
| 접근성 (Accessibility) | ⚠️ 미완료 |

### ✅ 기술 요건 완료

| 항목 | 상태 |
|------|------|
| HTTPS 사용 | ✅ Supabase 기본 HTTPS |
| OAuth 로그인 | ✅ Google/Apple OAuth |
| 푸시 알림 | ✅ expo-notifications |
| EAS Build 설정 | ✅ eas.json 구성 완료 |

---

## 📅 경과 시간 표시 기준 (UI/UX)

| 조건 | 표시 형식 |
|------|----------|
| 1분 미만 | '방금 전' |
| 1분~1시간 | 분 단위 ('2분 전') |
| 1시간~1일 | 시간 단위 ('3시간 전') |
| 1일~2주 | 일 단위 ('4일 전') |
| 2주~1개월 | 주 단위 ('2주 전') |
| 1개월~1년 | 개월 단위 ('1개월 전') |
| 1년 이상 | 년 단위 ('1년 전') |

---

## ✔️ Pre-Commit Checklist

- [ ] All array operations have null/undefined checks
- [ ] All optional properties use optional chaining (`?.`)
- [ ] All image URLs have fallback handling
- [ ] Field names match Supabase column names
- [ ] MUI 아이콘: `@mui/icons-material/{IconName}`에서 직접 import
- [ ] N+1 쿼리: 배치 조회 `getProfileDisplayMap()` 사용

---

## 🚨 Common Mistakes to Avoid

1. ❌ Hard-coding colors → Use `theme.palette.*`
2. ❌ Direct Supabase calls in components → Use service layer
3. ❌ Duplicating image upload code → Use `useImageUpload` hook
4. ❌ Custom navigation logic → Use `useOnboardingStep` hook
5. ❌ Using monolithic onboarding store → Use split stores
6. ❌ Array operations without null checks → Always default to `[]`
7. ❌ Private Storage 버킷 이미지를 public URL로 표시 → Use `SignedImage`

---

## 📖 마크다운 정리 템플릿

**"마크다운 정리"** 또는 **"markdown summary"** 명령 시 사용:

```markdown
## 범위
- 수정된 주요 파일 경로

## 주요 이슈 및 대응
### 1. (파일/기능명)
- **에러 수정**: ...
- **로직 개선**: ...
- **UI 변경**: ...

## 테스트 및 검증
- 테스트 환경 명시

## TODO Next
- 다음 단계 작성
```

**Plan 출력시, 주석 작성시 한글로 작성**

---

## 🚀 예정 기능 (Roadmap)

> [!NOTE]
> 상세 스펙 미정, 예정 기능으로만 기록

### 포인트 시스템
외부 웹사이트에서 결제-충전 후 앱 내 사용:
- 대화창 생성권 (talkRequest, partnershipInquiry, invitation)
- 기간별 탐색 상단 노출권
- 프로필 꾸미기 아이템

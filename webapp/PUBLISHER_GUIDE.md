# 퍼블리셔를 위한 스타일 수정 가이드

## 📋 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [스타일 시스템 구조](#스타일-시스템-구조)
3. [색상 변경 방법](#색상-변경-방법)
4. [주요 파일 위치](#주요-파일-위치)
5. [작업 방법](#작업-방법)
6. [주의사항](#주의사항)
7. [자주 사용되는 패턴](#자주-사용되는-패턴)
8. [트러블슈팅](#트러블슈팅)

---

## 프로젝트 개요

### LytApp 스타일 시스템
- **UI 프레임워크**: Material-UI (MUI) v7
- **스타일 방식**: Emotion (CSS-in-JS)
- **색상 관리**: MUI Theme Palette 시스템
- **빌드 도구**: Vite

### 마이그레이션 완료 사항
✅ 전체 173개 파일 중 169개 (97%) 마이그레이션 완료
✅ 하드코딩된 색상 → `theme.palette.*` 통일
✅ 다크 모드 지원 준비 완료
✅ 일관된 디자인 시스템 구축

---

## 스타일 시스템 구조

### 1. MUI Theme Configuration
**위치**: `webapp/src/main.tsx`

```typescript
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2563eb',         // 메인 파란색 (CTA 버튼, 링크 등)
      dark: '#1D4ED8',         // 호버 시 어두운 파란색
      contrastText: '#ffffff', // 버튼 텍스트 색상
    },
    text: {
      primary: '#000000',      // 메인 텍스트 색상
      secondary: '#949196',    // 보조 텍스트, 레이블 색상
    },
    background: {
      default: '#f2f2f2',      // 페이지 배경색
      paper: '#ffffff',        // 카드, 모달 배경색
    },
    divider: '#E5E7EB',        // 테두리, 구분선 색상
    grey: {
      50: '#f9f9f9',          // 매우 밝은 회색
      100: '#f2f2f2',         // 밝은 회색 배경
    },
    action: {
      selected: '#eff6ff',     // 선택된 상태 배경색
    },
    error: {
      main: '#DC2626',         // 에러 색상 (빨강)
    },
    warning: {
      main: '#F59E0B',         // 경고 색상 (주황)
    },
    success: {
      main: '#059669',         // 성공 색상 (초록)
    },
  },
});
```

### 2. Theme Palette 참조표

| 용도 | Theme 경로 | 색상 값 | 사용 예시 |
|------|-----------|--------|----------|
| 메인 텍스트 | `theme.palette.text.primary` | #000000 | 제목, 본문 텍스트 |
| 보조 텍스트 | `theme.palette.text.secondary` | #949196 | 라벨, 설명 텍스트 |
| 메인 버튼 | `theme.palette.primary.main` | #2563eb | CTA 버튼, 링크 |
| 버튼 호버 | `theme.palette.primary.dark` | #1D4ED8 | 버튼 호버 상태 |
| 카드 배경 | `theme.palette.background.paper` | #ffffff | 카드, 모달 배경 |
| 페이지 배경 | `theme.palette.background.default` | #f2f2f2 | 전체 페이지 배경 |
| 구분선 | `theme.palette.divider` | #E5E7EB | 테두리, 구분선 |
| 밝은 배경 | `theme.palette.grey[50]` | #f9f9f9 | 인풋 배경 |
| 회색 배경 | `theme.palette.grey[100]` | #f2f2f2 | 섹션 배경 |
| 에러 | `theme.palette.error.main` | #DC2626 | 에러 메시지 |
| 경고 | `theme.palette.warning.main` | #F59E0B | 경고 메시지 |
| 성공 | `theme.palette.success.main` | #059669 | 성공 메시지 |

---

## 색상 변경 방법

### 방법 1: Theme 설정 변경 (전역 색상 변경) ⭐ 권장

**파일**: `webapp/src/main.tsx`

```typescript
// 예시: 메인 파란색을 보라색으로 변경
const theme = createTheme({
  palette: {
    primary: {
      main: '#7C3AED',      // 파란색 → 보라색
      dark: '#6D28D9',      // 호버 색상도 함께 변경
    },
  },
});
```

**장점**:
- 한 곳만 수정하면 전체 앱에 적용
- 일관성 유지 보장
- 다크 모드 전환 시에도 자동 대응

**적용 범위**:
- 모든 버튼, 링크, 강조 요소
- 169개의 마이그레이션 완료 파일에 자동 반영

### 방법 2: 개별 컴포넌트 색상 변경 (부분 변경)

**예시 1: 특정 버튼만 색상 변경**

```typescript
<Button
  sx={{
    bgcolor: '#7C3AED',          // 보라색 배경
  }}
>
  특별한 버튼
</Button>
```

**예시 2: 특정 텍스트만 색상 변경**

```typescript
<Typography
  sx={{
    color: '#DC2626',            // 빨간색 텍스트
  }}
>
  중요 안내
</Typography>
```

---

## 주요 파일 위치

### 1. Theme 설정 파일 (전역 색상)
```
webapp/src/main.tsx              # ⭐ 메인 Theme 설정 (여기서 색상 변경!)
```

### 2. 공유 스타일 파일 (Onboarding)
```
webapp/src/styles/onboarding/
├── common.styles.ts             # 공통 타이포그래피, 레이아웃
├── form.styles.ts               # 폼 요소 (Input, Select, Chip 등)
└── profile.styles.ts            # 프로필 카드 스타일
```

### 3. 주요 컴포넌트 (마이그레이션 완료)
```
webapp/src/components/
├── common/                      # 공통 컴포넌트 (15개)
│   ├── ApplicationModal.tsx
│   ├── SearchModal.tsx
│   ├── ImageUploader.tsx
│   └── ...
├── explore/                     # 탐색 기능 (11개)
│   ├── ProjectCard.tsx
│   ├── CollaborationCard.tsx
│   ├── PartnerCard.tsx
│   └── ...
├── manage/                      # 관리 기능 (8개)
│   ├── ApplicationCard.tsx
│   ├── ProposalCard.tsx
│   └── ...
└── messages/                    # 메시지 기능 (3개)
    ├── MessageRoom.tsx
    └── ...
```

### 4. 페이지 컴포넌트 (마이그레이션 완료)
```
webapp/src/pages/
├── explore/                     # 탐색 페이지 (3개)
├── manage/                      # 관리 페이지 (4개)
├── messages/                    # 메시지 페이지 (2개)
└── Main/                        # 메인 페이지 (3개)
```

### 5. COLORS 사용 파일 (아직 마이그레이션 안 됨)

**복잡도로 인해 보류된 파일 (4개 tsx)**:
```
webapp/src/pages/
├── common/
│   ├── BrandArtistCollection.tsx    # ⚠️ COLORS 사용 중
│   └── Home.tsx                     # ⚠️ COLORS 사용 중
└── onboarding/
    ├── artist/Step3_AdditionalInfo.tsx   # ⚠️ COLORS 사용 중
    └── creative/Step1_CreativeImage.tsx  # ⚠️ COLORS 사용 중
```

**Onboarding Styles 파일 (17개 .styles.ts)**:
```
webapp/src/pages/onboarding/
├── artist/*.styles.ts           # ⚠️ COLORS 사용 중
├── brand/*.styles.ts            # ⚠️ COLORS 사용 중
├── creative/*.styles.ts         # ⚠️ COLORS 사용 중
├── fan/*.styles.ts              # ⚠️ COLORS 사용 중
└── ProfileSelect.styles.ts      # ⚠️ COLORS 사용 중
```

---

## 작업 방법

### A. 전역 색상 변경 (대부분의 경우) ⭐

#### 1단계: Theme 파일 열기
```bash
# VS Code에서
webapp/src/main.tsx
```

#### 2단계: 색상 값 변경
```typescript
const theme = createTheme({
  palette: {
    primary: {
      main: '#새로운색상',      // 여기를 수정!
    },
    text: {
      primary: '#새로운색상',   // 여기를 수정!
    },
    // ... 기타 색상
  },
});
```

#### 3단계: 개발 서버에서 확인
```bash
cd webapp
npm run dev
```

브라우저에서 `http://localhost:5173` 접속하여 변경 확인

#### 4단계: 빌드 테스트
```bash
npm run build
```

에러 없이 빌드 성공하면 완료!

### B. 개별 컴포넌트 색상 변경

#### 1단계: 파일 찾기
```bash
# 예시: ProjectCard 컴포넌트 찾기
webapp/src/components/explore/ProjectCard.tsx
```

#### 2단계: 파일 열고 수정

**변경 전**:
```typescript
<Box
  sx={{
    backgroundColor: theme.palette.grey[100],
  }}
>
```

**변경 후**:
```typescript
<Box
  sx={{
    backgroundColor: '#F0F9FF',  // 커스텀 색상
  }}
>
```

#### 3단계: 테스트 및 확인
```bash
npm run dev
```

### C. COLORS 사용 파일 수정 (주의!)

**⚠️ 경고**: 이 파일들은 복잡한 구조로 되어 있어 수정 시 주의 필요

#### 수정 전 확인사항
1. Git으로 버전 관리 중인지 확인
2. 백업 생성: `git stash` 또는 파일 복사

#### 수정 방법
```typescript
// 예시: Home.tsx
import { COLORS } from '../../styles/onboarding/common.styles';

// COLORS.TEXT_PRIMARY 찾아서 하드코딩으로 변경
<Typography sx={{ color: COLORS.TEXT_PRIMARY }}>
  ↓
<Typography sx={{ color: '#000000' }}>
```

#### 빌드 확인 필수
```bash
npm run build
```

에러 발생 시 즉시 원복:
```bash
git checkout -- 파일경로
```

---

## 주의사항

### ⚠️ 절대 하지 말아야 할 것

1. **COLORS 객체 직접 수정 금지**
   ```typescript
   // ❌ 이렇게 하면 안 됨!
   export const COLORS = {
     TEXT_PRIMARY: '#새로운색상',  // 마이그레이션된 파일에 영향 없음!
   };
   ```
   **이유**: 마이그레이션된 169개 파일은 COLORS를 사용하지 않음

2. **Theme 구조 변경 금지**
   ```typescript
   // ❌ 이렇게 하면 안 됨!
   const theme = createTheme({
     palette: {
       customColor: '#123456',  // 새로운 필드 추가 금지
     },
   });
   ```
   **이유**: TypeScript 타입 에러 발생

3. **임의로 import 추가/제거 금지**
   ```typescript
   // ❌ 이렇게 하면 안 됨!
   import { COLORS } from '../../styles/onboarding/common.styles';  // 삭제 금지
   ```
   **이유**: 빌드 에러 발생 가능

### ✅ 안전한 작업 방법

1. **항상 Git 커밋 후 작업**
   ```bash
   git add .
   git commit -m "스타일 변경 전 백업"
   ```

2. **변경 후 즉시 빌드 테스트**
   ```bash
   npm run build
   ```

3. **에러 발생 시 즉시 원복**
   ```bash
   git checkout -- 수정한파일.tsx
   ```

4. **한 번에 하나씩 변경**
   - 여러 파일 동시 수정 금지
   - 변경 → 테스트 → 커밋 순서 준수

---

## 자주 사용되는 패턴

### 패턴 1: 버튼 스타일

```typescript
// 기본 버튼
<Button
  variant="contained"
  sx={{
    bgcolor: theme.palette.primary.main,        // 배경색
    color: '#fff',                              // 텍스트 색
  }}
>
  확인
</Button>

// 외곽선 버튼
<Button
  variant="outlined"
  sx={{
    borderColor: theme.palette.divider,         // 테두리 색
    color: theme.palette.text.secondary,        // 텍스트 색
  }}
>
  취소
</Button>
```

### 패턴 2: 카드 스타일

```typescript
<Card
  sx={{
    borderRadius: '16px',
    boxShadow: 'none',
    border: `1px solid ${theme.palette.divider}`,  // 테두리
    bgcolor: theme.palette.background.paper,       // 배경색
    mb: 2,
  }}
>
  <CardContent>
    {/* 내용 */}
  </CardContent>
</Card>
```

### 패턴 3: 텍스트 스타일

```typescript
// 제목
<Typography
  sx={{
    fontSize: 24,
    fontWeight: 700,
    color: theme.palette.text.primary,           // 메인 텍스트
    mb: 2,
  }}
>
  페이지 제목
</Typography>

// 설명
<Typography
  sx={{
    fontSize: 14,
    color: theme.palette.text.secondary,         // 보조 텍스트
    mb: 1,
  }}
>
  설명 텍스트
</Typography>
```

### 패턴 4: Input 스타일

```typescript
<TextField
  fullWidth
  sx={{
    bgcolor: theme.palette.background.paper,     // 배경색
    '& .MuiOutlinedInput-root': {
      '& fieldset': {
        borderColor: theme.palette.divider,      // 테두리
      },
    },
  }}
/>
```

### 패턴 5: Chip (태그) 스타일

```typescript
<Chip
  label="태그"
  sx={{
    bgcolor: theme.palette.action.selected,      // 배경색
    color: theme.palette.primary.main,           // 텍스트 색
    fontWeight: 600,
  }}
/>
```

---

## 트러블슈팅

### 문제 1: 색상이 변경되지 않음

**증상**: Theme에서 색상을 바꿨는데 화면에 반영 안 됨

**원인**:
- 해당 파일이 COLORS를 사용 중
- 하드코딩된 색상 값 사용 중

**해결책**:
```bash
# 1. 파일 검색
grep -r "COLORS\." webapp/src/파일경로

# 2. 하드코딩 색상 검색
grep -r "#2563eb" webapp/src/파일경로
```

### 문제 2: 빌드 에러 발생

**증상**: `npm run build` 실행 시 에러

**흔한 에러 메시지**:
```
error TS2304: Cannot find name 'theme'
```

**해결책**:
```typescript
// useTheme import 확인
import { useTheme } from '@mui/material';

// 함수 내부에서 theme 선언
export default function MyComponent() {
  const theme = useTheme();  // ← 이 줄 있는지 확인

  return (
    <Box sx={{ color: theme.palette.text.primary }}>
      // ...
    </Box>
  );
}
```

### 문제 3: TypeScript 타입 에러

**증상**: `theme.palette.xxx`에서 타입 에러

**해결책**:
```typescript
// ❌ 잘못된 경로
theme.palette.customColor  // 존재하지 않는 필드

// ✅ 올바른 경로
theme.palette.text.primary
theme.palette.primary.main
theme.palette.grey[100]
```

### 문제 4: Hot Reload가 작동하지 않음

**해결책**:
```bash
# 개발 서버 재시작
Ctrl + C (서버 중지)
npm run dev (서버 재시작)
```

### 문제 5: 특정 컴포넌트만 이상한 색상

**원인**: COLORS 사용 파일 (미마이그레이션)

**확인 방법**:
```bash
# 파일 내부에서 COLORS import 찾기
import { COLORS } from ...
```

**해결책**:
1. Theme 색상 변경은 효과 없음
2. 해당 파일 직접 수정 필요 (주의!)

---

## 빠른 참조 (Cheat Sheet)

### 색상 변경 위치
```
전역 색상 변경
  → webapp/src/main.tsx

개별 컴포넌트 색상
  → 해당 컴포넌트 파일의 sx 속성

COLORS 파일 (주의!)
  → webapp/src/pages/common/Home.tsx
  → webapp/src/pages/common/BrandArtistCollection.tsx
  → webapp/src/pages/onboarding/*.styles.ts
```

### 자주 쓰는 색상 경로
```typescript
텍스트: theme.palette.text.primary
보조 텍스트: theme.palette.text.secondary
메인 버튼: theme.palette.primary.main
배경: theme.palette.background.paper
테두리: theme.palette.divider
회색 배경: theme.palette.grey[100]
```

### 개발/빌드 명령어
```bash
# 개발 서버 실행
cd webapp
npm run dev

# 빌드 테스트
npm run build

# Git 백업
git add .
git commit -m "스타일 수정"

# 원복
git checkout -- 파일경로
```

---

## 추가 지원

### 도움이 필요할 때
1. **빌드 에러**: 에러 메시지 전체를 개발자에게 전달
2. **색상 미적용**: 파일 경로와 변경 내용 공유
3. **Git 문제**: 현재 상태 백업 후 문의

### 유용한 도구
- **VS Code Extension**:
  - Material Icon Theme (파일 아이콘)
  - Color Highlight (색상 코드 하이라이트)
  - GitLens (Git 히스토리)

### 참고 문서
- [Material-UI Documentation](https://mui.com/material-ui/)
- [MUI Theme Customization](https://mui.com/material-ui/customization/theming/)
- [Emotion Documentation](https://emotion.sh/docs/introduction)

---

**작성일**: 2025-01-27
**마지막 업데이트**: 마이그레이션 완료 후
**문서 버전**: 1.0

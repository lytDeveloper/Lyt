# REFERENCE_TECHNICAL.md

이 문서는 Sonnet/Opus 모델을 위한 **상세 기술 가이드**입니다.  
기본 규칙은 [CLAUDE.md](./CLAUDE.md)를 참고하세요.

---

## 📦 Available Services (`webapp/src/services/`)

| Service | Purpose |
|---------|---------|
| `profileService` | Profile CRUD operations |
| `profileDisplayService` | **프로필 표시 정보 조회 (통합 서비스)** - 반드시 이 서비스 사용! |
| `imageUploadService` | Image upload to Supabase Storage |
| `authService` | OAuth login, session management |
| `messageService` | Chat/messaging functionality |
| `exploreService` | Explore page data fetching |
| `communityService` | Lounge/community features |
| `applicationService` | 프로젝트/콜라보레이션 지원 |
| `invitationService` | 초대 시스템 |
| `talkRequestService` | 대화 요청 |
| `partnershipService` | 파트너십 문의 |
| `blockService` | 사용자 차단 |
| `reportService` | 신고 시스템 |
| `reviewService` | 리뷰 시스템 |
| `badgeService` | 배지 시스템 |
| `socialService` | 팔로우/팔로잉 |
| `notificationActionService` | 알림 액션 처리 |

---

## 🪝 Available Hooks (`webapp/src/hooks/`)

| Hook | Purpose |
|------|---------|
| `useImageUpload` | All image upload functionality (cover/logo) |
| `useOnboardingStep` | Onboarding navigation & validation |
| `useMultiSelect` | Chip/tag selection, multi-checkbox |
| `useComments` | Comment system with threading |
| `usePresence` | User online status |
| `useSignedImage` | Private Storage 버킷 이미지 서명 URL 변환 |
| `useSignedImages` | 여러 이미지 URL 일괄 서명 URL 변환 |
| `useProfileDisplay` | 사용자 프로필 표시 정보 조회 (TanStack Query 기반) |
| `useProfileDisplayMap` | 여러 사용자 프로필 배치 조회 (N+1 방지) |
| `useLeaderProfile` | 팀 리더 프로필 조회 |
| `useProfileInfo` | 프로필 정보 간편 추출 (name, avatar, field) |
| `useManageAll` | 관리 페이지 데이터 |
| `useConnections` | 연결 관계 데이터 |
| `useNotifications` | 알림 시스템 |
| `useElapsedTime` | 경과 시간 표시 |

---

## 🧩 Available Components

| Component | Purpose |
|-----------|---------|
| `OnboardingLayout` | Onboarding page structure |
| `OnboardingButton` | Step action buttons |
| `ChipSelector` | Multi-select chip UI |
| `ProfilePreviewCard` | Profile card preview |
| `SignedImage` | Private Storage 버킷 이미지 자동 서명 URL 표시 |
| `LightningLoader` | 로딩 인디케이터 |
| `BottomNavigationBar` | 하단 네비게이션 |

---

## 🎨 MUI Theme System

**IMPORTANT**: Always use `theme.palette.*` instead of hard-coded colors!

| Hard-coded | MUI Theme Equivalent | Usage |
|------------|---------------------|-------|
| `#000000` | `theme.palette.text.primary` | Main text |
| `#949196` | `theme.palette.text.secondary` | Helper text |
| `#ffffff` | `theme.palette.background.paper` | Cards, inputs |
| `#f2f2f2` | `theme.palette.grey[100]` | Page background |
| `#2563eb` | `theme.palette.primary.main` | Buttons, links |
| `#E5E7EB` | `theme.palette.divider` | Borders |
| `#ef4444` | `theme.palette.error.main` | Error messages |

```tsx
// ✅ GOOD
export const PageTitle = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.primary,
}));

// ❌ BAD
export const PageTitle = styled(Typography)({
  color: '#000000',
});
```

---

## 🖼️ Private Storage 이미지 처리

**IMPORTANT**: `homepage-images` 버킷은 private입니다. 이미지를 표시할 때 반드시 서명 URL을 사용하세요!

### 방법 1: `<SignedImage />` 컴포넌트 (권장)

```tsx
import SignedImage from '../../components/common/SignedImage';

<SignedImage 
  src={magazine.cover_image_url} 
  alt="커버" 
  sx={{ width: 200, height: 150, objectFit: 'cover' }} 
/>
```

### 방법 2: `useSignedImage` 훅 (CSS background-image 등에서 사용)

```tsx
import { useSignedImage } from '../../hooks/useSignedImage';

const signedUrl = useSignedImage(magazine.cover_image_url);
<Box sx={{ backgroundImage: signedUrl ? `url(${signedUrl})` : 'none' }} />
```

---

## 👤 프로필 표시 시스템 (Profile Display)

**IMPORTANT**: 사용자 프로필 표시 정보가 필요할 때 반드시 `profileDisplayService`를 사용하세요!

### 핵심 원칙
- **우선순위**: brand > artist > creative > fan > customer (fallback)
- **is_active 필터**: 항상 `is_active=true`인 프로필만 조회
- **단일 진실 소스**: 모든 프로필 표시 로직은 `profileDisplayService.ts`에서 관리

### 사용 예시

```tsx
// 서비스 레이어
import { getProfileDisplay, getProfileDisplayMap } from '../services/profileDisplayService';

const profile = await getProfileDisplay(userId);
const profileMap = await getProfileDisplayMap([userId1, userId2]);

// React 컴포넌트
import { useProfileDisplay, useProfileInfo } from '../hooks/useProfileDisplay';

const { data: profile } = useProfileDisplay(userId);
const { name, avatar, field } = useProfileInfo(userId);
```

---

## ⚡ 성능 최적화 가이드

### 🔴 문제 패턴 1: MUI 아이콘 배럴 파일

```tsx
// ❌ BAD - 배럴 파일에서 re-export
import { CloseIcon } from '../navigation/BottomNavigationBar';

// ✅ GOOD - 직접 import
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
```

### 🔴 문제 패턴 2: N+1 쿼리

```tsx
// ❌ BAD - 루프 내 개별 조회
const enriched = await Promise.all(
  items.map(async (item) => {
    const profile = await getProfileDisplay(item.user_id);
    return { ...item, profile };
  })
);

// ✅ GOOD - 배치 조회
const userIds = [...new Set(items.map(i => i.user_id).filter(Boolean))];
const profileMap = await getProfileDisplayMap(userIds);
const enriched = items.map(item => ({
  ...item,
  profile: profileMap.get(item.user_id)
}));
```

### 🔴 문제 패턴 3: 불필요한 캐시 무효화

```tsx
// ❌ BAD
queryClient.invalidateQueries({ queryKey: ['manage-all'] });

// ✅ GOOD - 선택적 무효화
queryClient.invalidateQueries({ queryKey: ['manage-all', activeTab] });
```

---

## 🛡️ Defensive Programming

```tsx
// 1. Arrays - Always default to empty array
const items = props.items || [];

// 2. Optional chaining
const name = user?.profile?.name ?? 'Unknown';

// 3. Image URL handling
<Box sx={{
  backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
  backgroundColor: imageUrl ? 'transparent' : '#E9E9ED',
}} />

// 4. Match Supabase column names (snake_case)
interface Partner {
  profile_image_url: string;  // Matches Supabase
}
```

---

## 🛠️ Validation Utilities

Use `webapp/src/utils/validation.ts`:

```tsx
import {
  validateRequired, validateEmail, validateUrl,
  validatePhoneNumber, validateBusinessNumber, validateNickname,
} from '../utils/validation';
```

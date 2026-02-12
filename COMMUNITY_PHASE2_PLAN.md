# Community Tab - Phase 2 Implementation Plan

## ✅ Phase 1 완료 상태 (Completed)

### Database Layer
- ✅ `lounge_likes` 테이블 (이미 존재)
- ✅ `lounge_comments` 테이블 (이미 존재)
- ✅ `community_activity_feed` VIEW 생성
- ✅ `toggle_lounge_like()` FUNCTION 생성
- ✅ RLS Policies 존재 확인

### Frontend Layer
- ✅ `webapp/src/types/community.types.ts` - 타입 정의
- ✅ `webapp/src/services/communityService.ts` - API 서비스 레이어
- ✅ `webapp/src/stores/communityStore.ts` - Zustand 상태 관리
- ✅ `webapp/src/components/lounge/CommunityCard.tsx` - 기본 카드 컴포넌트
- ✅ `webapp/src/pages/common/Lounge.tsx` - 커뮤니티 탭 통합

### 현재 기능
- 프로젝트/협업 카드 표시 (정적 카운트)
- 탭 필터링 (전체/프로젝트/협업)
- 카테고리 필터링
- 기본 좋아요/댓글/조회수 표시

---

## 🎯 Phase 2 목표 (Real-time Features)

Phase 2에서는 **실시간 상호작용 기능**을 추가하여 커뮤니티 참여도를 높입니다.

### 핵심 기능
1. **실시간 좋아요/댓글 업데이트** - Supabase Realtime으로 즉시 반영
2. **실시간 뷰어 카운트** - Supabase Presence로 "n명 보는 중" 표시
3. **응원자 프로필 표시** - 최근 3명 아바타 + "외 n명이 응원중"
4. **응원하기 버튼** - 좋아요 토글 + Optimistic UI 업데이트
5. **경과 시간 표시** - 실시간 "n분 전" 업데이트

---

## 📋 Phase 2 구현 파일 목록

### 1. Hooks (webapp/src/hooks/)

#### 1.1 `useCommunityRealtime.ts` ⭐ 핵심
**목적**: Supabase Realtime으로 좋아요/댓글 변경사항을 실시간 감지

**패턴**: `useExploreRealtime.ts`와 동일한 구조

**구현 코드**:
```typescript
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useCommunityRealtime(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    // Subscribe to likes changes
    const likesChannel = supabase
      .channel('community-likes')
      .on('postgres_changes', {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'lounge_likes',
      }, (payload) => {
        console.log('[Community] Likes changed:', payload);
        // Invalidate queries to refetch updated counts
        queryClient.invalidateQueries({ queryKey: ['community', 'items'] });
        queryClient.invalidateQueries({ queryKey: ['community', 'activity'] });
      })
      .subscribe();

    // Subscribe to comments changes
    const commentsChannel = supabase
      .channel('community-comments')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lounge_comments',
      }, (payload) => {
        console.log('[Community] Comments changed:', payload);
        queryClient.invalidateQueries({ queryKey: ['community', 'items'] });
        queryClient.invalidateQueries({ queryKey: ['community', 'activity'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [enabled, queryClient]);
}
```

**통합 위치**: `webapp/src/pages/common/Lounge.tsx`
```typescript
import { useCommunityRealtime } from '../../hooks/useCommunityRealtime';

export default function Lounge() {
  // Enable realtime when community tab is active
  useCommunityRealtime(activeTab === 'community');

  // ... rest of component
}
```

---

#### 1.2 `useViewerPresence.ts` ⭐ 핵심
**목적**: Supabase Presence로 실시간 뷰어 수 추적

**작동 원리**:
- 사용자가 카드를 보면 Presence 채널에 join
- 같은 채널에 있는 사용자 수를 실시간 카운트
- 사용자가 떠나면 자동으로 leave

**구현 코드**:
```typescript
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface ViewerPresenceOptions {
  itemId: string;
  itemType: 'project' | 'collaboration';
  enabled?: boolean;
}

export function useViewerPresence({ itemId, itemType, enabled = true }: ViewerPresenceOptions) {
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    if (!enabled || !itemId) return;

    const channelName = `${itemType}-${itemId}`;

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: itemId
        }
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        setViewerCount(count);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('[Presence] User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('[Presence] User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track this user's presence
          await channel.track({
            online_at: new Date().toISOString(),
            user_id: (await supabase.auth.getUser()).data.user?.id,
          });
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [itemId, itemType, enabled]);

  return viewerCount;
}
```

**사용 예시**:
```typescript
const viewerCount = useViewerPresence({
  itemId: item.id,
  itemType: item.type,
  enabled: isCardVisible, // Optional: only track when card is in viewport
});
```

---

#### 1.3 `useElapsedTime.ts`
**목적**: 경과 시간을 "n분 전" 형식으로 실시간 업데이트

**구현 코드**:
```typescript
import { useState, useEffect } from 'react';
import { formatElapsedTime } from '../utils/timeFormatter';

export function useElapsedTime(timestamp?: string) {
  const [elapsed, setElapsed] = useState(() =>
    timestamp ? formatElapsedTime(timestamp) : ''
  );

  useEffect(() => {
    if (!timestamp) return;

    // Initial set
    setElapsed(formatElapsedTime(timestamp));

    // Update every minute
    const interval = setInterval(() => {
      setElapsed(formatElapsedTime(timestamp));
    }, 60000); // 60초마다 업데이트

    return () => clearInterval(interval);
  }, [timestamp]);

  return elapsed;
}
```

---

### 2. Components (webapp/src/components/lounge/)

#### 2.1 `ViewerCountChip.tsx`
**목적**: 우상단 "n명 보는 중" 표시 (빨간 펄스 점 포함)

**디자인**:
- 반투명 검은색 배경 (`rgba(0, 0, 0, 0.6)`)
- 빨간 점 펄스 애니메이션
- 흰색 텍스트
- `backdrop-filter: blur(4px)`

**구현 코드**:
```typescript
import { Box, Typography, styled } from '@mui/material';

const ChipContainer = styled(Box)({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 8px',
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  borderRadius: 12,
  backdropFilter: 'blur(4px)',
});

const PulseDot = styled(Box)({
  width: 6,
  height: 6,
  borderRadius: '50%',
  backgroundColor: '#ef4444',
  animation: 'pulse-dot 2s ease-in-out infinite',
  '@keyframes pulse-dot': {
    '0%, 100%': { opacity: 1, transform: 'scale(1)' },
    '50%': { opacity: 0.6, transform: 'scale(1.1)' },
  },
});

const ViewerText = styled(Typography)({
  fontSize: 11,
  fontWeight: 500,
  color: '#fff',
});

interface ViewerCountChipProps {
  count: number;
}

export default function ViewerCountChip({ count }: ViewerCountChipProps) {
  if (count === 0) return null;

  return (
    <ChipContainer>
      <PulseDot />
      <ViewerText>{count}명 보는 중</ViewerText>
    </ChipContainer>
  );
}
```

---

#### 2.2 `SupporterAvatars.tsx`
**목적**: Row 7 - 프로필 사진 3개 오버랩 + "외 n명이 응원중" + 경과 시간

**디자인**:
- 아바타 3개 오버랩 (왼쪽으로 -8px씩)
- 회색 텍스트 (13px)
- 경과 시간 (11px, 더 연한 회색)

**구현 코드**:
```typescript
import { Box, Avatar, Typography, styled } from '@mui/material';
import { useElapsedTime } from '../../hooks/useElapsedTime';

const Container = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});

const AvatarGroup = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  marginRight: 4,
});

const StyledAvatar = styled(Avatar)<{ index: number }>(({ index }) => ({
  width: 24,
  height: 24,
  border: '2px solid #fff',
  marginLeft: index > 0 ? -8 : 0,
  zIndex: 3 - index,
}));

const SupportText = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  color: theme.palette.text.secondary,
}));

const ElapsedText = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.disabled,
}));

interface Supporter {
  userId: string;
  name: string;
  avatarUrl: string;
}

interface SupporterAvatarsProps {
  supporters: Supporter[];
  totalCount: number;
  latestSupportAt?: string;
}

export default function SupporterAvatars({
  supporters,
  totalCount,
  latestSupportAt
}: SupporterAvatarsProps) {
  const elapsed = useElapsedTime(latestSupportAt);

  if (totalCount === 0) return null;

  const displaySupporters = supporters.slice(0, 3);
  const remainingCount = totalCount - displaySupporters.length;

  return (
    <Container>
      <AvatarGroup>
        {displaySupporters.map((supporter, index) => (
          <StyledAvatar
            key={supporter.userId}
            index={index}
            src={supporter.avatarUrl}
            alt={supporter.name}
          />
        ))}
      </AvatarGroup>
      <SupportText>
        {remainingCount > 0 ? `외 ${remainingCount}명이 응원중` : '응원중'}
      </SupportText>
      {elapsed && <ElapsedText>· {elapsed}</ElapsedText>}
    </Container>
  );
}
```

---

#### 2.3 `LikeButton.tsx`
**목적**: Row 8 - "❤️ 응원하기" 버튼 (Optimistic UI 업데이트)

**기능**:
- 좋아요 토글 (liked/unliked 상태)
- 클릭 시 즉시 UI 업데이트 (Optimistic)
- API 호출 실패 시 롤백
- 좋아요 수 증감 애니메이션

**구현 코드**:
```typescript
import { useState } from 'react';
import { Button, styled } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { communityService } from '../../services/communityService';
import { useAuthStore } from '../../stores/authStore';
import { useCommunityStore } from '../../stores/communityStore';

const StyledButton = styled(Button)<{ isLiked: boolean }>(({ theme, isLiked }) => ({
  backgroundColor: isLiked ? theme.palette.primary.main : theme.palette.background.paper,
  color: isLiked ? '#fff' : theme.palette.text.primary,
  border: isLiked ? 'none' : `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding: '8px 16px',
  fontSize: 14,
  fontWeight: 600,
  textTransform: 'none',
  transition: 'all 0.2s',
  '& .MuiButton-startIcon': {
    marginRight: 6,
  },
}));

interface LikeButtonProps {
  itemId: string;
  itemType: 'project' | 'collaboration';
  initialLiked: boolean;
  initialCount: number;
}

export default function LikeButton({
  itemId,
  itemType,
  initialLiked,
  initialCount,
}: LikeButtonProps) {
  const user = useAuthStore((state) => state.user);
  const { toggleLike: toggleStorelike, isLiked: isStoreLiked } = useCommunityStore();
  const queryClient = useQueryClient();

  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);

  const likeMutation = useMutation({
    mutationFn: () => communityService.toggleLike(itemId, itemType, user!.id),
    onMutate: async () => {
      // Optimistic update
      const previousLiked = isLiked;
      const previousCount = likeCount;

      setIsLiked(!isLiked);
      setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));
      toggleStorelike(itemId);

      return { previousLiked, previousCount };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context) {
        setIsLiked(context.previousLiked);
        setLikeCount(context.previousCount);
        toggleStorelike(itemId); // Revert store
      }
      console.error('Failed to toggle like:', error);
    },
    onSuccess: () => {
      // Invalidate queries to get fresh data
      queryClient.invalidateQueries({ queryKey: ['community', 'items'] });
    },
  });

  const handleClick = () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }
    likeMutation.mutate();
  };

  return (
    <StyledButton
      isLiked={isLiked}
      startIcon={isLiked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
      onClick={handleClick}
      disabled={likeMutation.isPending}
    >
      {isLiked ? '응원중' : '응원하기'} ({likeCount})
    </StyledButton>
  );
}
```

---

### 3. Update CommunityCard.tsx

**변경사항**:
1. ViewerCountChip을 CoverSection 우상단에 추가
2. SupporterAvatars를 Row 7에 추가
3. LikeButton을 Row 8에 추가
4. useViewerPresence hook 통합

**업데이트된 코드 (주요 부분만)**:
```typescript
import ViewerCountChip from './ViewerCountChip';
import SupporterAvatars from './SupporterAvatars';
import LikeButton from './LikeButton';
import { useViewerPresence } from '../../hooks/useViewerPresence';
import { useAuthStore } from '../../stores/authStore';

export default function CommunityCard({ item, onClick }: CommunityCardProps) {
  const user = useAuthStore((state) => state.user);
  const viewerCount = useViewerPresence({
    itemId: item.id,
    itemType: item.type
  });

  const [isLiked, setIsLiked] = useState(false);

  // Check if user has liked this item
  useEffect(() => {
    if (user) {
      communityService.checkLiked(item.id, item.type, user.id)
        .then(setIsLiked);
    }
  }, [item.id, item.type, user]);

  return (
    <CardContainer onClick={onClick}>
      <CoverSection>
        {item.coverImageUrl && (
          <CoverImage
            src={item.coverImageUrl}
            alt={item.title}
            onError={handleImageError}
          />
        )}

        {/* ViewerCountChip in top-right */}
        <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
          <ViewerCountChip count={viewerCount} />
        </Box>
      </CoverSection>

      <ContentSection>
        {/* Rows 1-6: Same as Phase 1 */}

        {/* Row 7: Supporter Avatars */}
        <SupporterAvatars
          supporters={item.latestSupporters}
          totalCount={item.likeCount}
          latestSupportAt={item.latestSupportAt}
        />

        {/* Row 8: Like Button */}
        <Box sx={{ mt: 2 }}>
          <LikeButton
            itemId={item.id}
            itemType={item.type}
            initialLiked={isLiked}
            initialCount={item.likeCount}
          />
        </Box>
      </ContentSection>
    </CardContainer>
  );
}
```

---

### 4. Update Lounge.tsx

**변경사항**:
1. `useCommunityRealtime` hook 추가
2. Realtime 활성화 조건: `activeTab === 'community'`

**업데이트된 코드**:
```typescript
import { useCommunityRealtime } from '../../hooks/useCommunityRealtime';

export default function Lounge() {
  const [activeTab, setActiveTab] = useState<LoungeTabKey>('magazine');

  // Enable realtime when community tab is active
  useCommunityRealtime(activeTab === 'community');

  // ... rest of component
}
```

---

## 🧪 Phase 2 테스트 체크리스트

### Realtime 기능 테스트
- [ ] 브라우저 2개를 열고 동일한 프로젝트 카드 확인
- [ ] 한 브라우저에서 좋아요 클릭 → 다른 브라우저에서 즉시 카운트 증가 확인
- [ ] 한 브라우저에서 댓글 작성 → 다른 브라우저에서 즉시 카운트 증가 확인

### Presence 기능 테스트
- [ ] 동일한 카드를 여러 브라우저에서 열기
- [ ] "n명 보는 중" 카운트가 실시간으로 증가하는지 확인
- [ ] 브라우저 닫으면 카운트가 감소하는지 확인

### Optimistic UI 테스트
- [ ] 네트워크를 느리게 설정 (Chrome DevTools → Network → Slow 3G)
- [ ] 좋아요 버튼 클릭 → 즉시 UI 변경 확인
- [ ] API 응답 전에도 버튼 상태가 변경되는지 확인
- [ ] API 실패 시 롤백되는지 확인 (네트워크 끊고 테스트)

### 경과 시간 테스트
- [ ] "n분 전" 표시가 정확한지 확인
- [ ] 1분 후 자동으로 업데이트되는지 확인

---

## 📊 Phase 2 예상 작업 시간

| 작업 | 예상 시간 | 우선순위 |
|-----|---------|---------|
| `useCommunityRealtime.ts` 구현 | 30분 | 🔴 High |
| `useViewerPresence.ts` 구현 | 45분 | 🔴 High |
| `useElapsedTime.ts` 구현 | 15분 | 🟡 Medium |
| `ViewerCountChip.tsx` 구현 | 30분 | 🟡 Medium |
| `SupporterAvatars.tsx` 구현 | 45분 | 🔴 High |
| `LikeButton.tsx` 구현 | 1시간 | 🔴 High |
| `CommunityCard.tsx` 업데이트 | 30분 | 🔴 High |
| `Lounge.tsx` 업데이트 | 15분 | 🟡 Medium |
| 테스트 및 버그 수정 | 1시간 | 🔴 High |
| **총 예상 시간** | **약 5시간** | |

---

## 🚀 Phase 2 구현 순서 (권장)

### Step 1: Hooks 구현 (Foundation)
1. `useElapsedTime.ts` (가장 단순)
2. `useCommunityRealtime.ts` (핵심 기능)
3. `useViewerPresence.ts` (복잡도 중간)

### Step 2: Components 구현 (UI)
1. `ViewerCountChip.tsx` (단순 UI)
2. `SupporterAvatars.tsx` (중간 복잡도)
3. `LikeButton.tsx` (가장 복잡 - Optimistic UI)

### Step 3: Integration (통합)
1. `CommunityCard.tsx` 업데이트
2. `Lounge.tsx` 업데이트

### Step 4: Testing & Polish
1. 브라우저 2개로 Realtime 테스트
2. Network throttling으로 Optimistic UI 테스트
3. 경과 시간 자동 업데이트 확인

---

## 🎯 Phase 3 Preview (미래 기획)

Phase 2 완료 후 추가할 기능들:

1. **ActivityFeed Component** - 실시간 활동 피드 (무지개 테두리, 5초마다 업데이트)
2. **CommunityProgressBar** - 진행률 표시 (초록→파랑 그라데이션, 쉬머 효과)
3. **FloatingEmojis** - 플로팅 이모지 리액션 (8종, 하단→상단 애니메이션)
4. **Comment Modal** - 댓글 작성/조회 모달
5. **Share Functionality** - 공유 기능

---

## 📝 Notes & Best Practices

### Defensive Programming
```typescript
// ✅ ALWAYS check arrays before operations
const supporters = item.latestSupporters || [];
supporters.slice(0, 3).map(...)

// ✅ ALWAYS use optional chaining
const elapsed = item.latestSupportAt ? formatElapsedTime(item.latestSupportAt) : '';

// ✅ ALWAYS handle missing image URLs
<Avatar src={supporter.avatarUrl || '/default-avatar.png'} />
```

### MUI Theme System
```typescript
// ✅ ALWAYS use theme.palette
const StyledText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

// ❌ NEVER hard-code colors
const StyledText = styled(Typography)({
  color: '#949196', // BAD!
});
```

### Realtime Performance
```typescript
// ✅ ONLY subscribe when tab is active
useCommunityRealtime(activeTab === 'community');

// ✅ Clean up subscriptions on unmount
useEffect(() => {
  const channel = supabase.channel(...);
  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

---

## ✅ Phase 2 완료 기준

Phase 2가 완료되었다고 판단하는 기준:

- [ ] 모든 Hook 파일이 생성되고 동작함
- [ ] 모든 Component 파일이 생성되고 렌더링됨
- [ ] CommunityCard에 실시간 뷰어 카운트 표시됨
- [ ] CommunityCard에 응원자 아바타 표시됨
- [ ] 좋아요 버튼이 Optimistic UI로 동작함
- [ ] 브라우저 2개에서 실시간 업데이트 확인됨
- [ ] TypeScript 빌드 에러 없음
- [ ] 테스트 체크리스트 모두 통과

---

**다음 단계**: Phase 2 구현 시작 (Step 1: Hooks부터 시작 권장)

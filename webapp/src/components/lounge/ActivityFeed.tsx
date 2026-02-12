/**
 * ActivityFeed Component (Phase 3 - Batch&Queue 최적화)
 *
 * Purpose: 실시간 활동 피드 표시 (좋아요, 댓글)
 *
 * Design Spec:
 * - 무지개색 그라데이션 테두리 (애니메이션)
 * - Batch&Queue 방식: 1분마다 20개 fetch → 3-8초 random interval로 표시
 * - Pulse 애니메이션으로 생동감 표현
 * - Slide-in 애니메이션으로 새 활동 등장
 * - 위치: TabBar(전체/프로젝트/협업) 바로 아래
 * - 고정 높이: 5행 (항상 표시), 스크롤로 최대 20개 확인 가능
 *
 * Features:
 * - 화면에 5개 슬롯 표시 (스크롤시 최대 20개까지 확인 가능)
 * - Batch&Queue: 1분마다 서버에서 20개 fetch, 로컬에서 3-8초마다 1개씩 큐에서 표시
 * - 초록 체크 아이콘 통일 (프로필 사진 없음)
 * - Framer Motion으로 부드러운 애니메이션
 * - localStorage를 통한 활동 데이터 영구 저장 (새로고침 후에도 유지)
 * - 7일 지난 활동은 자동 만료/제거
 *
 * 최적화 효과:
 * - Before: 5초마다 API 호출 (1분에 12회)
 * - After: 1분에 1회 API 호출 (92% 감소)
 *
 * Usage:
 * <ActivityFeed />
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../providers/AuthContext';
import { Box, Typography, styled, useTheme } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { communityService } from '../../services/communityService';
import type { ActivityFeedItem } from '../../types/community.types';
import ExpandCircleDownOutlinedIcon from '@mui/icons-material/ExpandCircleDownOutlined';

const FeedContainer = styled(Box)({
  margin: '16px 20px',
  padding: 16,
  borderRadius: 30,
  backgroundColor: '#fff',
  border: '3px solid transparent',
  backgroundImage: `
    linear-gradient(#fff, #fff),
    linear-gradient(
      90deg,
      #ff8a8a,
      #ffb38a,
      #fff59d,
      #b8f1b0,
      #9ecbff,
      #c4a2ff,
      #dba3ff,
      #ff8a8a
    )
  `,
  backgroundOrigin: 'border-box',
  backgroundClip: 'padding-box, border-box',
  backgroundSize: '100%, 200% 100%',
  // iOS 성능 최적화: 애니메이션 주기 5s → 15s로 증가, will-change 추가
  animation: 'rainbow-border 15s linear infinite',
  willChange: 'background-position',
  '@keyframes rainbow-border': {
    '0%': { backgroundPosition: '0% 0%, 0% 50%' },
    '100%': { backgroundPosition: '0% 0%, 200% 50%' },
  },
});

const FeedTitle = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 12,
});

const PulseIndicator = styled(Box)({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: '#10b981',
  animation: 'pulse 2s ease-in-out infinite',
  '@keyframes pulse': {
    '0%, 100%': { opacity: 1, transform: 'scale(1)' },
    '50%': { opacity: 0.5, transform: 'scale(1.2)' },
  },
});

const TitleText = styled(Typography)(({ theme }) => ({
  fontSize: 14,
  fontWeight: 700,
  color: theme.palette.text.primary,
}));

const ActivityList = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  maxHeight: '160px', // 5개 행 높이 (32px * 5)
  overflowY: 'auto',
  // 스크롤바 스타일링
  '&::-webkit-scrollbar': {
    width: 4,
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#e0e0e0',
    borderRadius: 2,
  },
});

const ActivityItem = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isEmpty',
})<{ isEmpty?: boolean }>(({ isEmpty }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  minHeight: '32px',
  opacity: isEmpty ? 0 : 1,
  transition: 'opacity 0.3s',
}));

const CheckIconWrapper = styled(Box)(({ }) => ({
  width: 32,
  height: 32,
  borderRadius: '50%',
  backgroundColor: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}));

const ActivityText = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  color: theme.palette.text.secondary,
  flex: 1,
  '& strong': {
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
}));

// localStorage 키 상수
const STORAGE_KEY_DISPLAYED = 'activityFeed_displayedActivities';
const MAX_DISPLAYED_ACTIVITIES = 20; // 최대 표시할 활동 개수
const ACTIVITY_EXPIRY_DAYS = 7; // 활동 만료 기간 (일)

// 저장용 활동 아이템 타입 (타임스탬프 포함)
interface StoredActivityItem extends ActivityFeedItem {
  displayedAt: number; // 표시된 시간 (timestamp)
}

// localStorage에서 표시된 활동 목록 읽기
const getStoredDisplayedActivities = (): StoredActivityItem[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_DISPLAYED);
    if (!stored) return [];
    const activities = JSON.parse(stored) as StoredActivityItem[];

    // 7일 지난 활동 필터링
    const now = Date.now();
    const expiryMs = ACTIVITY_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    const validActivities = activities.filter(
      a => now - a.displayedAt < expiryMs
    );

    // 만료된 활동이 있었다면 저장소 업데이트
    if (validActivities.length !== activities.length) {
      localStorage.setItem(STORAGE_KEY_DISPLAYED, JSON.stringify(validActivities));
    }

    return validActivities;
  } catch (error) {
    console.warn('Failed to read displayed activities from localStorage:', error);
    return [];
  }
};

// localStorage에 표시된 활동 저장
const saveDisplayedActivities = (activities: StoredActivityItem[]): void => {
  try {
    // 최대 개수 제한
    const trimmedActivities = activities.slice(0, MAX_DISPLAYED_ACTIVITIES);
    localStorage.setItem(STORAGE_KEY_DISPLAYED, JSON.stringify(trimmedActivities));
  } catch (error) {
    console.warn('Failed to save displayed activities to localStorage:', error);
  }
};

// 엔티티 제목의 종성 유무에 따라 목적격 조사를 반환
const getObjectParticle = (text: string) => {
  const lastChar = text.trim().slice(-1);
  if (!lastChar) return '를';

  const code = lastChar.charCodeAt(0);
  const isKoreanSyllable = code >= 0xac00 && code <= 0xd7a3;
  if (!isKoreanSyllable) return '를';

  const hasFinalConsonant = (code - 0xac00) % 28 !== 0;
  return hasFinalConsonant ? '을' : '를';
};

// 3-8초 사이 랜덤 interval 생성
const getRandomInterval = () => Math.floor(Math.random() * 5000) + 3000; // 3000-8000ms

export default function ActivityFeed() {
  const { user } = useAuth();
  const userIdRef = useRef(user?.id);

  // Sync userId ref
  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user]);

  // Batch&Queue 상태
  const [displayedActivities, setDisplayedActivities] = useState<StoredActivityItem[]>([]);
  const queueRef = useRef<ActivityFeedItem[]>([]); // 아직 표시 안 된 활동들
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitializedRef = useRef(false);

  // 컴포넌트 마운트 시 localStorage에서 기존 활동 목록 읽기
  useEffect(() => {
    if (!isInitializedRef.current) {
      const storedActivities = getStoredDisplayedActivities();
      setDisplayedActivities(storedActivities);
      isInitializedRef.current = true;
    }
  }, []);

  // 1분마다 20개 활동 fetch (refetchInterval 대신 staleTime 활용)
  const { data: fetchedActivities = [] } = useQuery({
    queryKey: ['community', 'activity', 'batch'],
    queryFn: () => communityService.getActivityFeed(20), // 20개 batch fetch
    staleTime: 60_000, // 1분간 fresh 상태 유지
    gcTime: 5 * 60_000, // 5분간 캐시
    refetchInterval: 60_000, // 1분마다 새로 fetch (기존 5초 → 1분, 92% 감소)
  });

  // 큐에서 하나씩 꺼내서 표시하는 함수
  const showNextActivity = useCallback(() => {
    if (queueRef.current.length === 0) return;

    const nextActivity = queueRef.current.shift()!;
    const storedActivity: StoredActivityItem = {
      ...nextActivity,
      displayedAt: Date.now(),
    };

    setDisplayedActivities(prev => {
      // 새 활동을 맨 앞에 추가, 최대 20개 유지
      const updated = [storedActivity, ...prev].slice(0, MAX_DISPLAYED_ACTIVITIES);
      // localStorage에 저장
      saveDisplayedActivities(updated);
      return updated;
    });

    // 내 활동이 큐에 있는지 확인 (있으면 빠르게 표시)
    const hasMyActivity = queueRef.current.some(a => a.userId === userIdRef.current);
    const nextInterval = hasMyActivity ? 200 : getRandomInterval(); // 내 활동 대기중이면 0.2초, 아니면 3-8초

    // 다음 활동 표시 스케줄
    if (queueRef.current.length > 0) {
      timerRef.current = setTimeout(showNextActivity, nextInterval);
    } else {
      timerRef.current = null;
    }
  }, []);

  // fetchedActivities가 변경되면 큐에 추가
  useEffect(() => {
    if (fetchedActivities.length === 0 || !isInitializedRef.current) return;

    // 이미 표시된 활동 ID 수집
    const displayedIds = new Set(displayedActivities.map(a => a.id));

    // 새로운 활동만 큐에 추가 (중복 제거)
    const newActivities = fetchedActivities.filter(a => !displayedIds.has(a.id));

    if (newActivities.length > 0) {
      // 기존 큐에 있는 ID도 제외
      const queueIds = new Set(queueRef.current.map(a => a.id));
      const uniqueNewActivities = newActivities.filter(a => !queueIds.has(a.id));

      if (uniqueNewActivities.length > 0) {
        // 날짜순 오름차순 정렬 (과거 -> 최신)
        // 큐에서 앞에서부터 꺼내서(shift) 리스트 앞에 추가(prepend)하므로
        // 과거 활동부터 처리해야 최신 활동이 리스트의 맨 위에 오게 됨
        uniqueNewActivities.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        queueRef.current = [...queueRef.current, ...uniqueNewActivities];

        // 타이머가 없으면 시작
        if (!timerRef.current && queueRef.current.length > 0) {
          // 첫 활동은 즉시 표시
          showNextActivity();
        }
      }
    }
  }, [fetchedActivities, displayedActivities, showNextActivity]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // 항상 최소 5개 슬롯 표시 (활동이 5개 미만이면 빈 슬롯으로 채움)
  const minSlots = 5;
  const displaySlots = displayedActivities.length >= minSlots
    ? displayedActivities
    : [...displayedActivities, ...Array(minSlots - displayedActivities.length).fill(null)];

  const theme = useTheme();
  return (
    <FeedContainer>
      <FeedTitle>
        <PulseIndicator />
        <TitleText>실시간 활동</TitleText>
      </FeedTitle>

      <ActivityList>
        <AnimatePresence mode="popLayout">
          {displaySlots.map((activity, index) => {
            if (!activity) {
              // Empty slot (transparent placeholder)
              return (
                <ActivityItem key={`empty-${index}`} isEmpty>
                  <CheckIconWrapper>
                    <ExpandCircleDownOutlinedIcon sx={{ fontSize: 20, color: theme.palette.status.green }} />
                  </CheckIconWrapper>
                  <ActivityText>&nbsp;</ActivityText>
                </ActivityItem>
              );
            }

            const actionText =
              activity.activityType === 'like'
                ? { particle: getObjectParticle(activity.entityTitle), verb: '응원했어요' }
                : { particle: '에', verb: '댓글을 남겼어요' };

            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <ActivityItem>
                  <CheckIconWrapper>
                    <ExpandCircleDownOutlinedIcon sx={{ fontSize: 16, color: theme.palette.status.green }} />
                  </CheckIconWrapper>

                  <ActivityText>
                    {activity.userName}님이{' '}
                    <strong>{activity.entityTitle}</strong>
                    {actionText.particle} {actionText.verb}
                  </ActivityText>
                </ActivityItem>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </ActivityList>
    </FeedContainer>
  );
}

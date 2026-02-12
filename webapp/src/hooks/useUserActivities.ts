/**
 * 사용자 활동 관련 TanStack Query 훅
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activityService } from '../services/activityService';
import { loginStreakService } from '../services/loginStreakService';
import { profileViewService } from '../services/profileViewService';
import type {
  UserActivity,
  ActivityFilters,
  DateRangeFilter,
  ActivityCategory,
} from '../types/activity.types';

// Query Keys
export const activityKeys = {
  all: ['activities'] as const,
  recent: (userId: string, limit: number) =>
    [...activityKeys.all, 'recent', userId, limit] as const,
  list: (userId: string, filters?: ActivityFilters) =>
    [...activityKeys.all, 'list', userId, filters] as const,
  grouped: (userId: string, filters?: ActivityFilters) =>
    [...activityKeys.all, 'grouped', userId, filters] as const,
  unreadCount: (userId: string) =>
    [...activityKeys.all, 'unreadCount', userId] as const,
  streak: (userId: string) => ['loginStreak', userId] as const,
  profileViews: (profileId: string) => ['profileViews', profileId] as const,
};

/**
 * 최근 활동 조회 훅 (MyProfile용)
 */
export function useRecentActivities(userId: string | undefined, limit = 3) {
  return useQuery({
    queryKey: activityKeys.recent(userId!, limit),
    queryFn: () => activityService.getRecentActivities(userId!, limit),
    enabled: !!userId,
    staleTime: 30_000, // 30초
    gcTime: 5 * 60_000, // 5분
    refetchOnMount: 'always', // 마운트 시 항상 refetch
  });
}

/**
 * 활동 목록 조회 훅
 */
export function useUserActivities(
  userId: string | undefined,
  filters?: ActivityFilters
) {
  return useQuery({
    queryKey: activityKeys.list(userId!, filters),
    queryFn: () => activityService.getUserActivities(userId!, filters),
    enabled: !!userId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * 날짜 범위 기반 활동 조회 훅
 */
export function useActivitiesByDateRange(
  userId: string | undefined,
  range: DateRangeFilter,
  additionalFilters?: Omit<ActivityFilters, 'startDate' | 'endDate'>
) {
  return useQuery({
    queryKey: activityKeys.list(userId!, { ...additionalFilters, range } as any),
    queryFn: () =>
      activityService.getActivitiesByDateRange(userId!, range, additionalFilters),
    enabled: !!userId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * 카테고리 기반 활동 조회 훅
 */
export function useActivitiesByCategory(
  userId: string | undefined,
  category: ActivityCategory,
  filters?: Omit<ActivityFilters, 'type' | 'category'>
) {
  return useQuery({
    queryKey: activityKeys.list(userId!, { category, ...filters } as any),
    queryFn: () =>
      activityService.getUserActivitiesByCategory(userId!, category, filters),
    enabled: !!userId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * 읽지 않은 활동 수 조회 훅
 */
export function useUnreadActivityCount(userId: string | undefined) {
  return useQuery({
    queryKey: activityKeys.unreadCount(userId!),
    queryFn: () => activityService.getUnreadCount(userId!),
    enabled: !!userId,
    staleTime: 30_000, // 30초
    gcTime: 60_000,
  });
}

/**
 * 활동 읽음 처리 뮤테이션
 */
export function useMarkActivityAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (activityId: string) => activityService.markAsRead(activityId),
    onSuccess: () => {
      // 활동 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
    },
  });
}

/**
 * 모든 활동 읽음 처리 뮤테이션
 */
export function useMarkAllActivitiesAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => activityService.markAllAsRead(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
    },
  });
}

/**
 * 로그인 스트릭 조회 훅
 */
export function useLoginStreak(userId: string | undefined) {
  return useQuery({
    queryKey: activityKeys.streak(userId!),
    queryFn: () => loginStreakService.getStreak(userId!),
    enabled: !!userId,
    staleTime: 5 * 60_000, // 5분
    gcTime: 10 * 60_000,
  });
}

/**
 * 로그인 스트릭 업데이트 뮤테이션
 */
export function useUpdateLoginStreak() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => loginStreakService.updateStreak(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: activityKeys.streak(userId) });
    },
  });
}

/**
 * 프로필 조회 통계 조회 훅
 */
export function useProfileViewStats(profileId: string | undefined) {
  return useQuery({
    queryKey: activityKeys.profileViews(profileId!),
    queryFn: () => profileViewService.getViewStats(profileId!),
    enabled: !!profileId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * 프로필 조회 기록 뮤테이션
 */
export function useRecordProfileView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      profileId,
      viewerId,
    }: {
      profileId: string;
      viewerId: string | null;
    }) => profileViewService.recordView(profileId, viewerId),
    onSuccess: (_, { profileId }) => {
      // 프로필 조회 통계 무효화
      queryClient.invalidateQueries({
        queryKey: activityKeys.profileViews(profileId),
      });
    },
  });
}

/**
 * 날짜별 그룹핑된 활동 데이터를 위한 유틸리티 훅
 */
export function useGroupedActivities(
  userId: string | undefined,
  filters?: ActivityFilters
) {
  const { data: activities = [], ...rest } = useUserActivities(userId, filters);

  // 날짜별 그룹핑 (로컬 타임존 기준)
  const groupedActivities = activities.reduce(
    (acc, activity) => {
      const date = new Date(activity.createdAt);
      // 로컬 타임존 기준 YYYY-MM-DD (toISOString은 UTC 기준이므로 사용하지 않음)
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(activity);
      return acc;
    },
    {} as Record<string, UserActivity[]>
  );

  // 날짜 라벨 생성 함수
  const getDateLabel = (dateKey: string): string => {
    const [y, m, d] = dateKey.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.floor(
      (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays === 2) return '그제';

    // 3일 전부터는 YYYY.MM.DD 형식으로 표시
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  return {
    ...rest,
    groupedActivities,
    getDateLabel,
    activities,
  };
}

/**
 * 활동 캐시 무효화 훅
 * 활동 생성 후 즉시 갱신이 필요할 때 사용
 */
export function useInvalidateActivities() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: activityKeys.all }),
    invalidateRecent: (userId: string) => {
      // 3개, 5개 등 다양한 limit의 recent 캐시를 모두 무효화
      queryClient.invalidateQueries({ queryKey: [...activityKeys.all, 'recent', userId] });
    },
  };
}

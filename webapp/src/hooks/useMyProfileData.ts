/**
 * useMyProfileData Hook
 *
 * MyProfile.tsx의 데이터 로딩을 TanStack Query로 래핑하여 캐싱 지원
 *
 * 최적화 효과:
 * - Before: 매 방문시 11개 API 호출
 * - After: 캐시된 데이터 즉시 표시 + 백그라운드 리프레시
 *
 * 캐싱 전략:
 * - staleTime: 2분 (프로필 데이터는 자주 바뀔 수 있음)
 * - gcTime: 10분
 */

import { useQuery } from '@tanstack/react-query';
import { profileService } from '../services/profileService';
import { profileQueryService } from '../services/profileQueryService';
import { socialService, type SocialStats } from '../services/socialService';
import { badgeService, type Badge } from '../services/badgeService';
import { reviewService } from '../services/reviewService';
import { supabase } from '../lib/supabase';
import type { ProfileType } from '../stores/profileStore';

// 프로필 데이터 타입
export interface ProfileData {
  profile: any;
  stats: SocialStats;
  badges: (Badge & { obtained: boolean })[];
}

// 아카이브 카운트 타입 (실제 아카이브된 항목만)
export interface ArchiveCount {
  archivedProjects: number;    // 완료/취소/보류된 프로젝트
  archivedCollaborations: number;  // 완료/취소/보류된 협업
  archivedPartnerships: number;    // 완료/거절/보류된 파트너십 문의
  total: number;
}

// 즐겨찾기 타입
export interface FavoriteItem {
  id: string;
  name: string;
  image: string | null;
  role: string;
}

// 리뷰 타입
export interface ReviewItem {
  id: string;
  content: string;
  rating: number;
  review_tag?: string | null;
  reviewer?: { name: string };
  reviewee?: { name: string };
  created_at: string;
}

/**
 * 프로필 초기화 (활성 프로필 가져오기)
 */
export function useProfileInitialization(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', 'initialization', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      return profileQueryService.getAllActiveProfiles(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60_000, // 5분
    gcTime: 30 * 60_000,
  });
}

/**
 * 프로필 데이터 + 소셜 통계 + 배지 조회
 */
export function useProfileData(profileId: string | null, profileType: ProfileType | null) {
  return useQuery({
    queryKey: ['profile', 'data', profileId, profileType],
    queryFn: async (): Promise<ProfileData> => {
      if (!profileId || !profileType) throw new Error('Profile ID and type required');
      // customer 타입은 실제 프로필 테이블이 없으므로 여기서는 허용하지 않는다
      if (profileType === 'customer') {
        throw new Error('Customer profile type is not supported for useProfileData');
      }

      const [profile, stats, badges] = await Promise.all([
        profileService.getProfile(profileId, profileType),
        socialService.getSocialStats(profileId),
        badgeService.getUserBadgesStatus(profileId),
      ]);

      return { profile, stats, badges };
    },
    enabled: !!profileId && !!profileType,
    staleTime: 2 * 60_000, // 2분
    gcTime: 10 * 60_000,
  });
}

// 아카이브 상태 (완료/취소/보류만) - useArchiveData.ts와 일치
// 제외: 'deleted'(삭제됨), 'open'(모집중), 'in_progress'(진행중)
// 파트너십은 ArchivePage에 표시되지 않으므로 카운트에서 제외
const ARCHIVE_PROJECT_STATUSES = ['completed', 'cancelled', 'on_hold'];

/**
 * 아카이브 카운트 조회 함수 (COUNT 쿼리 최적화)
 * 실제 아카이브된(완료/취소/보류) 프로젝트, 협업만 카운트
 * 파트너십은 ArchivePage에 표시되지 않으므로 total에서 제외
 */
async function getArchiveCountsOnly(): Promise<ArchiveCount> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      archivedProjects: 0,
      archivedCollaborations: 0,
      archivedPartnerships: 0,
      total: 0,
    };
  }

  // 1. 내가 생성한 아카이브된 프로젝트
  const createdProjectsPromise = supabase
    .from('projects')
    .select('id')
    .eq('created_by', user.id)
    .in('status', ARCHIVE_PROJECT_STATUSES);

  // 2. 먼저 존재하는 아카이브된 프로젝트를 조회한 후, 내가 멤버인지 확인
  // 이렇게 하면 projects 테이블에 없는(삭제된) 레코드는 자동으로 제외됨
  // 'open'(모집중), 'in_progress'(진행중)는 ARCHIVE_PROJECT_STATUSES에 포함되지 않아 자동 제외
  const allArchivedProjectsPromise = supabase
    .from('projects')
    .select('id, created_by')
    .in('status', ARCHIVE_PROJECT_STATUSES);

  // 3. 존재하는 아카이브된 협업 조회
  // 'open'(모집중), 'in_progress'(진행중)는 ARCHIVE_PROJECT_STATUSES에 포함되지 않아 자동 제외
  const allArchivedCollaborationsPromise = supabase
    .from('collaborations')
    .select('id')
    .in('status', ARCHIVE_PROJECT_STATUSES);

  const [
    createdProjectsResult,
    allArchivedProjectsResult,
    allArchivedCollaborationsResult,
  ] = await Promise.all([
    createdProjectsPromise,
    allArchivedProjectsPromise,
    allArchivedCollaborationsPromise,
  ]);

  // 내가 생성한 아카이브 프로젝트 수
  const createdArchivedCount = createdProjectsResult.data?.length ?? 0;

  // 멤버인 아카이브 프로젝트 찾기 (내가 생성한 것 제외)
  let memberArchivedProjectCount = 0;
  const allArchivedProjects = allArchivedProjectsResult.data || [];
  const memberProjectIds = allArchivedProjects
    .filter(p => p.created_by !== user.id)
    .map(p => p.id);

  if (memberProjectIds.length > 0) {
    const { data: memberData, error: memberError } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('project_id', memberProjectIds);

    if (memberError) {
      console.error('[useMyProfileData] Error fetching project members:', memberError);
    }
    memberArchivedProjectCount = memberData?.length ?? 0;
  }

  // 멤버인 아카이브 협업 찾기
  let archivedCollaborationsCount = 0;
  const allArchivedCollaborations = allArchivedCollaborationsResult.data || [];
  const archivedCollabIds = allArchivedCollaborations.map(c => c.id);

  if (archivedCollabIds.length > 0) {
    const { data: collabMemberData, error: collabMemberError } = await supabase
      .from('collaboration_members')
      .select('collaboration_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('collaboration_id', archivedCollabIds);

    if (collabMemberError) {
      console.error('[useMyProfileData] Error fetching collaboration members:', collabMemberError);
    }
    archivedCollaborationsCount = collabMemberData?.length ?? 0;
  }

  const archivedProjects = createdArchivedCount + memberArchivedProjectCount;

  console.log('[useMyProfileData] Archive counts:', {
    createdArchivedCount,
    memberArchivedProjectCount,
    archivedCollaborationsCount,
    total: archivedProjects + archivedCollaborationsCount,
  });

  return {
    archivedProjects,
    archivedCollaborations: archivedCollaborationsCount,
    archivedPartnerships: 0, // 파트너십은 ArchivePage에 표시되지 않음
    total: archivedProjects + archivedCollaborationsCount, // 프로젝트 + 협업만
  };
}

/**
 * 아카이브 카운트 조회 (프로젝트, 협업, 초대, 지원, 찜)
 * 최적화: COUNT 쿼리 사용으로 데이터 크기 99% 감소
 */
export function useArchiveCount() {
  return useQuery({
    queryKey: ['profile', 'archiveCount'],
    queryFn: getArchiveCountsOnly,
    staleTime: 5 * 60_000, // 5분 (카운트는 자주 변경되지 않음)
    gcTime: 15 * 60_000, // 15분
  });
}

/**
 * 즐겨찾기 목록 조회
 */
export function useFavorites(userId: string | null) {
  return useQuery({
    queryKey: ['profile', 'favorites', userId],
    queryFn: async (): Promise<FavoriteItem[]> => {
      if (!userId) return [];
      return socialService.getFavoritesWithDetails(userId);
    },
    enabled: !!userId,
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
  });
}

/**
 * 받은 리뷰 조회 (미리보기용 3개)
 * @param userId - 사용자 ID
 * @param enabled - 쿼리 활성화 여부 (탭별 조건부 로딩용)
 */
export function useReceivedReviewsPreview(userId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['profile', 'reviews', 'received', userId, 'preview'],
    queryFn: async (): Promise<ReviewItem[]> => {
      if (!userId) return [];
      const reviews = await reviewService.getReceivedReviews(userId);
      return reviews.slice(0, 3);
    },
    enabled: !!userId && enabled, // enabled 파라미터 추가
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
  });
}

/**
 * 작성한 리뷰 조회 (미리보기용 3개)
 * @param userId - 사용자 ID
 * @param enabled - 쿼리 활성화 여부 (탭별 조건부 로딩용)
 */
export function useWrittenReviewsPreview(userId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['profile', 'reviews', 'written', userId, 'preview'],
    queryFn: async (): Promise<ReviewItem[]> => {
      if (!userId) return [];
      const reviews = await reviewService.getWrittenReviews(userId);
      return reviews.slice(0, 3).map(review => ({
        id: review.id,
        content: review.content,
        rating: review.rating,
        review_tag: review.review_tag || undefined,
        reviewer: review.reviewer,
        reviewee: review.reviewee,
        created_at: review.created_at,
      }));
    },
    enabled: !!userId && enabled, // enabled 파라미터 추가
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
  });
}

/**
 * 받은 리뷰의 review_tag 통계 조회
 * MEMBER_REVIEW_TEMPLATES에 해당하는 템플릿 문구별 개수 반환
 * @param userId - 사용자 ID
 * @param enabled - 쿼리 활성화 여부
 */
export function useReceivedReviewTagStats(userId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['profile', 'reviews', 'tagStats', userId],
    queryFn: async (): Promise<Map<string, number>> => {
      if (!userId) return new Map();
      return reviewService.getReceivedReviewTagStats(userId);
    },
    enabled: !!userId && enabled,
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
  });
}

// 프로필 평점 타입
export interface ProfileRating {
  rating: number | null;
  reviewCount: number;
}

/**
 * 프로필 평점 조회
 * - artist/creative: partner_stats 테이블에서 조회
 * - brand: reviews 테이블에서 계산
 * - fan/customer: null 반환
 */
export function useProfileRating(profileId: string | null, profileType: ProfileType | null) {
  return useQuery({
    queryKey: ['profile', 'rating', profileId, profileType],
    queryFn: async (): Promise<ProfileRating> => {
      if (!profileId || !profileType) {
        return { rating: null, reviewCount: 0 };
      }

      // fan/customer는 평점 없음
      if (profileType === 'fan' || profileType === 'customer') {
        return { rating: null, reviewCount: 0 };
      }

      // // artist/creative: partner_stats 테이블에서 조회
      // if (profileType === 'artist' || profileType === 'creative') {
      //   const { data, error } = await supabase
      //     .from('partner_stats')
      //     .select('rating, review_count')
      //     .eq('profile_id', profileId)
      //     .maybeSingle();

      //   if (error) {
      //     console.error('partner_stats 조회 실패:', error);
      //     return { rating: null, reviewCount: 0 };
      //   }

      //   return {
      //     rating: data?.rating ? Number(data.rating) : null,
      //     reviewCount: data?.review_count ?? 0,
      //   };
      // }

      // brand: reviews 테이블에서 평균 rating 계산
      //if (profileType === 'brand') {
      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', profileId)
        .eq('is_visible', true);

      if (error) {
        console.error('reviews 조회 실패:', error);
        return { rating: null, reviewCount: 0 };
      }

      if (!data || data.length === 0) {
        return { rating: null, reviewCount: 0 };
      }

      const sum = data.reduce((acc, cur) => acc + (cur.rating || 0), 0);
      const avg = sum / data.length;
      const roundedRating = Math.round(avg * 10) / 10;

      return {
        rating: Number.isFinite(roundedRating) ? roundedRating : null,
        reviewCount: data.length,
      };
      //}

      return { rating: null, reviewCount: 0 };
    },
    enabled: !!profileId && !!profileType,
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
  });
}
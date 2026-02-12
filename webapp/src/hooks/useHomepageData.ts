/**
 * useHomepageData Hook
 *
 * Home.tsx의 데이터 로딩을 TanStack Query로 래핑하여 캐싱 지원
 *
 * 최적화 효과:
 * - Before: 매 방문시 6개 API 호출 (~2초 로딩)
 * - After: 캐시된 데이터 즉시 표시 + 백그라운드 리프레시 (~0.1초)
 *
 * 캐싱 전략:
 * - staleTime: 5분 (5분간 fresh 상태 유지, API 재호출 없음)
 * - gcTime: 30분 (30분간 캐시 보관)
 */

import { useQuery } from '@tanstack/react-query';
import { homepageService, type SliderImage, type NewBrand } from '../services/homepageService';
import { communityService } from '../services/communityService';

export interface HomepageData {
  sliderItems: SliderImage[];
  trendingProjects: Array<{ id: string; title: string; tag: string; color: string; image_url?: string | null }>;
  recommendedProfiles: Array<{ id: string; name: string; job: string; color: string; image_url?: string | null }>;
  newBrandItems: NewBrand[];
  magazineItems: Array<{ id: string; title: string; sub_title: string; description: string | null; thumbnail_url?: string | null; image_url: string[] }>;
}

/**
 * 홈페이지 데이터를 가져오고 서명 URL 처리를 수행하는 함수
 */
async function fetchHomepageData(includePersonalized: boolean): Promise<HomepageData> {
  // 1. 홈 “상단 노출”에 필요한 데이터만 먼저 가져온다.
  // 커뮤니티는 별도 쿼리로 분리하여, 슬라이더 이미지 요청이 늦게 생성되는 문제를 줄인다.
  const homepageResult = await homepageService.getAllHomepageData(includePersonalized);

  const {
    sliderImages,
    trendingProjects: trending,
    recommendedProfiles: recommended,
    newBrands,
    magazines,
  } = homepageResult;

  // 2. 이미지 URL은 그대로 전달
  // Home.tsx에서 화면 크기 기반으로 render/image 변환(getThumbnailUrl)을 적용하여
  // URL을 안정적으로 유지(토큰 변동 제거)하고 캐싱 효율을 높인다.
  const sliderData = sliderImages ?? [];
  const magazineData = magazines ?? [];

  return {
    sliderItems: sliderData.map((item) => ({
      id: item.id,
      image_url: item.image_url || null,
      video_url: item.video_url || null,
      media_type: item.media_type || 'image',
      link_url: item.link_url,
      background_color: item.background_color,
      display_order: item.display_order,
    })),
    trendingProjects: trending ?? [],
    recommendedProfiles: recommended ?? [],
    newBrandItems: newBrands ?? [],
    magazineItems: magazineData,
  };
}

/**
 * 홈페이지 데이터 캐싱 훅
 *
 * @param enabled - 쿼리 활성화 여부 (authLoading이 false일 때 true)
 */
export function useHomepageData(enabled: boolean, includePersonalized: boolean) {
  return useQuery({
    queryKey: ['homepage', 'all', includePersonalized],
    queryFn: () => fetchHomepageData(includePersonalized),
    enabled,
    staleTime: 5 * 60_000, // 5분간 fresh 상태 유지
    gcTime: 30 * 60_000, // 30분간 캐시 보관
  });
}

/**
 * 커뮤니티 섹션 데이터 (홈 하단) - 별도 캐싱
 */
export function useHomepageCommunityItems(enabled: boolean) {
  return useQuery({
    queryKey: ['homepage', 'community', 'all'],
    queryFn: () => communityService.getCommunityItems({ itemType: 'all', limit: 10 }),
    enabled,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}

/**
 * 카테고리별 프로젝트 캐싱 훅
 */
export function useCategoryProjects(category: string) {
  return useQuery({
    queryKey: ['homepage', 'category', category],
    queryFn: () => homepageService.getCategoryProjects(category),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}

/**
 * 추천 프로필 추가 로드 (무한 스크롤용)
 */
export function useRecommendedProfiles(offset: number, limit: number, enabled: boolean) {
  return useQuery({
    queryKey: ['homepage', 'recommended', offset, limit],
    queryFn: () => homepageService.getRecommendedProfiles(offset, limit),
    enabled,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}

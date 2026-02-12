import { useState, useRef, useEffect, useCallback, useMemo, type RefObject } from 'react';
import { homepageService } from '../services/homepageService';
import { RECOMMENDED_PROFILE_CONFIG } from '../constants/homeConstants';

export interface RecommendedProfile {
  id: string;
  name: string;
  job: string;
  color: string;
  image_url?: string | null;
}

interface UseRecommendedProfilesOptions {
  /** 초기 추천 프로필 목록 (homepageData에서 전달) */
  initialProfiles: RecommendedProfile[];
  /** 표시 이름 계산용 데이터 */
  displayNameData: {
    nonFanProfile?: {
      type: 'brand' | 'artist' | 'creative';
      record: {
        brand_name?: string;
        artist_name?: string;
        nickname?: string;
      };
    } | null;
    fanNickname?: string | null;
    sessionUserName?: string | null;
  };
}

interface UseRecommendedProfilesReturn {
  /** 추천 프로필 목록 */
  profiles: RecommendedProfile[];
  /** 스크롤 컨테이너 ref */
  scrollRef: RefObject<HTMLDivElement | null>;
  /** 현재 중앙에 위치한 프로필 인덱스 */
  centerIndex: number;
  /** 스크롤 핸들러 */
  handleScroll: () => void;
  /** 더 불러올 데이터가 있는지 여부 */
  hasMore: boolean;
  /** 추가 로딩 중 여부 */
  isLoadingMore: boolean;
  /** 사용자 표시 이름 */
  displayName: string;
}

/**
 * 홈페이지 추천 프로필 섹션 로직을 캡슐화하는 훅
 *
 * 기능:
 * - 무한 스크롤 로딩
 * - 중앙 프로필 인덱스 추적
 * - 초기 스크롤 위치 설정
 * - 사용자 표시 이름 계산
 */
export function useRecommendedProfiles({
  initialProfiles,
  displayNameData,
}: UseRecommendedProfilesOptions): UseRecommendedProfilesReturn {
  const [profiles, setProfiles] = useState<RecommendedProfile[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasInitializedRef = useRef(false);
  const [centerIndex, setCenterIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 초기 프로필 데이터 동기화
  useEffect(() => {
    if (initialProfiles && initialProfiles.length > 0) {
      setProfiles(initialProfiles);
    }
  }, [initialProfiles]);

  /**
   * 추가 프로필 로드
   */
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextOffset = profiles.length;
      const limit = RECOMMENDED_PROFILE_CONFIG.LOAD_LIMIT;
      const remaining = RECOMMENDED_PROFILE_CONFIG.MAX_COUNT - nextOffset;
      const fetchLimit = Math.min(limit, remaining);

      if (fetchLimit <= 0) {
        setHasMore(false);
        setIsLoadingMore(false);
        return;
      }

      const moreProfiles = await homepageService.getRecommendedProfiles(
        nextOffset,
        fetchLimit
      );

      if (moreProfiles.length === 0) {
        setHasMore(false);
      } else {
        setProfiles((prev) => [...prev, ...moreProfiles]);
        if (
          moreProfiles.length < fetchLimit ||
          nextOffset + moreProfiles.length >= RECOMMENDED_PROFILE_CONFIG.MAX_COUNT
        ) {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('추천 파트너 더 불러오기 실패:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, profiles.length]);

  /**
   * 스크롤 핸들러 - 중앙 인덱스 업데이트 및 무한 스크롤 트리거
   */
  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;

    const { scrollLeft, clientWidth, scrollWidth } = container;
    const newCenterIndex = Math.round(scrollLeft / RECOMMENDED_PROFILE_CONFIG.ITEM_STEP);

    if (newCenterIndex !== centerIndex && newCenterIndex >= 0 && newCenterIndex < profiles.length) {
      setCenterIndex(newCenterIndex);
    }

    // 무한 스크롤 트리거
    if (
      scrollLeft + clientWidth >= scrollWidth - 50 &&
      profiles.length < RECOMMENDED_PROFILE_CONFIG.MAX_COUNT &&
      hasMore &&
      !isLoadingMore
    ) {
      loadMore();
    }
  }, [centerIndex, profiles.length, hasMore, isLoadingMore, loadMore]);

  // 초기 스크롤 위치 설정 (두 번째 아이템이 중앙에 오도록)
  useEffect(() => {
    if (hasInitializedRef.current) return;
    if (!scrollRef.current) return;
    if (profiles.length < 2) return;

    hasInitializedRef.current = true;
    setCenterIndex(1);

    const container = scrollRef.current;
    const prevBehavior = container.style.scrollBehavior;
    container.style.scrollBehavior = 'auto';
    container.scrollTo({ left: RECOMMENDED_PROFILE_CONFIG.ITEM_STEP, behavior: 'auto' });

    requestAnimationFrame(() => {
      container.style.scrollBehavior = prevBehavior || 'smooth';
    });
  }, [profiles]);

  /**
   * 사용자 표시 이름 계산
   */
  const displayName = useMemo(() => {
    const { nonFanProfile, fanNickname, sessionUserName } = displayNameData;

    if (nonFanProfile) {
      if (nonFanProfile.type === 'brand') {
        return nonFanProfile.record.brand_name || 'Lyt';
      }
      if (nonFanProfile.type === 'artist') {
        return nonFanProfile.record.artist_name || 'Lyt';
      }
      if (nonFanProfile.type === 'creative') {
        return nonFanProfile.record.nickname || 'Lyt';
      }
    }

    if (fanNickname) return fanNickname;
    return sessionUserName || 'Lyt';
  }, [displayNameData]);

  return {
    profiles,
    scrollRef,
    centerIndex,
    handleScroll,
    hasMore,
    isLoadingMore,
    displayName,
  };
}

export default useRecommendedProfiles;

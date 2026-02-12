import { useState, useEffect, useCallback } from 'react';
import {
  useServerNotifications,
  type ServerNotificationRow,
} from './useServerNotifications';
import { getTodayString, HOME_STORAGE_KEYS } from '../constants/homeConstants';

type ProfileType = 'brand' | 'artist' | 'creative' | 'fan' | 'customer' | null;

interface UseHomeNotificationsOptions {
  /** 현재 프로필 타입 */
  profileType: ProfileType;
}

interface UseHomeNotificationsReturn {
  // 공지 관련
  /** 표시할 공지 목록 */
  noticeSlides: ServerNotificationRow[];
  /** 공지 닫기 핸들러 */
  handleGlobalNoticeClose: (id?: string) => void;
  /** 공지 오늘 안보기 핸들러 */
  handleGlobalNoticeHideToday: (id: string) => void;
  // 광고 관련
  /** 광고 표시 여부 */
  showAds: boolean;
  /** 활성 광고 목록 */
  activeAds: ServerNotificationRow[];
  /** 광고 닫기 핸들러 */
  handleAdsClose: () => void;
  /** 광고 오늘 안보기 핸들러 */
  handleAdsHideToday: () => void;
}

/**
 * 홈페이지 서버 알림 및 광고 관리 훅
 *
 * 기능:
 * - 프로필 타입에 따른 audience 필터링
 * - 공지/광고 표시 로직
 * - 닫기/오늘 안보기 기능
 * - 세션 내 dismissed 상태 관리
 */
export function useHomeNotifications({
  profileType,
}: UseHomeNotificationsOptions): UseHomeNotificationsReturn {
  // audiences 계산 - 항상 'all'을 포함하여 전체 대상 공지도 표시
  // profileType이 null(둘러보기 등)이면 'all'만 사용
  const audiences =
    profileType === 'brand'
      ? ['brand', 'all']
      : profileType === 'artist' || profileType === 'creative'
        ? ['creator', 'all']
        : ['all'];

  // 서버 알림 훅 - 광고는 프로필 로딩 여부와 관계없이 조회
  // (둘러보기 사용자도 광고를 볼 수 있어야 함)
  const { activeNotices, activeAds, hideSinceToday, hideOnce } =
    useServerNotifications({ audiences, enabled: true });

  // 로컬 상태
  const [noticeSlides, setNoticeSlides] = useState<ServerNotificationRow[]>([]);
  const [dismissedNoticeIds, setDismissedNoticeIds] = useState<Set<string>>(
    new Set()
  );
  const [showAds, setShowAds] = useState(false);
  const [adsDismissedThisSession, setAdsDismissedThisSession] = useState(false);

  // 광고 표시 여부 계산
  useEffect(() => {
    const today = getTodayString();
    const hiddenDate = localStorage.getItem(HOME_STORAGE_KEYS.ADS_HIDE_TODAY_DATE);
    if (adsDismissedThisSession) {
      setShowAds(false);
      return;
    }
    if (activeAds && activeAds.length > 0 && hiddenDate !== today) {
      setShowAds(true);
    } else {
      setShowAds(false);
    }
  }, [activeAds, adsDismissedThisSession]);

  // 공지 필터링 (광고 표시 중이면 공지 숨김)
  useEffect(() => {
    if (showAds) {
      setNoticeSlides([]);
      return;
    }
    const filtered = activeNotices.filter((n) => !dismissedNoticeIds.has(n.id));
    setNoticeSlides(filtered);
  }, [activeNotices, dismissedNoticeIds, showAds]);

  // 광고 닫기
  const handleAdsClose = useCallback(() => {
    setAdsDismissedThisSession(true);
    setShowAds(false);
  }, []);

  // 광고 오늘 안보기
  const handleAdsHideToday = useCallback(() => {
    const today = getTodayString();
    localStorage.setItem(HOME_STORAGE_KEYS.ADS_HIDE_TODAY_DATE, today);
    setAdsDismissedThisSession(true);
    setShowAds(false);
  }, []);

  // 공지 닫기
  const handleGlobalNoticeClose = useCallback(
    (id?: string) => {
      if (id) {
        hideOnce(id);
        setDismissedNoticeIds((prev) => new Set(prev).add(id));
        setNoticeSlides((prev) => prev.filter((n) => n.id !== id));
      } else {
        setDismissedNoticeIds((prev) => {
          const next = new Set(prev);
          noticeSlides.forEach((n) => next.add(n.id));
          return next;
        });
        setNoticeSlides([]);
      }
    },
    [hideOnce, noticeSlides]
  );

  // 공지 오늘 안보기
  const handleGlobalNoticeHideToday = useCallback(
    (id: string) => {
      hideSinceToday(id);
      setNoticeSlides((prev) => prev.filter((n) => n.id !== id));
      setDismissedNoticeIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    },
    [hideSinceToday]
  );

  return {
    // 공지
    noticeSlides,
    handleGlobalNoticeClose,
    handleGlobalNoticeHideToday,
    // 광고
    showAds,
    activeAds,
    handleAdsClose,
    handleAdsHideToday,
  };
}

export default useHomeNotifications;

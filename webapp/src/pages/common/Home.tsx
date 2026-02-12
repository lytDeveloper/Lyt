import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Box, Typography, Dialog } from '@mui/material';
import { LightningLoader } from '../../components/common';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { COLORS } from '../../styles/onboarding/common.styles';
import type { SliderImage } from '../../services/homepageService';
import { useProfileStore } from '../../stores/profileStore';
import { useAuth } from '../../providers/AuthContext';
import BottomNavigationBar from '../../components/navigation/BottomNavigationBar';
import NotificationModal from '../../components/common/NotificationModal';
import { useCommunityStore } from '../../stores/communityStore';
import Header, { HEADER_HEIGHT } from '../../components/common/Header';
import { useTheme } from '@mui/material/styles';
import GlobalNoticeModal from '../../components/GlobalNoticeModal';
import GlobalAdsModal from '../../components/GlobalAdsModal';
import PartnerDetailContent from '../../components/explore/PartnerDetailContent';
import { getPartnerById, type Partner } from '../../services/partnerService';
import { useHomepageData, useHomepageCommunityItems, useCategoryProjects } from '../../hooks/useHomepageData';
import {
  HOME_CATEGORY_LIST,
  HOME_CATEGORY_ICONS,
  PANEL_DRAG_CONFIG,
  normalizeLinkUrl,
} from '../../constants/homeConstants';
import {
  SectionHeader,
  RecommendedProfilesSection,
  NewBrandSection,
  MagazineSection,
  CommunitySection,
  CollaborationSection,
} from '../../components/home';
import { useHomeSlider } from '../../hooks/useHomeSlider';
import { useHomeDragPanel } from '../../hooks/useHomeDragPanel';
import { useHomeNotifications } from '../../hooks/useHomeNotifications';
import { useRecommendedProfiles } from '../../hooks/useRecommendedProfiles';
import { getThumbnailUrl } from '../../utils/signedUrl';

type ElasticConstraints = { left: number; right: number };

function useElasticScrollConstraints() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [constraints, setConstraints] = useState<ElasticConstraints>({ left: 0, right: 0 });
  // 이전 값 캐싱으로 불필요한 상태 업데이트 방지
  const prevConstraintsRef = useRef<ElasticConstraints>({ left: 0, right: 0 });
  // throttle을 위한 타이머 ref
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateConstraints = useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) {
      if (prevConstraintsRef.current.left !== 0 || prevConstraintsRef.current.right !== 0) {
        prevConstraintsRef.current = { left: 0, right: 0 };
        setConstraints({ left: 0, right: 0 });
      }
      return;
    }

    const containerWidth = container.offsetWidth;
    const contentWidth = content.scrollWidth;
    const maxOffset = Math.max(0, contentWidth - containerWidth);
    const newLeft = -maxOffset;

    // 값이 변경된 경우에만 상태 업데이트
    if (prevConstraintsRef.current.left !== newLeft) {
      prevConstraintsRef.current = { left: newLeft, right: 0 };
      setConstraints({ left: newLeft, right: 0 });
    }
  }, []);

  // throttle된 업데이트 함수
  const throttledUpdate = useCallback(() => {
    if (throttleTimerRef.current) return;
    throttleTimerRef.current = setTimeout(() => {
      updateConstraints();
      throttleTimerRef.current = null;
    }, 100); // 100ms throttle
  }, [updateConstraints]);

  useEffect(() => {
    updateConstraints();

    const ResizeObserverImpl = typeof ResizeObserver !== 'undefined' ? ResizeObserver : null;
    const resizeObserver = ResizeObserverImpl
      ? new ResizeObserverImpl(() => throttledUpdate())
      : null;

    if (resizeObserver) {
      if (containerRef.current) resizeObserver.observe(containerRef.current);
      if (contentRef.current) resizeObserver.observe(contentRef.current);
    }

    window.addEventListener('resize', throttledUpdate);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', throttledUpdate);
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
      }
    };
  }, [updateConstraints, throttledUpdate]);

  return { containerRef, contentRef, constraints, updateConstraints };
}

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // 패널 상단 라운드로 생기는 슬라이더 하단 모서리 여백을 없애기 위해 약간 겹치게 한다.
  // (패널이 항상 이미지 위에 있어야 하므로 overlap은 패널이 이미지 위로 올라오도록 적용)
  const PANEL_OVERLAP_PX = 40;
  const [containerWidth, setContainerWidth] = useState(393);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const { session } = useAuth();
  const isLoggedIn = Boolean(session?.user?.id);
  const theme = useTheme();
  const profileType = useProfileStore((s) => s.type);
  const contentPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  //const navHeight = BOTTOM_NAV_HEIGHT;
  // 3:4 비율을 기본으로 하되, 화면 높이의 60%를 넘지 않도록 제한 (폴더블/태블릿 대응)
  const imageSliderHeight = Math.min(containerWidth * (4 / 3), viewportHeight * 0.6);

  // 홈 컨텐츠는 공개 조회가 가능하므로, auth 로딩과 무관하게 먼저 시작해서 첫 화면 체감을 개선
  const { data: homepageData, isLoading: isHomepageLoading } = useHomepageData(true, isLoggedIn);
  const { data: homepageCommunityItems } = useHomepageCommunityItems(true);

  const sliderItems = homepageData?.sliderItems ?? [];
  const trendingProjects = homepageData?.trendingProjects ?? [];
  const newBrandItems = homepageData?.newBrandItems ?? [];
  const magazineItems = homepageData?.magazineItems ?? [];
  const communityItems = homepageCommunityItems ?? [];

  const [selectedCategory, setSelectedCategory] = useState('음악');
  const { data: categoryProjects = [], isLoading: isCategoryLoading } = useCategoryProjects(selectedCategory);

  // 파트너 상세 모달 상태
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [partnerDetailData, setPartnerDetailData] = useState<Partner | null>(null);
  const [isPartnerLoading, setIsPartnerLoading] = useState(false);

  // 슬라이더 고해상도 이미지 로드 완료 상태 (id 기준으로 공유: clone 슬라이드도 동일 id 사용)
  const [sliderHiResLoaded, setSliderHiResLoaded] = useState<Record<string, boolean>>({});

  const sliderDims = useMemo(() => {
    const w = Math.max(1, Math.round(containerWidth));
    const h = Math.max(1, Math.round(imageSliderHeight));
    return {
      displayW: w,
      displayH: h,
      // 2x 레티나
      hiW: Math.max(1, w * 2),
      hiH: Math.max(1, h * 2),
      // 빠른 프리뷰 (대략 1/8 크기)
      loW: Math.max(80, Math.round(w / 6)),
      loH: Math.max(80, Math.round(h / 6)),
    };
  }, [containerWidth, imageSliderHeight]);

  // 슬라이더 훅
  const { sliderRef, activeSlideIndex } = useHomeSlider({
    items: sliderItems,
    containerWidth,
  });

  // 슬라이더 이미지 프리로드 (현재/인접 슬라이드)
  useEffect(() => {
    if (!sliderItems.length) return;
    const current = activeSlideIndex;
    const idxs = new Set<number>([
      current,
      (current + 1) % sliderItems.length,
    ]);

    idxs.forEach((i) => {
      const item = sliderItems[i];
      if (!item?.image_url) return;
      const hiUrl = getThumbnailUrl(item.image_url, sliderDims.hiW, sliderDims.hiH, 75) ?? item.image_url;
      const img = new Image();
      img.decoding = 'async';
      img.src = hiUrl;
      img.onload = () => {
        setSliderHiResLoaded((prev) => (prev[item.id] ? prev : { ...prev, [item.id]: true }));
      };
    });
  }, [sliderItems, activeSlideIndex, sliderDims.hiW, sliderDims.hiH]);

  // 브라우저 우선순위 상향: 현재/다음 슬라이드를 <link rel="preload" as="image">로 먼저 요청
  useEffect(() => {
    if (!sliderItems.length) return;

    const head = document.head;
    if (!head) return;

    const current = activeSlideIndex;
    const targets = [
      { item: sliderItems[current], priority: 'high' as const },
      { item: sliderItems[(current + 1) % sliderItems.length], priority: 'low' as const },
    ];

    // 기존에 넣은 preload 제거
    const existing = head.querySelectorAll('link[data-home-slider-preload="true"]');
    existing.forEach((el) => el.parentNode?.removeChild(el));

    targets.forEach(({ item, priority }) => {
      if (!item?.image_url) return;
      const hrefHi = getThumbnailUrl(item.image_url, sliderDims.hiW, sliderDims.hiH, 75) ?? item.image_url;

      // hi-res preload
      const linkHi = document.createElement('link');
      linkHi.rel = 'preload';
      linkHi.as = 'image';
      linkHi.href = hrefHi;
      linkHi.setAttribute('data-home-slider-preload', 'true');
      linkHi.setAttribute('data-home-slider-preload-kind', 'hi');
      linkHi.setAttribute('fetchpriority', priority);
      linkHi.crossOrigin = 'anonymous';
      head.appendChild(linkHi);
    });

    return () => {
      const els = head.querySelectorAll('link[data-home-slider-preload="true"]');
      els.forEach((el) => el.parentNode?.removeChild(el));
    };
  }, [sliderItems, activeSlideIndex, sliderDims.hiW, sliderDims.hiH]);

  const loading = isHomepageLoading;
  const isPrioritySlide = useCallback((index: number) => {
    if (!sliderItems.length) return false;
    const linearDiff = Math.abs(index - activeSlideIndex);
    const circularDiff = Math.min(linearDiff, sliderItems.length - linearDiff);
    return circularDiff <= 1;
  }, [activeSlideIndex, sliderItems.length]);
  const renderSliderCard = useCallback((
    item: SliderImage,
    key: string,
    options?: { shouldLoadVideo?: boolean; posterUrl?: string | null; prioritizeImage?: boolean }
  ) => {
    const shouldLoadVideo = options?.shouldLoadVideo ?? true;
    const prioritizeImage = options?.prioritizeImage ?? false;
    const rawPoster = options?.posterUrl || item.image_url || undefined;
    const videoSrc = shouldLoadVideo ? item.video_url || undefined : undefined;
    const linkHref = normalizeLinkUrl(item.link_url);
    const isVideo = item.media_type === 'video' && item.video_url;

    const loImageUrl = item.image_url
      ? (getThumbnailUrl(item.image_url, sliderDims.loW, sliderDims.loH, 35) ?? item.image_url)
      : rawPoster
        ? (getThumbnailUrl(rawPoster, sliderDims.loW, sliderDims.loH, 35) ?? rawPoster)
        : undefined;
    const hiImageUrl = item.image_url
      ? (getThumbnailUrl(item.image_url, sliderDims.hiW, sliderDims.hiH, 75) ?? item.image_url)
      : undefined;
    const hiLoaded = !!sliderHiResLoaded[item.id];
    const posterUrl = rawPoster
      ? (getThumbnailUrl(rawPoster, sliderDims.loW, sliderDims.loH, 35) ?? rawPoster)
      : undefined;

    return (
      <Box
        key={key}
        component={linkHref ? 'a' : 'div'}
        href={linkHref || undefined}
        sx={{
          minWidth: '100%',
          width: '100%',
          height: `${imageSliderHeight}px`,
          backgroundColor: item.background_color || '#f0f0f0',
          // 배경이미지(background-image)는 브라우저가 우선순위를 낮게 잡기 쉬워(DevTools priority: i),
          // 프리뷰도 <img>로 올려 fetchpriority로 우선순위를 끌어올린다.
          scrollSnapAlign: 'start',
          scrollSnapStop: 'always',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          textDecoration: 'none',
          position: 'relative',
          overflow: 'hidden',
          touchAction: 'pan-x',
        }}
      >
        {loImageUrl && (
          <Box
            component="img"
            src={loImageUrl}
            alt=""
            loading={prioritizeImage ? 'eager' : 'lazy'}
            decoding="async"
            {...({ fetchpriority: prioritizeImage ? 'high' : 'low' } as any)}
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              // 저해상도 티를 줄이기 위한 약한 블러 + 살짝 확대
              filter: hiLoaded ? 'none' : 'blur(10px)',
              transform: hiLoaded ? 'scale(1)' : 'scale(1.05)',
              transition: 'filter 220ms ease-out, transform 220ms ease-out',
              opacity: 1,
            }}
          />
        )}
        {!isVideo && hiImageUrl && (
          <Box
            component="img"
            src={hiImageUrl}
            alt=""
            loading={prioritizeImage ? 'eager' : 'lazy'}
            decoding="async"
            {...({ fetchpriority: prioritizeImage ? 'high' : 'low' } as any)}
            onLoad={() => {
              setSliderHiResLoaded((prev) => ({ ...prev, [item.id]: true }));
            }}
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              opacity: hiLoaded ? 1 : 0,
              transition: 'opacity 220ms ease-out',
            }}
          />
        )}
        {isVideo && (
          <Box
            component="video"
            src={videoSrc}
            autoPlay={shouldLoadVideo}
            muted
            loop
            playsInline
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback"
            preload={shouldLoadVideo ? 'metadata' : 'none'}
            poster={posterUrl}
            crossOrigin="anonymous"
            onError={(e) => {
              const target = e.currentTarget;
              console.error('[Video] 로드 실패:', {
                src: videoSrc,
                error: target.error,
                networkState: target.networkState,
                readyState: target.readyState,
              });
            }}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              pointerEvents: 'none',
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          />
        )}
      </Box>
    );
  }, [imageSliderHeight, sliderDims.hiH, sliderDims.hiW, sliderDims.loH, sliderDims.loW, sliderHiResLoaded]);

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const { fanProfile, nonFanProfile } = useProfileStore();
  const { setActiveTab: setCommunityTab } = useCommunityStore();

  // 알림/광고 훅
  const {
    noticeSlides,
    handleGlobalNoticeClose,
    handleGlobalNoticeHideToday,
    showAds,
    activeAds,
    handleAdsClose,
    handleAdsHideToday,
  } = useHomeNotifications({ profileType });

  // 추천 프로필 훅
  const {
    profiles: recommendedProfiles,
    scrollRef: recommendedScrollRef,
    centerIndex: centerProfileIndex,
    handleScroll: handleRecommendedScroll,
    displayName: recommendedDisplayName,
  } = useRecommendedProfiles({
    initialProfiles: homepageData?.recommendedProfiles ?? [],
    displayNameData: {
      nonFanProfile: nonFanProfile as {
        type: 'brand' | 'artist' | 'creative';
        record: { brand_name?: string; artist_name?: string; nickname?: string };
      } | null,
      fanNickname: fanProfile?.nickname,
      sessionUserName:
        (session?.user?.user_metadata?.full_name as string | undefined) ||
        (session?.user?.user_metadata?.name as string | undefined),
    },
  });

  // 추천 프로필에서 본인 제외
  const filteredRecommendedProfiles = useMemo(() => {
    const currentUserId = session?.user?.id;
    if (!currentUserId) return recommendedProfiles;
    return recommendedProfiles.filter((profile) => profile.id !== currentUserId);
  }, [recommendedProfiles, session?.user?.id]);

  const loginRedirectPath = `${location.pathname}${location.search}`;
  const handleRequireLogin = useCallback(() => {
    navigate(`/login?redirectTo=${encodeURIComponent(loginRedirectPath)}`);
  }, [navigate, loginRedirectPath]);

  const handleProjectPreviewClick = useCallback((projectId: string) => {
    if (!isLoggedIn) {
      handleRequireLogin();
      return;
    }

    if (profileType === 'fan') {
      navigate(`/lounge/community/${projectId}?type=project`);
      return;
    }

    navigate(`/explore/project/${projectId}`);
  }, [isLoggedIn, handleRequireLogin, profileType, navigate]);

  const handleNotificationClose = useCallback(() => {
    setIsNotificationOpen(false);
  }, []);

  // 파트너 클릭 핸들러 - 파트너 상세 모달 열기
  const handlePartnerClick = useCallback(async (partnerId: string) => {
    setIsPartnerModalOpen(true);
    setIsPartnerLoading(true);
    setPartnerDetailData(null);

    try {
      const partnerData = await getPartnerById(partnerId);
      setPartnerDetailData(partnerData);
    } catch (error) {
      console.error('[Home] Failed to fetch partner detail:', error);
    } finally {
      setIsPartnerLoading(false);
    }
  }, []);

  // 파트너 모달 닫기 핸들러
  const handlePartnerModalClose = useCallback(() => {
    setIsPartnerModalOpen(false);
    setPartnerDetailData(null);
  }, []);

  const trendingScroll = useElasticScrollConstraints();
  const categoryScroll = useElasticScrollConstraints();
  const brandScroll = useElasticScrollConstraints();
  const magazineScroll = useElasticScrollConstraints();
  const spotlightScroll = useElasticScrollConstraints();
  const collaborationScroll = useElasticScrollConstraints();

  useEffect(() => {
    const updateDimensions = () => {
      const width = Math.min(window.innerWidth, 768);
      setContainerWidth(width);
      setViewportHeight(window.innerHeight);
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // 패널 드래그 훅
  // 패널이 슬라이더 위로 PANEL_OVERLAP_PX 만큼 겹치므로, expandedY 계산도 동일하게 보정
  const panelBaseOffset = Math.max(0, imageSliderHeight - PANEL_OVERLAP_PX);
  const expandedY = -(panelBaseOffset - HEADER_HEIGHT - PANEL_DRAG_CONFIG.DOCK_GAP);
  const {
    panelState,
    panelY,
    dragControls,
    scrollableContentRef,
    dragListener,
    handleDragEnd,
    markHandleBarDrag,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useHomeDragPanel({ expandedY });

  return (
    <Box
      data-home-loaded="true"
      sx={{
        height: '100vh',
        backgroundColor: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        maxWidth: '768px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '768px',
          backgroundColor: 'transparent',
          zIndex: 1000,
        }}
      >
        <Header showSearchInput />
      </Box>

      <Box
        ref={scrollContainerRef}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          // 슬라이더 영역만 인터랙션을 차지하도록 높이를 슬라이더 높이로 제한
          height: `${imageSliderHeight}px`,
          overflow: 'hidden',
          // 패널은 모든 순간 이미지 위에 있어야 하므로, 슬라이더는 항상 패널보다 낮은 zIndex 유지
          zIndex: 200,
        }}
      >
        <Box
          ref={sliderRef}
          sx={{
            width: '100%',
            height: `${imageSliderHeight}px`,
            overflowX: 'auto',
            overflowY: 'hidden',
            display: 'flex',
            gap: 0,
            '&::-webkit-scrollbar': {
              display: 'none',
            },
            scrollSnapType: 'x mandatory',
            scrollBehavior: 'smooth',
            position: 'absolute',
            top: `${HEADER_HEIGHT}px`,
            zIndex: 100,
            touchAction: 'pan-x',
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorX: 'contain',
          }}
        >
          {loading ? (
            <Box
              sx={{
                minWidth: '100%',
                height: `${imageSliderHeight}px`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f5f5f5',
                gap: 2,
              }}
            >
              <LightningLoader size={40} />
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 14,
                  color: COLORS.TEXT_SECONDARY,
                }}
              >
                콘텐츠를 불러오는 중...
              </Typography>
            </Box>
          ) : sliderItems.length > 0 ? (
            <>
              {renderSliderCard(
                sliderItems[sliderItems.length - 1],
                `clone-last-${sliderItems[sliderItems.length - 1].id}`,
                {
                  shouldLoadVideo: activeSlideIndex === sliderItems.length - 1,
                  prioritizeImage: isPrioritySlide(sliderItems.length - 1),
                }
              )}
              {sliderItems.map((item, index) =>
                renderSliderCard(item, item.id, {
                  shouldLoadVideo: activeSlideIndex === index,
                  prioritizeImage: isPrioritySlide(index),
                })
              )}
              {renderSliderCard(sliderItems[0], `clone-first-${sliderItems[0].id}`, {
                shouldLoadVideo: activeSlideIndex === 0,
                prioritizeImage: isPrioritySlide(0),
              })}
            </>
          ) : (
            <Box
              sx={{
                minWidth: '100%',
                height: `${imageSliderHeight}px`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f5f5f5',
                gap: 1,
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 16,
                  fontWeight: 600,
                  color: COLORS.TEXT_SECONDARY,
                }}
              >
                콘텐츠가 없어요.
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 12,
                  color: COLORS.TEXT_SECONDARY,
                  opacity: 0.7,
                }}
              >
                곧 새로운 콘텐츠가 추가될 예정이에요.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      <motion.div
        ref={contentPanelRef}
        initial={{ y: 0 }}
        style={{
          y: panelY,
          // 패널은 세로 드래그가 핵심이므로 pan-y가 더 적절 (슬라이더 영역 터치 충돌도 줄임)
          touchAction: 'pan-y',
          zIndex: 500,
          // 패널 래퍼가 화면 상단(슬라이더 영역)까지 덮으면 슬라이더 스와이프가 막힐 수 있어,
          // 래퍼 자체를 슬라이더 아래(겹침 시작 지점)부터 배치한다.
          position: 'absolute',
          top: `${panelBaseOffset}px`,
          left: 0,
          right: 0,
          // y(=panelY)로 위로 올릴 때 하단이 비는 현상을 방지하기 위해,
          // 래퍼 높이를 expandedY 만큼 아래로 더 확보한다(초기에는 아래로 넘치고, expand 시 정확히 하단 맞춤).
          bottom: expandedY,
          willChange: 'transform',
          // NOTE: layout contain은 margin collapsing을 막아 슬라이더 영역을 패널 레이어가 덮을 수 있어
          // 스와이프/클릭이 안 되는 문제가 발생할 수 있음. paint containment만 유지.
          contain: 'paint',
        }}
        drag="y"
        dragDirectionLock
        dragControls={dragControls}
        dragListener={dragListener}
        dragConstraints={{ top: expandedY, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        data-no-ptr="true"
      >
        <Box
          sx={{
            backgroundColor: theme.palette.background.default,
            borderTopLeftRadius: '40px',
            borderTopRightRadius: '40px',
            // 패널이 슬라이더 위로 살짝 겹치도록 해서 라운드 모서리 아래 여백(슬라이더 좌우 하단 빈공간) 제거
            mt: 0,
            position: 'relative',
            zIndex: 200,
            // motion.div 래퍼가 top: panelBaseOffset ~ bottom: 0 영역을 차지하므로,
            // 내부 컨테이너는 그 영역을 그대로 채워야 하단이 잘리지 않는다.
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0px -4px 20px rgba(0,0,0,0.05)',
            contain: 'layout paint',
          }}
        >
          {/* 핸들 바 영역 - 항상 드래그 가능 */}
          <Box
            data-handlebar="true"
            sx={{
              width: '100%',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              cursor: 'grab',
              touchAction: 'none',
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              markHandleBarDrag();
              dragControls.start(e);
            }}
          >
            <Box
              aria-hidden
              sx={{
                width: '40px',
                height: '4px',
                backgroundColor: '#E0E0E0',
                borderRadius: '2px',
              }}
            />
          </Box>

          <Box
            ref={scrollableContentRef}
            data-scroll-container="true"
            sx={{
              flex: 1,
              overflowY: panelState === 'expanded' ? 'auto' : 'hidden',
              overflowX: 'hidden',
              overscrollBehaviorY: 'none',
              WebkitOverflowScrolling: panelState === 'expanded' ? 'touch' : 'auto',
              px: { xs: 3, sm: 4, md: 5 },
              pb: 6,
              // collapsed 상태에서는 터치 스크롤 차단 (expand 애니메이션 시작 시 상태 변경으로 빠르게 활성화)
              touchAction: panelState === 'expanded' ? 'auto' : 'none',
              pointerEvents: 'auto',
              '&::-webkit-scrollbar': {
                display: 'none',
              },
            }}
          >
            {!isLoggedIn ? (
              <Box
                sx={{
                  mb: 3,
                  p: 2,
                  borderRadius: '16px',
                  backgroundColor: '#F6F7FB',
                  border: '1px solid #E6E8EF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 14,
                      fontWeight: 700,
                      color: COLORS.TEXT_PRIMARY,
                    }}
                  >
                    로그인하면 더 많은 콘텐츠를 볼 수 있어요
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 12,
                      color: COLORS.TEXT_SECONDARY,
                    }}
                  >
                    맞춤 추천과 더 많은 정보를 확인해보세요.
                  </Typography>
                </Box>
                <Box
                  component="button"
                  type="button"
                  onClick={handleRequireLogin}
                  sx={{
                    border: 'none',
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    borderRadius: '999px',
                    px: 2,
                    py: 1,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  로그인
                </Box>
              </Box>
            ) : null}


            {/* 급상승 프로젝트 */}
            <Box sx={{ mb: 3 }}>
              <SectionHeader title="🔥급상승 프로젝트" showArrow />

              <Box
                ref={trendingScroll.containerRef}
                sx={{
                  position: 'relative',
                  overflow: 'hidden',
                  width: '100%',
                  pb: 2,
                }}
              >
                <Box
                  ref={trendingScroll.contentRef}
                  sx={{
                    display: 'flex',
                    gap: '16px',
                    overflowX: 'auto',
                    cursor: 'grab',
                    touchAction: panelState === 'collapsed' ? 'pan-x' : 'auto', // collapsed일 때는 수직 스크롤 차단하여 패널 확장 허용, expanded일 때는 부모 스크롤 허용
                    '&::-webkit-scrollbar': { display: 'none' },
                    scrollbarWidth: 'none',
                  }}
                >
                  {trendingProjects.map((project) => (
                    <Box
                      key={project.id}
                      sx={{
                        width: '90px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        // 팬 프로필이면 CommunityDetail로, 비팬 프로필이면 ExploreProjectDetail로 이동
                        handleProjectPreviewClick(project.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleProjectPreviewClick(project.id);
                        }
                      }}
                    >
                      <Box
                        sx={{
                          width: '90px',
                          height: 120,
                          borderRadius: '12px',
                          background: project.image_url
                            ? `url(${getThumbnailUrl(project.image_url, 180, 240, 75)})`
                            : project.color,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      />
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography
                          sx={{
                            fontFamily: 'Pretendard, sans-serif',
                            fontSize: 13,
                            fontWeight: 700,
                            color: COLORS.TEXT_PRIMARY,
                            lineHeight: 1.3,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {project.title}
                        </Typography>
                        <Typography
                          sx={{
                            fontFamily: 'Pretendard, sans-serif',
                            fontSize: 11,
                            color: COLORS.TEXT_SECONDARY,
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {project.tag}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>

            {/* 카테고리 */}
            <Box sx={{ mb: 3 }}>
              <SectionHeader
                title="🔍관심있는 카테고리를 찾아보세요"
                onClick={() => navigate('/category-explore')}
              />

              <Box
                ref={categoryScroll.containerRef}
                sx={{
                  position: 'relative',
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  width: '100%',
                  pb: 2,
                  '&::-webkit-scrollbar': { display: 'none' },
                  scrollbarWidth: 'none',
                }}
              >
                <Box
                  sx={{
                    display: 'grid',
                    gridAutoFlow: 'column',
                    gridTemplateRows: 'repeat(2, auto)',
                    columnGap: '12px',
                    rowGap: '10px',
                    cursor: 'grab',
                  }}
                >
                  {HOME_CATEGORY_LIST.map((category) => {
                    const IconComponent = HOME_CATEGORY_ICONS[category];
                    const isSelected = category === selectedCategory;
                    return (
                      <Box
                        key={category}
                        role="button"
                        tabIndex={0}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 0.5,
                          px: 2,
                          py: 1.2,
                          backgroundColor: isSelected ? theme.palette.primary.main : theme.palette.bgColor.default,
                          color: isSelected ? theme.palette.primary.contrastText : theme.palette.subText.default,
                          borderRadius: '100px',
                          fontSize: 11,
                          fontFamily: 'Pretendard, sans-serif',
                          whiteSpace: 'nowrap',
                          width: '90px',
                        }}
                        onClick={() => setSelectedCategory(category)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedCategory(category);
                          }
                        }}
                      >
                        {IconComponent && (
                          <IconComponent
                            size={16}
                            color={isSelected ? theme.palette.primary.contrastText : theme.palette.icon.default}
                          />
                        )}
                        {category}
                      </Box>
                    );
                  })}
                </Box>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Box
                  sx={{
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    width: '100%',
                    pb: 1,
                    '&::-webkit-scrollbar': { display: 'none' },
                    scrollbarWidth: 'none',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1,
                      width: '26.4%',
                      minHeight: 149,
                      alignItems: 'flex-start',
                    }}
                  >
                    {isCategoryLoading
                      ? Array.from({ length: 4 }).map((_, idx) => (
                        <Box
                          key={`category-skeleton-${idx}`}
                          sx={{
                            maxWidth: 140,
                            height: 149,
                            borderRadius: '16px',
                            backgroundColor: '#f5f5f5',
                          }}
                        />
                      ))
                      : categoryProjects.length > 0
                        ? categoryProjects.map((item) => (
                          <Box
                            key={item.id}
                            onClick={() => {
                              // 팬 프로필이면 CommunityDetail로, 비팬 프로필이면 ExploreProjectDetail로 이동
                              handleProjectPreviewClick(item.id);
                            }}
                            sx={{
                              minWidth: 100,
                              maxWidth: 140,
                              height: 149,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 0.5,
                              cursor: 'pointer',
                            }}
                          >
                            <Box
                              sx={{
                                height: 103,
                                borderRadius: '16px',
                                backgroundColor: '#f5f5f5',
                                backgroundImage: item.cover_image_url
                                  ? `url(${getThumbnailUrl(item.cover_image_url, 280, 206, 75)})`
                                  : 'none',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                fontFamily: 'Pretendard, sans-serif',
                                fontSize: 12,
                                fontWeight: 700,
                                color: COLORS.TEXT_PRIMARY,
                                lineHeight: 1.3,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                minHeight: '31.2px', // 12px * 1.3 * 2줄
                              }}
                            >
                              {item.title}
                            </Typography>
                            <Typography
                              sx={{
                                fontFamily: 'Pretendard, sans-serif',
                                fontSize: 11,
                                color: COLORS.TEXT_SECONDARY,
                                lineHeight: 1.3,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                minHeight: '28.6px', // 11px * 1.3 * 2줄
                              }}
                            >
                              {item.description || '설명이 곧 업데이트됩니다.'}
                            </Typography>
                          </Box>
                        ))
                        : (
                          <Typography
                            sx={{
                              fontFamily: 'Pretendard, sans-serif',
                              fontSize: 12,
                              color: COLORS.TEXT_SECONDARY,
                              wordBreak: 'keep-all',
                            }}
                          >
                            해당 카테고리의 프로젝트/협업을 준비중이에요.
                          </Typography>
                        )
                    }
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* 추천 프로필 */}
            {isLoggedIn ? (
              <RecommendedProfilesSection
                displayName={recommendedDisplayName}
                profiles={filteredRecommendedProfiles}
                scrollRef={recommendedScrollRef}
                centerIndex={centerProfileIndex}
                onScroll={handleRecommendedScroll}
                onPartnerClick={handlePartnerClick}
              />
            ) : null}

            {/* 새로운 브랜드/파트너 */}
            {isLoggedIn ? (
              <NewBrandSection
                items={newBrandItems}
                containerRef={brandScroll.containerRef}
              />
            ) : null}

            {/* Magazine of the Month */}
            <MagazineSection
              items={magazineItems}
              containerRef={magazineScroll.containerRef}
            />

            {/* 커뮤니티 */}
            <CommunitySection
              items={communityItems}
              containerRef={spotlightScroll.containerRef}
              contentRef={spotlightScroll.contentRef}
              onSetCommunityTab={setCommunityTab}
            />

            {/* 협업 아티스트 섹션 */}
            <CollaborationSection
              containerRef={collaborationScroll.containerRef}
            />


            {/* 하단 여백 - 네비게이션 바와의 최소 간격 */}
            <Box sx={{ height: '20px' }} />
          </Box> {/* Scrollable content 닫기 */}
        </Box> {/* Panel container 닫기 */}
      </motion.div>

      <BottomNavigationBar />
      <NotificationModal open={isNotificationOpen} onClose={handleNotificationClose} />
      <GlobalNoticeModal
        notices={noticeSlides}
        onClose={handleGlobalNoticeClose}
        onDontShowToday={handleGlobalNoticeHideToday}
      />
      <GlobalAdsModal
        open={showAds}
        ads={activeAds}
        onClose={handleAdsClose}
        onDontShowToday={handleAdsHideToday}
      />

      {/* 파트너 상세 모달 */}
      <Dialog
        open={isPartnerModalOpen}
        onClose={handlePartnerModalClose}
        fullWidth
        maxWidth="md"
        scroll="paper"
        BackdropProps={{
          sx: {
            backdropFilter: 'blur(6px)',
          },
        }}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            maxWidth: '768px',
            width: 'calc(100% - 40px)',
            m: { xs: '16px auto', sm: '48px auto' },
            maxHeight: { xs: 'calc(100vh - 64px)', sm: 'calc(100vh - 128px)' },
            overflow: 'hidden',
            backgroundColor: 'rgba(255,255,255,0.04)',
          },
        }}
      >
        <PartnerDetailContent
          partner={partnerDetailData}
          loading={isPartnerLoading}
          onClose={handlePartnerModalClose}
          showBottomNavigation={false}
          isModal
        />
      </Dialog>
    </Box >
  );
}

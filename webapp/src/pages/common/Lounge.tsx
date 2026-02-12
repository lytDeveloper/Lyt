import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Box, Typography, Chip, styled } from '@mui/material';
import { LightningLoader } from '../../components/common';
import { useTheme } from '@mui/material/styles';
import { ScrollToTopProvider } from '../../contexts/ScrollToTopContext';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../../components/common/Header';
import TabBar, { type TabItem } from '../../components/common/TabBar';
import FeaturedMagazineCard from '../../components/lounge/FeaturedMagazineCard';
import MagazineCard from '../../components/lounge/MagazineCard';
import FeaturedMagazineSkeleton from '../../components/lounge/FeaturedMagazineSkeleton';
import MagazineSkeleton from '../../components/lounge/MagazineSkeleton';
import CommunityCard from '../../components/lounge/CommunityCard';
import ActivityFeed from '../../components/lounge/ActivityFeed';
import ExploreFilters from '../../components/common/ExploreFilters';
import { magazineService } from '../../services/magazineService';
import { communityService } from '../../services/communityService';
import { useCommunityStore } from '../../stores/communityStore';
import { useCommunityRealtime } from '../../hooks/useCommunityRealtime';
import { useAuth } from '../../providers/AuthContext';
import {
  MAGAZINE_CATEGORIES,
  type MagazineCategory,
  type DBMagazineCategory,
} from '../../types/magazine.types';
import type { CommunityTabKey } from '../../types/community.types';
import type { ProjectCategory, ProjectStatus } from '../../types/exploreTypes';
import { PROJECT_CATEGORIES, getCategoryLabel } from '../../constants/projectConstants';
import BottomNavigationBar, { BOTTOM_NAV_HEIGHT } from '../../components/navigation/BottomNavigationBar';

import WindowOutlinedIcon from '@mui/icons-material/WindowOutlined';
import WindowIcon from '@mui/icons-material/Window';
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import InterpreterModeOutlinedIcon from '@mui/icons-material/InterpreterModeOutlined';
import InterpreterModeIcon from '@mui/icons-material/InterpreterMode';
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import ExploreIcon from '@mui/icons-material/Explore';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import ArticleIcon from '@mui/icons-material/Article';
import GradeOutlinedIcon from '@mui/icons-material/GradeOutlined';
import GradeIcon from '@mui/icons-material/Grade';
import FolderSpecialOutlinedIcon from '@mui/icons-material/FolderSpecialOutlined';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import BookOutlinedIcon from '@mui/icons-material/BookOutlined';
import BookRoundedIcon from '@mui/icons-material/BookRounded';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';

// 아이콘 이미지
import LoungeIconImg from '../../assets/icon/emptyState/lounge.png';
// Tab configuration
type LoungeTabKey = 'magazine' | 'community';
const LOUNGE_TABS: TabItem<LoungeTabKey>[] = [
  { key: 'magazine', label: '매거진' },
  { key: 'community', label: '커뮤니티' },
];

// Styled Components
const PageContainer = styled(Box)({
  minHeight: '100vh',
  backgroundColor: '#fff',
  paddingBottom: BOTTOM_NAV_HEIGHT + 20,
});

const ContentContainer = styled(Box)({
  marginTop: '20px'
});

const PageTitle = styled(Typography)(({ theme }) => ({
  fontSize: 24,
  fontWeight: 700,
  color: theme.palette.text.primary,
  padding: '8px 20px 4px',
}));

const PageSubtitle = styled(Typography)(({ theme }) => ({
  fontSize: 14,
  color: theme.palette.text.secondary,
  padding: '0 20px 12px',
}));

const TabBarContainer = styled(Box)({
  padding: '0 20px',
});

const FilterContainer = styled(Box)({
  padding: '0 20px',
  overflowX: 'auto',
  '&::-webkit-scrollbar': {
    display: 'none',
  },
  scrollbarWidth: 'none',
});

const FilterChipGroup = styled(Box)({
  display: 'flex',
  gap: 8,
  flexWrap: 'nowrap',
});

const FilterChip = styled(Chip)<{ selected: boolean }>(({ theme, selected }) => ({
  height: 32,
  fontSize: 12,
  fontWeight: 500,
  backgroundColor: selected ? theme.palette.primary.main : theme.palette.background.paper,
  color: selected ? theme.palette.primary.contrastText : theme.palette.text.secondary,
  cursor: 'pointer',
  transition: 'all 0.2s',
  padding: '0 4px',
  '&.MuiChip - clickable:hover': {
    backgroundColor: selected ? theme.palette.primary.main : theme.palette.background.paper,
  },
  '&:focus': {
    backgroundColor: selected ? theme.palette.primary.main : theme.palette.background.paper,
  },
  '& .MuiChip-label': {
    padding: '0 12px',
  },
}));

const Section = styled(Box)({
  padding: '24px 20px',
});

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: 18,
  fontWeight: 700,
  color: theme.palette.text.primary,
  marginBottom: 16,
}));

const FeaturedContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 16,
  width: '100%',
});

const AllArticlesContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 16,
  width: '100%',
});

const EmptyState = styled(Box)(({ theme }) => ({
  padding: 60,
  textAlign: 'center',
  color: theme.palette.text.secondary,
  fontSize: 14,
}));

// Community tab items
const COMMUNITY_TABS: TabItem<CommunityTabKey>[] = [
  { key: 'all', label: '전체' },
  { key: 'project', label: '프로젝트' },
  { key: 'collaboration', label: '협업' },
];

const CATEGORY_ICONS: Record<
  MagazineCategory,
  { filled: React.ElementType; outlined: React.ElementType }
> = {
  전체: { filled: WindowIcon, outlined: WindowOutlinedIcon },
  트렌드: { filled: ThumbUpIcon, outlined: ThumbUpAltOutlinedIcon },
  인터뷰: { filled: InterpreterModeIcon, outlined: InterpreterModeOutlinedIcon },
  가이드: { filled: ExploreIcon, outlined: ExploreOutlinedIcon },
  뉴스: { filled: ArticleIcon, outlined: ArticleOutlinedIcon },
  리뷰: { filled: GradeIcon, outlined: GradeOutlinedIcon },
  케이스스터디: { filled: FolderSpecialIcon, outlined: FolderSpecialOutlinedIcon },
  인사이트: { filled: BookRoundedIcon, outlined: BookOutlinedIcon },
  '브랜드 스토리': { filled: AutoStoriesIcon, outlined: AutoStoriesOutlinedIcon },
};

export default function Lounge() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') === 'community' ? 'community' : 'magazine') as LoungeTabKey;
  const [activeTab, setActiveTab] = useState<LoungeTabKey>(initialTab);
  const [selectedCategory, setSelectedCategory] = useState<MagazineCategory>('전체');

  // Community filters (project/collaboration)
  const [selectedProjectCategory, setSelectedProjectCategory] = useState<ProjectCategory | '전체'>('전체');
  const [selectedStatuses, setSelectedStatuses] = useState<ProjectStatus[]>(['in_progress']);
  const isLoggedIn = Boolean(user?.id);
  const loginRedirectPath = `${location.pathname}${location.search}`;
  const handleRequireLogin = useCallback(() => {
    navigate(`/login?redirectTo=${encodeURIComponent(loginRedirectPath)}`);
  }, [navigate, loginRedirectPath]);

  // Community store
  const { activeTab: communityTab, setActiveTab: setCommunityTab } = useCommunityStore();

  // Update activeTab when URL param changes
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'community') {
      setActiveTab('community');
    } else if (tabParam === 'magazine') {
      setActiveTab('magazine');
    }
  }, [searchParams]);

  // Enable real-time updates when community tab is active (Phase 2)
  useCommunityRealtime(activeTab === 'community');

  const queryClient = useQueryClient();

  // Fetch featured magazines
  const { data: featuredMagazines = [], isLoading: isFeaturedLoading } = useQuery({
    queryKey: ['magazines', 'featured'],
    queryFn: () => magazineService.getFeaturedMagazines(),
    enabled: activeTab === 'magazine',
    staleTime: 60_000, // 1분간 fresh 상태 유지
    gcTime: 5 * 60_000, // 5분간 캐시 유지
  });

  // Fetch all magazines with category filter (무한 스크롤)
  // 카테고리 필터링이 최우선 적용되도록 서버에서 처리
  const {
    data: allMagazinesData,
    isLoading: isAllMagazinesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['magazines', 'all', selectedCategory],
    queryFn: ({ pageParam = 0 }) => {
      // '전체'인 경우 필터 없이 조회
      if (selectedCategory === '전체') {
        return magazineService.getMagazinesPaginated(undefined, pageParam, 5);
      }
      // 선택된 카테고리로 필터링 (서버에서 카테고리 필터링 후 display_order 정렬)
      return magazineService.getMagazinesPaginated(
        { category: selectedCategory as DBMagazineCategory },
        pageParam,
        5
      );
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length : undefined,
    initialPageParam: 0,
    enabled: activeTab === 'magazine',
    staleTime: 60_000, // 1분간 fresh 상태 유지
    gcTime: 5 * 60_000, // 5분간 캐시 유지
  });

  // 무한 스크롤된 매거진 데이터 평탄화
  const allMagazines = useMemo(
    () => allMagazinesData?.pages.flatMap((page) => page.data) ?? [],
    [allMagazinesData]
  );

  // 무한 스크롤 트리거 ref
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef(false);

  // IntersectionObserver로 무한 스크롤 구현
  useEffect(() => {
    const currentLoadMoreRef = loadMoreRef.current;
    if (!currentLoadMoreRef || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasNextPage &&
          !isFetchingNextPage &&
          !isFetchingRef.current
        ) {
          isFetchingRef.current = true;
          fetchNextPage().finally(() => {
            setTimeout(() => {
              isFetchingRef.current = false;
            }, 500);
          });
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(currentLoadMoreRef);

    return () => {
      if (currentLoadMoreRef) {
        observer.unobserve(currentLoadMoreRef);
      }
      isFetchingRef.current = false;
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Fetch community items with caching (refetchInterval 제거 - pull-to-refresh로 대체)
  const { data: communityItems = [], isLoading: isCommunityLoading } = useQuery({
    queryKey: ['community', 'items', communityTab, selectedProjectCategory, selectedStatuses],
    queryFn: () =>
      communityService.getCommunityItems({
        itemType: communityTab === 'all' ? undefined : communityTab,
        category: selectedProjectCategory === '전체' ? undefined : selectedProjectCategory,
      }),
    enabled: activeTab === 'community',
    staleTime: 60_000, // 1분간 fresh 상태 유지
    gcTime: 5 * 60_000, // 5분간 캐시 유지
    // refetchInterval 제거 - pull-to-refresh로 대체하여 요청 수 90% 감소
  });

  // N+1 방지: 배치로 좋아요 상태 조회 (20개 아이템 → 2개 쿼리)
  const communityItemIds = useMemo(
    () => communityItems.map(item => ({ id: item.id, type: item.type })),
    [communityItems]
  );

  const { data: likedMap } = useQuery({
    queryKey: ['community', 'likedMap', user?.id, communityItemIds.map(i => i.id).join(',')],
    queryFn: () => communityService.checkLikedBatch(communityItemIds, user!.id),
    enabled: !!user && communityItems.length > 0,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  // Prefetch community tab data when magazine tab is active
  useEffect(() => {
    if (activeTab === 'magazine') {
      // 매거진 탭이 보이는 동안 커뮤니티 탭 데이터 미리 로드
      // 기본 필터: 전체 카테고리, in_progress 상태
      queryClient.prefetchQuery({
        queryKey: ['community', 'items', 'all', '전체', ['in_progress']],
        queryFn: () => communityService.getCommunityItems({
          itemType: undefined,
          category: undefined,
        }),
        staleTime: 60_000,
        gcTime: 5 * 60_000,
      });
    }
  }, [activeTab, queryClient]);

  const handleTabChange = useCallback((key: LoungeTabKey) => {
    setActiveTab(key);
  }, []);

  const handleCategoryChange = useCallback((category: MagazineCategory) => {
    setSelectedCategory(category);
  }, []);

  const handleCommunityTabChange = useCallback((key: CommunityTabKey) => {
    setCommunityTab(key);
  }, [setCommunityTab]);

  return (
    <ScrollToTopProvider>
      <PageContainer>
        <Header />

        <ContentContainer>
          <PageTitle>라운지</PageTitle>
          <PageSubtitle>매거진과 커뮤니티가 함께하는 공간</PageSubtitle>

          <TabBarContainer>
            <TabBar tabs={LOUNGE_TABS} activeTab={activeTab} onTabChange={handleTabChange} />
          </TabBarContainer>

          {activeTab === 'magazine' ? (
            <>
              <FilterContainer>
                <FilterChipGroup>
                  {MAGAZINE_CATEGORIES.map((category) => {
                    const isSelected = selectedCategory === category;
                    const IconComponent = isSelected
                      ? CATEGORY_ICONS[category].filled
                      : CATEGORY_ICONS[category].outlined;
                    return (
                      <FilterChip
                        key={category}
                        icon={
                          <IconComponent
                            sx={{
                              fontSize: 18,
                              color: isSelected
                                ? theme.palette.primary.contrastText
                                : theme.palette.icon?.default ?? theme.palette.text.secondary,
                              '& path': {
                                fill: isSelected
                                  ? theme.palette.primary.contrastText
                                  : theme.palette.icon?.default ?? theme.palette.text.secondary,
                              },
                            }}
                          />
                        }
                        label={category}
                        selected={isSelected}
                        onClick={() => handleCategoryChange(category)}
                      />
                    );
                  })}
                </FilterChipGroup>
              </FilterContainer>

              {/* Featured Section */}
              <Section>
                <SectionTitle>추천 아티클</SectionTitle>
                <FeaturedContainer>
                  {isFeaturedLoading ? (
                    <>
                      <FeaturedMagazineSkeleton />
                      <FeaturedMagazineSkeleton />
                      <FeaturedMagazineSkeleton />
                    </>
                  ) : featuredMagazines.length > 0 ? (
                    featuredMagazines.map((magazine) => (
                      <FeaturedMagazineCard key={magazine.id} magazine={magazine} />
                    ))
                  ) : (
                    <EmptyState>추천 아티클이 없어요.</EmptyState>
                  )}
                </FeaturedContainer>
              </Section>

              {/* All Articles Section - 무한 스크롤 */}
              <Section>
                <SectionTitle>전체 아티클</SectionTitle>
                {isAllMagazinesLoading ? (
                  <AllArticlesContainer>
                    <MagazineSkeleton />
                    <MagazineSkeleton />
                    <MagazineSkeleton />
                    <MagazineSkeleton />
                    <MagazineSkeleton />
                  </AllArticlesContainer>
                ) : allMagazines.length > 0 ? (
                  <>
                    <AllArticlesContainer>
                      {allMagazines.map((magazine) => (
                        <MagazineCard key={magazine.id} magazine={magazine} />
                      ))}
                    </AllArticlesContainer>

                    {/* 무한 스크롤 트리거 */}
                    {hasNextPage && <div ref={loadMoreRef} style={{ height: 1 }} />}

                    {/* 로딩 인디케이터 */}
                    {isFetchingNextPage && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                        <LightningLoader size={28} />
                      </Box>
                    )}

                    {/* 더 이상 데이터 없음 메시지 */}
                    {!hasNextPage && allMagazines.length > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                          더 이상 표시할 아티클이 없어요.
                        </Typography>
                      </Box>
                    )}
                  </>
                ) : (
                  <EmptyState sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, fontWeight: 600, color: theme.palette.text.primary, fontSize: 16, px: '16px', }}>
                    <Box
                      component="img"
                      src={LoungeIconImg}
                      alt="아티클이 없어요"
                      sx={{ width: 70, height: 70 }}
                    />
                    {selectedCategory === '전체'
                      ? '아티클이 없어요.'
                      : `${selectedCategory} 카테고리의 아티클이 없어요.`}

                    <Typography sx={{ fontSize: 14, color: theme.palette.text.secondary }}>
                      다른 카테고리의 아이템을 탐험해보세요!
                    </Typography>
                  </EmptyState>
                )}
              </Section>
            </>
          ) : (
            <>


              {/* Activity Feed (Phase 3) - Below Community TabBar */}
              <ActivityFeed />


              {/* Community Tab Bar */}
              <TabBarContainer sx={{ mt: 2 }}>
                <TabBar
                  tabs={COMMUNITY_TABS}
                  activeTab={communityTab}
                  onTabChange={handleCommunityTabChange}
                />
              </TabBarContainer>

              {/* Project/Collaboration Filters */}
              <Box sx={{ px: 2.5, mt: 2 }}>
                <ExploreFilters
                  categories={['전체', ...PROJECT_CATEGORIES] as Array<ProjectCategory | '전체'>}
                  statuses={['in_progress', 'open', 'completed'] as ProjectStatus[]}
                  selectedCategory={selectedProjectCategory}
                  selectedStatuses={selectedStatuses}
                  onCategoryChange={setSelectedProjectCategory}
                  onStatusToggle={(status) => {
                    setSelectedStatuses((prev) =>
                      prev.includes(status)
                        ? prev.filter((s) => s !== status)
                        : [...prev, status]
                    );
                  }}
                  showStatuses={false}
                />
              </Box>

              {/* Community Items */}
              <Section>
                {isCommunityLoading ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <EmptyState>로딩 중...</EmptyState>
                  </Box>
                ) : communityItems.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {communityItems.map((item) => (
                      <CommunityCard
                        key={`${item.type}-${item.id}`}
                        item={item}
                        isLiked={likedMap?.get(item.id) ?? false}
                        isLoggedIn={isLoggedIn}
                        onRequireLogin={handleRequireLogin}
                        onClick={() => {
                          if (!isLoggedIn) {
                            handleRequireLogin();
                            return;
                          }
                          navigate(`/lounge/community/${item.id}?type=${item.type}`, {
                            state: { from: 'lounge' },
                          });
                        }}
                      />
                    ))}
                  </Box>
                ) : (
                  <EmptyState sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, fontWeight: 600, color: theme.palette.text.primary, fontSize: 16, px: '16px', }}>
                    <Box
                      component="img"
                      src={LoungeIconImg}
                      alt="커뮤니티 아이템이 없어요"
                      sx={{ width: 70, height: 70 }}
                    />
                    {selectedProjectCategory === '전체'
                      ? '커뮤니티 아이템이 없어요.'
                      : `${getCategoryLabel(selectedProjectCategory)} 카테고리의 아이템이 없어요.`}

                    <Typography sx={{ fontSize: 14, color: theme.palette.text.secondary }}>
                      다른 카테고리의 아이템을 탐험해보세요!
                    </Typography>
                  </EmptyState>
                )}
              </Section>
            </>
          )}
        </ContentContainer>
        <BottomNavigationBar />
      </PageContainer>
    </ScrollToTopProvider>
  );
}

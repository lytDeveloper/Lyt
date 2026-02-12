import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, Dialog, Fab, Skeleton, useTheme, IconButton } from '@mui/material';
import { LightningLoader } from '../../components/common';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import BottomNavigationBar, { BOTTOM_NAV_HEIGHT } from '../../components/navigation/BottomNavigationBar';
import { useExploreStore } from '../../stores/exploreStore';
import { useProfileStore } from '../../stores/profileStore';
import { useAuth } from '../../providers/AuthContext';
import { useExploreFeed } from '../../hooks/useExploreFeed';
import { useExploreRealtime } from '../../hooks/useExploreRealtime';
import { ScrollToTopProvider } from '../../contexts/ScrollToTopContext';
import {
  type ProjectCategory,
  type ProjectStatus,
} from '../../services/exploreService';
import ProjectCard from '../../components/explore/ProjectCard';
import CollaborationCard from '../../components/explore/CollaborationCard';
import PartnerCard from '../../components/explore/PartnerCard';
import PartnerDetailContent from '../../components/explore/PartnerDetailContent';
import ManageButtonGroup from '../../components/explore/ManageButtonGroup';
import TabBar, { type TabItem } from '../../components/common/TabBar';
import SearchBar from '../../components/common/SearchBar';
import ExploreFilters from '../../components/common/ExploreFilters';
import Header, { HEADER_HEIGHT } from '../../components/common/Header';
import { type ExploreTab } from '../../stores/exploreStore';
import type { ActionType } from '../../components/common/ReasonModal';
import { PROJECT_CATEGORIES, CATEGORY_LABELS } from '../../constants/projectConstants';
import PendingApprovalNotice from '../../components/common/PendingApprovalNotice';
import { useBrandApprovalStatus } from '../../hooks/useBrandApprovalStatus';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';

// ManageAll prefetch용 service imports
import {
  getMyProjects,
  getReceivedApplications,
  getMyApplications,
} from '../../services/projectService';
import {
  getMyCollaborations,
  getMyCollaborationApplications,
  getReceivedCollaborationApplications,
  getReceivedInvitations as getReceivedCollabInvitations,
} from '../../services/collaborationService';
import {
  getSentInvitations as getUnifiedSentInvitations,
  getReceivedInvitations as getUnifiedReceivedInvitations,
} from '../../services/invitationService';
import {
  getSentTalkRequests,
  getReceivedTalkRequests,
} from '../../services/talkRequestService';

const CATEGORIES: Array<ProjectCategory | '전체'> = ['전체', ...PROJECT_CATEGORIES];
const STATUSES: ProjectStatus[] = ['in_progress', 'open'];

const EXPLORE_TABS: TabItem<ExploreTab>[] = [
  { key: 'projects', label: '프로젝트' },
  { key: 'collaborations', label: '협업' },
  { key: 'partners', label: '파트너' },
];

const IDLE_PREFETCH_DELAY_MS = 1800;

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/**
 * Custom hook for debouncing values
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function Explore() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [showApprovalOverlay, setShowApprovalOverlay] = useState(false);

  // Store state
  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedStatuses,
    toggleStatus,
    initializeSocialData,
    clearSocialState,
    artistOnlyFilter,
    setArtistOnlyFilter,
  } = useExploreStore();

  // Profile state - useProfileStore의 type을 우선 사용하고, 없으면 nonFanProfile.type 또는 useAuth의 roles 사용
  const { type: activeProfileType, nonFanProfile } = useProfileStore();
  const { profile, user } = useAuth();
  const isLoggedIn = Boolean(user);
  const loginRedirectPath = `${location.pathname}${location.search}`;
  const { isRestricted: isBrandApprovalRestricted } = useBrandApprovalStatus();

  // 실제 활성 프로필 타입 결정: useProfileStore의 type > nonFanProfile.type > profile.roles에서 첫 번째 비팬 role
  const resolvedProfileType = useMemo(() => {
    if (activeProfileType) {
      return activeProfileType;
    }
    if (nonFanProfile?.type) {
      return nonFanProfile.type;
    }
    // profile.roles에서 첫 번째 비팬 role 찾기
    if (profile?.roles && Array.isArray(profile.roles)) {
      const nonFanRoles = profile.roles.filter((role) => role !== 'fan') as Array<'brand' | 'artist' | 'creative'>;
      if (nonFanRoles.length > 0) {
        return nonFanRoles[0];
      }
    }
    return null;
  }, [activeProfileType, nonFanProfile, profile]);

  // 현재 활성 프로필 기준 역할 플래그
  const isBrandProfile = resolvedProfileType === 'brand';
  const isArtistProfile = resolvedProfileType === 'artist';
  const isCreativeProfile = resolvedProfileType === 'creative';

  const openApprovalOverlay = () => setShowApprovalOverlay(true);

  const handleTabChange = useCallback((tab: ExploreTab) => {
    if (tab === activeTab) return;
    // Clear query before switching tab to avoid transient "empty results" flashes.
    setSearchQuery('');
    setActiveTab(tab);
  }, [activeTab, setActiveTab, setSearchQuery]);

  // if (isBrandApprovalRestricted) {
  //   return (
  //     <>
  //       <PendingApprovalNotice
  //         status={normalizedApprovalStatus === 'rejected' ? 'rejected' : 'pending'}
  //       />
  //       <BottomNavigationBar />
  //     </>
  //   );
  // }

  // Initialize social data (likes/follows) from DB
  useEffect(() => {
    if (!isLoggedIn) {
      clearSocialState();
      return;
    }
    initializeSocialData();
  }, [isLoggedIn, initializeSocialData, clearSocialState]);

  // Handle refresh state from navigation (after project/collaboration creation)
  useEffect(() => {
    const state = location.state as { refresh?: boolean } | null;
    if (state?.refresh) {
      // Invalidate explore queries to force refetch
      queryClient.invalidateQueries({ queryKey: ['explore'] });
      // Clear the state to prevent re-refresh on subsequent renders
      navigate(location.pathname + location.search, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, location.search, queryClient, navigate]);

  // Sync tab with query parameter (?tab=partners | projects | collaborations)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab') as ExploreTab | null;
    const allowedTabs: ExploreTab[] = ['projects', 'collaborations', 'partners'];
    if (tabParam && allowedTabs.includes(tabParam)) {
      handleTabChange(tabParam);
    }
  }, [location.search, handleTabChange]);

  // Sync category with query parameter (?category=music ...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const categoryParam = params.get('category');
    if (!categoryParam) return;

    if (categoryParam === '전체') {
      setSelectedCategory('전체');
      return;
    }

    if ((PROJECT_CATEGORIES as string[]).includes(categoryParam)) {
      setSelectedCategory(categoryParam as ProjectCategory);
    }
  }, [location.search, setSelectedCategory]);

  // Sync artistOnly filter with query parameter (?artistOnly=true)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const artistOnlyParam = params.get('artistOnly');
    setArtistOnlyFilter(artistOnlyParam === 'true');
  }, [location.search, setArtistOnlyFilter]);

  // Debounce search query (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const effectiveStatuses = useMemo<ProjectStatus[]>(
    () => (selectedStatuses.length > 0 ? selectedStatuses : STATUSES),
    [selectedStatuses],
  );

  // React Query: Fetch explore feed with infinite scroll support
  const {
    data,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    prefetchTab,
  } = useExploreFeed(
    selectedCategory,
    effectiveStatuses,
    debouncedSearchQuery,
    activeTab
  );

  // Realtime subscriptions: Disabled for performance optimization
  // Re-enable if real-time updates become necessary
  useExploreRealtime({
    category: selectedCategory,
    enabled: false,  // 성능 최적화를 위해 비활성화
    onInvalidate: () => {
      console.log('[Explore] Realtime invalidation triggered');
    },
  });

  // Prefetch other tabs one by one during idle time after current tab has loaded.
  useEffect(() => {
    if (isLoading || !data?.pages?.length) return;
    if (debouncedSearchQuery && debouncedSearchQuery.trim().length > 0) return;

    const idleWindow = window as IdleWindow;
    const timeoutIds: number[] = [];
    const idleIds: number[] = [];
    const tabsToPrefetch = EXPLORE_TABS
      .map((tab) => tab.key)
      .filter((tab): tab is ExploreTab => tab !== activeTab);

    tabsToPrefetch.forEach((tab, index) => {
      const timeoutId = window.setTimeout(() => {
        if (idleWindow.requestIdleCallback) {
          const idleId = idleWindow.requestIdleCallback(() => {
            prefetchTab(tab);
          }, { timeout: 1500 });
          idleIds.push(idleId);
          return;
        }
        prefetchTab(tab);
      }, index * IDLE_PREFETCH_DELAY_MS);

      timeoutIds.push(timeoutId);
    });

    return () => {
      timeoutIds.forEach((id) => window.clearTimeout(id));
      if (idleWindow.cancelIdleCallback) {
        idleIds.forEach((id) => idleWindow.cancelIdleCallback?.(id));
      }
    };
  }, [
    activeTab,
    data?.pages?.length,
    debouncedSearchQuery,
    isLoading,
    prefetchTab,
  ]);

  // Extract and flatten data from React Query infinite pages
  // IMPORTANT: Deduplicate by ID to handle cursor overlap between pages
  // This is necessary because the cursor is now set to the newest among hasMore types,
  // which may cause some items to appear in multiple pages
  const projects = useMemo(() => {
    const all = data?.pages.flatMap((page) => page.projects) ?? [];
    const seen = new Set<string>();
    return all.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      // Only show projects with status 'open' or 'in_progress'
      return p.status === 'open' || p.status === 'in_progress';
    });
  }, [data]);

  const collaborations = useMemo(() => {
    const all = data?.pages.flatMap((page) => page.collaborations) ?? [];
    const seen = new Set<string>();
    return all.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      // Only show collaborations with status 'open' or 'in_progress'
      return c.status === 'open' || c.status === 'in_progress';
    });
  }, [data]);

  const allPartners = useMemo(() => {
    const all = data?.pages.flatMap((page) => page.partners) ?? [];
    const seen = new Set<string>();
    return all.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [data]);

  // Filter partners by activityField when in partners tab and category is selected
  // Also filter by role (artist only) when artistOnlyFilter is true
  const partners = useMemo(() => {
    let filtered = allPartners;

    // Apply category filter if not '전체'
    if (activeTab === 'partners' && selectedCategory !== '전체') {
      // Convert category to Korean label (e.g., 'music' -> '음악')
      const categoryLabel = CATEGORY_LABELS[selectedCategory as ProjectCategory];

      // Filter partners whose activityField contains the category label
      filtered = filtered.filter((partner) => {
        const activityField = partner.activityField || '';
        return activityField.includes(categoryLabel);
      });
    }

    // Apply artist-only filter (exclude creatives) if enabled
    if (artistOnlyFilter) {
      filtered = filtered.filter((partner) => partner.role === 'artist');
    }

    return filtered;
  }, [allPartners, activeTab, selectedCategory, artistOnlyFilter]);

  // Show skeleton while the active tab has no data and a fetch is in flight.
  const isCurrentTabFetchingWithoutData = useMemo(() => {
    if (!isFetching) return false;
    if (activeTab === 'projects') return projects.length === 0;
    if (activeTab === 'collaborations') return collaborations.length === 0;
    if (activeTab === 'partners') return partners.length === 0;
    return false;
  }, [activeTab, collaborations.length, isFetching, partners.length, projects.length]);

  const showInitialLoadingState = isLoading || isCurrentTabFetchingWithoutData;

  // Infinite Scroll: Intersection Observer for "Load More" trigger
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef(false); // 중복 요청 방지 플래그

  /**
   * IMPORTANT:
   * explore-feed는 "프로젝트/협업/파트너"를 한 번의 커서로 섞어서 페이지네이션합니다.
   * hasNextPage는 하나라도 더 가져올 데이터가 있으면 true를 반환합니다.
   * 
   * 하지만 현재 탭의 데이터가 끝났는데(cursor가 null) 다른 탭 데이터 때문에 계속 fetch하는 것을 방지하기 위해,
   * 현재 활성화된 탭의 cursor 상태를 확인하여 shouldLoadMore를 결정합니다.
   */
  const shouldLoadMore = useMemo(() => {
    if (!hasNextPage || !data?.pages?.length) return false;
    const lastPage = data.pages[data.pages.length - 1];

    if (activeTab === 'projects') return !!lastPage.projectsCursor;
    if (activeTab === 'collaborations') return !!lastPage.collaborationsCursor;
    if (activeTab === 'partners') return !!lastPage.partnersCursor;

    return false;
  }, [hasNextPage, data, activeTab]);

  useEffect(() => {
    const currentLoadMoreRef = loadMoreRef.current;
    if (!currentLoadMoreRef) return;

    // Don't create observer if there's no more data for this tab
    if (!shouldLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Only fetch if:
        // 1. Element is in viewport
        // 2. There's a next page (React Query says so)
        // 3. Not already fetching (React Query state)
        // 4. Not in cooldown (our ref flag)
        // 5. Current tab still has more data
        if (
          entries[0].isIntersecting &&
          shouldLoadMore &&
          !isFetchingNextPage &&
          !isFetchingRef.current
        ) {
          isFetchingRef.current = true;
          fetchNextPage().finally(() => {
            // Longer cooldown to prevent rapid requests
            setTimeout(() => {
              isFetchingRef.current = false;
            }, 1000);
          });
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px',
      }
    );

    observer.observe(currentLoadMoreRef);

    return () => {
      if (currentLoadMoreRef) {
        observer.unobserve(currentLoadMoreRef);
      }
      isFetchingRef.current = false;
    };
  }, [shouldLoadMore, isFetchingNextPage, fetchNextPage, activeTab]);

  // Local state for UI management
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [isPartnerModalOpen, setPartnerModalOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);

  // Scroll container ref for ScrollToTopButton
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const selectedPartner = useMemo(() => {
    if (!selectedPartnerId) {
      return null;
    }
    return partners.find((partner) => partner.id === selectedPartnerId) ?? null;
  }, [partners, selectedPartnerId]);

  const handleRequireLogin = useCallback(() => {
    toast.info('로그인이 필요합니다.');
    navigate(`/login?redirectTo=${encodeURIComponent(loginRedirectPath)}`);
  }, [navigate, loginRedirectPath]);

  const handleProjectClick = useCallback((projectId: string) => {
    if (!isLoggedIn) {
      handleRequireLogin();
      return;
    }
    navigate(`/explore/project/${projectId}`);
  }, [handleRequireLogin, isLoggedIn, navigate]);

  const handleCollaborationClick = useCallback((collaborationId: string) => {
    if (!isLoggedIn) {
      handleRequireLogin();
      return;
    }
    navigate(`/explore/collaboration/${collaborationId}`);
  }, [handleRequireLogin, isLoggedIn, navigate]);

  const handlePartnerClick = useCallback((_partnerId: string) => {
    if (!isLoggedIn) {
      handleRequireLogin();
      return;
    }
    setSelectedPartnerId(_partnerId);
    setPartnerModalOpen(true);
  }, [handleRequireLogin, isLoggedIn]);

  const handlePartnerModalClose = useCallback(() => {
    setPartnerModalOpen(false);
    setSelectedPartnerId(null);
  }, []);

  const handlePartnerRequest = useCallback((_partnerId: string) => {
    if (!isLoggedIn) {
      handleRequireLogin();
      return;
    }
    navigate(`/explore/partner/request/${_partnerId}`);
  }, [handleRequireLogin, isLoggedIn, navigate]);

  const handleProjectActionSuccess = useCallback(
    (_projectId: string, _action: ActionType) => {
      // TODO: Invalidate React Query cache when action completes
      // Will be implemented with Realtime invalidation in Week 4
      console.log('[Explore] Project action success:', _projectId, _action);
    },
    [],
  );

  const handleCollaborationActionSuccess = useCallback(
    (_collaborationId: string, _action: ActionType) => {
      // TODO: Invalidate React Query cache when action completes
      console.log('[Explore] Collaboration action success:', _collaborationId, _action);
    },
    [],
  );

  const handlePartnerActionSuccess = useCallback(
    (_partnerId: string, _action: ActionType) => {
      // TODO: Invalidate React Query cache when action completes
      console.log('[Explore] Partner action success:', _partnerId, _action);
    },
    [],
  );

  const handleCreateClick = useCallback(() => {
    if (isBrandApprovalRestricted) {
      openApprovalOverlay();
      return;
    }
    // 팬 프로필은 어떤 탭에서든 생성 불가
    if (resolvedProfileType === 'fan') {
      toast.info('팬 프로필에서는 생성할 수 없습니다');
      return;
    }

    // 탭별로 우선 분기
    if (activeTab === 'projects') {
      // 파트너(아티스트/크리에이티브)는 프로젝트 생성 불가
      navigate('/explore/project/create');
      return;
    }

    if (activeTab === 'collaborations') {
      // 브랜드 프로필은 협업 생성 불가
      navigate('/explore/collaboration/create');
      return;
    }
  }, [isBrandApprovalRestricted, resolvedProfileType, activeTab, navigate]);

  const prefetchManageAllData = useCallback(() => {
    if (!resolvedProfileType || resolvedProfileType === 'fan') return;

    // Projects tab
    queryClient.prefetchQuery({
      queryKey: ['manage-all', 'projects'],
      queryFn: () => getMyProjects(),
      staleTime: 60_000,
    });
    queryClient.prefetchQuery({
      queryKey: ['manage-all', 'collaborations'],
      queryFn: () => getMyCollaborations(),
      staleTime: 60_000,
    });

    // Invitations tab
    queryClient.prefetchQuery({
      queryKey: ['manage-all', 'sent-project-applications'],
      queryFn: () => getMyApplications(true),
      staleTime: 60_000,
    });
    queryClient.prefetchQuery({
      queryKey: ['manage-all', 'sent-collab-applications'],
      queryFn: () => getMyCollaborationApplications(true),
      staleTime: 60_000,
    });
    queryClient.prefetchQuery({
      queryKey: ['manage-all', 'received-project-applications'],
      queryFn: () => getReceivedApplications(true),
      staleTime: 60_000,
    });
    queryClient.prefetchQuery({
      queryKey: ['manage-all', 'received-collab-applications'],
      queryFn: () => getReceivedCollaborationApplications(true),
      staleTime: 60_000,
    });
    queryClient.prefetchQuery({
      queryKey: ['manage-all', 'invitations'],
      queryFn: () => getReceivedCollabInvitations(true),
      staleTime: 60_000,
    });
    queryClient.prefetchQuery({
      queryKey: ['manage-all', 'unified-sent-invitations'],
      queryFn: () => getUnifiedSentInvitations(undefined, true),
      staleTime: 60_000,
    });
    queryClient.prefetchQuery({
      queryKey: ['manage-all', 'unified-received-invitations'],
      queryFn: () => getUnifiedReceivedInvitations(undefined, true),
      staleTime: 60_000,
    });
    queryClient.prefetchQuery({
      queryKey: ['manage-all', 'sent-talk-requests'],
      queryFn: () => getSentTalkRequests(true),
      staleTime: 60_000,
    });
    queryClient.prefetchQuery({
      queryKey: ['manage-all', 'received-talk-requests'],
      queryFn: () => getReceivedTalkRequests(true),
      staleTime: 60_000,
    });
  }, [queryClient, resolvedProfileType]);

  const handleManageClick = useCallback(() => {
    if (isBrandApprovalRestricted) {
      openApprovalOverlay();
      return;
    }
    setIsManageOpen((prev) => {
      const next = !prev;
      if (next) {
        prefetchManageAllData();
      }
      return next;
    });
  }, [isBrandApprovalRestricted, prefetchManageAllData]);

  // FAB 표시 여부: partners 탭에서는 숨기고,
  // 비팬 프로필(브랜드/아티스트/크리에이티브)일 때만 보여줌
  const showFAB =
    isLoggedIn &&
    activeTab !== 'partners' &&
    (isBrandProfile || isArtistProfile || isCreativeProfile);

  // 현재 프로필 타입에 따른 entityId (첫 번째 항목 사용)
  const currentEntityId = useMemo(() => {
    if (resolvedProfileType === 'brand' && projects.length > 0) {
      return projects[0].id;
    }
    if ((resolvedProfileType === 'artist' || resolvedProfileType === 'creative') && collaborations.length > 0) {
      return collaborations[0].id;
    }
    return null;
  }, [resolvedProfileType, projects, collaborations]);
  const searchPlaceholder = useMemo(() => {
    if (activeTab === 'collaborations') {
      return '다양한 협업을 찾아보세요';
    }
    if (activeTab === 'partners') {
      return '다양한 파트너를 찾아보세요';
    }
    return '다양한 프로젝트를 찾아보세요';
  }, [activeTab]);

  return (
    <ScrollToTopProvider scrollContainerRef={scrollContainerRef}>
      <Box
        sx={{
          height: '100vh',
          backgroundColor: '#fff',
          position: 'relative',
          overflow: 'hidden',
          maxWidth: '768px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header - Fixed */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: 'transparent',
            backdropFilter: 'blur(3px) saturate(180%)',
            WebkitBackdropFilter: 'blur(3px) saturate(180%)',
            zIndex: 1000,
          }}
        >
          <Header />
        </Box>

        {/* Main Scrollable Content */}
        <Box
          ref={scrollContainerRef}
          sx={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            px: 2,
            pb: `${BOTTOM_NAV_HEIGHT + 20}px`,
            '&::-webkit-scrollbar': {
              display: 'none',
              top: 0,
            },
          }}
        >
          {/* Top Controls - Now Scrollable */}
          <Box
            sx={{
              marginTop: `${HEADER_HEIGHT}px`,
              pt: 3,
              pb: 1,
            }}
          >
            {/* Tab Bar */}
            <TabBar tabs={EXPLORE_TABS} activeTab={activeTab} onTabChange={handleTabChange} />

            {/* Search Bar */}
            <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder={searchPlaceholder} />

            {/* Filters */}
            <ExploreFilters
              categories={CATEGORIES}
              statuses={STATUSES}
              selectedCategory={selectedCategory}
              selectedStatuses={selectedStatuses}
              onCategoryChange={setSelectedCategory}
              onStatusToggle={toggleStatus}
            />
          </Box>

          {/* Content List - Conditional based on active tab */}
          {activeTab === 'projects' && (
            <>
              {showInitialLoadingState ? (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: 2,
                  }}
                >
                  {[1, 2, 3].map((i) => (
                    <Box
                      key={i}
                      sx={{
                        backgroundColor: '#fff',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        // boxShadow: '0px 3px 5px rgba(0,0,0,0.04)',
                        boxShadow: '0px 2px 5px 0px rgba(50, 50, 105, 0.15), 0px 1px 1px 0px rgba(0, 0, 0, 0.05)',
                        p: 2,
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Skeleton variant="rectangular" width={80} height={80} sx={{ borderRadius: '8px' }} />
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <Skeleton variant="text" width="60%" height={32} />
                            <Skeleton variant="rectangular" width={50} height={22} sx={{ borderRadius: '4px' }} />
                            <Skeleton variant="circular" width={24} height={24} />
                          </Box>
                          <Skeleton variant="text" width="40%" height={20} />
                          <Skeleton variant="text" width="70%" height={20} />
                        </Box>
                      </Box>
                      <Skeleton variant="text" width="30%" height={16} sx={{ mb: 1 }} />
                      <Skeleton variant="rectangular" width="100%" height={40} sx={{ borderRadius: '4px', mb: 1.5 }} />
                      <Skeleton variant="text" width="20%" height={16} sx={{ mb: 1 }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Skeleton variant="circular" width={36} height={36} />
                        <Box sx={{ flex: 1 }}>
                          <Skeleton variant="text" width="40%" height={16} />
                          <Skeleton variant="text" width="60%" height={14} />
                        </Box>
                        <Skeleton variant="text" width={50} height={14} />
                      </Box>
                      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <Skeleton variant="rectangular" width="58%" height={38} sx={{ borderRadius: '24px' }} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : projects.length === 0 ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 8,
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 15,
                      color: theme.palette.text.secondary,
                      textAlign: 'center',
                    }}
                  >
                    검색 결과가 없어요.
                  </Typography>
                </Box>
              ) : (
                <>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '1fr',
                      gap: 2,
                    }}
                  >
                    {projects.map((project) => (
                      <Box key={project.id}>
                        <ProjectCard
                          project={project}
                          onClick={() => handleProjectClick(project.id)}
                          onActionSuccess={handleProjectActionSuccess}
                          currentUserId={user?.id}
                          isLoggedIn={isLoggedIn}
                          onRequireLogin={handleRequireLogin}
                        />
                      </Box>
                    ))}
                  </Box>

                  {/* Infinite Scroll: Load More Trigger - only render if shouldLoadMore */}
                  {shouldLoadMore && <div ref={loadMoreRef} style={{ height: 1 }} />}

                  {/* Loading Indicator OR "No more data" message */}
                  {isFetchingNextPage ? (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        py: 4,
                      }}
                    >
                      <LightningLoader size={32} />
                    </Box>
                  ) : !shouldLoadMore && projects.length > 0 && (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        py: 4,
                      }}
                    >
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        더 이상 표시할 항목이 없어요.
                      </Typography>
                    </Box>
                  )}
                </>
              )}
            </>
          )}

          {activeTab === 'collaborations' && (
            <>
              {showInitialLoadingState ? (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: 5,
                  }}
                >
                  {[1, 2, 3].map((i) => (
                    <Box
                      key={i}
                      sx={{
                        backgroundColor: '#fff',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        // boxShadow: '0px 3px 5px rgba(0,0,0,0.04)',
                        boxShadow: '0px 2px 5px 0px rgba(50, 50, 105, 0.15), 0px 1px 1px 0px rgba(0, 0, 0, 0.05)',
                        p: 2,
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Skeleton variant="rectangular" width={80} height={80} sx={{ borderRadius: '8px' }} />
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <Skeleton variant="text" width="60%" height={32} />
                            <Skeleton variant="rectangular" width={50} height={22} sx={{ borderRadius: '4px' }} />
                            <Skeleton variant="circular" width={24} height={24} />
                          </Box>
                          <Skeleton variant="rectangular" width={80} height={20} sx={{ borderRadius: '4px' }} />
                          <Skeleton variant="text" width="100%" height={36} />
                          <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5 }}>
                            <Skeleton variant="text" width={60} height={16} />
                            <Skeleton variant="text" width={80} height={16} />
                          </Box>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: '12px' }} />
                          <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: '12px' }} />
                        </Box>
                        <Skeleton variant="circular" width={36} height={36} />
                      </Box>
                      <Skeleton variant="text" width="20%" height={16} sx={{ mb: 1 }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Skeleton variant="circular" width={36} height={36} />
                        <Box sx={{ flex: 1 }}>
                          <Skeleton variant="text" width="40%" height={16} />
                          <Skeleton variant="text" width="60%" height={14} />
                        </Box>
                        <Skeleton variant="text" width={60} height={14} />
                      </Box>
                      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <Skeleton variant="rectangular" width="58%" height={37} sx={{ borderRadius: '24px' }} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : collaborations.length === 0 ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 8,
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 15,
                      color: theme.palette.text.secondary,
                      textAlign: 'center',
                    }}
                  >
                    검색 결과가 없어요.
                  </Typography>
                </Box>
              ) : (
                <>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '1fr',
                      gap: 2,
                    }}
                  >
                    {collaborations.map((collaboration) => (
                      <Box key={collaboration.id}>
                        <CollaborationCard
                          collaboration={collaboration}
                          onClick={() => handleCollaborationClick(collaboration.id)}
                          onActionSuccess={handleCollaborationActionSuccess}
                          currentUserId={user?.id}
                          isLoggedIn={isLoggedIn}
                          onRequireLogin={handleRequireLogin}
                        />
                      </Box>
                    ))}
                  </Box>

                  {/* Infinite Scroll: Load More Trigger - only render if shouldLoadMore */}
                  {shouldLoadMore && <div ref={loadMoreRef} style={{ height: 1 }} />}

                  {/* Loading Indicator OR "No more data" message */}
                  {isFetchingNextPage ? (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        py: 4,
                      }}
                    >
                      <LightningLoader size={32} />
                    </Box>
                  ) : !shouldLoadMore && collaborations.length > 0 && (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        py: 4,
                      }}
                    >
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        더 이상 표시할 항목이 없어요.
                      </Typography>
                    </Box>
                  )}
                </>
              )}
            </>
          )}

          {activeTab === 'partners' && (
            <>
              {showInitialLoadingState ? (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: 2,
                  }}
                >
                  {[1, 2, 3].map((i) => (
                    <Box
                      key={i}
                      sx={{
                        backgroundColor: '#fff',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        // boxShadow: '0px 3px 5px rgba(0,0,0,0.04)',
                        boxShadow: '0px 2px 5px 0px rgba(50, 50, 105, 0.15), 0px 1px 1px 0px rgba(0, 0, 0, 0.05)',
                        p: 2,
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Skeleton variant="circular" width={64} height={64} />
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Skeleton variant="text" width="50%" height={20} />
                            <Skeleton variant="circular" width={24} height={24} />
                            <Skeleton variant="circular" width={24} height={24} />
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Skeleton variant="text" width="40%" height={18} />
                            <Skeleton variant="rectangular" width={70} height={24} sx={{ borderRadius: '12px', ml: 'auto' }} />
                          </Box>
                          <Skeleton variant="text" width="60%" height={16} />
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Skeleton variant="text" width={40} height={14} />
                            <Skeleton variant="text" width={80} height={14} />
                            <Skeleton variant="text" width={60} height={14} />
                          </Box>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <Box sx={{ display: 'flex', gap: 0.5, flex: 1 }}>
                          <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: '12px' }} />
                          <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: '12px' }} />
                          <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: '12px' }} />
                        </Box>
                        <Skeleton variant="rectangular" width={68} height={24} sx={{ borderRadius: '12px' }} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : partners.length === 0 ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 8,
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 15,
                      color: theme.palette.text.secondary,
                      textAlign: 'center',
                    }}
                  >
                    검색 결과가 없어요.
                  </Typography>
                </Box>
              ) : (
                <>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '1fr',
                      gap: 2,
                    }}
                  >
                    {partners.map((partner) => (
                      <Box key={partner.id}>
                        <PartnerCard
                          partner={partner}
                          onClick={() => handlePartnerClick(partner.id)}
                          onRequestClick={() => handlePartnerRequest(partner.id)}
                          onActionSuccess={handlePartnerActionSuccess}
                          isLoggedIn={isLoggedIn}
                          onRequireLogin={handleRequireLogin}
                        />
                      </Box>
                    ))}
                  </Box>

                  {/* Infinite Scroll: Load More Trigger - only render if shouldLoadMore */}
                  {shouldLoadMore && <div ref={loadMoreRef} style={{ height: 1 }} />}

                  {/* Loading Indicator OR "No more data" message */}
                  {isFetchingNextPage ? (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        py: 4,
                      }}
                    >
                      <LightningLoader size={32} />
                    </Box>
                  ) : !shouldLoadMore && partners.length > 0 && (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        py: 4,
                      }}
                    >
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        더 이상 표시할 항목이 없어요.
                      </Typography>
                    </Box>
                  )}
                </>
              )}
            </>
          )}
        </Box>

        <BottomNavigationBar />

        {showApprovalOverlay && (
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: `${BOTTOM_NAV_HEIGHT}px`,
              backgroundColor: '#fff',
              zIndex: 2000,
            }}
          >
            <IconButton
              onClick={() => setShowApprovalOverlay(false)}
              sx={{ position: 'absolute', top: 12, left: 12, zIndex: 2001 }}
              aria-label="뒤로가기"
            >
              <ArrowBackIosNewRoundedIcon />
            </IconButton>
            <PendingApprovalNotice status="pending" />
          </Box>
        )}

        {/* Floating Action Buttons - role에 따라 표시 */}
        {
          showFAB && (
            <>
              {resolvedProfileType === 'brand' && (
                <>
                  {/* 생성 버튼 */}
                  <Fab
                    onClick={handleCreateClick}
                    sx={{
                      position: 'fixed',
                      bottom: `${BOTTOM_NAV_HEIGHT + 20}px`,
                      right: 'calc((100% - 768px) / 2 + 16px)',
                      backgroundColor: theme.palette.transparent.white,
                      backdropFilter: 'blur(4px)',
                      WebkitBackdropFilter: 'blur(4px)',
                      border: `0.1px solid ${theme.palette.transparent.white}`,
                      color: theme.palette.primary.main,
                      fontWeight: 900,
                      width: 56,
                      height: 56,
                      '&:hover': {
                        backgroundColor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                      },
                      '&:active': {
                        backgroundColor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                      },
                      zIndex: 999,
                      '@media (max-width: 768px)': {
                        right: '16px',
                      },
                    }}
                    aria-label="create"
                  >
                    <AddRoundedIcon sx={{ fontSize: 22 }} />
                  </Fab>

                  {/* 관리 버튼 */}
                  <Fab
                    onClick={handleManageClick}
                    sx={{
                      position: 'fixed',
                      bottom: `${BOTTOM_NAV_HEIGHT + 90}px`,
                      right: 'calc((100% - 768px) / 2 + 16px)',
                      backgroundColor: isManageOpen ? theme.palette.primary.main : theme.palette.transparent.white,
                      backdropFilter: 'blur(4px)',
                      WebkitBackdropFilter: 'blur(4px)',
                      border: `0.1px solid ${theme.palette.transparent.white}`,
                      color: isManageOpen ? theme.palette.primary.contrastText : theme.palette.primary.main,
                      fontWeight: 900,
                      width: 56,
                      height: 56,
                      '&:hover': {
                        backgroundColor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                      },
                      '&:active': {
                        backgroundColor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                      },
                      zIndex: 999,
                      '@media (max-width: 768px)': {
                        right: '16px',
                      },
                    }}
                    aria-label="manage"
                  >
                    <Inventory2OutlinedIcon sx={{ fontSize: 18 }} />
                  </Fab>

                  {/* 관리 버튼 그룹 (슬라이드) */}
                  <ManageButtonGroup
                    isOpen={isManageOpen}
                    entityType="project"
                    entityId={currentEntityId}
                    isRestricted={isBrandApprovalRestricted}
                    onRestricted={openApprovalOverlay}
                    onClose={() => setIsManageOpen(false)}
                  />
                </>
              )}

              {(resolvedProfileType === 'artist' || resolvedProfileType === 'creative') && (
                <>
                  {/* 생성 버튼 */}
                  <Fab
                    onClick={handleCreateClick}
                    sx={{
                      position: 'fixed',
                      bottom: `${BOTTOM_NAV_HEIGHT + 20}px`,
                      right: 'calc((100% - 768px) / 2 + 16px)',
                      backgroundColor: theme.palette.transparent.white,
                      backdropFilter: 'blur(4px)',
                      WebkitBackdropFilter: 'blur(4px)',
                      border: `0.1px solid ${theme.palette.transparent.white}`,
                      color: theme.palette.primary.main,
                      fontWeight: 900,
                      width: 56,
                      height: 56,
                      '&:hover': {
                        backgroundColor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                      },
                      '&:active': {
                        backgroundColor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                      },
                      zIndex: 999,
                      '@media (max-width: 768px)': {
                        right: '16px',
                      },
                    }}
                    aria-label="create"
                  >
                    <AddRoundedIcon sx={{ fontSize: 22 }} />
                  </Fab>

                  {/* 관리 버튼 */}
                  <Fab
                    onClick={handleManageClick}
                    sx={{
                      position: 'fixed',
                      bottom: `${BOTTOM_NAV_HEIGHT + 90}px`,
                      right: 'calc((100% - 768px) / 2 + 16px)',
                      backgroundColor: isManageOpen ? theme.palette.primary.main : theme.palette.transparent.white,
                      backdropFilter: 'blur(4px)',
                      WebkitBackdropFilter: 'blur(4px)',
                      border: `0.1px solid ${theme.palette.transparent.white}`,
                      color: isManageOpen ? theme.palette.primary.contrastText : theme.palette.primary.main,
                      fontWeight: 900,
                      width: 56,
                      height: 56,
                      '&:hover': {
                        backgroundColor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                      },
                      '&:active': {
                        backgroundColor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                      },
                      zIndex: 999,
                      '@media (max-width: 768px)': {
                        right: '16px',
                      },
                    }}
                    aria-label="manage"
                  >
                    <Inventory2OutlinedIcon sx={{ fontSize: 18 }} />
                  </Fab>

                  {/* 관리 버튼 그룹 (슬라이드) */}
                  <ManageButtonGroup
                    isOpen={isManageOpen}
                    entityType="collaboration"
                    entityId={currentEntityId}
                    isRestricted={isBrandApprovalRestricted}
                    onRestricted={openApprovalOverlay}
                    onClose={() => setIsManageOpen(false)}
                  />
                </>
              )}
            </>
          )
        }

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
          {selectedPartner && (
            <PartnerDetailContent
              partner={selectedPartner}
              onClose={handlePartnerModalClose}
              showBottomNavigation={false}
              isModal
            />
          )}
        </Dialog>
      </Box>
    </ScrollToTopProvider>
  );
}

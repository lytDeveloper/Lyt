import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Box, Typography, Dialog, Chip, IconButton, useTheme } from '@mui/material';
import { ScrollToTopProvider } from '../../contexts/ScrollToTopContext';
import { LightningLoader } from '../../components/common';
import { styled } from '@mui/material/styles';
import { useNavigate, useLocation } from 'react-router-dom';
import TabBar, { type TabItem } from '../../components/common/TabBar';
import SearchBar from '../../components/common/SearchBar';
import ExploreFilters from '../../components/common/ExploreFilters';
import { brandService, type Brand } from '../../services/brandService';
import type { ProjectCategory } from '../../types/exploreTypes';
import { COLORS } from '../../styles/onboarding/common.styles';
import BottomNavigationBar, { BOTTOM_NAV_HEIGHT } from '../../components/navigation/BottomNavigationBar';
import PartnerDetailContent from '../../components/explore/PartnerDetailContent';
import { partnerService, type Partner } from '../../services/partnerService';
import { useProfileStore } from '../../stores/profileStore';
import { socialService } from '../../services/socialService';
import { getBrandMetrics } from '../../services/brandMetricsService';
import { CATEGORY_LABELS, PROJECT_CATEGORIES } from '../../constants/projectConstants';
import { LogoPreview, Tag, TagsRow } from '../../styles/onboarding/profile.styles';
import { UploadBadge, SmallEm } from '../../styles/onboarding/common.styles';

// Icons
import BusinessIcon from '@mui/icons-material/Business'; // For Enterprise
import VerifiedIcon from '@mui/icons-material/Verified'; // Blue check
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import FmdGoodOutlinedIcon from '@mui/icons-material/FmdGoodOutlined';
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded';

type TabType = 'brand' | 'partner';

const TABS: TabItem<TabType>[] = [
    { key: 'brand', label: '브랜드' },
    { key: 'partner', label: '파트너' },
];

const CATEGORIES: Array<ProjectCategory | '전체'> = ['전체', ...PROJECT_CATEGORIES];

// Styled Components for Carousel
const Arrow = styled(IconButton)(() => ({
    width: 36,
    height: 36,
    padding: 0,
    color: '#949196',
}));

const HorizontalViewport = styled(Box)({
    overflow: 'hidden',
    width: '100%',
    maxWidth: 300,
    margin: '0 auto',
});

const HorizontalTrack = styled(Box)({
    display: 'flex',
    willChange: 'transform',
});

const HorizontalItem = styled(Box)(() => ({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    minWidth: '100%',
    flexShrink: 0,
    padding: '16px',
}));

const SmallCover = styled('img')({
    width: 80,
    height: 80,
    objectFit: 'cover',
    borderRadius: 12,
    display: 'block',
});

const VerticalViewport = styled(Box)({
    width: '100%',
    maxWidth: 340,
    height: 'auto',
    aspectRatio: '1 / 1',
    borderRadius: '20px',
    overflow: 'hidden',
    border: '2px solid #E5E7EB',
    background: '#F3F7FF',
    margin: '0 auto',
    position: 'relative',
});

const VerticalTrack = styled(Box)({
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    willChange: 'transform',
});

const VerticalItem = styled('img')({
    width: '100%',
    height: '100%',
    minHeight: '100%',
    flexShrink: 0,
    objectFit: 'cover',
    display: 'block',
});

// Debounce hook
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

export default function BrandArtistCollection() {
    const navigate = useNavigate();
    const location = useLocation();
    const userId = useProfileStore((state) => state.userId);
    const [activeTab, setActiveTab] = useState<TabType>('brand');
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300); // 300ms debounce
    const [initialLoadDone, setInitialLoadDone] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<ProjectCategory | '전체'>('전체');
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(false);
    const [isPartnerModalOpen, setPartnerModalOpen] = useState(false);
    const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

    // Like state
    const [likedBrandIds, setLikedBrandIds] = useState<Set<string>>(new Set());

    // Project counts for brands
    const [brandProjectCounts, setBrandProjectCounts] = useState<Record<string, number>>({});

    // Ratings and response/매칭 지표 for brands
    const [brandRatings, setBrandRatings] = useState<Record<string, number | null>>({});
    const [brandResponseRates, setBrandResponseRates] = useState<Record<string, number>>({});
    const [brandMatchingRates, setBrandMatchingRates] = useState<Record<string, number>>({});
    const [brandResponseTimeTexts, setBrandResponseTimeTexts] = useState<Record<string, string>>({});

    // Cache to track loaded data by tab and category
    const [loadedDataCache, setLoadedDataCache] = useState<Record<string, boolean>>({});

    // Carousel state for partner tab
    const [verticalPartners, setVerticalPartners] = useState<Partner[]>([]);
    const [current, setCurrent] = useState(0); // Unified page state for both carousels
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const isTransitioning = true; // Always transitioning

    // 파트너 리스트 (검색 시 사용)
    const [partnerList, setPartnerList] = useState<Partner[]>([]);
    const [partnerListLoading, setPartnerListLoading] = useState(false);
    const [hasMorePartners, setHasMorePartners] = useState(true);
    const [partnerOffset, setPartnerOffset] = useState(0);
    const PARTNER_PAGE_SIZE = 10;

    // 브랜드 더 로드 시 별도 로딩 상태 (스크롤 위치 유지용)
    const [isLoadingMoreBrands, setIsLoadingMoreBrands] = useState(false);

    // 브랜드 무한스크롤
    const [hasMoreBrands, setHasMoreBrands] = useState(true);
    const [brandOffset, setBrandOffset] = useState(0);
    const BRAND_PAGE_SIZE = 20;
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Touch refs
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const verticalRef = useRef<HTMLDivElement>(null);
    const horizontalRef = useRef<HTMLDivElement>(null);

    // URL 쿼리 파라미터로 탭과 검색어 처리
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tabParam = params.get('tab') as TabType | null;
        const searchParam = params.get('search');

        if (tabParam && (tabParam === 'brand' || tabParam === 'partner')) {
            setActiveTab(tabParam);
        }
        if (searchParam) {
            setSearchQuery(decodeURIComponent(searchParam));
        }
        setInitialLoadDone(true);
    }, [location.search]);

    // Fetch brands when brand tab is active or category/search changes
    useEffect(() => {
        if (activeTab === 'brand' && initialLoadDone) {
            loadBrands();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, selectedCategory, debouncedSearchQuery, initialLoadDone]);

    // userId가 변경될 때 좋아요 상태 다시 로드
    useEffect(() => {
        if (activeTab === 'brand' && userId && brands.length > 0) {
            const loadLikedStatus = async () => {
                try {
                    const brandIds = brands.map(b => b.id);
                    const likedMap = await socialService.areLiked(userId, brandIds, 'brand');

                    console.log('Reloaded liked brands after userId change:', likedMap); // 디버깅용

                    const newLikedIds = new Set<string>();
                    Object.entries(likedMap).forEach(([id, isLiked]) => {
                        if (isLiked) {
                            newLikedIds.add(id);
                        }
                    });
                    setLikedBrandIds(newLikedIds);
                } catch (error) {
                    console.error('Failed to reload liked brands:', error);
                }
            };
            loadLikedStatus();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    // Fetch partners when partner tab is active (debounced search)
    useEffect(() => {
        if (activeTab === 'partner' && initialLoadDone) {
            // 검색어 변경 시 캐러셀 인덱스 리셋
            setCurrent(0);

            if (debouncedSearchQuery.trim()) {
                // 검색어가 있으면 검색 결과 로드
                loadPartnersList(true);
            } else {
                // 검색어가 없으면 전체 파트너 로드
                loadPartnersForCarousel();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, selectedCategory, debouncedSearchQuery, initialLoadDone]);

    const loadBrands = async () => {
        // 검색어는 debouncedSearchQuery 사용 (서버 측 검색)
        const currentSearchQuery = debouncedSearchQuery.trim();

        // Check if data is already loaded for this tab+category+search combination
        const cacheKey = `brand-${selectedCategory}-${currentSearchQuery}`;
        if (loadedDataCache[cacheKey]) {
            // Data already loaded, skip API call
            return;
        }

        try {
            setLoading(true);
            // 검색 초기화
            setBrandOffset(0);
            setHasMoreBrands(true);

            const data = await brandService.getAllBrands({
                activity_field: selectedCategory,
                limit: BRAND_PAGE_SIZE,
                searchQuery: currentSearchQuery || undefined,
            });
            setBrands(data);
            setBrandOffset(BRAND_PAGE_SIZE);
            setHasMoreBrands(data.length === BRAND_PAGE_SIZE);

            // Mark this tab+category+search combination as loaded
            setLoadedDataCache(prev => ({ ...prev, [cacheKey]: true }));

            // Fetch like status if user is logged in
            if (userId && data.length > 0) {
                try {
                    const brandIds = data.map(b => b.id);
                    const likedMap = await socialService.areLiked(userId, brandIds, 'brand');

                    console.log('Loaded liked brands:', likedMap); // 디버깅용

                    const newLikedIds = new Set<string>();
                    Object.entries(likedMap).forEach(([id, isLiked]) => {
                        if (isLiked) {
                            newLikedIds.add(id);
                        }
                    });
                    setLikedBrandIds(newLikedIds);
                } catch (error) {
                    console.error('Failed to load liked brands:', error);
                }
            } else {
                // userId가 없으면 좋아요 상태 초기화
                setLikedBrandIds(new Set());
            }

            // Fetch project counts, ratings, and live response/matching metrics for all brands
            if (data.length > 0) {
                const brandIds = data.map(b => b.id);
                const [projectCounts, ratings, metricsList] = await Promise.all([
                    brandService.getBrandProjectCounts(brandIds),
                    brandService.getBrandRatings(brandIds),
                    Promise.all(brandIds.map((id) => getBrandMetrics(id))),
                ]);
                setBrandProjectCounts(projectCounts);
                setBrandRatings(ratings);
                // Build metric maps
                const respRates: Record<string, number> = {};
                const matchRates: Record<string, number> = {};
                const respTimes: Record<string, string> = {};
                metricsList.forEach((metric, idx) => {
                    const brandId = brandIds[idx];
                    if (metric) {
                        respRates[brandId] = metric.responseRate;
                        matchRates[brandId] = metric.matchingRate;
                        respTimes[brandId] = metric.responseTime;
                    }
                });
                setBrandResponseRates(respRates);
                setBrandMatchingRates(matchRates);
                setBrandResponseTimeTexts(respTimes);
            }
        } catch (error) {
            console.error('Failed to load brands:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadPartnersForCarousel = async (reset: boolean = true) => {
        // Check if data is already loaded for this tab+category combination
        const cacheKey = `partner-${selectedCategory}`;
        if (loadedDataCache[cacheKey]) {
            // Data already loaded, skip API call
            return;
        }

        try {
            setLoading(true);
            // Load initial 10 partners for both carousels
            const data = await partnerService.getAllPartners({
                category: selectedCategory,
                limit: 10,
                sortBy: 'created_at',
            });

            // Use same data for both carousels
            setVerticalPartners(data);

            // Mark this tab+category combination as loaded
            setLoadedDataCache(prev => ({ ...prev, [cacheKey]: true }));

            // Reset pagination
            if (reset) {
                setCurrent(0);
            }
        } catch (error) {
            console.error('Failed to load partners:', error);
        } finally {
            setLoading(false);
        }
    };

    // Load more partners when reaching 5th item (캐러셀용)
    const loadMorePartners = async () => {
        if (isLoadingMore) return;

        try {
            setIsLoadingMore(true);
            // Load next 5 partners (offset by current length)
            const data = await partnerService.getAllPartners({
                category: selectedCategory,
                limit: 5,
                from: verticalPartners.length, // Use current array length as offset
                sortBy: 'created_at',
            });

            // Append to existing arrays
            setVerticalPartners(prev => [...prev, ...data]);
        } catch (error) {
            console.error('Failed to load more partners:', error);
        } finally {
            setIsLoadingMore(false);
        }
    };

    // 파트너 리스트 로드 (검색 시 사용)
    const loadPartnersList = useCallback(async (reset: boolean = false) => {
        // reset이 아닐 때만 로딩 중 체크 (더 로드 시)
        if (!reset && partnerListLoading) return;

        try {
            setPartnerListLoading(true);
            const offset = reset ? 0 : partnerOffset;

            const data = await partnerService.searchPartnersWithFilters(
                debouncedSearchQuery,
                selectedCategory,
                { from: offset, limit: PARTNER_PAGE_SIZE }
            );

            if (reset) {
                setPartnerList(data);
                setPartnerOffset(PARTNER_PAGE_SIZE);
            } else {
                setPartnerList(prev => [...prev, ...data]);
                setPartnerOffset(prev => prev + PARTNER_PAGE_SIZE);
            }

            setHasMorePartners(data.length === PARTNER_PAGE_SIZE);
        } catch (error) {
            console.error('Failed to load partners list:', error);
        } finally {
            setPartnerListLoading(false);
        }
    }, [debouncedSearchQuery, selectedCategory, partnerOffset, partnerListLoading]);

    // 브랜드 더 로드 (무한스크롤) - 스크롤 위치 유지를 위해 별도 로딩 상태 사용
    const loadMoreBrands = useCallback(async () => {
        console.log('[loadMoreBrands] Called:', { isLoadingMoreBrands, hasMoreBrands, brandOffset });
        if (isLoadingMoreBrands || !hasMoreBrands) {
            console.log('[loadMoreBrands] Skipping - already loading or no more brands');
            return;
        }

        try {
            setIsLoadingMoreBrands(true);
            console.log('[loadMoreBrands] Fetching from offset:', brandOffset);
            const data = await brandService.getAllBrands({
                activity_field: selectedCategory,
                limit: BRAND_PAGE_SIZE,
                from: brandOffset,
            });
            console.log('[loadMoreBrands] Fetched:', data.length, 'brands');

            if (data.length > 0) {
                setBrands(prev => [...prev, ...data]);
                setBrandOffset(prev => prev + BRAND_PAGE_SIZE);
                setHasMoreBrands(data.length === BRAND_PAGE_SIZE);

                // 새 브랜드들에 대한 추가 데이터 로드
                if (userId) {
                    const brandIds = data.map(b => b.id);
                    const likedMap = await socialService.areLiked(userId, brandIds, 'brand');
                    setLikedBrandIds(prev => {
                        const next = new Set(prev);
                        Object.entries(likedMap).forEach(([id, isLiked]) => {
                            if (isLiked) next.add(id);
                        });
                        return next;
                    });
                }
            } else {
                setHasMoreBrands(false);
            }
        } catch (error) {
            console.error('Failed to load more brands:', error);
        } finally {
            setIsLoadingMoreBrands(false);
        }
    }, [isLoadingMoreBrands, hasMoreBrands, selectedCategory, brandOffset, userId]);

    // 파트너 리스트 더 로드 (무한스크롤)
    const loadMorePartnersList = useCallback(async () => {
        if (partnerListLoading || !hasMorePartners) return;
        await loadPartnersList(false);
    }, [partnerListLoading, hasMorePartners, loadPartnersList]);

    // 무한 스크롤 Intersection Observer
    useEffect(() => {
        // loading 중이거나 브랜드가 없으면 observer를 연결하지 않음
        if (loading || (activeTab === 'brand' && brands.length === 0)) {
            console.log('[InfiniteScroll] Waiting for data to load...');
            return;
        }

        const currentLoadMoreRef = loadMoreRef.current;
        if (!currentLoadMoreRef) {
            console.log('[InfiniteScroll] loadMoreRef is null');
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                console.log('[InfiniteScroll] Intersection:', {
                    isIntersecting: entry.isIntersecting,
                    activeTab,
                    hasMoreBrands,
                    isLoadingMoreBrands,
                });

                if (entry.isIntersecting) {
                    if (activeTab === 'brand' && hasMoreBrands && !isLoadingMoreBrands) {
                        console.log('[InfiniteScroll] Loading more brands...');
                        loadMoreBrands();
                    } else if (activeTab === 'partner' && debouncedSearchQuery.trim() && hasMorePartners && !partnerListLoading) {
                        loadMorePartnersList();
                    }
                }
            },
            { threshold: 0.1, rootMargin: '200px' }
        );

        observer.observe(currentLoadMoreRef);
        console.log('[InfiniteScroll] Observer attached to ref');

        return () => {
            if (currentLoadMoreRef) {
                observer.unobserve(currentLoadMoreRef);
            }
        };
    }, [activeTab, hasMoreBrands, hasMorePartners, isLoadingMoreBrands, partnerListLoading, debouncedSearchQuery, loadMoreBrands, loadMorePartnersList, loading, brands.length]);

    const handleToggleLike = async (e: React.MouseEvent, brandId: string) => {
        e.stopPropagation(); // Prevent card click
        if (!userId) {
            // Show login prompt or alert
            alert('로그인이 필요한 서비스입니다.');
            return;
        }

        const wasLiked = likedBrandIds.has(brandId);

        // Optimistic update
        setLikedBrandIds(prev => {
            const next = new Set(prev);
            if (wasLiked) next.delete(brandId);
            else next.add(brandId);
            return next;
        });

        try {
            // 클라이언트 상태를 기준으로 직접 like/unlike 호출
            if (wasLiked) {
                await socialService.unlikeEntity(userId, brandId, 'brand');
            } else {
                await socialService.likeEntity(userId, brandId, 'brand');
            }

            // 성공 시 상태는 이미 optimistic update로 반영됨
        } catch (error) {
            console.error('Failed to toggle like:', error);
            // Revert on error - 원래 상태로 복구
            setLikedBrandIds(prev => {
                const next = new Set(prev);
                if (wasLiked) {
                    next.add(brandId);
                } else {
                    next.delete(brandId);
                }
                return next;
            });

            // 사용자에게 에러 알림
            alert('좋아요 처리 중 오류가 발생했어요. 다시 시도해주세요.');
        }
    };

    // Filter brands based on category (search is now handled server-side)
    // Note: Server already applies both category and search filters,
    // so we can use brands directly. This filter is just for safety/consistency.
    const filteredBrands = brands;

    // 캐러셀에 표시할 파트너 (검색어가 있으면 검색 결과, 없으면 전체 목록)
    const displayPartners = useMemo(() => {
        return debouncedSearchQuery.trim() ? partnerList : verticalPartners;
    }, [debouncedSearchQuery, partnerList, verticalPartners]);

    // Unified carousel navigation handlers (both carousels move together)
    const handleNext = () => {
        if (!isTransitioning) return;
        if (current >= displayPartners.length - 1) return;

        setCurrent((c) => c + 1);

        // Load more when reaching 5th item (index 4) and every 5 items after
        if (!debouncedSearchQuery.trim() && (current + 1) % 5 === 4 && current + 1 >= 4) {
            loadMorePartners();
        }
    };

    const handlePrev = () => {
        if (!isTransitioning) return;
        if (current <= 0) return;
        setCurrent((c) => c - 1);
    };

    // Touch handlers for swipe (both horizontal and vertical trigger same actions)
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchStartX.current - touchEndX;
        const deltaY = touchStartY.current - touchEndY;

        const threshold = 50;

        // Handle left/right swipe
        if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > 0) {
                handleNext(); // Swipe left → next
            } else {
                handlePrev(); // Swipe right → prev
            }
        }
        // Handle up/down swipe
        else if (Math.abs(deltaY) > threshold && Math.abs(deltaY) > Math.abs(deltaX)) {
            if (deltaY > 0) {
                handleNext(); // Swipe up → next
            } else {
                handlePrev(); // Swipe down → prev
            }
        }
    };

    const handleBrandClick = (brandId: string) => {
        // Navigate to brand profile detail (implement this route if needed)
        console.log('Navigate to brand:', brandId);
        // navigate(`/profile/brand/${brandId}`);
    };

    const handlePartnerClick = async (partnerId: string) => {
        // Fetch partner data for the modal
        try {
            const partner = await partnerService.getPartnerById(partnerId);
            setSelectedPartner(partner);
            setPartnerModalOpen(true);
        } catch (error) {
            console.error('Failed to load partner detail:', error);
        }
    };

    const handlePartnerModalClose = () => {
        setPartnerModalOpen(false);
        setSelectedPartner(null);
    };

    // Carousel offset calculations (unified)
    const verticalOffset = useMemo(
        () => `translateY(-${current * 100}%)`,
        [current]
    );

    const horizontalOffset = useMemo(() => {
        const bottomIndex = Math.min(current + 1, Math.max(displayPartners.length - 1, 0));
        return `translateX(-${bottomIndex * 100}%)`;
    }, [current, displayPartners.length]);

    const transitionStyle = isTransitioning ? 'transform 400ms ease' : 'none';

    const theme = useTheme();
    return (
        <ScrollToTopProvider>
            <Box
                sx={{
                    minHeight: '100vh',
                    backgroundColor: theme.palette.background.default,
                    pb: `${BOTTOM_NAV_HEIGHT}px`,
                }}
            >
                {/* Header */}
                <Box
                    sx={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 10,
                        backgroundColor: 'transparent',
                        backdropFilter: 'blur(3px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(3px) saturate(180%)',
                        height: '56px',
                        pt: 0,
                    }}
                >
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            height: 56,
                            px: 2,
                            gap: 1,
                        }}
                    >
                        <Box
                            onClick={() => navigate(-1)}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                '&:active': { opacity: 0.6 },
                            }}
                        >
                            <ArrowBackIosNewRoundedIcon sx={{ fontSize: 24, color: COLORS.TEXT_PRIMARY }} />
                        </Box>
                        <Typography
                            sx={{
                                fontFamily: 'Pretendard, sans-serif',
                                fontSize: 18,
                                fontWeight: 700,
                                color: COLORS.TEXT_PRIMARY,
                            }}
                        >
                            새로운 브랜드/파트너
                        </Typography>
                    </Box>
                </Box>

                {/* Main Content */}
                <Box sx={{ px: 2, pt: 2.5 }}>
                    {/* Tab Bar */}
                    <TabBar tabs={TABS} activeTab={activeTab} onTabChange={(tab) => {
                        setActiveTab(tab);
                        setSearchQuery(''); // 탭 변경 시 검색어 초기화
                    }} />

                    {/* Search Bar */}
                    <SearchBar
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder={
                            activeTab === 'brand'
                                ? '브랜드를 검색해보세요'
                                : '파트너를 검색해보세요'
                        }
                    />

                    {/* Filters (Categories only, no statuses) */}
                    <ExploreFilters
                        categories={CATEGORIES}
                        statuses={[]}
                        selectedCategory={selectedCategory}
                        selectedStatuses={[]}
                        onCategoryChange={setSelectedCategory}
                        onStatusToggle={() => { }}
                        showStatuses={false}
                    />

                    {/* Content Area */}
                    <Box sx={{ mt: 2.5 }}>
                        {loading ? (
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    minHeight: 200,
                                }}
                            >
                                <LightningLoader color={COLORS.CTA_BLUE} />
                            </Box>
                        ) : (
                            <>
                                {/* Brand Tab Content */}
                                {activeTab === 'brand' && (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {filteredBrands.length === 0 ? (
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    minHeight: 200,
                                                    gap: 1,
                                                }}
                                            >
                                                <Typography
                                                    sx={{
                                                        fontFamily: 'Pretendard, sans-serif',
                                                        fontSize: 14,
                                                        color: COLORS.TEXT_SECONDARY,

                                                    }}
                                                >
                                                    브랜드를 찾을 수 없습니다
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <>
                                                {filteredBrands.map((brand) => (
                                                    <BrandCard
                                                        key={brand.id}
                                                        brand={brand}
                                                        isLiked={likedBrandIds.has(brand.id)}
                                                        onToggleLike={(e) => handleToggleLike(e, brand.id)}
                                                        onClick={() => handleBrandClick(brand.id)}
                                                        projectCount={brandProjectCounts[brand.id] || 0}
                                                        rating={brandRatings[brand.id] ?? null}
                                                        responseTimeText={brandResponseTimeTexts[brand.id]}
                                                        responseRate={brandResponseRates[brand.id]}
                                                        matchingRate={brandMatchingRates[brand.id]}
                                                    />
                                                ))}

                                                {/* 무한 스크롤 트리거 */}
                                                {hasMoreBrands && <div ref={loadMoreRef} style={{ height: 1 }} />}

                                                {/* 로딩 인디케이터 */}
                                                {isLoadingMoreBrands && brands.length > 0 && (
                                                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                                        <LightningLoader color={COLORS.CTA_BLUE} />
                                                    </Box>
                                                )}

                                                {/* 더 이상 데이터 없음 */}
                                                {!hasMoreBrands && filteredBrands.length > 0 && (
                                                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                            더 이상 표시할 브랜드가 없어요.
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </>
                                        )}
                                    </Box>
                                )}

                                {/* Partner Tab Content */}
                                {activeTab === 'partner' && (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                        {/* 검색어가 있으면 검색 결과를 캐러셀로, 없으면 전체 파트너를 캐러셀로 */}
                                        {debouncedSearchQuery.trim() && partnerListLoading && partnerList.length === 0 ? (
                                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                                                <LightningLoader color={COLORS.CTA_BLUE} />
                                            </Box>
                                        ) : debouncedSearchQuery.trim() && partnerList.length === 0 && !partnerListLoading ? (
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    minHeight: 200,
                                                    gap: 1,
                                                }}
                                            >
                                                <Typography
                                                    sx={{
                                                        fontFamily: 'Pretendard, sans-serif',
                                                        fontSize: 14,
                                                        color: COLORS.TEXT_SECONDARY,
                                                    }}
                                                >
                                                    '{searchQuery}'에 해당하는 파트너를 찾을 수 없습니다
                                                </Typography>
                                            </Box>
                                        ) : (debouncedSearchQuery.trim() ? partnerList : verticalPartners).length === 0 ? (
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    minHeight: 200,
                                                    gap: 1,
                                                }}
                                            >
                                                <Typography
                                                    sx={{
                                                        fontFamily: 'Pretendard, sans-serif',
                                                        fontSize: 14,
                                                        color: COLORS.TEXT_SECONDARY,
                                                    }}
                                                >
                                                    파트너를 찾을 수 없습니다
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <>
                                                {/* Vertical Carousel - Top */}
                                                <Box sx={{ width: '100%', maxWidth: 340, margin: '0 auto' }}>
                                                    <Box sx={{ position: 'relative', width: '82%', maxWidth: 340, margin: '0 auto' }}>
                                                        <VerticalViewport
                                                            ref={verticalRef}
                                                            onTouchStart={handleTouchStart}
                                                            onTouchEnd={handleTouchEnd}
                                                            onClick={() => handlePartnerClick(displayPartners[current]?.id)}
                                                        >
                                                            <VerticalTrack style={{ transform: verticalOffset, transition: transitionStyle }}>
                                                                {displayPartners.map((partner, idx) => (
                                                                    <Box key={`v-${idx}`} sx={{ width: '100%', height: '100%', minHeight: '100%', flexShrink: 0 }}>
                                                                        {partner?.coverImageUrl ? (
                                                                            <VerticalItem src={partner.coverImageUrl} alt={partner?.name ?? 'partner'} />
                                                                        ) : (
                                                                            <Box sx={{ width: '100%', height: '100%', minHeight: '100%', background: '#E9E9ED' }} />
                                                                        )}
                                                                    </Box>
                                                                ))}
                                                            </VerticalTrack>
                                                        </VerticalViewport>

                                                        {/* Logo Badge */}
                                                        <UploadBadge sx={{ width: 54, height: 54 }}>
                                                            {displayPartners[current]?.profileImageUrl ? (
                                                                <LogoPreview src={displayPartners[current].profileImageUrl} alt={displayPartners[current]?.name ?? 'partner'} />
                                                            ) : (
                                                                'image'
                                                            )}
                                                        </UploadBadge>
                                                    </Box>

                                                    {/* Partner Info */}
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 1.5,
                                                            marginTop: 0,
                                                            paddingLeft: '104px',
                                                            height: 44,
                                                        }}
                                                    >
                                                        <Box
                                                            sx={{
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'flex-start',
                                                                gap: 0.25,
                                                            }}
                                                        >
                                                            <Typography
                                                                sx={(theme) => ({
                                                                    fontFamily: 'Pretendard, sans-serif',
                                                                    fontSize: 16,
                                                                    fontWeight: 500,
                                                                    color: theme.palette.text.primary,
                                                                })}
                                                            >
                                                                {displayPartners[current]?.name ?? ''}
                                                            </Typography>
                                                            <SmallEm>{displayPartners[current]?.activityField ?? ''}</SmallEm>
                                                        </Box>
                                                    </Box>

                                                    {/* Tags */}
                                                    <Box sx={{
                                                        height: 80, marginTop: 1.5,
                                                        px: 3,
                                                    }}>
                                                        <TagsRow sx={{
                                                            justifyContent: 'center',
                                                        }}>
                                                            {displayPartners[current]?.specializedRoles?.map((role) => (
                                                                <Tag key={role}>#{role}</Tag>
                                                            ))}
                                                            {displayPartners[current]?.tags?.map((tag) => (
                                                                <Tag key={tag}>#{tag}</Tag>
                                                            ))}
                                                            {(displayPartners[current] as { highlightKeywords?: string[] })?.highlightKeywords?.map((keyword: string) => (
                                                                <Tag key={keyword}>#{keyword}</Tag>
                                                            ))}
                                                        </TagsRow>
                                                    </Box>

                                                </Box>

                                                {/* Horizontal Carousel - Bottom */}
                                                <Typography
                                                    sx={{
                                                        fontFamily: 'Pretendard, sans-serif',
                                                        fontSize: 16,
                                                        fontWeight: 500,
                                                        color: COLORS.TEXT_PRIMARY,
                                                        px: 3
                                                    }}
                                                >
                                                    다양한 파트너를 더 만나보세요
                                                </Typography>

                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, mb: 4 }}>
                                                    <Arrow aria-label="prev" onClick={handlePrev}>
                                                        <ArrowBackIosNewRoundedIcon sx={{ fontSize: 24, color: theme.palette.icon.default }} />
                                                    </Arrow>

                                                    <HorizontalViewport
                                                        ref={horizontalRef}
                                                        onTouchStart={handleTouchStart}
                                                        onTouchEnd={handleTouchEnd}
                                                    >
                                                        <HorizontalTrack style={{ transform: horizontalOffset, transition: transitionStyle }}>
                                                            {displayPartners.map((partner, idx) => (
                                                                <HorizontalItem
                                                                    key={`h-${idx}`}
                                                                    onClick={() => handlePartnerClick(partner.id)}
                                                                    sx={{ cursor: 'pointer' }}
                                                                >
                                                                    {partner?.profileImageUrl ? (
                                                                        <SmallCover src={partner.profileImageUrl} alt={partner?.name ?? 'partner'} />
                                                                    ) : (
                                                                        <Box sx={{ width: 80, height: 80, background: '#E9E9ED' }} />
                                                                    )}
                                                                    <Box
                                                                        sx={{
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            alignItems: 'flex-start',
                                                                            textAlign: 'center',
                                                                        }}
                                                                    >
                                                                        <Typography
                                                                            sx={{
                                                                                fontFamily: 'Pretendard, sans-serif',
                                                                                fontSize: 12,
                                                                                color: '#949196',
                                                                            }}
                                                                        >
                                                                            PARTNER
                                                                        </Typography>
                                                                        <Typography
                                                                            sx={(theme) => ({
                                                                                fontFamily: 'Pretendard, sans-serif',
                                                                                fontSize: 16,
                                                                                fontWeight: 600,
                                                                                color: theme.palette.text.primary,
                                                                            })}
                                                                        >
                                                                            {partner?.name ?? ''}
                                                                        </Typography>
                                                                    </Box>
                                                                </HorizontalItem>
                                                            ))}
                                                        </HorizontalTrack>
                                                    </HorizontalViewport>

                                                    <Arrow aria-label="next" onClick={handleNext}>
                                                        <ArrowForwardIosRoundedIcon sx={{ fontSize: 24, color: theme.palette.icon.default }} />
                                                    </Arrow>
                                                </Box>
                                            </>
                                        )}
                                    </Box>
                                )}
                            </>
                        )}
                    </Box>
                </Box>

                {/* Bottom Navigation */}
                <BottomNavigationBar />

                {/* Partner Detail Modal */}
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

// Brand Card Component
interface BrandCardProps {
    brand: Brand;
    onClick: () => void;
    isLiked: boolean;
    onToggleLike: (e: React.MouseEvent) => void;
    projectCount: number;
    rating: number | null;
    responseTimeText?: string;
    responseRate?: number;
    matchingRate?: number;
}

function BrandCard({ brand, onClick, isLiked, onToggleLike, }: BrandCardProps) {
    const navigate = useNavigate();

    const categoryLabel = CATEGORY_LABELS[brand.activityField as ProjectCategory] || brand.activityField;


    const theme = useTheme();

    return (
        <Box
            onClick={onClick}
            sx={{
                position: 'relative',
                borderRadius: '24px', // More rounded as per screenshot
                overflow: 'hidden',
                cursor: 'pointer',
                backgroundColor: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                transition: 'all 0.2s',
                '&:active': {
                    transform: 'scale(0.99)',
                },
            }}
        >
            {/* 1. Cover Image Area */}
            <Box
                sx={{
                    position: 'relative',
                    height: 240, // Increased height as per screenshot
                    backgroundColor: '#E5E7EB',
                    overflow: 'hidden',
                }}
            >
                {brand.coverImageUrl ? (
                    <Box
                        component="img"
                        src={brand.coverImageUrl}
                        alt={brand.name}
                        sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                        }}
                    />
                ) : (
                    <Box
                        sx={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#F3F4F6',
                        }}
                    >
                        <Typography
                            sx={{
                                fontFamily: 'Pretendard, sans-serif',
                                fontSize: 12,
                                color: COLORS.TEXT_SECONDARY,
                            }}
                        >
                            No Image
                        </Typography>
                    </Box>
                )}

                {/* Enterprise Chip (Top Left) */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        backgroundColor: theme.palette.transparent.white,
                        backdropFilter: 'blur(2px)',
                        padding: '6px 12px',
                        borderRadius: '100px',
                        color: '#fff',
                        zIndex: 1,
                    }}
                >
                    <BusinessIcon sx={{ fontSize: 16 }} />
                    <Typography sx={{ fontSize: 13, fontWeight: 600, fontFamily: 'Pretendard, sans-serif' }}>
                        Enterprise
                    </Typography>
                </Box>

                {/* Like Button (Top Right) */}
                <IconButton
                    onClick={onToggleLike}
                    sx={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        color: '#fff',
                        backgroundColor: theme.palette.transparent.white,
                        backdropFilter: 'blur(2px)',
                        padding: '4px',
                    }}
                >
                    {isLiked ? <FavoriteIcon sx={{ color: theme.palette.status.red, fontSize: '20px' }} /> : <FavoriteBorderIcon sx={{ fontSize: '20px' }} />}
                </IconButton>
            </Box>

            {/* Content Container */}
            <Box sx={{ p: 2.5 }}>
                {/* 3. Brand Name & Verified Badge */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <Typography
                        sx={{
                            fontFamily: 'Pretendard, sans-serif',
                            fontSize: 20,
                            fontWeight: 700,
                            color: COLORS.TEXT_PRIMARY,
                        }}
                    >
                        {brand.name}
                    </Typography>
                    <VerifiedIcon sx={{ fontSize: 20, color: '#3B82F6' }} />
                </Box>

                {/* 4. Brand Label & Category */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <BusinessOutlinedIcon sx={{ fontSize: 18, color: COLORS.TEXT_SECONDARY }} />
                        <Typography sx={{ fontSize: 14, color: COLORS.TEXT_SECONDARY, fontWeight: 500 }}>
                            브랜드
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', color: COLORS.TEXT_SECONDARY }}>
                            <FolderOutlinedIcon sx={{ fontSize: 18 }} />
                        </Box>
                        <Typography sx={{ fontSize: 14, color: COLORS.TEXT_SECONDARY, fontWeight: 500 }}>
                            {categoryLabel}
                        </Typography>
                    </Box>
                </Box>

                {/* 5. Description */}
                {brand.description && (
                    <Typography
                        sx={{
                            fontFamily: 'Pretendard, sans-serif',
                            fontSize: 14,
                            color: COLORS.TEXT_SECONDARY,
                            lineHeight: 1.5,
                            mb: 2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 5,
                            WebkitBoxOrient: 'vertical',
                        }}
                    >
                        {brand.description}
                    </Typography>
                )}

                {/* 8. Expanded Content (Stats & Tags) */}
                {/* 9. Tags */}
                {brand.targetAudiences && brand.targetAudiences.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                        {brand.targetAudiences.map((tag, index) => (
                            <Chip
                                key={index}
                                label={`#${tag}`}
                                size="small"
                                sx={{
                                    backgroundColor: theme.palette.grey[100],
                                    color: theme.palette.subText.default,
                                    fontSize: 12,
                                    fontWeight: 500,
                                    borderRadius: '20px',
                                    height: 28,
                                }}
                            />
                        ))}
                    </Box>
                )}

                {/* 7. Footer (Region & Contact) */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        pt: 1,
                    }}
                >
                    {/* Region */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: COLORS.TEXT_SECONDARY }}>
                        <FmdGoodOutlinedIcon sx={{ fontSize: 18 }} />
                        <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                            {brand.region || '지역 미설정'}
                        </Typography>
                    </Box>

                    {/* Contact Button */}
                    <Box
                        component="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/partnership-inquiry/${brand.id}`);
                        }}
                        sx={{
                            backgroundColor: '#2563EB', // Blue button
                            color: '#fff',
                            border: 'none',
                            borderRadius: '25px',
                            padding: '8px 16px',
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            '&:active': {
                                transform: 'scale(0.98)',
                            },
                        }}
                    >
                        파트너십 문의
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}


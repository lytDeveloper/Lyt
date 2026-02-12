import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, Dialog, useTheme } from '@mui/material';
import { LightningLoader } from '../../components/common';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useExploreStore } from '../../stores/exploreStore';
import { useProfileStore } from '../../stores/profileStore';
import { useAuth } from '../../providers/AuthContext';
import { useExploreFeed } from '../../hooks/useExploreFeed';
import {
    type ProjectCategory,
    type ProjectStatus,
} from '../../services/exploreService';
import PartnerCard from '../../components/explore/PartnerCard';
import PartnerDetailContent from '../../components/explore/PartnerDetailContent';
import ExploreFilters from '../../components/common/ExploreFilters';
import Header, { HEADER_HEIGHT } from '../../components/common/Header';
import { PROJECT_CATEGORIES, CATEGORY_LABELS } from '../../constants/projectConstants';
import SearchBar from '../../components/common/SearchBar';
import { BOTTOM_NAV_HEIGHT } from '../../components/navigation/BottomNavigationBar';

const CATEGORIES: Array<ProjectCategory | '전체'> = ['전체', ...PROJECT_CATEGORIES];
const STATUSES: ProjectStatus[] = ['in_progress', 'open'];

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

export default function PartnerSearchPage() {
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();

    // Store state
    const {
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        selectedStatuses,
        toggleStatus,
        initializeSocialData,
        artistOnlyFilter,
    } = useExploreStore();

    useProfileStore();
    useAuth();

    // Initialize social data (likes/follows) from DB
    useEffect(() => {
        initializeSocialData();
    }, [initializeSocialData]);

    // Handle refresh state
    useEffect(() => {
        const state = location.state as { refresh?: boolean } | null;
        if (state?.refresh) {
            queryClient.invalidateQueries({ queryKey: ['explore'] });
            navigate(location.pathname + location.search, { replace: true, state: {} });
        }
    }, [location.state, location.pathname, location.search, queryClient, navigate]);

    // Sync category with query parameter
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

    // Debounce search query
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const effectiveStatuses = useMemo<ProjectStatus[]>(
        () => (selectedStatuses.length > 0 ? selectedStatuses : STATUSES),
        [selectedStatuses],
    );

    // React Query: Fetch explore feed
    const {
        data,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useExploreFeed(
        selectedCategory,
        effectiveStatuses,
        debouncedSearchQuery,
        'partners'
    );

    // Filter partners logic (reused from Explore.tsx)
    const allPartners = useMemo(() => {
        const all = data?.pages.flatMap((page) => page.partners) ?? [];
        const seen = new Set<string>();
        return all.filter((p) => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
        });
    }, [data]);

    const partners = useMemo(() => {
        let filtered = allPartners;
        // Always consider activeTab is 'partners' equivalent
        if (selectedCategory !== '전체') {
            const categoryLabel = CATEGORY_LABELS[selectedCategory as ProjectCategory];
            filtered = filtered.filter((partner) => {
                const activityField = partner.activityField || '';
                return activityField.includes(categoryLabel);
            });
        }
        if (artistOnlyFilter) {
            filtered = filtered.filter((partner) => partner.role === 'artist');
        }
        return filtered;
    }, [allPartners, selectedCategory, artistOnlyFilter]);

    // Infinite Scroll logic
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const isFetchingRef = useRef(false);

    const shouldLoadMore = useMemo(() => {
        if (!hasNextPage || !data?.pages?.length) return false;
        const lastPage = data.pages[data.pages.length - 1];
        return !!lastPage.partnersCursor;
    }, [hasNextPage, data]);

    useEffect(() => {
        const currentLoadMoreRef = loadMoreRef.current;
        if (!currentLoadMoreRef) return;
        if (!shouldLoadMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (
                    entries[0].isIntersecting &&
                    shouldLoadMore &&
                    !isFetchingNextPage &&
                    !isFetchingRef.current
                ) {
                    isFetchingRef.current = true;
                    fetchNextPage().finally(() => {
                        setTimeout(() => {
                            isFetchingRef.current = false;
                        }, 1000);
                    });
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        observer.observe(currentLoadMoreRef);
        return () => {
            if (currentLoadMoreRef) observer.unobserve(currentLoadMoreRef);
            isFetchingRef.current = false;
        };
    }, [shouldLoadMore, isFetchingNextPage, fetchNextPage]);

    // Local state for UI management
    const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
    const [isPartnerModalOpen, setPartnerModalOpen] = useState(false);

    const selectedPartner = useMemo(() => {
        if (!selectedPartnerId) {
            return null;
        }
        return partners.find((partner) => partner.id === selectedPartnerId) ?? null;
    }, [partners, selectedPartnerId]);

    const handlePartnerClick = useCallback((_partnerId: string) => {
        setSelectedPartnerId(_partnerId);
        setPartnerModalOpen(true);
    }, []);

    const handlePartnerModalClose = useCallback(() => {
        setPartnerModalOpen(false);
        setSelectedPartnerId(null);
    }, []);

    return (
        <Box sx={{
            height: '100vh',
            backgroundColor: '#fff',
            position: 'relative',
            overflow: 'hidden',
            maxWidth: '768px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
        }}>
            {/* Header */}
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 }}>
                <Header showBackButton onBackClick={() => navigate(-1)} />
            </Box>

            {/* Content */}
            <Box sx={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                px: 2,
                pb: `${BOTTOM_NAV_HEIGHT + 20}px`,
                '&::-webkit-scrollbar': { display: 'none' },
            }}>
                <Box sx={{ marginTop: `${HEADER_HEIGHT}px`, pt: 3, pb: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>파트너 찾기</Typography>
                    <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="원하는 파트너를 찾아보세요." />
                    <ExploreFilters
                        categories={CATEGORIES}
                        statuses={STATUSES}
                        selectedCategory={selectedCategory}
                        selectedStatuses={selectedStatuses}
                        onCategoryChange={setSelectedCategory}
                        onStatusToggle={toggleStatus}
                    />
                </Box>

                {/* List */}
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <LightningLoader />
                    </Box>
                ) : partners.length === 0 ? (
                    <Box sx={{ py: 8, textAlign: 'center', color: theme.palette.text.secondary }}>
                        검색 결과가 없어요.
                    </Box>
                ) : (
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
                        {partners.map((partner) => (
                            <PartnerCard
                                key={partner.id}
                                partner={partner}
                                onClick={() => handlePartnerClick(partner.id)}
                            />
                        ))}
                    </Box>
                )}

                {shouldLoadMore && <div ref={loadMoreRef} style={{ height: 1 }} />}
                {isFetchingNextPage && <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><LightningLoader size={24} /></Box>}
            </Box>

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
    );
}

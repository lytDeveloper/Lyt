import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Modal,
  Dialog,
  Box,
  TextField,
  Typography,
  IconButton,
  InputAdornment,
  useTheme,
} from '@mui/material';
import { LightningLoader } from '../common';
import { AnimatePresence, motion } from 'framer-motion';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import SearchIcon from '@mui/icons-material/Search';
import { searchService } from '../../services/searchService';
import { useAuth } from '../../providers/AuthContext';
import { useSearchStore } from '../../stores/searchStore';
import HomeDiscoveryView from './views/HomeDiscoveryView';
import GlobalHistoryView from './views/GlobalHistoryView';
import SearchResultsView from './SearchResultsView';
import PartnerDetailContent from '../explore/PartnerDetailContent';
import { partnerService, type Partner } from '../../services/partnerService';
import { getBrandById, getBrandStats } from '../../services/brandService';
import {
  addRecentlyViewed,
  addRecentlyViewedToServer,
} from '../../services/recentViewsService';

// Placeholder 순환 상수
const PLACEHOLDER_CYCLE_INTERVAL = 3000; // 3초

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
  mode?: 'home' | 'global'; // 'home' for Home page, 'global' for other pages
}

export default function SearchModal({
  open,
  onClose,
  initialQuery,
  mode = 'global',
}: SearchModalProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Use searchStore for persisted state (survives navigation)
  const { query, setQuery, results: searchResults, setResults: setSearchResults, clear } = useSearchStore();

  const [isSearching, setIsSearching] = useState(false);
  const [currentSearchQueryId, setCurrentSearchQueryId] = useState<string | null>(null);

  // Partner detail modal state
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [partnerLoading, setPartnerLoading] = useState(false);

  // 애니메이션 placeholder 상태
  const [placeholders, setPlaceholders] = useState<string[] | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 프로젝트 타이틀 로드 (home/global 공통 placeholder에 사용)
  useEffect(() => {
    if (!open) return;

    const loadProjectTitles = async () => {
      try {
        const { projects } = await searchService.getTrendingContents(5);

        if (projects?.length) {
          setPlaceholders(projects.map((p) => p.title));
          setPlaceholderIndex(0);
        } else {
          setPlaceholders(null);
        }
      } catch (error) {
        console.error(
          'Failed to load project titles for placeholder:',
          error
        );
        setPlaceholders(null);
      }
    };

    loadProjectTitles();
  }, [open]);

  // Placeholder 순환 애니메이션 (query가 비어있을 때만)
  useEffect(() => {
    // 기존 interval 정리
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // placeholder 없거나, query 있거나, 1개 이하면 애니메이션 안 함
    if (
      !placeholders ||
      placeholders.length <= 1 ||
      query.trim().length > 0
    ) {
      return;
    }

    intervalRef.current = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, PLACEHOLDER_CYCLE_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [placeholders, query]);

  // 현재 placeholder
  const currentPlaceholder = placeholders?.[placeholderIndex];

  // Initialize query when modal opens - reset if no initialQuery
  useEffect(() => {
    if (open) {
      // If initialQuery is provided, use it (fresh search)
      if (initialQuery) {
        setQuery(initialQuery);
        setSearchResults({ projects: [], partners: [], collaborations: [] });
      } else {
        // Reset search state when opening modal without initialQuery
        clear();
      }
      setCurrentSearchQueryId(null);
      setPlaceholderIndex(0);
    }
  }, [open, initialQuery, setQuery, setSearchResults, clear]);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setSearchResults({ projects: [], partners: [], collaborations: [] });
      setIsSearching(false);
      setCurrentSearchQueryId(null);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      // Pass userId to searchAll for partner blocking/hiding filters
      const results = await searchService.searchAll(query, 10, user?.id);
      setSearchResults(results);
      setIsSearching(false);

      // 검색 결과 수 계산 및 검색 쿼리 저장
      const totalResults =
        results.projects.length + results.partners.length + results.collaborations.length;
      if (user) {
        const queryId = await searchService.saveSearchQuery(user.id, query, 'all', totalResults);
        setCurrentSearchQueryId(queryId);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, user]);

  const handleSearchSubmit = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim() || searchQuery.trim().length < 2) return;

      // Save to search history
      if (user) {
        await searchService.saveSearchHistory(user.id, searchQuery, 'all');
      }

      // Perform search if not already done
      if (query !== searchQuery) {
        setQuery(searchQuery);
      }
    },
    [user, query]
  );

  const handleResultClick = (type: 'project' | 'partner' | 'collaboration', id: string) => {
    // 클릭 추적 (search_queries 테이블 업데이트)
    if (currentSearchQueryId) {
      searchService.updateClickedResult(currentSearchQueryId, id, type);
    }

    // Save to recently viewed
    const result = getResultForType(type, id);
    if (result) {
      const viewItem = {
        id,
        type,
        title: result.title,
        image: result.image,
        subtitle: result.subtitle,
      };

      // 로그인 사용자: 서버에 저장
      if (user) {
        addRecentlyViewedToServer(user.id, viewItem);
      }
      // 항상 LocalStorage에도 저장 (fallback)
      addRecentlyViewed(viewItem);
    }

    // Navigate to detail page or show modal
    if (type === 'project') {
      navigate(`/explore/project/${id}`);
    } else if (type === 'partner') {
      // Show partner modal instead of navigating
      setSelectedPartnerId(id);
      setPartnerLoading(true);
      (async () => {
        try {
          // 먼저 파트너(artist/creative) 조회 시도
          let partner = await partnerService.getPartnerById(id);

          // 파트너가 없으면 브랜드인지 확인
          if (!partner) {
            const brand = await getBrandById(id);
            if (brand) {
              // 브랜드 통계 조회 (실제 데이터)
              const brandStats = await getBrandStats(brand.id);

              // 브랜드를 Partner 형식으로 변환 (explore-feed의 fetchBrands 로직 참고)
              partner = {
                id: brand.id,
                name: brand.name,
                activityField: brand.activityField,
                role: 'brand',
                specializedRoles: brand.targetAudiences || [],
                tags: [],
                bio: brand.description || '',
                profileImageUrl: brand.logoImageUrl || '',
                coverImageUrl: brand.coverImageUrl || '',
                portfolioImages: [],
                rating: brandStats.rating ?? 0,
                reviewCount: brandStats.reviewCount,
                completedProjects: brandStats.completedProjects,
                region: brand.region || '',
                matchingRate: 0, // 브랜드는 matchingRate 없음
                responseRate: brandStats.responseRate ?? 0,
                responseTime: brandStats.responseTime ?? '24시간 이내',
                career: '',
                isOnline: false,
                isVerified: false,
                careerHistory: [],
                category: brand.activityField,
                display: {
                  displayName: brand.name,
                  displayAvatar: brand.logoImageUrl || '',
                  displayField: brand.activityField,
                  displayCategory: 'brand',
                  displaySource: 'brand',
                },
              } as Partner;
            }
          }

          setSelectedPartner(partner);
          setPartnerLoading(false);
        } catch (error) {
          console.error('[SearchModal] Failed to load partner/brand:', error);
          setPartnerLoading(false);
          setSelectedPartnerId(null);
          // Fallback: navigate to profile page
          navigate(`/profile/${id}`);
        }
      })();
    } else if (type === 'collaboration') {
      navigate(`/explore/collaboration/${id}`);
    }
  };

  const handlePartnerModalClose = () => {
    setSelectedPartnerId(null);
    setSelectedPartner(null);
  };

  // Clear search state when modal closes
  useEffect(() => {
    if (!open) {
      clear();
    }
  }, [open, clear]);

  const getResultForType = (
    type: 'project' | 'partner' | 'collaboration',
    id: string
  ): { title: string; image?: string | null; subtitle?: string } | null => {
    if (type === 'project') {
      const project = searchResults.projects.find((p) => p.id === id);
      return project
        ? {
          title: project.title,
          image: project.cover_image_url,
          subtitle: project.description,
        }
        : null;
    } else if (type === 'partner') {
      const partner = searchResults.partners.find((p) => p.profile_id === id);
      return partner
        ? {
          title: partner.name,
          image: partner.logo_image_url || partner.profile_image_url,
          subtitle:
            partner.type === 'brand'
              ? `브랜드 • ${partner.category || ''}`
              : partner.type === 'artist'
                ? `아티스트 • ${partner.activity_field || ''}`
                : '크리에이티브',
        }
        : null;
    } else {
      const collab = searchResults.collaborations.find((c) => c.id === id);
      return collab
        ? {
          title: collab.title,
          image: collab.cover_image_url,
          subtitle: collab.brief_description,
        }
        : null;
    }
  };

  const hasResults =
    searchResults.projects.length > 0 ||
    searchResults.partners.length > 0 ||
    searchResults.collaborations.length > 0;

  const showEmptyState = query.trim().length >= 2 && !isSearching && !hasResults;

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              pt: 2,
              pb: 2,
              px: 2,
              gap: 1,
            }}
          >
            <IconButton onClick={onClose} size="small">
              <ArrowBackIosNewIcon sx={{ fontSize: 20 }} />
            </IconButton>

            {/* Search Input */}
            <Box sx={{ flex: 1, position: 'relative' }}>
              <TextField
                fullWidth
                placeholder=""
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchSubmit(query);
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: theme.palette.text.secondary }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '24px',
                    backgroundColor: theme.palette.transparent.white,
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.2)',
                    '& fieldset': {
                      borderColor: theme.palette.transparent.white,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: theme.palette.transparent.white,
                    },
                    '& .MuiOutlinedInput-input': {
                      padding: '10px 0',
                    },
                  },
                }}
                autoFocus
              />
              {/* 애니메이션 placeholder (query가 비어있을 때) */}
              {query.trim().length === 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: 48,
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    overflow: 'hidden',
                    height: 20,
                  }}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={placeholderIndex}
                      initial={{ y: 15, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -15, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <Typography
                        sx={{
                          fontSize: 16,
                          color: theme.palette.text.secondary,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {currentPlaceholder}
                      </Typography>
                    </motion.div>
                  </AnimatePresence>
                </Box>
              )}
            </Box>
          </Box>

          {/* Content Area */}
          <Box sx={{ flex: 1, overflowY: 'auto', px: 2 }}>
            {isSearching ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <LightningLoader size={32} />
              </Box>
            ) : query.trim().length < 2 ? (
              // Show discovery/history view when no query
              mode === 'home' ? (
                <HomeDiscoveryView onSearchClick={handleSearchSubmit} />
              ) : (
                <GlobalHistoryView onSearchClick={handleSearchSubmit} onPartnerClick={(id) => handleResultClick('partner', id)} />
              )
            ) : showEmptyState ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 8,
                }}
              >
                <SearchIcon sx={{ fontSize: 64, color: theme.palette.grey[300], mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  검색 결과가 없어요.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  다른 검색어를 시도해보세요.
                </Typography>
              </Box>
            ) : (
              <SearchResultsView results={searchResults} onResultClick={handleResultClick} />
            )}
          </Box>
        </Box>
      </Modal>

      {/* Partner Detail Dialog - styled like Explore.tsx */}
      <Dialog
        open={!!selectedPartnerId}
        onClose={handlePartnerModalClose}
        fullWidth
        maxWidth="md"
        scroll="paper"
        sx={{ zIndex: 1400 }}
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
        {(selectedPartner || partnerLoading) && (
          <PartnerDetailContent
            partner={selectedPartner}
            loading={partnerLoading}
            onClose={handlePartnerModalClose}
            isModal={true}
            showBottomNavigation={false}
          />
        )}
      </Dialog>
    </>
  );
}


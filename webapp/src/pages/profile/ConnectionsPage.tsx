import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Box, Typography, TextField, InputAdornment, Chip, CircularProgress, IconButton, Dialog, Button } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../providers/AuthContext';
import { useConnections, type ConnectionType } from '../../hooks/useConnections';
import PartnerCard from '../../components/explore/PartnerCard';
import PartnerDetailContent from '../../components/explore/PartnerDetailContent';
import { useTheme } from '@mui/material/styles';
import { socialService } from '../../services/socialService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ActorInfo } from '../../stores/exploreStore';
import { useProfileStore } from '../../stores/profileStore';
import { supabase } from '../../lib/supabase';

// Tabs
const TABS: { key: ConnectionType; label: string }[] = [
    { key: 'followers', label: '팔로워' },
    { key: 'following', label: '팔로잉' },
    { key: 'mutual', label: '맞팔' },
];

// Filters
const FILTERS = [
    { key: 'all', label: '전체' },
    { key: 'brand', label: '브랜드' },
    { key: 'artist', label: '아티스트' },
    { key: 'creative', label: '크리에이티브' },
    { key: 'fan', label: '일반유저' },
];

export default function ConnectionsPage() {
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    // Store
    const { type: activeRole, profileId, fanProfile, nonFanProfile } = useProfileStore();

    // Get initial tab from navigation state
    const initialTab = (location.state as { initialTab?: ConnectionType })?.initialTab || 'followers';

    const [activeTab, setActiveTab] = useState<ConnectionType>(initialTab);
    const [activeFilter, setActiveFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Partner modal state
    const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
    const [isPartnerModalOpen, setPartnerModalOpen] = useState(false);

    // Unfollow Confirm Dialog
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmTarget, setConfirmTarget] = useState<{ id: string; name: string } | null>(null);

    // ============================================================
    // 로컬 팔로우 상태 관리 (이 페이지 전용)
    // - DB에서 가져온 followedUserIds를 기준으로
    // - 언팔로우/새 팔로우 변경을 로컬에서 추적
    // ============================================================
    const [localFollowedIds, setLocalFollowedIds] = useState<Set<string>>(new Set());
    const [isFollowDataLoaded, setIsFollowDataLoaded] = useState(false);
    const loadedRef = useRef(false);

    // 페이지 마운트 시 DB에서 팔로우 목록 로드
    useEffect(() => {
        if (!user?.id || loadedRef.current) return;
        loadedRef.current = true;

        const loadFollowedUsers = async () => {
            try {
                const ids = await socialService.getFollowedUsers(user.id);
                setLocalFollowedIds(new Set(ids));
            } catch (error) {
                console.error('팔로우 목록 로드 실패:', error);
            } finally {
                setIsFollowDataLoaded(true);
            }
        };
        loadFollowedUsers();
    }, [user?.id]);

    // 로컬 팔로우 토글 함수
    const toggleLocalFollow = useCallback((partnerId: string) => {
        setLocalFollowedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(partnerId)) {
                newSet.delete(partnerId);
            } else {
                newSet.add(partnerId);
            }
            return newSet;
        });
    }, []);

    // 팔로우 여부 확인
    const isFollowedLocally = useCallback((partnerId: string) => {
        return localFollowedIds.has(partnerId);
    }, [localFollowedIds]);

    // Fetch data
    const { data: connections, loading } = useConnections(user?.id || '', activeTab);

    // Social stats for tab counts
    const { data: stats } = useQuery({
        queryKey: ['socialStats', user?.id],
        enabled: !!user?.id,
        queryFn: () => socialService.getSocialStats(user!.id),
    });

    const { data: mutualIds } = useQuery({
        queryKey: ['mutualIds', user?.id],
        enabled: !!user?.id,
        queryFn: () => socialService.getMutualFollows(user!.id),
    });

    // Helper to get count for tab
    const getTabCount = (key: ConnectionType) => {
        if (key === 'followers') return stats?.followerCount ?? 0;
        if (key === 'following') return stats?.followingCount ?? 0;
        if (key === 'mutual') return mutualIds?.length ?? 0;
        return 0;
    };

    // Get selected partner from data
    const selectedPartner = useMemo(() => {
        if (!selectedPartnerId) return null;
        return connections.find((p) => p.id === selectedPartnerId) ?? null;
    }, [connections, selectedPartnerId]);

    // Modal handlers
    const handlePartnerClick = useCallback((partnerId: string) => {
        setSelectedPartnerId(partnerId);
        setPartnerModalOpen(true);
    }, []);

    const handlePartnerModalClose = useCallback(() => {
        setPartnerModalOpen(false);
        setSelectedPartnerId(null);
    }, []);

    const queryClient = useQueryClient();

    // Optimistic Count Updates
    const updateOptimisticCounts = useCallback((action: 'follow' | 'unfollow', partnerId: string) => {
        // Update Social Stats (Following Count)
        queryClient.setQueryData(['socialStats', user?.id], (old: any) => {
            if (!old) return old;
            return {
                ...old,
                followingCount: action === 'follow'
                    ? old.followingCount + 1
                    : Math.max(0, old.followingCount - 1)
            };
        });

        // Update Mutual IDs List
        queryClient.setQueryData(['mutualIds', user?.id], (old: string[] | undefined) => {
            if (!old) return old;

            if (action === 'follow') {
                // We only call this when following back a follower, so it becomes mutual
                if (!old.includes(partnerId)) {
                    return [...old, partnerId];
                }
                return old;
            } else {
                // Unfollow
                // If id was in the list, remove it
                return old.filter(id => id !== partnerId);
            }
        });
    }, [queryClient, user?.id]);


    // Actor Info Helper
    const getActorInfo = useCallback(async (): Promise<ActorInfo | undefined> => {
        if (!activeRole || activeRole === 'customer' || !profileId) return undefined;

        let name = '';
        let avatarUrl = '';

        if (activeRole === 'fan') {
            name = fanProfile?.nickname || '';
            const { data } = await supabase
                .from('profile_fans')
                .select('profile_image_url')
                .eq('profile_id', profileId)
                .maybeSingle();
            avatarUrl = data?.profile_image_url || '';
        } else if (activeRole === 'brand') {
            name = nonFanProfile?.record?.brand_name || '';
            const { data } = await supabase
                .from('profile_brands')
                .select('logo_image_url')
                .eq('profile_id', profileId)
                .maybeSingle();
            avatarUrl = data?.logo_image_url || '';
        } else if (activeRole === 'artist') {
            name = nonFanProfile?.record?.artist_name || '';
            const { data } = await supabase
                .from('profile_artists')
                .select('logo_image_url')
                .eq('profile_id', profileId)
                .maybeSingle();
            avatarUrl = data?.logo_image_url || '';
        } else if (activeRole === 'creative') {
            name = nonFanProfile?.record?.nickname || '';
            const { data } = await supabase
                .from('profile_creatives')
                .select('profile_image_url')
                .eq('profile_id', profileId)
                .maybeSingle();
            avatarUrl = data?.profile_image_url || '';
        }

        return { role: activeRole, profileId, name, avatarUrl };
    }, [activeRole, profileId, fanProfile, nonFanProfile]);

    const handleFollowBack = async (partner: any) => {
        if (!user) return;
        const actorInfo = await getActorInfo();

        // 1. 로컬 상태 업데이트 (낙관적)
        toggleLocalFollow(partner.id);

        // 2. DB 업데이트
        try {
            await socialService.followUser(user.id, partner.id, actorInfo);
        } catch (error) {
            console.error('팔로우 실패:', error);
            // 실패 시 롤백
            toggleLocalFollow(partner.id);
        }

        // 3. 카운트 낙관적 업데이트
        updateOptimisticCounts('follow', partner.id);
    };

    const handleUnfollowClick = (partner: any) => {
        setConfirmTarget({ id: partner.id, name: partner.name });
        setConfirmOpen(true);
    };

    const handleConfirmUnfollow = async () => {
        if (!confirmTarget || !user) return;

        // 1. 로컬 상태 업데이트 (낙관적)
        toggleLocalFollow(confirmTarget.id);

        // 2. DB 업데이트
        try {
            await socialService.unfollowUser(user.id, confirmTarget.id);
        } catch (error) {
            console.error('언팔로우 실패:', error);
            // 실패 시 롤백
            toggleLocalFollow(confirmTarget.id);
        }

        setConfirmOpen(false);
        setConfirmTarget(null);

        // 3. 카운트 낙관적 업데이트
        updateOptimisticCounts('unfollow', confirmTarget.id);
    };

    // Filter logic
    const filteredData = useMemo(() => {
        return connections.filter(item => {
            // ============================================================
            // 탭별 필터링 로직
            // - connections: DB에서 가져온 데이터 (소스 오브 트루스)
            // - localFollowedIds: 이 페이지에서 관리하는 팔로우 상태 (낙관적 업데이트 포함)
            // ============================================================
            const isFollowed = isFollowDataLoaded ? localFollowedIds.has(item.id) : true;

            if (activeTab === 'followers') {
                // 팔로워 탭: 모든 팔로워 표시 (내 팔로우 여부 상관없이)
                // 필터링 없음
            } else if (activeTab === 'following') {
                // 팔로잉 탭: DB에서 가져온 connections + 로컬 팔로우 상태 체크
                // - 로컬에서 언팔로우했으면 숨김
                // - 로컬 데이터가 아직 로드 안됐으면 DB 데이터 신뢰
                if (isFollowDataLoaded && !isFollowed) return false;
            } else if (activeTab === 'mutual') {
                // 맞팔 탭: 언팔로우했으면 숨김
                if (isFollowDataLoaded && !isFollowed) return false;
            }

            // 1. Role Filter
            if (activeFilter !== 'all') {
                if (activeFilter === 'fan') {
                    const isSpecial = ['brand', 'artist', 'creative'].includes(item.role || '');
                    if (isSpecial) return false;
                } else {
                    if (item.role !== activeFilter) return false;
                }
            }

            // 2. Search
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchName = item.name?.toLowerCase().includes(q);
                const matchField = item.activityField?.toLowerCase().includes(q);
                const matchTags = item.tags?.some(t => t.toLowerCase().includes(q));
                return matchName || matchField || matchTags;
            }

            return true;
        });
    }, [connections, activeFilter, searchQuery, activeTab, localFollowedIds, isFollowDataLoaded]);


    return (
        <Box sx={{
            minHeight: '100vh',
            bgcolor: 'white',
            pb: 4,
            maxWidth: '768px',
            margin: '0 auto',
        }}>
            {/* Header */}
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2,
                position: 'sticky',
                top: 0,
                backgroundColor: 'transparent',
                backdropFilter: 'blur(3px) saturate(180%)',
                WebkitBackdropFilter: 'blur(3px) saturate(180%)',
                zIndex: 10,
                mb: 2,
                height: '56px',
                pt: 0,
            }}>
                <IconButton onClick={() => navigate(-1)} sx={{
                    width: 34, height: 34,
                }}>
                    <ArrowBackIosNewRoundedIcon sx={{ fontSize: 20, color: theme.palette.icon.default }} />
                </IconButton>

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', }}>
                    <IconButton sx={{
                        width: 34, height: 34,
                        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.12))',
                        borderRadius: '100px',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        WebkitBackdropFilter: 'blur(10px)',
                        backdropFilter: 'blur(10px)',
                        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 4px 12px rgba(0, 0, 0, 0.1)',
                        '&:focus': { outline: 'none' },
                        '&.Mui-focusVisible': { outline: 'none' },
                    }}>
                        <SearchOutlinedIcon sx={{ fontSize: 24, color: theme.palette.icon.default }} />
                    </IconButton>
                    <IconButton sx={{
                        width: 34, height: 34,
                        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.12))',
                        borderRadius: '100px',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        WebkitBackdropFilter: 'blur(10px)',
                        backdropFilter: 'blur(10px)',
                        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 4px 12px rgba(0, 0, 0, 0.1)',
                        '&:focus': { outline: 'none' },
                        '&.Mui-focusVisible': { outline: 'none' },
                    }}>
                        <NotificationsNoneIcon sx={{ fontSize: 24, color: theme.palette.icon.default }} />
                    </IconButton>
                </Box>
            </Box>

            {/* Filter Chips */}
            <Box sx={{
                px: 2,
                pb: 2,
                display: 'flex',
                gap: 1,
                overflowX: 'auto',
                '::-webkit-scrollbar': { display: 'none' },
                mb: 1,
            }}>
                {FILTERS.map((filter) => (
                    <Chip
                        key={filter.key}
                        label={filter.label}
                        onClick={() => setActiveFilter(filter.key)}
                        sx={{
                            height: 32,
                            borderRadius: '16px',
                            fontSize: 13,
                            fontWeight: 600,
                            bgcolor: activeFilter === filter.key ? theme.palette.primary.main : '#F3F4F6',
                            color: activeFilter === filter.key ? 'white' : '#6B7280',
                            border: 'none',
                            '&:hover': {
                                bgcolor: activeFilter === filter.key ? theme.palette.primary.main : '#E5E7EB',
                            }
                        }}
                    />
                ))}
            </Box>

            {/* Search Bar */}
            <Box sx={{ px: 2, pb: 2, mb: 1 }}>
                <TextField
                    fullWidth
                    placeholder="팔로워를 검색해보세요"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: '#9CA3AF' }} />
                            </InputAdornment>
                        ),
                        sx: {
                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                            borderRadius: '24px',
                            boxShadow: '0 1px 1px rgba(0, 0, 0, 0.1)',
                            backdropFilter: 'blur(10px)',
                            fontSize: 14,
                            '& fieldset': { border: 'none' },
                        }
                    }}
                    size="small"
                />
            </Box>

            {/* Tabs */}
            <Box sx={{
                display: 'flex',
                mb: 2,
                px: 2
            }}>
                {TABS.map((tab) => (
                    <Box
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        sx={{
                            mr: 3,
                            pb: 0.5,
                            cursor: 'pointer',
                            borderBottom: activeTab === tab.key ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
                            color: activeTab === tab.key ? theme.palette.primary.main : '#6B7280',
                            fontWeight: activeTab === tab.key ? 700 : 500,
                            fontSize: 15,
                            display: 'flex',
                            gap: 0.5
                        }}
                    >
                        {tab.label} <span style={{ fontFamily: 'Inter' }}>{getTabCount(tab.key)}</span>
                    </Box>
                ))}
            </Box>

            {/* List */}
            <Box sx={{ px: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                        <CircularProgress size={30} />
                    </Box>
                ) : filteredData.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 5, color: '#9CA3AF' }}>
                        <Typography variant="body2">
                            {searchQuery ? '검색 결과가 없어요.' : '사용자가 없어요.'}
                        </Typography>
                    </Box>
                ) : (
                    filteredData.map((partner) => {
                        // Custom Action Button Logic
                        let actionButton = null;
                        const isFollowed = isFollowedLocally(partner.id);

                        if (activeTab === 'followers') {
                            // "맞팔로우" button if not followed back yet
                            // If already followed, it should technically be in mutual, but render "팔로잉" just in case
                            if (!isFollowed) {
                                actionButton = (
                                    <Chip
                                        label="+ 맞팔로우"
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleFollowBack(partner);
                                        }}
                                        sx={{
                                            ml: 'auto',
                                            height: 24,
                                            fontSize: 12,
                                            fontFamily: 'Pretendard, sans-serif',
                                            fontWeight: 500,
                                            backgroundColor: theme.palette.status.green,
                                            color: theme.palette.primary.contrastText,
                                            border: 'none',
                                            cursor: 'pointer',
                                            '&:hover': {
                                                backgroundColor: theme.palette.status.green,
                                            },
                                        }}
                                    />
                                );
                            } else {
                                // Already followed -> "팔로잉" (Gray)
                                actionButton = (
                                    <Chip
                                        label="팔로잉"
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleUnfollowClick(partner);
                                        }}
                                        sx={{
                                            ml: 'auto',
                                            height: 24,
                                            fontSize: 12,
                                            fontFamily: 'Pretendard, sans-serif',
                                            fontWeight: 500,
                                            backgroundColor: theme.palette.icon.inner,
                                            color: theme.palette.primary.contrastText,
                                            border: 'none',
                                            cursor: 'pointer',
                                            '&:hover': {
                                                backgroundColor: theme.palette.icon.inner,
                                            },
                                        }}
                                    />
                                );
                            }
                        } else {
                            // Following / Mutual -> "팔로잉" -> Unfollow confirm
                            actionButton = (
                                <Chip
                                    label="팔로잉"
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleUnfollowClick(partner);
                                    }}
                                    sx={{
                                        ml: 'auto',
                                        height: 24,
                                        fontSize: 12,
                                        fontFamily: 'Pretendard, sans-serif',
                                        fontWeight: 500,
                                        backgroundColor: theme.palette.icon.inner,
                                        color: theme.palette.primary.contrastText,
                                        border: 'none',
                                        cursor: 'pointer',
                                        '&:hover': {
                                            backgroundColor: theme.palette.icon.inner,
                                        },
                                    }}
                                />
                            );
                        }

                        return (
                            <PartnerCard
                                key={partner.id}
                                partner={partner}
                                onClick={partner.role === 'fan' ? () => { } : () => handlePartnerClick(partner.id)}
                                hideStats={partner.role === 'fan'}
                                actionButton={actionButton}
                            />
                        );
                    })
                )}
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

            {/* Unfollow Confirmation Dialog */}
            <Dialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                PaperProps={{
                    sx: {
                        borderRadius: '16px',
                        padding: 2,
                        minWidth: 280,
                    }
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: 18 }}>
                        팔로우 취소
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        <span style={{ fontWeight: 700, color: theme.palette.text.primary }}>{confirmTarget?.name}</span> 님을 팔로우 취소하시겠어요?
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => setConfirmOpen(false)}
                            sx={{
                                borderRadius: '20px',
                                color: theme.palette.text.primary,
                                borderColor: theme.palette.divider,
                            }}
                        >
                            취소
                        </Button>
                        <Button
                            fullWidth
                            variant="contained"
                            onClick={handleConfirmUnfollow}
                            sx={{
                                borderRadius: '20px',
                                bgcolor: theme.palette.primary.main,
                                boxShadow: 'none',
                            }}
                        >
                            확인
                        </Button>
                    </Box>
                </Box>
            </Dialog>
        </Box >
    );
}

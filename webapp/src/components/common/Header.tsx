import { useState, useMemo, memo, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Box, IconButton, Badge, Avatar, useTheme, ClickAwayListener, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import NotificationModal from './NotificationModal';
import SearchModal from '../search/SearchModal';
import ProfileSwitcher from '../profile/ProfileSwitcher';
import { useAuth } from '../../providers/AuthContext';
import { useProfileStore } from '../../stores/profileStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { userNotificationService } from '../../services/userNotificationService';
import { profileService } from '../../services/profileService';
import AddReactionOutlinedIcon from '@mui/icons-material/AddReactionOutlined';
import { isIOS } from '../../utils/deviceUtils';
import { searchService } from '../../services/searchService';

const PLACEHOLDER_CYCLE_INTERVAL = 3000;

// 애니메이션 placeholder 훅
function useAnimatedPlaceholder() {
  const [placeholders, setPlaceholders] = useState<string[] | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  // 프로젝트 타이틀 로드
  useEffect(() => {
    const loadProjectTitles = async () => {
      try {
        const { projects } = await searchService.getTrendingContents(5);

        if (projects?.length) {
          setPlaceholders(projects.map((p) => p.title));
          setPlaceholderIndex(0);
        }
      } catch (error) {
        console.error('Failed to load project titles for placeholder:', error);
        setPlaceholders(null);
      }
    };

    loadProjectTitles();
  }, []);

  // Placeholder 순환
  useEffect(() => {
    if (!placeholders || placeholders.length <= 1) return;

    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, PLACEHOLDER_CYCLE_INTERVAL);

    return () => clearInterval(interval);
  }, [placeholders]);

  return {
    placeholder: placeholders?.[placeholderIndex],
    placeholderIndex,
  };
}


export const HEADER_HEIGHT = 57;


// 기본 프로필 이미지 URL
const DEFAULT_PROFILE_IMAGE = 'https://xianrhwkdarupnvaumti.supabase.co/storage/v1/object/public/assets/defaults/profile.png';

interface HeaderProps {
  // 뒤로가기 버튼이 필요할 때 사용 (예: 생성/상세 페이지 등)
  showBackButton?: boolean;
  onBackClick?: () => void;
  showSearchInput?: boolean;
  /** 뒤로가기 버튼 오른쪽에 표시할 제목 */
  title?: string;
}

const Header = memo(({ showBackButton = false, onBackClick, showSearchInput = false, title }: HeaderProps) => {
  const theme = useTheme();
  const { user } = useAuth();
  const { type: activeProfileType, fanProfile, nonFanProfile } = useProfileStore();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // ProfileSwitcher state
  const [isProfileSwitcherOpen, setIsProfileSwitcherOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [initialSearchQuery, setInitialSearchQuery] = useState<string | undefined>(undefined);

  // iOS Glass Fallback: blur 축소 + gradient + border로 보완
  const isIOSDevice = useMemo(() => isIOS(), []);
  const blurAmount = isIOSDevice ? 4 : 10;
  const headerBlurAmount = isIOSDevice ? 2 : 3; // 헤더는 더 가벼운 blur

  // 애니메이션 placeholder 사용
  const { placeholder: animatedPlaceholder, placeholderIndex } = useAnimatedPlaceholder();

  // Zustand store에서 unreadCount 가져오기 (실시간 업데이트 즉시 반영)
  const { unreadCount } = useNotificationStore();

  // 초기 로드 및 주기적 동기화 (실시간 구독이 누락될 경우 대비)
  const { refetch: refetchUnreadCount } = useQuery({
    queryKey: ['unreadNotificationCount', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const count = await userNotificationService.getUnreadCount(user.id);
      // Zustand store와 동기화
      useNotificationStore.getState().setUnreadCount(count);
      return count;
    },
    staleTime: 60 * 1000, // 1분 (실시간 업데이트가 있으므로 polling 간격 늘림)
    refetchInterval: 60 * 1000, // Poll every 60 seconds
    enabled: !!user,
  });

  // Fetch profile image with caching (5min staleTime)
  const { data: profileData } = useQuery({
    queryKey: ['headerProfileImage', activeProfileType, fanProfile?.profile_id, nonFanProfile?.record.profile_id],
    queryFn: async () => {
      const effectiveType = activeProfileType || (nonFanProfile ? nonFanProfile.type : (fanProfile ? 'fan' : null));

      if (!effectiveType) {
        return { imageUrl: null, name: '' };
      }

      try {
        let imageUrl: string | null = null;
        let name = '';

        if (effectiveType === 'fan' && fanProfile) {
          const profile = await profileService.getProfile(fanProfile.profile_id, 'fan');
          if (profile) {
            imageUrl = profile.profile_image_url || null;
            name = fanProfile.nickname || '팬';
          }
        } else if (nonFanProfile && effectiveType === nonFanProfile.type) {
          const profile = await profileService.getProfile(nonFanProfile.record.profile_id, nonFanProfile.type);
          if (profile) {
            if (nonFanProfile.type === 'brand') {
              imageUrl = profile.logo_image_url || null;
              name = nonFanProfile.record.brand_name || '브랜드';
            } else if (nonFanProfile.type === 'artist') {
              imageUrl = profile.logo_image_url || null;
              name = nonFanProfile.record.artist_name || '아티스트';
            } else if (nonFanProfile.type === 'creative') {
              imageUrl = profile.profile_image_url || null;
              name = nonFanProfile.record.nickname || '크리에이티브';
            }
          }
        }

        return { imageUrl, name };
      } catch (error) {
        console.error('[Header] Error fetching profile image:', error);
        return { imageUrl: null, name: '' };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - profile images don't change often
    enabled: !!activeProfileType || !!fanProfile || !!nonFanProfile,
  });

  const profileImage = profileData?.imageUrl || null;
  const profileName = profileData?.name || '';

  const handleNotificationClose = useCallback(() => {
    setIsNotificationOpen(false);
    refetchUnreadCount();
  }, [refetchUnreadCount]);

  // Track whether we pushed the hash ourselves (vs. landing on it directly)
  const searchHashPushedByUs = useRef(false);

  // Handle search modal close - sync with hash state
  const handleSearchClose = useCallback(() => {
    // Always remove the hash via replaceState (no history navigation).
    // This avoids race conditions where `history.back()` + `popstate` can re-open the modal.
    if (window.location.hash === '#search') {
      // Preserve history.state (React Router relies on it)
      window.history.replaceState(
        window.history.state,
        '',
        window.location.pathname + window.location.search
      );
    }

    searchHashPushedByUs.current = false;
    setIsSearchOpen(false);
    setInitialSearchQuery(undefined);
  }, []);

  // Sync search modal state with URL hash for back navigation support
  useEffect(() => {
    // Handle popstate (browser back/forward)
    const handlePopState = () => {
      const hasSearchHash = window.location.hash === '#search';
      if (hasSearchHash && !isSearchOpen) {
        setIsSearchOpen(true);
      } else if (!hasSearchHash && isSearchOpen) {
        setIsSearchOpen(false);
        setInitialSearchQuery(undefined);
        searchHashPushedByUs.current = false;
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Check initial hash on mount - open modal but don't mark as pushed by us
    if (window.location.hash === '#search' && !isSearchOpen) {
      setIsSearchOpen(true);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isSearchOpen]);

  // Open search modal and push hash to history
  const openSearchModal = useCallback(() => {
    setInitialSearchQuery(undefined);
    // Push #search hash to enable back navigation
    if (window.location.hash !== '#search') {
      // Preserve history.state (React Router relies on it)
      const prevState = window.history.state ?? {};
      window.history.pushState({ ...prevState, __bridgeSearchHash: true }, '', '#search');
      searchHashPushedByUs.current = true; // Mark that we pushed it
    }
    setIsSearchOpen(true);
  }, []);

  return (
    <>
      <Box
        sx={{
          paddingTop: 0,
          backgroundColor: 'transparent',
          backdropFilter: `blur(${headerBlurAmount}px) saturate(180%)`,
          WebkitBackdropFilter: `blur(${headerBlurAmount}px) saturate(180%)`,
        }}
      >
        <Box
          sx={{
            height: `${HEADER_HEIGHT}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
          }}
        >

          {/* Left: Profile Trigger or Back Button */}
          <Box sx={{ display: 'flex', alignItems: 'center', zIndex: 1400 }}>
            {showBackButton ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton
                  id="header-back-button"
                  size="small"
                  sx={{ p: 0.5 }}
                  onClick={onBackClick}
                >
                  <ArrowBackIosNewIcon sx={{ fontSize: 20, color: theme.palette.icon.default }} />
                </IconButton>
                {title && (
                  <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.25rem' }}>
                    {title}
                  </Typography>
                )}
              </Box>
            ) : (
              <ClickAwayListener onClickAway={() => setIsProfileSwitcherOpen(false)}>
                <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>

                  {/* Profile Trigger */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      cursor: 'pointer',
                    }}
                    onClick={() => setIsProfileSwitcherOpen((prev) => !prev)}
                  >
                    <Avatar
                      src={profileImage || DEFAULT_PROFILE_IMAGE}
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: 'transparent',
                        color: theme.palette.text.secondary,
                        fontSize: 16,
                        fontWeight: 600,
                      }}
                    >
                      {profileName ? profileName.charAt(0).toUpperCase() : '?'}
                    </Avatar>
                  </Box>

                  {/* Profile Switcher Popup - Rendered via Portal logic in component, but here we inject custom render */}
                  <ProfileSwitcher
                    open={isProfileSwitcherOpen || isAnimating}
                    onClose={() => setIsProfileSwitcherOpen(false)}
                    render={({ fan, nonfan, fanImage, nonfanImage, handleSelect, handleCreate, close }) => {
                      const nonfanName = nonfan
                        ? nonfan.type === 'brand'
                          ? nonfan.record.brand_name || '브랜드'
                          : nonfan.type === 'artist'
                            ? nonfan.record.artist_name || '아티스트'
                            : nonfan.record.nickname || '크리에이티브'
                        : '';

                      const options = [
                        ...(nonfan && nonfan.type !== activeProfileType
                          ? [{
                            key: 'nonfan',
                            image: nonfanImage,
                            fallback: nonfanName,
                            onClick: () => void handleSelect(nonfan.type),
                          }]
                          : []),
                        ...(fan && activeProfileType !== 'fan'
                          ? [{
                            key: 'fan',
                            image: fanImage,
                            fallback: fan.nickname || '팬',
                            onClick: () => void handleSelect('fan'),
                          }]
                          : []),
                      ];

                      const getInitial = (text: string) => (text ? text.charAt(0).toUpperCase() : '?');

                      return (
                        <AnimatePresence
                          onExitComplete={() => setIsAnimating(false)}
                        >
                          {isProfileSwitcherOpen && (
                            <motion.div
                              initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                              animate={{ width: 'auto', opacity: 1, marginLeft: 8 }}
                              exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                              onLayoutAnimationStart={() => setIsAnimating(true)}
                              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                              style={{
                                // position: 'absolute' 제거하여 실제 공간 차지하게 함
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                height: '40px',
                                zIndex: 1300,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <Box
                                sx={{
                                  display: 'flex',
                                  gap: 1,
                                  alignItems: 'center',
                                  px: 1,
                                  py: 0.5,
                                  // iOS Glass Fallback: blur 축소 + gradient로 보완
                                  background: isIOSDevice
                                    ? `linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.12))`
                                    : 'rgba(255, 255, 255, 0.1)',
                                  backdropFilter: `blur(${blurAmount}px)`,
                                  WebkitBackdropFilter: `blur(${blurAmount}px)`,
                                  border: isIOSDevice ? '1px solid rgba(255, 255, 255, 0.25)' : 'none',
                                  borderRadius: '20px',
                                }}
                              >
                                {options.map((item) => (
                                  <Avatar
                                    key={item.key}
                                    src={item.image || undefined}
                                    onClick={(e) => {
                                      e.stopPropagation(); // Prevent closing immediately
                                      void item.onClick();
                                      close();
                                    }}
                                    sx={{
                                      width: 34,
                                      height: 34,
                                      cursor: 'pointer',
                                      bgcolor: item.image ? 'transparent' : '#E5E7EB',
                                      color: '#6B7280',
                                      fontSize: 18,
                                      fontWeight: 600,
                                      boxShadow: 2,
                                      transition: 'transform 0.15s ease, opacity 0.15s ease',
                                    }}
                                  >
                                    {!item.image && getInitial(item.fallback)}
                                  </Avatar>
                                ))}

                                {/* fan 또는 nonfan 중 하나라도 없으면 프로필 추가 버튼 표시 */}
                                {(!fan || !nonfan) && (
                                  <Avatar
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCreate();
                                      close();
                                    }}
                                    sx={{
                                      width: 38,
                                      height: 38,
                                      cursor: 'pointer',
                                      bgcolor: '#ffffff',
                                      color: theme.palette.icon.default,
                                      boxShadow: 2,
                                      transition: 'transform 0.15s ease, opacity 0.15s ease',
                                    }}
                                  >
                                    <AddReactionOutlinedIcon sx={{ fontSize: 22 }} />
                                  </Avatar>
                                )}
                              </Box>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      );
                    }}
                  />
                </Box>
              </ClickAwayListener>
            )}
          </Box>

          {/* Right: Search and Notification */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flex: 1, justifyContent: 'flex-end', minWidth: 0 }}>
            {showSearchInput ? (
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  justifyContent: 'flex-end',
                  minWidth: 0,
                  ml: 2,
                }}
              >
                {/* 커스텀 애니메이션 검색 입력 */}
                <Box
                  onClick={openSearchModal}
                  sx={{
                    width: '100%',
                    height: 42,
                    borderRadius: '24px',
                    backgroundColor: isIOSDevice
                      ? 'rgba(255, 255, 255, 0.85)'
                      : theme.palette.transparent.white,
                    backdropFilter: `blur(${blurAmount}px)`,
                    WebkitBackdropFilter: `blur(${blurAmount}px)`,
                    boxShadow: isIOSDevice
                      ? 'inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 1px 4px rgba(0, 0, 0, 0.15)'
                      : '0 1px 4px rgba(0, 0, 0, 0.2)',
                    border: `1px solid ${isIOSDevice ? 'rgba(255, 255, 255, 0.25)' : theme.palette.transparent.white}`,
                    display: 'flex',
                    alignItems: 'center',
                    px: 1.5,
                    cursor: 'pointer',
                    overflow: 'hidden',
                  }}
                >
                  <SearchIcon sx={{ color: theme.palette.text.secondary, mr: 1, flexShrink: 0 }} />
                  <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative', height: 24, display: 'flex', alignItems: 'center' }}>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={placeholderIndex}
                        initial={{ y: 15, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -15, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        style={{ width: '100%' }}
                      >
                        <Typography
                          sx={{
                            fontSize: 14,
                            color: theme.palette.text.secondary,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: 1.5,
                          }}
                        >
                          {animatedPlaceholder}
                        </Typography>
                      </motion.div>
                    </AnimatePresence>
                  </Box>
                </Box>
              </Box>
            ) : (
              <IconButton
                size="small"
                sx={{
                  p: 0.5,
                  background: isIOSDevice
                    ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.12))'
                    : 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '100px',
                  border: isIOSDevice
                    ? '1px solid rgba(255, 255, 255, 0.25)'
                    : '0.1px solid rgba(255, 255, 255, 0.3)',
                  backdropFilter: `blur(${blurAmount}px)`,
                  WebkitBackdropFilter: `blur(${blurAmount}px)`,
                  boxShadow: isIOSDevice
                    ? 'inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 4px 12px rgba(0, 0, 0, 0.1)'
                    : 'none',
                  '&:focus': { outline: 'none' },
                  '&.Mui-focusVisible': { outline: 'none' },
                }}
                onClick={openSearchModal}
              >
                <SearchIcon sx={{ fontSize: 24, color: theme.palette.icon.default, }} />
              </IconButton>
            )}
            <IconButton
              size="small"
              sx={{
                p: 0.5,
                background: isIOSDevice
                  ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.12))'
                  : 'rgba(255, 255, 255, 0.2)',
                borderRadius: '100px',
                border: isIOSDevice
                  ? '1px solid rgba(255, 255, 255, 0.25)'
                  : '0.1px solid rgba(255, 255, 255, 0.3)',
                backdropFilter: `blur(${blurAmount}px)`,
                WebkitBackdropFilter: `blur(${blurAmount}px)`,
                boxShadow: isIOSDevice
                  ? 'inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 4px 12px rgba(0, 0, 0, 0.1)'
                  : 'none',
                '&:focus': { outline: 'none' },
                '&.Mui-focusVisible': { outline: 'none' },
              }}
              onClick={() => setIsNotificationOpen(true)}
            >
              <Badge
                badgeContent={unreadCount}
                color="error"
                sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 16, minWidth: 16 } }}
              >
                <NotificationsNoneIcon sx={{ fontSize: 24, color: theme.palette.icon.default }} />
              </Badge>
            </IconButton>
          </Box>
        </Box>

      </Box>

      {/* Modals */}
      <NotificationModal open={isNotificationOpen} onClose={handleNotificationClose} />
      <SearchModal
        open={isSearchOpen}
        onClose={handleSearchClose}
        initialQuery={initialSearchQuery}
        mode={showSearchInput ? 'home' : 'global'}
      />
      <ProfileSwitcher
        open={isProfileSwitcherOpen}
        onClose={() => setIsProfileSwitcherOpen(false)}
      />
    </>
  );
});

Header.displayName = 'Header';

export default Header;


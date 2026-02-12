import { type ReactNode, useState, useMemo, memo } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { NotificationSettings } from '../common/NotificationModal';
import PendingApprovalNotice from '../common/PendingApprovalNotice';
import { useBrandApprovalStatus } from '../../hooks/useBrandApprovalStatus';
import { isIOS } from '../../utils/deviceUtils';
import { queryClient } from '../../lib/queryClient';
import { fetchExploreBatch } from '../../services/exploreService';
import { useAuth } from '../../providers/AuthContext';
import { useScrollToTop } from '../../contexts/ScrollToTopContext';

// 네비게이션 바에서 실제 사용하는 아이콘만 import
import HotelClassOutlinedIcon from '@mui/icons-material/HotelClassOutlined';
import HotelClassIcon from '@mui/icons-material/HotelClass';
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import ExploreIcon from '@mui/icons-material/Explore';
import TextsmsOutlinedIcon from '@mui/icons-material/TextsmsOutlined';
import TextsmsIcon from '@mui/icons-material/Textsms';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import PersonIcon from '@mui/icons-material/Person';
import OtherHousesOutlinedIcon from '@mui/icons-material/OtherHousesOutlined';
import OtherHousesIcon from '@mui/icons-material/OtherHouses';
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
// 하단 네비게이션 바의 실제 높이 계산:
// bottom: 10px + 패딩(8px) + 아이콘(26px) + 텍스트(16px) + 인디케이터(9px) + 여유(10px) ≈ 79px
export const BOTTOM_NAV_HEIGHT = 80;

interface NavItem {
  label: string;
  icon: ReactNode;
  activeIcon?: ReactNode;
  path?: string;
  disabled?: boolean;
  isActive?: (pathname: string) => boolean;
  onClick?: () => void;
}

const BottomNavigationBar = memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showApprovalOverlay, setShowApprovalOverlay] = useState(false);
  const { isRestricted: isBrandApprovalRestricted } = useBrandApprovalStatus();
  const { scrollToTop } = useScrollToTop();
  const isLoggedIn = Boolean(user?.id);
  const loginRedirectPath = `${location.pathname}${location.search}`;
  const handleRequireLogin = () => {
    navigate(`/login?redirectTo=${encodeURIComponent(loginRedirectPath)}`);
  };

  // iOS Glass Fallback 스타일: blur 축소 + gradient + border로 보완
  const glassStyle = useMemo(() => {
    if (isIOS()) {
      return {
        background: `linear-gradient(
          180deg,
          rgba(255, 255, 255, 0.22),
          rgba(255, 255, 255, 0.12)
        )`,
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        boxShadow: `
          inset 0 1px 0 rgba(255, 255, 255, 0.25),
          0 8px 24px rgba(0, 0, 0, 0.15)
        `,
      };
    }
    // Android: 기존 스타일 유지
    return {
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    };
  }, []);

  const navItems = useMemo<NavItem[]>(() => [
    {
      label: '탐색',
      icon: <ExploreOutlinedIcon sx={{ fontSize: 26 }} />,
      activeIcon: <ExploreIcon sx={{ fontSize: 26 }} />,
      path: '/explore',
      isActive: (pathname) => pathname.startsWith('/explore'),
    },
    {
      label: '라운지',
      icon: <HotelClassOutlinedIcon sx={{ fontSize: 26 }} />,
      activeIcon: <HotelClassIcon sx={{ fontSize: 26 }} />,
      path: '/lounge',
      isActive: (pathname) => pathname.startsWith('/lounge'),
    },
    {
      label: '홈',
      icon: <OtherHousesOutlinedIcon sx={{ fontSize: 26 }} />,
      activeIcon: <OtherHousesIcon sx={{ fontSize: 26 }} />,
      path: '/home',
    },
    {
      label: '메시지',
      icon: <TextsmsOutlinedIcon sx={{ fontSize: 26 }} />,
      activeIcon: <TextsmsIcon sx={{ fontSize: 26 }} />,
      path: '/messages',
      isActive: (pathname) => pathname.startsWith('/messages'),
    },
    {
      label: '프로필',
      icon: <PersonOutlineOutlinedIcon sx={{ fontSize: 26 }} />,
      activeIcon: <PersonIcon sx={{ fontSize: 26 }} />,
      path: '/profile',
      isActive: (pathname) => pathname.startsWith('/profile'),
    },
  ], []);

  return (
    <>
      <Box
        component="nav"
        sx={{
          position: 'fixed',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 16px)',
          maxWidth: '500px',
          borderRadius: '40px',
          zIndex: 1001,
          pb: 1,
          pt: 1,
          ...glassStyle,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            px: 2,
          }}
        >
          {navItems.map((item) => {
            const isActive = item.isActive
              ? item.isActive(location.pathname)
              : Boolean(item.path && location.pathname === item.path);

            const handleClick = () => {
              if (item.disabled) return;
              if (item.onClick) {
                item.onClick();
                return;
              }
              if (!isLoggedIn && (item.path === '/messages' || item.path === '/profile')) {
                handleRequireLogin();
                return;
              }
              if (isBrandApprovalRestricted && item.path === '/messages') {
                setShowApprovalOverlay(true);
                return;
              }

              // 같은 페이지인 경우 스크롤 최상단으로 이동
              if (item.path && location.pathname === item.path) {
                scrollToTop();
                return;
              }

              if (item.path && location.pathname !== item.path) {
                // 페이지 전환 전 데이터 prefetch
                if (item.path === '/explore') {
                  queryClient.prefetchInfiniteQuery({
                    queryKey: ['explore', 'projects', '전체', ['in_progress', 'open'], ''],
                    queryFn: ({ pageParam }) => {
                      const cursors = pageParam as {
                        projectsCursor?: string | null;
                        collaborationsCursor?: string | null;
                        partnersCursor?: string | null;
                      } | undefined;
                      return fetchExploreBatch({
                        category: '전체',
                        statuses: ['in_progress', 'open'],
                        cursors,
                        limit: cursors ? 10 : 3,
                        activeTab: 'projects',
                        fetchMode: 'active-only',
                      });
                    },
                    initialPageParam: undefined,
                  });
                }
                navigate(item.path);
              }
            };

            return (
              <Box
                key={item.label}
                onClick={handleClick}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0,
                  cursor: item.disabled ? 'default' : 'pointer',
                  minWidth: '42px',
                  opacity: isActive ? 1 : 0.9,
                  pointerEvents: item.disabled ? 'none' : 'auto',
                }}
              >
                <Box sx={{ color: isActive ? '#2563EB' : '#9CA3AF' }}>
                  {isActive && item.activeIcon ? item.activeIcon : item.icon}
                </Box>
                <Typography
                  sx={{
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 12,
                    color: isActive ? '#2563EB' : '#9CA3AF',
                    letterSpacing: 0,
                    lineHeight: '16px',
                  }}
                >
                  {item.label}
                </Typography>
              </Box>
            );
          })}
        </Box>

        <Box
          sx={{
            width: '127px',
            height: '5px',
            // backgroundColor: 'rgba(0, 0, 0, 0.1)',
            borderRadius: '100px',
            margin: '4px auto 0',
            // boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          }}
        />
      </Box>

      <NotificationSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />

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


    </>
  );
});

BottomNavigationBar.displayName = 'BottomNavigationBar';

export default BottomNavigationBar;

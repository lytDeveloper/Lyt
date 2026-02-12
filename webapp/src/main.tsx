import * as Sentry from "@sentry/react";

// Sentry 초기화 - 다른 모든 코드보다 먼저 실행되어야 함
Sentry.init({
  dsn: "https://6b0481f89edab0472ab2573bef6187ac@o4510695326351360.ingest.us.sentry.io/4510695562477568",
  sendDefaultPii: true,
  // 개발 환경에서는 더 많은 정보 수집
  environment: import.meta.env.DEV ? 'development' : 'production',
  // 성능 모니터링 (선택사항)
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  // 성능 샘플링 비율 (0.0 ~ 1.0)
  tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
});

// 개발 환경에서 콘솔 테스트를 위해 window에 Sentry 노출
if (import.meta.env.DEV) {
  (window as unknown as { Sentry: typeof Sentry }).Sentry = Sentry;
}

import React, { Suspense, useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { ToastContainer } from 'react-toastify';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App.tsx';
import AuthProvider from './providers/AuthProvider.tsx';
import { RootRedirect, ProtectedRoute, OptionalAuthRoute } from './routes/Guards.tsx';
import AuthCallback from './routes/AuthCallback.tsx';
import { InAppNotificationProvider } from './contexts/InAppNotificationContext.tsx';
import './index.css'
import 'react-toastify/dist/ReactToastify.css';
import './utils/supabaseCheck';
import { PretendardFont } from './styles/common';
import NativeBridgeListener from './components/native/NativeBridgeListener';
import ErrorBoundary from './components/common/ErrorBoundary';
import LightningLoader from './components/common/LightningLoader';
import { addIOSBodyClass } from './utils/deviceUtils';
import BadgeAchievementModal from './components/common/BadgeAchievementModal';

// 첫 화면 직접 import (lazy 제거로 초기 로딩 속도 개선)
import Home from './pages/common/Home';

// iOS 디바이스에서 body에 'is-ios' 클래스 추가 (CSS 조건부 스타일용)
addIOSBodyClass();

// Lazy-loaded pages (Route-based code splitting)
import {
  PageLoadingFallback,
  // 핵심 페이지 (Home은 직접 import로 변경됨)
  LazyLounge,
  LazyExplore,
  LazyMyProfile,
  // 공통 페이지
  LazyBrandArtistCollection,
  LazyMagazineDetail,
  LazyCategoryExplorePage,
  LazyBanned,
  // 프로필 관련
  LazyArchivePage,
  LazyReceivedReviewsPage,
  LazyWrittenReviewsPage,
  LazyActivityListPage,
  LazyMyBadges,
  LazyPortfolioManagementPage,
  LazyBookmarkManagement,
  LazyNotificationSettingsPage,
  LazyCustomerSupportPage,
  LazyTermsOfServicePage,
  LazyRefundPolicyPage,
  LazyAccountDeletionPage,
  LazyAccountWithdrawalPage,
  LazyServiceAnnouncementListPage,
  LazyServiceAnnouncementDetailPage,
  // Revenue Pages
  LazyRevenueManagementPage,
  LazyRevenueHistoryPage,
  LazyProjectSettlementDistributionPage,
  // Explore 상세
  LazyExploreProjectDetail,
  LazyExploreCollaborationDetail,
  LazyExplorePartnerDetail,
  // 프로젝트/협업 생성
  LazyCreateProjectStep1,
  LazyCreateProjectStep2,
  LazyCreateProjectStep3,
  LazyExploreCollaborationCreate,
  // 관리 페이지
  LazyManageAll,
  LazyManageProjectDetail,
  LazyManageCollaborationDetail,
  // 메시지
  LazyMessageList,
  LazyChatRoom,
  // Lounge
  LazyCommunityDetail,
  // Inquiry
  LazyPartnershipInquiryPage,
  // 온보딩 - 공통
  LazyConsentPage,
  LazyInitialNickname,
  LazyWelcome,
  LazyProfileSelect,
  // 온보딩 - Brand
  LazyBrandStep1,
  LazyBrandStep2,
  LazyBrandStep3,
  LazyBrandStep4,
  LazyBrandStep5,
  LazyBrandStep6,
  LazyBrandStep7,
  // 온보딩 - Artist (3단계: Step1 → Step2 → Step3)
  LazyArtistStep1,
  LazyArtistStep2,
  LazyArtistStep3,
  // 온보딩 - Creative
  LazyCreativeStep1,
  LazyCreativeStep2,
  LazyCreativeStep3,
  LazyCreativeStep4,
  // 온보딩 - Fan
  LazyFanStep1,
  LazyFanStep2,
  LazyFanStep3,
  LazyFanStep4,
  LazyFanStep5,
  LazyFanStep6,
  LazyPartnerSearchPage,
  LazyConnectionsPage,
  LazyShopPage,
  LazyCheckoutPage,
  LazyPaymentCallbackPage,
  LazyProjectSettlementPage,
  LazyProjectSettlementSelectionPage,
  LazyDownloadPage,
} from './routes/lazyPages';

// Material-UI 테마 타입 확장
declare module '@mui/material/styles' {
  interface Palette {
    userTypeBg: {
      brand: string;
      artist: string;
      creative: string;
      fan: string;
    };
    userTypeText: {
      brand: string;
      artist: string;
      creative: string;
      fan: string;
    };
    icon: {
      default: string;
      inner: string;
    };
    bgColor: {
      default: string;
      blue: string;
      green: string;
      red: string;
      orange: string;
    };
    status: {
      Success: string;
      Error: string;
      star: string;
      green: string;
      blue: string;
      default: string;
      blueOpacity: string;
      red: string;
      purple: string;
      orange: string;
    };
    subText: {
      default: string;
      secondary: string;
    };
    transparent: {
      black: string;
      white: string;
      red: string;
      blue: string;
    };

  }

  interface PaletteOptions {
    userTypeBg?: {
      brand?: string;
      artist?: string;
      creative?: string;
      fan?: string;
    };
    userTypeText?: {
      brand?: string;
      artist?: string;
      creative?: string;
      fan?: string;
    };
    icon?: {
      default?: string;
      inner?: string;
    };
    bgColor?: {
      default?: string;
      blue?: string;
      green?: string;
      red?: string;
      orange?: string;
    };
    status?: {
      Success?: string;
      Error?: string;
      star?: string;
      green?: string;
      blue?: string;
      default?: string;
      red?: string;
      purple?: string;
      orange?: string;
    };
    subText?: {
      default?: string;
      secondary?: string;
    };
    transparent?: {
      black?: string;
      white?: string;
      red?: string;
      blue?: string;
    };

  }
}

// React Query 클라이언트는 lib/queryClient.ts에서 import

// MUI 커스텀 테마 설정 (라이트 모드 전용)
const theme = createTheme({
  typography: {
    fontFamily: [
      'Pretendard',
      '-apple-system',
      'BlinkMacSystemFont',
      'system-ui',
      'Roboto',
      '"Helvetica Neue"',
      'Segoe UI',
      'Apple SD Gothic Neo',
      'Malgun Gothic',
      'sans-serif',
    ].join(','),
  },
  palette: {
    mode: 'light',
    primary: {
      main: '#2563EB', // CTA_BLUE와 동일
      contrastText: '#ffffff',
    },
    text: {
      primary: '#000000',
      secondary: '#949196',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    divider: '#E5E7EB',
    grey: {
      50: '#f9f9f9',
      100: '#F3F4F6',
    },
    action: {
      selected: '#eff6ff',
    },
    userTypeBg: {
      brand: '#B7E2F4',
      artist: '#CDC1FF',
      creative: '#CCE0AC',
      fan: '#F5AFAF',
    },
    userTypeText: {
      brand: '#ffffff',
      artist: '#ffffff',
      creative: '#ffffff',
      fan: '#ffffff',
    },
    icon: {
      default: '#374151',
      inner: '#9CA3AF',
    },
    bgColor: {
      default: '#F9FAFB',
      blue: '#EFF6FF',
      green: '#F0FFF5',
      red: '#FFEDED',
      orange: '#FFF7ED',
    },
    status: {
      Success: '#22C55E',
      Error: '#EA4335',
      star: '#FACC15',
      green: '#16A34A',
      blue: '#2563EB',
      default: '#D1D5DB',
      red: 'rgba(234, 67, 53, 0.6)',
      purple: '#9333EA',
      orange: '#F25912',
    },
    subText: {
      default: '#4B5563',
      secondary: '#111827',
    },
    transparent: {
      black: 'rgba(0, 0, 0, 0.3)',
      white: 'rgba(255, 255, 255, 0.3)',
      red: 'rgba(234, 67, 53, 0.3)',
      blue: 'rgba(37, 99, 235, 0.3)',
    },

  },
  components: {
    MuiCheckbox: {
      defaultProps: {
        icon: (
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: '2px solid #D1D5DB',
              backgroundColor: 'transparent',
              display: 'inline-block',
            }}
          />
        ),
        checkedIcon: (
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: '2px solid #2563EB',
              backgroundColor: '#2563EB',
              display: 'inline-block',
              position: 'relative',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#ffffff',
              }}
            />
          </span>
        ),
      },
      styleOverrides: {
        root: ({ theme }) => ({
          padding: '8px',
          color: '#D1D5DB',
          '&.Mui-checked': {
            color: theme.palette.primary.main,
          },
          '&.Mui-focusVisible': {
            outline: '2px solid #2563EB',
            outlineOffset: '2px',
          },
          '&.Mui-disabled': {
            color: '#E5E7EB',
          },
        }),
      },
    },
  },
});

// Legacy notification redirect handler
function ProfileRedirect() {
  const { id } = useParams();
  // Validate UUID to prevent matching paths like "connections"
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '');

  if (!isUuid) {
    // If not a UUID, it might be a specific route that failed to match or invalid ID.
    // Return null or 404 to avoid redirecting to /explore/partner/non-uuid
    return <Navigate to="/home" replace />;
  }

  return <Navigate to={`/explore/partner/${id}`} replace />;
}

function PullToRefreshHandler() {
  const [pullDistance, setPullDistance] = useState(0);
  const [loading, setLoading] = useState(false);
  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const topLockedRef = useRef(false);
  const threshold = 90;
  const maxPull = 140;

  const isTopOfWindow = () =>
    (window.scrollY ?? 0) <= 0 &&
    (document.documentElement?.scrollTop ?? 0) <= 0 &&
    (document.body?.scrollTop ?? 0) <= 0;

  const hasActiveScrollableParent = (target: EventTarget | null) => {
    let el = target as HTMLElement | null;
    const scrollRegex = /(auto|scroll)/;
    while (el && el !== document.body) {
      // Check if explicit no-ptr data attribute exists
      if (el.getAttribute('data-no-ptr') === 'true') {
        return true;
      }

      const style = window.getComputedStyle(el);
      const canScrollY = scrollRegex.test(style.overflowY);
      if (canScrollY && el.scrollHeight - el.clientHeight > 1) {
        if (el.scrollTop > 0) return true;
        // if not at top, also block
        if (el.scrollTop > 0) return true;
      }
      el = el.parentElement;
    }
    return false;
  };

  useEffect(() => {
    const handleTouchStart = (event: TouchEvent) => {
      if (loading) return;
      if (!isTopOfWindow()) return;
      if (hasActiveScrollableParent(event.target)) return;
      startYRef.current = event.touches[0]?.clientY ?? 0;
      pullingRef.current = true;
      topLockedRef.current = true;
      setPullDistance(0);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!pullingRef.current || loading) return;
      if (!topLockedRef.current || !isTopOfWindow()) {
        pullingRef.current = false;
        topLockedRef.current = false;
        setPullDistance(0);
        return;
      }
      const currentY = event.touches[0]?.clientY ?? 0;
      const deltaY = currentY - startYRef.current;
      if (deltaY <= 0 || window.scrollY > 0) {
        pullingRef.current = false;
        topLockedRef.current = false;
        setPullDistance(0);
        return;
      }
      // block native overscroll bounce while pulling
      event.preventDefault();
      setPullDistance(Math.min(deltaY, maxPull));
    };

    const handleTouchEnd = () => {
      if (!pullingRef.current || loading) {
        pullingRef.current = false;
        topLockedRef.current = false;
        setPullDistance(0);
        return;
      }

      const shouldRefresh = pullDistance >= threshold && window.scrollY === 0;
      pullingRef.current = false;
      topLockedRef.current = false;

      if (shouldRefresh) {
        setLoading(true);
        setPullDistance(threshold);
        setTimeout(() => window.location.reload(), 80);
      } else {
        setPullDistance(0);
      }
    };

    const handleTouchCancel = () => {
      pullingRef.current = false;
      topLockedRef.current = false;
      setPullDistance(0);
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchCancel);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [loading, pullDistance]);

  const active = pullDistance > 0 || loading;
  const reached = pullDistance >= threshold;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 70,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          transform: `translateY(${active ? pullDistance / 1.2 : 0}px)`,
          transition: active ? 'none' : 'transform 0.2s ease, opacity 0.2s ease',
          opacity: active ? 1 : 0,
          zIndex: 1300,
        }}
      >
        <LightningLoader size={32} color={reached ? '#2563EB' : '#6B7280'} />
      </div>
    </>
  );
}

// 개발 모드에서는 StrictMode 비활성화 (중복 마운트 방지)
// 프로덕션에서만 StrictMode 활성화
const AppWrapper = import.meta.env.DEV
  ? ({ children }: { children: React.ReactNode }) => <>{children}</>
  : React.StrictMode;

const DevOnlyReactQueryDevtools = import.meta.env.DEV
  ? React.lazy(async () => {
    const module = await import('@tanstack/react-query-devtools');
    return { default: module.ReactQueryDevtools };
  })
  : null;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AppWrapper>
    <PretendardFont />
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PullToRefreshHandler />
      <QueryClientProvider client={queryClient}>
        {DevOnlyReactQueryDevtools ? (
          <Suspense fallback={null}>
            <DevOnlyReactQueryDevtools initialIsOpen={false} />
          </Suspense>
        ) : null}
        <BrowserRouter>
          <NativeBridgeListener />
          {/* AuthProvider로 감싸서 로그인 상태 전역 관리 */}
          <AuthProvider>
            <InAppNotificationProvider>
              <ToastContainer position="top-center" autoClose={4000} hideProgressBar />
              <ErrorBoundary>
                <Routes>
                  {/* 루트 경로는 로그인 상태에 따라 분기 처리 */}
                  <Route path="/" element={<RootRedirect />} />
                  <Route path="/login" element={<App />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />

                  <Route path="/banned" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyBanned /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/home" element={
                    <OptionalAuthRoute>
                      <Home />
                    </OptionalAuthRoute>
                  } />
                  {/* Specific routes should come before parameterized routes */}
                  <Route path="/profile/connections" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyConnectionsPage /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyMyProfile /></Suspense>
                    </ProtectedRoute>
                  } />
                  {/* Redirect /profile/:id to /explore/partner/:id for legacy notifications */}
                  <Route path="/profile/:id" element={<ProfileRedirect />} />
                  <Route path="/settings/notifications" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyNotificationSettingsPage /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/settings/support" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyCustomerSupportPage /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/settings/terms" element={
                    //  <ProtectedRoute>
                    <Suspense fallback={<PageLoadingFallback />}><LazyTermsOfServicePage /></Suspense>
                    // </ProtectedRoute>
                  } />
                  <Route path="/settings/refund-policy" element={
                    <Suspense fallback={<PageLoadingFallback />}><LazyRefundPolicyPage /></Suspense>
                  } />
                  <Route path="/account-deletion" element={
                    <Suspense fallback={<PageLoadingFallback />}><LazyAccountDeletionPage /></Suspense>
                  } />
                  <Route path="/settings/account-withdrawal" element={
                    <Suspense fallback={<PageLoadingFallback />}><LazyAccountWithdrawalPage /></Suspense>
                  } />
                  <Route path="/settings/announcements" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyServiceAnnouncementListPage /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/settings/announcements/:id" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyServiceAnnouncementDetailPage /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/profile/reviews/received" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyReceivedReviewsPage /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/profile/reviews/written" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyWrittenReviewsPage /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/profile/activities" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyActivityListPage /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/profile/portfolio" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyPortfolioManagementPage /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/profile/badges" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyMyBadges /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/profile/bookmarks" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyBookmarkManagement /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/archive" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyArchivePage /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/lounge" element={
                    <OptionalAuthRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyLounge /></Suspense>
                    </OptionalAuthRoute>
                  } />
                  <Route path="/magazine/:id" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyMagazineDetail /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/lounge/community/:id" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyCommunityDetail /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/brands-artists" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyBrandArtistCollection /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/partnership-inquiry/:brandId" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyPartnershipInquiryPage /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/explore" element={
                    <OptionalAuthRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyExplore /></Suspense>
                    </OptionalAuthRoute>
                  } />
                  <Route path="/category-explore" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyCategoryExplorePage /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/explore/project/:id" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyExploreProjectDetail /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/explore/collaboration/:id" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyExploreCollaborationDetail /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/explore/partner/:id" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyExplorePartnerDetail /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/messages" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyMessageList /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/messages/:id" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyChatRoom /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/partner-search" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyPartnerSearchPage /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/shop" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyShopPage /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/checkout" element={
                    <OptionalAuthRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyCheckoutPage /></Suspense>
                    </OptionalAuthRoute>
                  } />
                  <Route path="/download" element={
                    <Suspense fallback={<PageLoadingFallback />}><LazyDownloadPage /></Suspense>
                  } />
                  <Route path="/payment/callback" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyPaymentCallbackPage /></Suspense>
                    </ProtectedRoute>
                  } />
                  {/* Project Payment Route */}
                  <Route path="/project/payment/:id" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyProjectSettlementPage /></Suspense>
                    </ProtectedRoute>
                  } />
                  {/* Revenue Management Routes */}
                  <Route path="/profile/revenue" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyRevenueManagementPage /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/profile/revenue/history" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyRevenueHistoryPage /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/profile/revenue/settlement" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyProjectSettlementSelectionPage /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/profile/revenue/settlement/:id" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyProjectSettlementDistributionPage /></Suspense>
                    </ProtectedRoute>
                  } />

                  {/* Project Creation Routes */}
                  <Route path="/explore/project/create" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyCreateProjectStep1 /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/explore/project/create/step2" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyCreateProjectStep2 /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/explore/project/create/step3" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyCreateProjectStep3 /></Suspense>
                    </ProtectedRoute>
                  } />

                  {/* Collaboration Creation Route */}
                  <Route path="/explore/collaboration/create" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyExploreCollaborationCreate /></Suspense>
                    </ProtectedRoute>
                  } />

                  {/* 통합 관리 페이지 */}
                  <Route path="/manage" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyManageAll /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/manage/project/:id" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyManageProjectDetail /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/manage/collaboration/:id" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyManageCollaborationDetail /></Suspense>
                    </ProtectedRoute>
                  } />

                  <Route path="/onboarding/consent" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyConsentPage /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/onboarding/nickname" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyInitialNickname /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/onboarding/welcome" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyWelcome /></Suspense>
                    </ProtectedRoute>
                  } />
                  {/* Brand Onboarding Routes */}
                  <Route path="/onboarding/profile" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyProfileSelect /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/onboarding/brand/name" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyBrandStep1 /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/onboarding/brand/details" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyBrandStep2 /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/onboarding/brand/images" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyBrandStep3 /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/onboarding/brand/collaboration" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyBrandStep4 /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/onboarding/brand/business-info" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyBrandStep5 /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/onboarding/brand/complete" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyBrandStep6 /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/onboarding/brand/recommendation" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyBrandStep7 /></Suspense>
                    </ProtectedRoute>
                  } />
                  {/* Artist Onboarding Routes */}
                  <Route path="/onboarding/artist/name" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyArtistStep1 /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/onboarding/artist/additionalInfo" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyArtistStep2 /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/onboarding/artist/complete" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyArtistStep3 /></Suspense>
                    </ProtectedRoute>
                  } />

                  {/* Creative Onboarding Routes */}
                  <Route path="/onboarding/creative/image" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyCreativeStep1 /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/onboarding/creative/addChannels" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyCreativeStep2 /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/onboarding/creative/acquisitionSource" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyCreativeStep3 /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/onboarding/creative/complete" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyCreativeStep4 /></Suspense>
                    </ProtectedRoute>
                  } />

                  {/* Fan Onboarding Routes */}
                  <Route path="/onboarding/fan/image" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyFanStep1 /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/onboarding/fan/interests" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyFanStep2 /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/onboarding/fan/persona" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyFanStep3 /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/onboarding/fan/specificInterests" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyFanStep4 /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/onboarding/fan/preferredRegions" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyFanStep5 /></Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/onboarding/fan/complete" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoadingFallback />}><LazyFanStep6 /></Suspense>
                    </ProtectedRoute>
                  } />
                </Routes>
                {/* 전역 배지 획득 축하 모달 */}
                <BadgeAchievementModal />
              </ErrorBoundary>
            </InAppNotificationProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </AppWrapper>,
)

export { };

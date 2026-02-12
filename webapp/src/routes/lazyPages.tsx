/**
 * Lazy-loaded page components for route-based code splitting
 *
 * 이 파일은 페이지 컴포넌트들을 React.lazy로 감싸서 export합니다.
 * 각 페이지는 사용자가 해당 라우트에 접근할 때만 로드됩니다.
 */
import { Suspense, type ComponentType } from 'react';
import { Box } from '@mui/material';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { LightningLoader } from '../components/common';

// Suspense fallback 컴포넌트
export function PageLoadingFallback() {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100%',
        backgroundColor: '#ffffff',
      }}
    >
      <LightningLoader size={40} />
    </Box>
  );
}

// Suspense 래퍼 HOC
export function withSuspense<P extends object>(
  LazyComponent: ComponentType<P>,
  fallback: React.ReactNode = <PageLoadingFallback />
) {
  return function SuspenseWrapper(props: P) {
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// ============================================
// 핵심 페이지 (자주 접근)
// ============================================
// Home은 main.tsx에서 직접 import (첫 화면 로딩 최적화)
export const LazyLounge = lazyWithRetry(() => import('../pages/common/Lounge'));
export const LazyExplore = lazyWithRetry(() => import('../pages/Main/Explore'));
export const LazyMyProfile = lazyWithRetry(() => import('../pages/profile/MyProfile'));

// ============================================
// 공통 페이지
// ============================================
// ============================================
// 공통 페이지
// ============================================
export const LazyBrandArtistCollection = lazyWithRetry(() => import('../pages/common/BrandArtistCollection'));
export const LazyMagazineDetail = lazyWithRetry(() => import('../pages/common/MagazineDetail'));
export const LazyCategoryExplorePage = lazyWithRetry(() => import('../pages/common/CategoryExplorePage'));
export const LazyBanned = lazyWithRetry(() => import('../pages/common/Banned'));
export const LazyShopPage = lazyWithRetry(() => import('../pages/shop/ShopPage'));
export const LazyCheckoutPage = lazyWithRetry(() => import('../pages/payment/CheckoutPage'));
export const LazyPaymentCallbackPage = lazyWithRetry(() => import('../pages/payment/PaymentCallbackPage'));
export const LazyProjectSettlementPage = lazyWithRetry(() => import('../pages/payment/ProjectSettlementPage'));
export const LazyProjectSettlementSelectionPage = lazyWithRetry(() => import('../pages/payment/ProjectSettlementSelectionPage'));
export const LazyDownloadPage = lazyWithRetry(() => import('../pages/DownloadPage'));

// ============================================
// 프로필 관련
// ============================================
// ============================================
// 프로필 관련
// ============================================
export const LazyArchivePage = lazyWithRetry(() => import('../pages/profile/ArchivePage'));
export const LazyReceivedReviewsPage = lazyWithRetry(() => import('../pages/profile/ReceivedReviewsPage'));
export const LazyWrittenReviewsPage = lazyWithRetry(() => import('../pages/profile/WrittenReviewsPage'));
export const LazyActivityListPage = lazyWithRetry(() => import('../pages/profile/ActivityListPage'));
export const LazyMyBadges = lazyWithRetry(() => import('../pages/profile/MyBadges'));
export const LazyPortfolioManagementPage = lazyWithRetry(() => import('../pages/profile/PortfolioManagementPage'));
export const LazyRevenueManagementPage = lazyWithRetry(() => import('../pages/profile/revenue/RevenueManagementPage'));
export const LazyRevenueHistoryPage = lazyWithRetry(() => import('../pages/profile/revenue/RevenueHistoryPage'));
export const LazyProjectSettlementDistributionPage = lazyWithRetry(() => import('../pages/payment/ProjectSettlementDistributionPage'));
export const LazyBookmarkManagement = lazyWithRetry(() => import('../pages/profile/BookmarkManagement'));
export const LazyNotificationSettingsPage = lazyWithRetry(() => import('../pages/settings/NotificationSettingsPage'));
export const LazyCustomerSupportPage = lazyWithRetry(() => import('../pages/settings/CustomerSupportPage'));
export const LazyTermsOfServicePage = lazyWithRetry(() => import('../pages/settings/TermsOfServicePage'));
export const LazyRefundPolicyPage = lazyWithRetry(() => import('../pages/settings/RefundPolicyPage'));
export const LazyAccountDeletionPage = lazyWithRetry(() => import('../pages/settings/AccountDeletionPage'));
export const LazyAccountWithdrawalPage = lazyWithRetry(() => import('../pages/settings/AccountWithdrawalPage'));
export const LazyServiceAnnouncementListPage = lazyWithRetry(() => import('../pages/settings/ServiceAnnouncementListPage'));
export const LazyServiceAnnouncementDetailPage = lazyWithRetry(() => import('../pages/settings/ServiceAnnouncementDetailPage'));
export const LazyConnectionsPage = lazyWithRetry(() => import('../pages/profile/ConnectionsPage'));

// ============================================
// Explore 상세
// ============================================
// ============================================
// Explore 상세
// ============================================
export const LazyExploreProjectDetail = lazyWithRetry(() => import('../pages/Main/ExploreProjectDetail'));
export const LazyExploreCollaborationDetail = lazyWithRetry(() => import('../pages/Main/ExploreCollaborationDetail'));
export const LazyExplorePartnerDetail = lazyWithRetry(() => import('../pages/Main/ExplorePartnerDetail'));

// ============================================
// 프로젝트/협업 생성
// ============================================
// ============================================
// 프로젝트/협업 생성
// ============================================
export const LazyCreateProjectStep1 = lazyWithRetry(() => import('../pages/explore/CreateProjectStep1'));
export const LazyCreateProjectStep2 = lazyWithRetry(() => import('../pages/explore/CreateProjectStep2'));
export const LazyCreateProjectStep3 = lazyWithRetry(() => import('../pages/explore/CreateProjectStep3'));
export const LazyExploreCollaborationCreate = lazyWithRetry(() => import('../pages/Main/ExploreCollaborationCreate'));

// ============================================
// 관리 페이지
// ============================================
// ============================================
// 관리 페이지
// ============================================
export const LazyManageAll = lazyWithRetry(() => import('../pages/manage/ManageAll'));
export const LazyManageProjectDetail = lazyWithRetry(() => import('../pages/manage/ManageProjectDetail'));
export const LazyManageCollaborationDetail = lazyWithRetry(() => import('../pages/manage/ManageCollaborationDetail'));

// ============================================
// 메시지
// ============================================
// ============================================
// 메시지
// ============================================
export const LazyMessageList = lazyWithRetry(() => import('../pages/messages/MessageList'));
export const LazyChatRoom = lazyWithRetry(() => import('../pages/messages/ChatRoom'));
export const LazyPartnerSearchPage = lazyWithRetry(() => import('../pages/Main/PartnerSearchPage'));

// ============================================
// Lounge
// ============================================
// ============================================
// Lounge
// ============================================
export const LazyCommunityDetail = lazyWithRetry(() => import('../pages/lounge/CommunityDetail'));

// ============================================
// Inquiry
// ============================================
// ============================================
// Inquiry
// ============================================
export const LazyPartnershipInquiryPage = lazyWithRetry(() => import('../pages/inquiry/PartnershipInquiryPage'));

// ============================================
// 온보딩 - 공통
// ============================================
// ============================================
// 온보딩 - 공통
// ============================================
export const LazyConsentPage = lazyWithRetry(() => import('../pages/onboarding/ConsentPage'));
export const LazyInitialNickname = lazyWithRetry(() => import('../pages/onboarding/InitialNickname'));
export const LazyWelcome = lazyWithRetry(() => import('../pages/onboarding/Welcome'));
export const LazyProfileSelect = lazyWithRetry(() => import('../pages/onboarding/ProfileSelect'));

// ============================================
// 온보딩 - Brand
// ============================================
// ============================================
// 온보딩 - Brand
// ============================================
export const LazyBrandStep1 = lazyWithRetry(() => import('../pages/onboarding/brand/Step1_NameInput'));
export const LazyBrandStep2 = lazyWithRetry(() => import('../pages/onboarding/brand/Step2_Details'));
export const LazyBrandStep3 = lazyWithRetry(() => import('../pages/onboarding/brand/Step3_Images'));
export const LazyBrandStep4 = lazyWithRetry(() => import('../pages/onboarding/brand/Step4_Collaboration'));
export const LazyBrandStep5 = lazyWithRetry(() => import('../pages/onboarding/brand/Step5_BusinessInfo'));
export const LazyBrandStep6 = lazyWithRetry(() => import('../pages/onboarding/brand/Step6_Complete'));
export const LazyBrandStep7 = lazyWithRetry(() => import('../pages/onboarding/brand/Step7_Recommendation'));

// ============================================
// 온보딩 - Artist
// ============================================
// ============================================
// 온보딩 - Artist
// ============================================
export const LazyArtistStep1 = lazyWithRetry(() => import('../pages/onboarding/artist/Step1_ArtistName'));
export const LazyArtistStep2 = lazyWithRetry(() => import('../pages/onboarding/artist/Step2_AdditionalInfo'));
export const LazyArtistStep3 = lazyWithRetry(() => import('../pages/onboarding/artist/Step3_Complete'));

// ============================================
// 온보딩 - Creative
// ============================================
// ============================================
// 온보딩 - Creative
// ============================================
export const LazyCreativeStep1 = lazyWithRetry(() => import('../pages/onboarding/creative/Step1_CreativeImage'));
export const LazyCreativeStep2 = lazyWithRetry(() => import('../pages/onboarding/creative/Step2_addChannels'));
export const LazyCreativeStep3 = lazyWithRetry(() => import('../pages/onboarding/creative/Step3_acquisition_source'));
export const LazyCreativeStep4 = lazyWithRetry(() => import('../pages/onboarding/creative/Step4_Complete'));

// ============================================
// 온보딩 - Fan
// ============================================
// ============================================
// 온보딩 - Fan
// ============================================
export const LazyFanStep1 = lazyWithRetry(() => import('../pages/onboarding/fan/Step1_FanImage'));
export const LazyFanStep2 = lazyWithRetry(() => import('../pages/onboarding/fan/Step2_Interests'));
export const LazyFanStep3 = lazyWithRetry(() => import('../pages/onboarding/fan/Step3_Persona'));
export const LazyFanStep4 = lazyWithRetry(() => import('../pages/onboarding/fan/Step4_SpecificInterests'));
export const LazyFanStep5 = lazyWithRetry(() => import('../pages/onboarding/fan/Step5_PreferredRegions'));
export const LazyFanStep6 = lazyWithRetry(() => import('../pages/onboarding/fan/Step6_Complete'));

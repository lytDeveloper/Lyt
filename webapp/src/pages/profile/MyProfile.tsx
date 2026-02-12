/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  Skeleton,
  Container,
  Paper,
  Button,
  Radio,
  Dialog,
} from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LogoutIcon from '@mui/icons-material/Logout';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';

import { socialService } from '../../services/socialService';
import { useProfileStore } from '../../stores/profileStore';
import { useProfileTabStore, type ProfileTab } from '../../stores/profileTabStore';
import { supabase } from '../../lib/supabase';

import Header from '../../components/common/Header';
import { getBadgeAsset } from '../../constants/badgeAssets';
import BottomNavigationBar, { BOTTOM_NAV_HEIGHT } from '../../components/navigation/BottomNavigationBar';
import BlockedAccountManagement from '../../components/settings/BlockedAccountManagement';
import TabBar, { type TabItem } from '../../components/common/TabBar';
import ConfirmDialog from '../../components/common/ConfirmDialog';


import settingProfileIcon from '../../assets/icon/setting/setting-profile.png';
import settingAccountIcon from '../../assets/icon/setting/setting-account.png';
import settingBookmarkIcon from '../../assets/icon/setting/setting-bookmark.png';
import settingNotificationIcon from '../../assets/icon/setting/setting-notification.png';
import settingRevenueIcon from '../../assets/icon/setting/setting-revenue.png';
import settingSupportIcon from '../../assets/icon/setting/setting-support.png';
import settingPortfolioIcon from '../../assets/icon/setting/setting-portfolio.png';
import settingShopIcon from '../../assets/icon/setting/setting-shop.png';


// TanStack Query hooks
import {
  useProfileInitialization,
  useProfileData,
  useArchiveCount,
  useFavorites,
  useReceivedReviewsPreview,
  useWrittenReviewsPreview,
  useProfileRating,
  useReceivedReviewTagStats,
} from '../../hooks/useMyProfileData';
import { MEMBER_REVIEW_TEMPLATES } from '../../constants/reviewTemplates';
import ReviewTemplateCard from '../../components/profile/ReviewTemplateCard';
import { useAuth } from '../../providers/AuthContext';
import { useResizedImages } from '../../hooks/useResizedImage';
import { toast } from 'react-toastify';
import EditProfileModal from '../../components/profile/EditProfileModal';
import RecentActivitySection from '../../components/profile/RecentActivitySection';
import { getPartnerById, type Partner } from '../../services/partnerService';
import { getBrandById, getBrandStats } from '../../services/brandService';
import PartnerDetailContent from '../../components/explore/PartnerDetailContent';
import { USER_TYPE_OPTIONS } from '../../constants/userTypeOptions';

// ProfileTab type is imported from profileTabStore

const PROFILE_TABS: TabItem<ProfileTab>[] = [
  { key: 'overview', label: '개요' },
  { key: 'reviews', label: '리뷰' },
  { key: 'settings', label: '설정' },
];

export default function MyProfile() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    type: activeProfileType,
    profileId: activeProfileId,
    setActiveProfile,
    setProfileSummary
  } = useProfileStore();

  const { activeTab, setActiveTab } = useProfileTabStore();

  // 디버깅: 현재 프로필 타입 확인
  useEffect(() => {
    console.log('📊 Current Profile State:', {
      activeProfileType,
      activeProfileId,
      userId: user?.id
    });
  }, [activeProfileType, activeProfileId, user?.id]);

  // Settings Modals
  const [blockedManagementOpen, setBlockedManagementOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const queryClient = useQueryClient();

  // TanStack Query: 프로필 초기화
  const { data: profileInit } = useProfileInitialization(user?.id);

  // customer 역할인 경우 public.profiles 에서 nickname 조회
  const { data: customerProfile } = useQuery({
    queryKey: ['customerProfileNickname', user?.id, activeProfileType],
    enabled: !!user?.id && activeProfileType === 'customer',
    queryFn: async () => {
      if (!user?.id) return null;
      console.log('🔎 Fetching customer profile nickname for user:', user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('❌ customer 프로필 닉네임 조회 실패:', error);
        return null;
      }
      console.log('✅ customer 프로필 닉네임:', data);
      return data as { nickname: string } | null;
    },
  });

  // fan 역할인 경우 public.profiles 에서 nickname 조회
  const { data: fanProfileNickname } = useQuery({
    queryKey: ['fanProfileNickname', user?.id, activeProfileType],
    enabled: !!user?.id && activeProfileType === 'fan',
    queryFn: async () => {
      if (!user?.id) return null;
      console.log('🔎 Fetching fan profile nickname for user:', user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('❌ fan 프로필 닉네임 조회 실패:', error);
        return null;
      }
      console.log('✅ fan 프로필 닉네임:', data);
      return data as { nickname: string } | null;
    },
  });

  // 프로필 초기화 완료 시 스토어 업데이트
  useEffect(() => {
    if (profileInit && user && (!activeProfileType || !activeProfileId)) {
      const { fan: fanProfileSummary, nonfan: nonfanSummary } = profileInit;

      setProfileSummary({
        userId: user.id,
        fan: fanProfileSummary,
        nonfan: nonfanSummary,
      });

      if (nonfanSummary) {
        setActiveProfile({
          type: nonfanSummary.type,
          profileId: nonfanSummary.record.profile_id,
        });
      } else if (fanProfileSummary) {
        setActiveProfile({
          type: 'fan',
          profileId: fanProfileSummary.profile_id,
        });
      } else {
        // fan도 nonfan도 없는 경우 = 온보딩 미완료 customer
        console.log('👤 No profiles found, setting as customer');
        setActiveProfile({
          type: 'customer',
          profileId: user.id, // customer는 user.id를 profileId로 사용
        });
      }
    }
  }, [profileInit, user, activeProfileType, activeProfileId, setActiveProfile, setProfileSummary]);

  // TanStack Query: 프로필 데이터 + 소셜 통계 + 배지
  const { data: profileDataResult, isLoading: isProfileLoading } = useProfileData(
    activeProfileId,
    activeProfileType
  );

  // TanStack Query: 아카이브 카운트
  const { data: archiveData, isLoading: archiveCountLoading } = useArchiveCount();

  // TanStack Query: 프로필 평점
  const { data: ratingData, isLoading: ratingLoading } = useProfileRating(
    activeProfileId,
    activeProfileType
  );

  // 데이터 추출
  const profileData = profileDataResult?.profile ?? null;
  const stats = profileDataResult?.stats ?? { followerCount: 0, followingCount: 0, likeCount: 0 };
  const badges = profileDataResult?.badges ?? [];
  const archiveCount = archiveData?.total ?? null;
  const profileRating = ratingData?.rating ?? null;
  const loading = isProfileLoading;

  // Helper to extract display data based on profile type
  const getDisplayData = () => {
    // customer의 경우 profileData가 없어도 public.profiles의 nickname 사용 가능
    if (!profileData && activeProfileType !== 'customer')
      return {
        name: '',
        role: '',
        subInfo: '',
        image: '',
        cover: '',
        tags: [],
        roleColor: '',
        roleBgColor: '',
      };

    let name = '';
    let role = '';
    let subInfo = '';
    let image = '';
    let cover = '';
    let tags: string[] = [];
    let roleColor = '';
    let roleBgColor = '';
    switch (activeProfileType) {
      case 'brand': {
        name = profileData.brand_name || profileData.nickname || '';
        role = '브랜드';
        // activity_field를 한글로 매핑
        const activityFieldMap: Record<string, string> = {
          'music': '음악',
          'art': '아트',
          'fashion': '패션',
          'tech': '테크',
          'content': '콘텐츠',
          'lifestyle': '라이프스타일',
          'beauty': '뷰티',
          'food': '푸드',
          'sports': '스포츠',
          'travel': '여행',
          'entertainment': '엔터테인먼트',
          'education': '교육',
          'health': '건강',
          'finance': '금융',
          'other': '기타',
        };
        const brandActivityField = profileData.activity_field || '';
        subInfo = activityFieldMap[brandActivityField] || brandActivityField || '';
        image = profileData.logo_image_url || '';
        cover = profileData.cover_image_url || '';
        // target_audiences와 tags를 합쳐서 태그로 표시
        const brandTargetAudiences: string[] = profileData.target_audiences || [];
        const brandTags: string[] = profileData.tags || [];
        tags = [...brandTargetAudiences, ...brandTags];
        roleColor = theme.palette.userTypeText.brand;
        roleBgColor = theme.palette.userTypeBg.brand;
        break;
      }
      case 'artist':
        name = profileData.artist_name || profileData.nickname || '';
        role = '아티스트';
        subInfo = profileData.activity_field || '';
        image = profileData.logo_image_url || '';
        cover = profileData.cover_image_url || '';
        tags = profileData.tags || [];
        roleColor = theme.palette.userTypeText.artist;
        roleBgColor = theme.palette.userTypeBg.artist;
        break;
      case 'creative':
        name = profileData.nickname || '';
        role = '크리에이티브';
        subInfo = profileData.activity_field || '';
        image = profileData.profile_image_url || '';
        cover = profileData.cover_image_url || '';
        tags = profileData.tags || [];
        roleColor = theme.palette.userTypeText.creative;
        roleBgColor = theme.palette.userTypeBg.creative;
        break;
      case 'fan':
        // fan은 public.profiles의 nickname을 우선 사용
        name = (fanProfileNickname as any)?.nickname || profileData?.nickname || '';
        role = '팬';
        // persona id로 USER_TYPE_OPTIONS에서 label 찾기
        const fanPersona = profileData?.persona || '';
        const personaOption = USER_TYPE_OPTIONS.find(opt => opt.id === fanPersona);
        subInfo = personaOption?.label || '';
        image = profileData?.logo_image_url || profileData?.profile_image_url || '';
        // 팬은 커버 이미지를 설정할 수 없으므로 기본 이미지 사용
        cover = 'https://xianrhwkdarupnvaumti.supabase.co/storage/v1/object/public/assets/defaults/cover.png';
        roleColor = theme.palette.userTypeText.fan;
        roleBgColor = theme.palette.userTypeBg.fan;
        break;
      case 'customer':
        // customer는 public.profiles의 nickname을 우선 사용
        name = (customerProfile as any)?.nickname || profileData?.nickname || '';
        role = 'Customer';
        image = profileData?.profile_image_url || '';
        cover = profileData?.cover_image_url || '';
        roleColor = theme.palette.text.primary;
        roleBgColor = theme.palette.grey[100];
        break;
    }

    return { name, role, subInfo, image, cover, tags, roleColor, roleBgColor };
  };

  const displayData = getDisplayData();

  // 프로필 타입에 따라 탭 필터링
  const availableTabs = PROFILE_TABS.filter(tab => {
    if (tab.key === 'reviews' && activeProfileType === 'fan') return false;
    return true;
  });

  // 유효하지 않은 탭인 경우 (예: 팬이 리뷰 탭에 머물러 있는 경우) 개요로 이동
  useEffect(() => {
    if (activeProfileType === 'fan' && activeTab === 'reviews') {
      setActiveTab('overview');
    }
  }, [activeProfileType, activeTab, setActiveTab]);

  // 디버깅: customer 및 fan 프로필 확인
  useEffect(() => {
    if (activeProfileType === 'customer') {
      console.log('🔍 Customer Profile Debug:', {
        activeProfileType,
        customerProfile,
        profileData,
        displayData
      });
    } else if (activeProfileType === 'fan') {
      console.log('🔍 Fan Profile Debug:', {
        activeProfileType,
        fanProfileNickname,
        profileData,
        displayData
      });
    }
  }, [activeProfileType, customerProfile, fanProfileNickname, profileData, displayData]);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLogoutLoading(false);
      setLogoutConfirmOpen(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 10 }}>
        <Skeleton variant="rectangular" height={200} />
        <Box sx={{ display: 'flex', mt: 2 }}>
          <Skeleton variant="circular" width={80} height={80} />
          <Box sx={{ ml: 2, width: '100%' }}>
            <Skeleton width="60%" />
            <Skeleton width="40%" />
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Box sx={{
      pb: `${BOTTOM_NAV_HEIGHT}px`,
      minHeight: '100vh',
      position: 'relative',
      maxWidth: '768px',
      margin: '0 auto'
    }}>
      {/* Header - Fixed */}
      <Box sx={{ position: 'sticky', top: 0, zIndex: 1100 }}>
        <Header />
      </Box>

      {/* Cover Image */}
      <Box sx={{
        width: '100%',
        height: '200px',
        bgcolor: theme.palette.background.default,
        backgroundImage: displayData.cover ? `url(${displayData.cover})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative'
      }}>
        {/* Profile Image Overlapping */}
        <Box sx={{
          position: 'absolute',
          bottom: '-40px',
          left: '20px',
          border: '4px solid white',
          borderRadius: '50%',
          bgcolor: 'white',
          width: '88px',
          height: '88px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          <Avatar
            src={displayData.image}
            alt={displayData.name}
            sx={{ width: '100%', height: '100%' }}
          >
            {displayData.name?.charAt(0)}
          </Avatar>
        </Box>
      </Box>

      {/* Profile Info */}
      <Box sx={{ mt: '50px', px: 3 }}>
        {/* Name & Role */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Inter, sans-serif', color: '#1F2937' }}>
            {displayData.name || '이름 없음'}
          </Typography>
          <Chip
            label={displayData.role}
            size="small"
            sx={{
              bgcolor: displayData.roleBgColor,
              color: displayData.roleColor,
              fontWeight: 600,
              fontSize: '11px',
              height: '22px'
            }}
          />
        </Box>

        {/* Sub Info */}
        {displayData.subInfo && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {displayData.subInfo}
          </Typography>
        )}

        {/* Stats */}
        <Box sx={{ display: 'flex', justifyContent: activeProfileType === 'fan' ? 'flex-start' : 'space-between', mb: 3, mt: 1, gap: 2 }}>
          {/* 팬인 경우: 팔로잉을 왼쪽(아카이브 위치)에 배치 */}
          {activeProfileType === 'fan' && (
            <Box
              sx={{ textAlign: 'center', flex: 'none', cursor: 'pointer' }}
              onClick={() => navigate('/profile/connections', { state: { initialTab: 'following' } })}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '16px' }}>
                {stats.followingCount}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                팔로잉
              </Typography>
            </Box>
          )}
          {/* 팬이 아닌 경우: 아카이브 */}
          {activeProfileType !== 'fan' && (
            <Box
              sx={{ textAlign: 'center', flex: 1, cursor: 'pointer' }}
              onClick={() => navigate('/archive')}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {archiveCountLoading ? <Skeleton width={30} sx={{ mx: 'auto' }} /> : archiveCount ?? '-'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                아카이브
              </Typography>
            </Box>
          )}
          {/* 팬이 아닌 경우: 팔로워 */}
          {activeProfileType !== 'fan' && (
            <Box
              sx={{ textAlign: 'center', flex: 1, cursor: 'pointer' }}
              onClick={() => navigate('/profile/connections', { state: { initialTab: 'followers' } })}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '16px' }}>
                {stats.followerCount}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                팔로워
              </Typography>
            </Box>
          )}
          {/* 팬이 아닌 경우: 좋아요 (팔로잉 대신) */}
          {activeProfileType !== 'fan' && (
            <Box sx={{ textAlign: 'center', flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '16px' }}>
                {stats.likeCount}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                좋아요
              </Typography>
            </Box>
          )}
          {/* 팬이 아니고 customer가 아닌 경우: 평점 */}
          {activeProfileType !== 'fan' && activeProfileType !== 'customer' && (
            <Box sx={{ textAlign: 'center', flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '16px', color: theme.palette.status.star, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                {ratingLoading ? (
                  <Skeleton width={40} sx={{ mx: 'auto' }} />
                ) : profileRating !== null ? (
                  `★ ${profileRating.toFixed(1)}`
                ) : (
                  <span style={{ color: 'inherit' }}>★ -</span>
                )}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                평점
              </Typography>
            </Box>
          )}
        </Box>

        {/* Tags */}
        {(activeProfileType === 'brand' || activeProfileType === 'artist' || activeProfileType === 'creative') && displayData.tags.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
            {displayData.tags.map((tag: string, index: number) => (
              <Chip
                key={index}
                label={tag}
                sx={{
                  bgcolor: theme.palette.grey[100],
                  color: theme.palette.text.primary,
                  borderRadius: '20px',
                  fontSize: '12px',
                  height: '28px'
                }}
              />
            ))}
          </Box>
        )}

        {/* Fan Specific Interests Tags */}
        {activeProfileType === 'fan' && profileData?.specific_interests && profileData.specific_interests.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {profileData.specific_interests.map((interest: string, index: number) => (
                <Chip
                  key={index}
                  label={interest}
                  sx={{
                    bgcolor: theme.palette.grey[100],
                    color: theme.palette.text.primary,
                    borderRadius: '20px',
                    fontSize: '12px',
                    height: '28px'
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Achievement Badges */}
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1.5,
              cursor: 'pointer'
            }}
            onClick={() => navigate('/profile/badges')}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1F2937' }}>
              성취 배지
            </Typography>
            <ChevronRightIcon sx={{ color: theme.palette.icon.default, fontSize: 20 }} />
          </Box>
          <Box
            sx={{
              display: 'flex',
              gap: 1.5,
              overflowX: 'auto',
              pb: 1,
              '::-webkit-scrollbar': { display: 'none' },
              cursor: 'pointer'
            }}
            onClick={() => navigate('/profile/badges')}
          >
            {[...badges]
              // 획득한 배지를 왼쪽(앞쪽)에 먼저 배치
              .sort((a, b) => {
                if (a.obtained === b.obtained) return 0;
                return a.obtained ? -1 : 1;
              })
              .map((badge) => {
                const badgeAsset = getBadgeAsset(badge.id);
                return (
                  <Box key={badge.id} sx={{ textAlign: 'center', minWidth: '56px' }}>
                    <Box sx={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      bgcolor: badge.obtained ? 'transparent' : '#F3F4F6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      filter: badge.obtained ? 'none' : 'grayscale(100%)',
                      opacity: badge.obtained ? 1 : 0.4,
                      mb: 0.5,
                      margin: '0 auto',
                      // 미획득 배지의 경우 배경색을 더 어둡게 하여 스샷 2 느낌 내기
                      ...(!badge.obtained && {
                        backgroundColor: 'rgba(0,0,0,0.05)',
                      })
                    }}>
                      {badgeAsset ? (
                        <Box
                          component="img"
                          src={badgeAsset}
                          alt={badge.name}
                          sx={{
                            width: '70%',
                            height: '70%',
                            objectFit: 'contain'
                          }}
                        />
                      ) : (
                        <Typography sx={{ fontSize: '20px' }}>{badge.icon}</Typography>
                      )}
                    </Box>
                  </Box>
                );
              })}
            {badges.length === 0 && (
              <Typography variant="caption" color="text.secondary">아직 획득한 배지가 없어요.</Typography>
            )}
          </Box>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ mb: 0 }}>
        <TabBar tabs={availableTabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </Box>

      {/* Tab Content */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'overview' && (
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Recent Activity Section */}
            {user?.id && <RecentActivitySection userId={user.id} />}

            {/* Favorites Section */}
            <Box>
              {activeProfileId && <FavoritesSection userId={activeProfileId} />}
            </Box>
          </Box>
        )}

        {/* Restore Reviews Tab */}
        {activeTab === 'reviews' && (
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Reviews I Received - Template Statistics */}
            {activeProfileType !== 'fan' && (
              <Box>
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, cursor: 'pointer' }}
                  onClick={() => navigate('/profile/reviews/received')}
                >
                  <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                    내가 받은 리뷰
                  </Typography>
                  <ChevronRightIcon sx={{ color: theme.palette.icon.default, fontSize: 20 }} />
                </Box>
                {activeProfileId && <ReceivedReviewTagStats userId={activeProfileId} enabled={activeTab === 'reviews'} />}
              </Box>
            )}

            {/* Reviews I Wrote */}
            <Box>
              <Box
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, cursor: 'pointer' }}
                onClick={() => navigate('/profile/reviews/written')}
              >
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                  내가 작성한 리뷰
                </Typography>
                <ChevronRightIcon sx={{ color: theme.palette.icon.default, fontSize: 20 }} />
              </Box>
              {activeProfileId && <WrittenReviewsPreview userId={activeProfileId} enabled={activeTab === 'reviews'} />}
            </Box>
          </Box>
        )}

        {/* Restore Settings Tab */}
        {activeTab === 'settings' && (
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              {
                icon: (
                  <Box
                    component="img"
                    src={settingProfileIcon}
                    alt="프로필 편집"
                    sx={{ width: 40, height: 40, objectFit: 'contain' }}
                  />
                ),
                title: '프로필 편집',
                subtitle: '개인 정보 및 전문 분야 수정',
                action: () => {
                  if (activeProfileType === 'customer') {
                    toast.info('먼저 프로필을 만들어야 해요.');
                  } else {
                    setEditProfileOpen(true);
                  }
                }
              },
              {
                icon:
                  (
                    <Box
                      component="img"
                      src={settingPortfolioIcon}
                      alt="포트폴리오 관리"
                      sx={{ width: 40, height: 40, objectFit: 'contain' }}
                    />
                  ),
                title: '포트폴리오 관리',
                subtitle: '작업물 및 경력 관리',
                action: () => navigate('/profile/portfolio')
              },
              {
                icon: (
                  <Box
                    component="img"
                    src={settingNotificationIcon}
                    alt="알림 설정"
                    sx={{ width: 40, height: 40, objectFit: 'contain' }}
                  />
                ),
                title: '알림 설정',
                subtitle: '프로젝트 및 메시지 알림 설정',
                action: () => navigate('/settings/notifications')
              },
              {
                icon: (
                  <Box
                    component="img"
                    src={settingAccountIcon}
                    alt="숨김/차단 계정 관리"
                    sx={{ width: 40, height: 40, objectFit: 'contain' }}
                  />
                ),
                title: '숨김/차단 계정 관리',
                subtitle: '사용자, 프로젝트·협업 숨김 차단 관리',
                action: () => setBlockedManagementOpen(true)
              },
              {
                icon: (
                  <Box
                    component="img"
                    src={settingBookmarkIcon}
                    alt="북마크 관리"
                    sx={{ width: 40, height: 40, objectFit: 'contain' }}
                  />
                ),
                title: '북마크 관리',
                subtitle: '매거진 북마크 관리',
                action: () => navigate('/profile/bookmarks')
              },
              {
                icon: (
                  <Box
                    component="img"
                    src={settingShopIcon}
                    alt="상점"
                    sx={{ width: 40, height: 40, objectFit: 'contain' }}
                  />
                ),
                title: '상점',
                subtitle: '프로필 꾸미기 및 채팅권 구매',
                action: () => navigate('/shop')
              },
              {
                icon: (
                  <Box
                    component="img"
                    src={settingRevenueIcon}
                    alt="수익 관리"
                    sx={{ width: 40, height: 40, objectFit: 'contain' }}
                  />
                ),
                title: '수익 관리',
                subtitle: '라잇 포인트, 프로젝트 정산 관리',
                action: () => navigate('/profile/revenue'),
              },
              {
                icon: (
                  <Box
                    component="img"
                    src={settingRevenueIcon}
                    alt="수익 관리"
                    sx={{ width: 40, height: 40, objectFit: 'contain' }}
                  />
                ),
                title: '수익 관리',
                subtitle: '라잇 포인트, 프로젝트 정산 관리',
                action: () => navigate('/profile/revenue'),
              },
              {
                icon: (
                  <Box
                    component="img"
                    src={settingSupportIcon}
                    alt="고객 지원"
                    sx={{ width: 40, height: 40, objectFit: 'contain' }}
                  />
                ),
                title: '고객 지원',
                subtitle: '문의사항 및 도움말',
                action: () => navigate('/settings/support')
              },
            ].map((item, index) => (
              <Paper
                key={index}
                elevation={0}
                onClick={item.action}
                sx={{
                  p: 2,
                  borderRadius: '16px',
                  boxShadow: '0px 3px 5px rgba(0,0,0,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {item.icon}
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#111827', mb: 0.5 }}>
                      {item.title}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#6B7280' }}>
                      {item.subtitle}
                    </Typography>
                  </Box>
                </Box>
                <ChevronRightIcon sx={{ color: theme.palette.icon.default, fontSize: 20 }} />
              </Paper>
            ))}

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 2 }}>
              <Button
                onClick={() => setLogoutConfirmOpen(true)}
                startIcon={<LogoutIcon />}
                sx={{
                  color: '#9CA3AF',
                  textTransform: 'none',
                  fontSize: 13,
                }}
              >
                로그아웃
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      {/* Footer & Modals */}
      <BottomNavigationBar />

      {/* Settings Modals */}
      {activeProfileId && (
        <>
          <BlockedAccountManagement
            open={blockedManagementOpen}
            onClose={() => setBlockedManagementOpen(false)}
          />
        </>
      )}

      {/* Logout Confirm Dialog */}
      <ConfirmDialog
        open={logoutConfirmOpen}
        onClose={() => !logoutLoading && setLogoutConfirmOpen(false)}
        onConfirm={handleLogout}
        title="로그아웃 하시겠어요?"
        message="현재 기기에서 계정이 로그아웃됩니다."
        confirmText="로그아웃"
        cancelText="취소"
        loading={logoutLoading}
        icon={<LogoutIcon />}
      />

      {/* Edit Profile Modal */}
      {activeProfileType && activeProfileType !== 'customer' && (
        <EditProfileModal
          open={editProfileOpen}
          onClose={() => setEditProfileOpen(false)}
          profileType={activeProfileType}
          profileData={profileData}
          fanProfileNickname={activeProfileType === 'fan' ? (fanProfileNickname as any)?.nickname : undefined}
          onSuccess={() => {
            // 프로필 관련 모든 쿼리 무효화 (useMyProfileData.ts의 키와 일치시킴)
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: ['profile-initialization', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['headerProfileImage'] });

            // 프로필 타입별 추가 무효화
            if (activeProfileType === 'brand') {
              queryClient.invalidateQueries({ queryKey: ['brandProfile'] });
            } else if (activeProfileType === 'artist') {
              queryClient.invalidateQueries({ queryKey: ['artistProfile'] });
            } else if (activeProfileType === 'creative') {
              queryClient.invalidateQueries({ queryKey: ['creativeProfile'] });
            } else if (activeProfileType === 'fan') {
              queryClient.invalidateQueries({ queryKey: ['fanProfile'] });
              queryClient.invalidateQueries({ queryKey: ['fanProfileNickname', user?.id] });
            }
          }}
        />
      )}
    </Box>
  );
}

function FavoritesSection({ userId }: { userId: string }) {
  const theme = useTheme();
  const { data: favorites = [], isLoading } = useFavorites(userId);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // 파트너 상세 모달 상태
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [partnerLoading, setPartnerLoading] = useState(false);

  // 이미지 URL 추출 및 리사이즈 (48x48 Avatar 크기 * 2 = 96px, 레티나 대응)
  const imageUrls = favorites.map((fav) => fav.image).filter((url): url is string => !!url);
  const resizedImageMap = useResizedImages(imageUrls, { maxWidth: 96, maxHeight: 96 });

  // Reset selection when exiting edit mode
  useEffect(() => {
    if (!isEditMode) setSelectedIds(new Set());
  }, [isEditMode]);

  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // 즐겨찾기 유저 클릭 시 파트너/브랜드 상세 모달 열기
  const handleFavoriteClick = async (favId: string) => {
    if (isEditMode) {
      handleToggle(favId);
      return;
    }

    try {
      setPartnerLoading(true);
      // 먼저 파트너(artist/creative) 조회 시도
      let partner = await getPartnerById(favId);

      // 파트너가 없으면 브랜드인지 확인
      if (!partner) {
        const brand = await getBrandById(favId);
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

      if (partner) {
        setSelectedPartner(partner);
        setPartnerModalOpen(true);
      }
    } catch (error) {
      console.error('[FavoritesSection] Failed to fetch partner/brand:', error);
    } finally {
      setPartnerLoading(false);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm('선택한 항목을 즐겨찾기에서 해제하시겠습니까?')) return;

    try {
      await Promise.all(Array.from(selectedIds).map(async (targetId) => {
        // Shotgun approach to remove relationship
        // We try to unlike for user/brand/partner and unfollow for user
        // Errors are swallowed in service typically or we can catch here
        await Promise.all([
          socialService.unlikeEntity(userId, targetId, 'user').catch(() => { }),
          socialService.unlikeEntity(userId, targetId, 'brand').catch(() => { }),
          socialService.unlikeEntity(userId, targetId, 'partner').catch(() => { }),
          socialService.unfollowUser(userId, targetId).catch(() => { })
        ]);
      }));

      // Invalidate query
      queryClient.invalidateQueries({ queryKey: ['profile', 'favorites', userId] });
      setIsEditMode(false);
    } catch (err) {
      console.error('Failed to delete favorites:', err);
      alert('삭제 중 오류가 발생했어요.');
    }
  };

  if (isLoading) return (
    <Box>
      <Typography sx={{ fontSize: 16, fontWeight: 600, mb: 2, color: '#111827' }}>즐겨찾기</Typography>
      <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 3 }} />
    </Box>
  );

  if (favorites.length === 0) return (
    <Box>
      <Typography sx={{ fontSize: 16, fontWeight: 600, mb: 2, color: '#111827' }}>즐겨찾기</Typography>
      <Typography color="text.secondary" align="center" py={4} sx={{ fontSize: 13 }}>즐겨찾는 항목이 없어요.</Typography>
    </Box>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>
          즐겨찾기 <span style={{ color: '#9CA3AF', fontSize: 14, fontWeight: 400 }}>{favorites.length}</span>
        </Typography>
        <Box>
          {isEditMode ? (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                size="small"
                onClick={() => setIsEditMode(false)}
                sx={{ color: '#6B7280', fontSize: 13, minWidth: 'auto' }}
              >
                취소
              </Button>
              <Button
                size="small"
                onClick={handleDelete}
                disabled={selectedIds.size === 0}
                sx={{ color: '#EF4444', fontWeight: 600, fontSize: 13, minWidth: 'auto' }}
              >
                삭제({selectedIds.size})
              </Button>
            </Box>
          ) : (
            <Button
              size="small"
              onClick={() => setIsEditMode(true)}
              sx={{ color: '#6B7280', fontSize: 13, minWidth: 'auto' }}
            >
              관리
            </Button>
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1, pt: 1, '::-webkit-scrollbar': { display: 'none' } }}>
        {favorites.map(fav => (
          <Box
            key={fav.id}
            onClick={() => handleFavoriteClick(fav.id)}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
              cursor: 'pointer',
              minWidth: 72,
              position: 'relative',
              opacity: (isEditMode && !selectedIds.has(fav.id)) ? 0.5 : 1
            }}
          >
            <Box sx={{ position: 'relative' }}>
              <Avatar src={fav.image ? (resizedImageMap.get(fav.image) || fav.image) : undefined} sx={{ width: 48, height: 48, mb: 0.5 }}>{fav.name[0]}</Avatar>
              {isEditMode && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: -12,
                    right: -4,
                  }}
                >
                  <Radio
                    checked={selectedIds.has(fav.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleToggle(fav.id);
                    }}
                    sx={{
                      p: 0,
                      color: theme.palette.status.Error,
                      '&.Mui-checked': {
                        color: theme.palette.status.Error,
                      },
                      '& .MuiSvgIcon-root': {
                        fontSize: 20,
                      },
                    }}
                  />
                </Box>
              )}
            </Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#111827', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', maxWidth: 100 }}>{fav.name}</Typography>
            <Typography sx={{ fontSize: 11, color: '#6B7280', textAlign: 'center' }}>{fav.role}</Typography>
          </Box>
        ))}
      </Box>

      {/* 파트너 상세 모달 */}
      <Dialog
        open={partnerModalOpen}
        onClose={() => {
          setPartnerModalOpen(false);
          setSelectedPartner(null);
        }}
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
            backgroundColor: theme.palette.background.paper,
          },
        }}
      >
        <PartnerDetailContent
          partner={selectedPartner}
          loading={partnerLoading}
          onClose={() => {
            setPartnerModalOpen(false);
            setSelectedPartner(null);
          }}
          showBottomNavigation={false}
          isModal={true}
        />
      </Dialog>
    </Box>
  );
}

function ReceivedReviewTagStats({ userId, enabled = true }: { userId: string; enabled?: boolean }) {
  const { data: tagStats, isLoading } = useReceivedReviewTagStats(userId, enabled);

  // MEMBER_REVIEW_TEMPLATES 중에서 받은 리뷰가 있는 것만 필터링하고 개수 순으로 정렬
  const statsToShow = MEMBER_REVIEW_TEMPLATES
    .map(template => ({
      template,
      count: tagStats?.get(template) || 0
    }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            height={48}
            sx={{ borderRadius: '12px', bgcolor: '#F3F4F6' }}
          />
        ))}
      </Box>
    );
  }

  if (statsToShow.length === 0) {
    return <Typography color="text.secondary" sx={{ fontSize: 13, py: 2 }}>아직 받은 리뷰가 없어요.</Typography>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {statsToShow.map(({ template, count }) => (
        <ReviewTemplateCard key={template} template={template} count={count} />
      ))}
    </Box>
  );
}

// 추후 사용 예정 (ReceivedReviewsPreview)
function _ReceivedReviewsPreview({ userId, enabled = true }: { userId: string; enabled?: boolean }) {
  const { data: reviews = [] } = useReceivedReviewsPreview(userId, enabled);

  if (reviews.length === 0) return <Typography color="text.secondary" sx={{ fontSize: 13, py: 2 }}>아직 받은 리뷰가 없어요.</Typography>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {reviews.map(review => (
        <Paper key={review.id} elevation={0} sx={{ p: 1.5, border: '1px solid #F3F4F6', borderRadius: '12px' }}>
          <Typography sx={{ fontSize: 13, color: '#374151', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            "{review.content}"
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
            <Typography sx={{ fontSize: 11, color: '#9CA3AF' }}>- {review.reviewer?.name}</Typography>
          </Box>
        </Paper>
      ))}
    </Box>
  );
}

// 향후 사용을 위해 유지
void _ReceivedReviewsPreview;

function WrittenReviewsPreview({ userId, enabled = true }: { userId: string; enabled?: boolean }) {
  const { data: reviews = [], isLoading } = useWrittenReviewsPreview(userId, enabled);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {[1, 2].map((i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            height={68}
            sx={{ borderRadius: '12px', border: '1px solid #F3F4F6', bgcolor: '#fff' }}
          />
        ))}
      </Box>
    );
  }

  if (reviews.length === 0) return <Typography color="text.secondary" sx={{ fontSize: 13, py: 2 }}>작성한 리뷰가 없어요.</Typography>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {reviews.map(review => (
        <Paper key={review.id} elevation={0} sx={{ borderRadius: '12px', bgcolor: '#F3F4F6', py: 1.5, px: 2.5, }}>
          {review.review_tag && (
            <Typography sx={{ fontSize: 13, fontWeight: 500, color: '#111827', mb: 1, borderRadius: '12px' }}>
              {review.review_tag}
            </Typography>
          )}

          <Box sx={{ display: !review.content ? 'none' : 'flex', flexDirection: 'column' }}>
            <Typography sx={{ fontSize: 10, color: '#374151' }}>
              추가메시지
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#374151', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {review.content}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
            <Typography sx={{ fontSize: 11, color: '#9CA3AF' }}>To. {review.reviewee?.name}</Typography>
          </Box>
        </Paper>
      ))}
    </Box>
  );
}

import { useState, useCallback, useEffect, memo } from 'react';
import { Box, Typography, Button, Chip, IconButton, useTheme } from '@mui/material';
import Favorite from '@mui/icons-material/Favorite';
import FavoriteBorder from '@mui/icons-material/FavoriteBorder';
import StarIcon from '@mui/icons-material/Star';
import OnlineIndicator from '../common/OnlineIndicator';
import LazyImage from '../common/LazyImage';
import { toast } from 'react-toastify';
import ProjectCardMenu from './ProjectCardMenu';
import ReasonModal, { type ActionType } from '../common/ReasonModal';
import ActionResultModal from '../common/ActionResultModal';
import { ReportModal, type ReportTargetType } from '../common';
import InvitationModal from '../common/InvitationModal';
import { useExploreStore, type ActorInfo } from '../../stores/exploreStore';
import { useBrandApprovalStatus } from '../../hooks/useBrandApprovalStatus';
import { useProfileStore } from '../../stores/profileStore';
import { useAuth } from '../../providers/AuthContext';
import type { Partner } from '../../services/exploreService';
import { hidePartner, blockPartner, getPartnerStats, type PartnerStats } from '../../services/partnerService';
import { getBrandStats, type BrandStats } from '../../services/brandService';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import NotInterestedOutlinedIcon from '@mui/icons-material/NotInterestedOutlined';
import FmdGoodOutlinedIcon from '@mui/icons-material/FmdGoodOutlined';
import { supabase } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

interface PartnerCardProps {
  partner: Partner;
  onClick: () => void;
  onRequestClick?: () => void;
  onActionSuccess?: (partnerId: string, action: ActionType) => void;
  hideStats?: boolean;
  isLoggedIn?: boolean;
  onRequireLogin?: () => void;
  actionButton?: React.ReactNode;
}

// 카드가 많은 화면에서 불필요한 통계 API 호출을 줄이기 위한 간단 캐시
const partnerStatsCache = new Map<string, PartnerStats>();
const partnerStatsInflight = new Map<string, Promise<PartnerStats>>();

const fetchPartnerStatsCached = async (partnerId: string): Promise<PartnerStats> => {
  const cached = partnerStatsCache.get(partnerId);
  if (cached) return cached;

  const inflight = partnerStatsInflight.get(partnerId);
  if (inflight) return inflight;

  const p = getPartnerStats(partnerId)
    .then((stats) => {
      partnerStatsCache.set(partnerId, stats);
      return stats;
    })
    .finally(() => {
      partnerStatsInflight.delete(partnerId);
    });

  partnerStatsInflight.set(partnerId, p);
  return p;
};

const PartnerCard = memo((props: PartnerCardProps) => {
  const {
    partner,
    onClick,
    onActionSuccess,
    hideStats = false,
    isLoggedIn = false,
    onRequireLogin,
    actionButton,
  } = props;
  const theme = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isRestricted: isBrandApprovalRestricted } = useBrandApprovalStatus();
  const { type: activeRole, profileId, fanProfile, nonFanProfile } = useProfileStore();
  const {
    isPartnerLiked,
    toggleLikePartner,
    isPartnerFollowed,
    toggleFollowPartner
  } = useExploreStore();
  const isFanUser = activeRole === 'fan';

  // 자기 자신인지 확인 (자기 카드에는 좋아요/팔로우/초대하기 버튼 숨김)
  const isSelf = user?.id === partner.id;

  const shouldHideRequestButton = !isLoggedIn || isFanUser || isBrandApprovalRestricted || isSelf;

  const isLiked = isLoggedIn ? isPartnerLiked(partner.id) : false;
  const isFollowed = isLoggedIn ? isPartnerFollowed(partner.id) : false;

  /**
   * 현재 활성 프로필의 actorInfo를 수집
   * 좋아요/팔로우 시점의 프로필 정보를 스냅샷으로 저장하기 위해 사용
   */
  const getActorInfo = useCallback(async (): Promise<ActorInfo | undefined> => {
    // customer 는 별도 프로필 테이블이 없으므로 actor 스냅샷을 남기지 않는다
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
  const [modalAction, setModalAction] = useState<ActionType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [resultAction, setResultAction] = useState<ActionType | null>(null);
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [invitationSent, setInvitationSent] = useState(false);
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // 브랜드 유저용: profile_brands에서 activity_field, tags 직접 조회
  const [brandData, setBrandData] = useState<{ activityField: string; tags: string[] } | null>(null);

  // 브랜드일 경우 profile_brands에서 activity_field, tags 가져오기
  useEffect(() => {
    if (partner?.role !== 'brand' || !partner?.id) {
      setBrandData(null);
      return;
    }

    let isMounted = true;

    const fetchBrandData = async () => {
      try {
        const { data, error } = await supabase
          .from('profile_brands')
          .select('activity_field, tags')
          .eq('profile_id', partner.id)
          .maybeSingle();

        if (isMounted && !error && data) {
          setBrandData({
            activityField: data.activity_field || '',
            tags: data.tags || [],
          });
        }
      } catch {
        if (isMounted) setBrandData(null);
      }
    };

    fetchBrandData();

    return () => {
      isMounted = false;
    };
  }, [partner?.id, partner?.role]);

  // PartnerDetailContent와 동일한 기준으로(리뷰 테이블 기반) 평점/리뷰 수 표시
  useEffect(() => {
    let isMounted = true;

    const shouldLoadStats = !!partner?.id && (partner.role === 'artist' || partner.role === 'creative' || partner.role === 'brand');
    if (!shouldLoadStats) {
      setStats(null);
      return () => {
        isMounted = false;
      };
    }

    // Brand uses different stats function
    if (partner.role === 'brand') {
      getBrandStats(partner.id)
        .then((brandStats: BrandStats) => {
          if (isMounted) {
            setStats({
              rating: brandStats.rating,
              reviewCount: brandStats.reviewCount,
              responseRate: brandStats.responseRate,
              responseTime: brandStats.responseTime,
              matchingRate: null,
            });
          }
        })
        .catch((err: unknown) => {
          console.warn('[PartnerCard] Failed to load brand stats:', err);
          if (isMounted) setStats(null);
        });
    } else {
      fetchPartnerStatsCached(partner.id)
        .then((fresh) => {
          if (isMounted) setStats(fresh);
        })
        .catch((err) => {
          console.warn('[PartnerCard] Failed to load partner stats:', err);
          if (isMounted) setStats(null);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [partner?.id, partner?.role]);

  // 브랜드일 경우 brandData 우선 사용, 아니면 partner 데이터 사용
  const displayActivityField = partner.role === 'brand' && brandData ? brandData.activityField : partner.activityField;
  const displayTags = partner.role === 'brand' && brandData ? brandData.tags : (partner.tags || []);

  const displayReviewCount = stats?.reviewCount ?? (partner.reviewCount ?? 0);
  const displayRating =
    stats?.rating ??
    (displayReviewCount > 0
      ? (typeof partner.rating === 'number' ? partner.rating : null)
      : null);

  const partnerMenuItems = [
    {
      action: 'hide' as const,
      label: '프로필 숨김',
      icon: <VisibilityOffOutlinedIcon sx={{ fontSize: 18, color: theme.palette.icon.default }} />,
    },
    {
      action: 'block' as const,
      label: '사용자 차단',
      icon: <NotInterestedOutlinedIcon sx={{ fontSize: 18, color: theme.palette.icon.default }} />,
      textColor: theme.palette.subText.default,
    },
    {
      label: '신고하기',
      icon: <NotInterestedOutlinedIcon sx={{ fontSize: 18, color: theme.palette.status.Error }} />,
      textColor: theme.palette.status.Error,
      onClick: () => {
        setShowReportModal(true);
      },
    },
  ];

  const handleLikeClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }
    const actorInfo = await getActorInfo();
    toggleLikePartner(partner.id, actorInfo);

    // 좋아요 후 프로필 통계 쿼리 무효화 (좋아요 수 업데이트를 위해)
    // partner.id는 좋아요를 받은 사용자의 ID이므로 해당 사용자의 프로필 쿼리를 무효화
    queryClient.invalidateQueries({
      queryKey: ['profile', 'data', partner.id]
    });
  }, [isLoggedIn, onRequireLogin, partner.id, getActorInfo, toggleLikePartner, queryClient]);

  const handleFollowClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }
    const actorInfo = await getActorInfo();
    toggleFollowPartner(partner.id, actorInfo);
  }, [isLoggedIn, onRequireLogin, partner.id, getActorInfo, toggleFollowPartner]);

  const handleCardClick = useCallback(() => {
    onClick();
  }, [onClick]);

  const handleRequestClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowInvitationModal(true);
  }, []);

  const handleInvitationSuccess = useCallback(() => {
    setShowInvitationModal(false);
    setInvitationSent(true);
  }, []);

  const handleHide = useCallback((_partnerId: string) => {
    void _partnerId;
    setModalAction('hide');
  }, []);

  const handleBlock = useCallback((_partnerId: string) => {
    void _partnerId;
    setModalAction('block');
  }, []);

  const handleReasonConfirm = useCallback(async (reason: string) => {
    if (!modalAction) return;
    const currentAction = modalAction;

    setIsLoading(true);
    try {
      if (modalAction === 'hide') {
        await hidePartner(partner.id, reason);
        toast.success('파트너가 숨겨졌습니다');
      } else {
        await blockPartner(partner.id, reason);
        toast.success('파트너가 차단되었습니다');
      }
      setModalAction(null);
      setIsVisible(false);
      setResultAction(currentAction);
      onActionSuccess?.(partner.id, currentAction);
    } catch (error) {
      console.error(`Failed to ${modalAction} partner:`, error);
      toast.error(`파트너 ${modalAction === 'hide' ? '숨김' : '차단'}에 실패했습니다`);
    } finally {
      setIsLoading(false);
    }
  }, [modalAction, partner.id, onActionSuccess]);

  const handleView = useCallback((_partnerId: string) => {
    void _partnerId;
    onClick();
  }, [onClick]);

  return (
    <>
      {isVisible && (
        <Box
          onClick={handleCardClick}
          sx={{
            backgroundColor: theme.palette.background.paper,
            overflow: 'hidden',
            borderRadius: '12px',
            boxShadow: '0px 2px 5px 0px rgba(50, 50, 105, 0.15), 0px 1px 1px 0px rgba(0, 0, 0, 0.05)',
            p: 2,
            cursor: 'pointer',
          }}
        >
          {/* Header: Profile Image + Info */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            {/* Profile Image - Left (Circular) with Online Indicator */}
            <Box sx={{ position: 'relative', flexShrink: 0 }}>
              <LazyImage
                src={partner.profileImageUrl}
                type="background"
                fallbackColor="#E9E9ED"
                cacheBust={false}
                alt={partner.name}
                targetWidth={128}
                targetHeight={128}
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  border: `2px solid ${theme.palette.divider}`,
                }}
              >
                <OnlineIndicator
                  userId={partner.id}
                  size="large"
                  position={{ top: 50, right: 5 }}
                />
              </LazyImage>
            </Box>

            {/* Info - Right */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {/* Row 1: Name + Menu + Like */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 16,
                      fontWeight: 500,
                      color: theme.palette.text.primary,
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {partner.name}
                  </Typography>
                  {partner.role && (partner.role === 'artist' || partner.role === 'creative' || partner.role === 'brand') && (
                    <Box
                      sx={{
                        ml: 0.6,
                        px: 0.8,
                        py: 0.6,
                        borderRadius: '12px',

                        backgroundColor: partner.role === 'artist'
                          ? theme.palette.userTypeBg.artist
                          : partner.role === 'creative'
                            ? theme.palette.userTypeBg.creative
                            : theme.palette.userTypeBg.brand ?? '#FEF3C7',

                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: 400,

                          color: partner.role === 'artist'
                            ? theme.palette.userTypeText.artist
                            : partner.role === 'creative'
                              ? theme.palette.userTypeText.creative
                              : theme.palette.userTypeText.brand ?? '#D97706',

                          lineHeight: 1,
                        }}
                      >
                        {partner.role === 'artist' ? '아티스트' : partner.role === 'creative' ? '크리에이티브' : '브랜드'}
                      </Typography>
                    </Box>
                  )}
                </Box>
                {isLoggedIn && (
                  <ProjectCardMenu
                    projectId={partner.id}
                    menuItems={partnerMenuItems}
                    onHide={handleHide}
                    onBlock={handleBlock}
                    onView={handleView}
                  />
                )}
                {!isSelf && (
                  <IconButton
                    size="small"
                    onClick={handleLikeClick}
                    sx={{ p: 0.5 }}
                  >
                    {isLiked ? (
                      <Favorite sx={{ fontSize: 20, color: theme.palette.status.red }} />
                    ) : (
                      <FavoriteBorder sx={{ fontSize: 20, color: theme.palette.text.secondary }} />
                    )}
                  </IconButton>
                )}
              </Box>

              {/* Row 2: Activity Field + Follow Chip */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  sx={{
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 14,
                    fontWeight: 500,
                    color: theme.palette.text.secondary,
                  }}
                >
                  {displayActivityField}
                </Typography>
                {!isSelf && (
                  actionButton ? (
                    actionButton
                  ) : (
                    <Chip
                      label={isFollowed ? '팔로잉' : '+ 팔로우'}
                      size="small"
                      onClick={handleFollowClick}
                      sx={{
                        ml: 'auto',
                        height: 24,
                        fontSize: 12,
                        fontFamily: 'Pretendard, sans-serif',
                        fontWeight: 500,
                        backgroundColor: isFollowed ? theme.palette.icon.inner : theme.palette.status.blue,
                        color: theme.palette.primary.contrastText,
                        border: 'none',
                        cursor: 'pointer',
                        '&:focus': {
                          backgroundColor: isFollowed ? theme.palette.icon.inner : theme.palette.status.blue,
                        },
                        '&:hover': {
                          backgroundColor: isFollowed ? theme.palette.icon.inner : theme.palette.status.blue,
                        },
                      }}
                    />
                  )
                )}
              </Box>

              {/* Row 3: Specialized Roles + Rating */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  sx={{
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 13,
                    fontWeight: 300,
                    color: theme.palette.text.secondary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {(partner.specializedRoles || []).slice(0, 2).join(', ')}
                </Typography>
              </Box>
              {/* Row 4: Rating + Projects + Region */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {!hideStats && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                    <StarIcon sx={{ fontSize: 12, color: theme.palette.status.star }} />
                    <Typography
                      sx={{
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: 12,
                        fontWeight: 500,
                        color: theme.palette.status.star,
                      }}
                    >
                      {displayRating ?? '–'}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: 11,
                        fontWeight: 400,
                        color: theme.palette.text.secondary,
                      }}
                    >
                      ({displayReviewCount})
                    </Typography>
                  </Box>
                )}

                {!hideStats && (
                  <Typography
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 12,
                      fontWeight: 400,
                      color: theme.palette.text.secondary,
                    }}
                  >
                    프로젝트 {partner.completedProjects ?? 0}개
                  </Typography>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                  <FmdGoodOutlinedIcon sx={{ fontSize: 12, color: theme.palette.icon.default }} />
                  <Typography
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 12,
                      fontWeight: 400,
                      color: theme.palette.text.secondary,
                    }}
                  >
                    {partner.region}
                  </Typography>
                </Box>

              </Box>
            </Box>

          </Box>



          {/* Row 5: Tags + Request Button */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            {/* Tags */}
            <Box sx={{ display: 'flex', gap: 0.5, flex: 1, overflow: 'hidden' }}>
              {displayTags.slice(0, 3).map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  sx={{
                    height: 24,
                    fontSize: 12,
                    fontFamily: 'Pretendard, sans-serif',
                    fontWeight: 400,
                    backgroundColor: theme.palette.grey[100],
                    color: theme.palette.text.secondary,
                    border: 'none',
                  }}
                />
              ))}
            </Box>

            {/* Request Button */}
            {!shouldHideRequestButton && (
              <Button
                onClick={handleRequestClick}
                disabled={isLoading}
                sx={{
                  height: 24,
                  width: 68,
                  fontSize: 12,
                  fontFamily: 'Pretendard, sans-serif',
                  fontWeight: 400,
                  color: theme.palette.primary.contrastText,
                  backgroundColor: theme.palette.primary.main,
                  borderRadius: '12px',
                  textTransform: 'none',
                  flexShrink: 0,
                }}
              >
                초대하기
              </Button>
            )}
          </Box>

          <ReasonModal
            open={modalAction !== null}
            onClose={() => setModalAction(null)}
            onConfirm={handleReasonConfirm}
            actionType={modalAction || 'hide'}
            entityType="partner"
            loading={isLoading}
            partnerName={partner.name}
          />

          <InvitationModal
            open={showInvitationModal}
            onClose={() => setShowInvitationModal(false)}
            onSuccess={handleInvitationSuccess}
            receiverId={partner.id}
            receiverName={partner.name}
          />
        </Box>
      )}

      {/* ReportModal을 Box 외부로 이동 - 클릭 이벤트 전파 방지 */}
      <ReportModal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType={'profile' as ReportTargetType}
        targetId={partner.id}
        targetName={partner.name}
      />

      <ActionResultModal
        open={resultAction !== null}
        onClose={() => setResultAction(null)}
        title={
          !resultAction
            ? ''
            : resultAction === 'hide'
              ? `${partner.name}님의 프로필을 숨겼어요`
              : `${partner.name}님을 차단했어요`
        }
        description={
          !resultAction
            ? ''
            : resultAction === 'hide'
              ? '탐색 피드와 추천에서 더 이상 표시되지 않아요.'
              : '차단된 사용자의 메시지와 활동은 제한됩니다.'
        }
      />

      <ActionResultModal
        open={invitationSent}
        onClose={() => setInvitationSent(false)}
        title="파트너에게 연결을 위한 라잇을 켰어요"
        confirmLabel="확인"
        variant="success"
      />
    </>
  );
});

PartnerCard.displayName = 'PartnerCard';

export default PartnerCard;

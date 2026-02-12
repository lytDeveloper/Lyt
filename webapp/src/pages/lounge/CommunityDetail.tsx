/**
 * CommunityDetail Page
 *
 * Full detail view for a community item (project/collaboration)
 * Displays all information, team members, comments with replies
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, IconButton, Typography, Chip, useTheme } from '@mui/material';
import { LightningLoader } from '../../components/common';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import { useCommunityDetail } from '../../hooks/useCommunityDetail';
import { useAuth } from '../../providers/AuthContext';
import { useProfileStore } from '../../stores/profileStore';
import { communityService } from '../../services/communityService';
import type { SupporterUser, ViewerUser } from '../../types/community.types';
import Header from '../../components/common/Header';
import { useViewerPresence } from '../../hooks/useViewerPresence';
import CommunityDetailCover from '../../components/lounge/CommunityDetailCover';
import BrandPartnerInfoCard from '../../components/lounge/BrandPartnerInfoCard';
import CommunityProgressStats from '../../components/lounge/CommunityProgressStats';
import SupporterListModal from '../../components/lounge/SupporterListModal';
import ViewerListModal from '../../components/lounge/ViewerListModal';
import TeamMembersSection from '../../components/lounge/TeamMembersSection';
import CommunityInfoSection from '../../components/lounge/CommunityInfoSection';
import BudgetDurationRow from '../../components/lounge/BudgetDurationRow';
import TagChipList from '../../components/lounge/TagChipList';
import CommentInput from '../../components/lounge/CommentInput';
import CommentList from '../../components/lounge/CommentList';
import BottomNavigationBar from '../../components/navigation/BottomNavigationBar';
import type { ReplySelectPayload } from '../../components/lounge/CommentItem';

const BOTTOM_NAV_HEIGHT = 60;

export default function CommunityDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') as 'project' | 'collaboration';
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { type: activeRole, profileId, fanProfile, nonFanProfile } = useProfileStore();

  const { data, isLoading, error } = useCommunityDetail(id!, type);

  // 프로젝트 타입일 때만 실시간 뷰어 presence에 참여 (카드에서 "~명 보는 중" 표시용)
  useViewerPresence({
    itemId: id!,
    itemType: type,
    enabled: type === 'project' && !!id,
    subscribeOnly: false, // track 수행 (count에 포함됨)
  });

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [isFollowed, setIsFollowed] = useState(false);
  const [isCommentSheetOpen, setIsCommentSheetOpen] = useState(false);
  const [isSupporterModalOpen, setIsSupporterModalOpen] = useState(false);
  const [isSupportersLoading, setIsSupportersLoading] = useState(false);
  const [supporters, setSupporters] = useState<SupporterUser[]>([]);
  const [isViewerModalOpen, setIsViewerModalOpen] = useState(false);
  const [isViewersLoading, setIsViewersLoading] = useState(false);
  const [viewers, setViewers] = useState<ViewerUser[]>([]);
  const [replyTarget, setReplyTarget] = useState<ReplySelectPayload | null>(null);
  const hasIncrementedRef = useRef(false);
  const hasTrackedViewRef = useRef(false);

  useEffect(() => {
    if (data) {
      setLikeCount(data.likeCount);
      // Always set viewCount from data first
      setViewCount(data.viewCount || 0);

      // Check if user has liked this item
      if (user) {
        communityService
          .checkLiked(id!, type, user.id)
          .then(setIsLiked)
          .catch(() => setIsLiked(false));
      }

      // Check if user follows the brand/partner (if applicable)
      // TODO: Implement follow check for brand/partner
    }
  }, [data, user, id, type]);

  useEffect(() => {
    if (!data || hasIncrementedRef.current) return;

    // Check if view count was already incremented in this session
    const viewKey = `community_view_${type}_${id}`;
    const hasViewed = sessionStorage.getItem(viewKey);

    if (hasViewed) {
      hasIncrementedRef.current = true;
      return;
    }

    hasIncrementedRef.current = true;
    sessionStorage.setItem(viewKey, 'true');

    const increment = async () => {
      try {
        const next = await communityService.incrementViewCount(id!, type);
        if (next >= 0) {
          setViewCount(next);
        } else {
          // If increment fails, keep the current count
          setViewCount((prev) => prev > 0 ? prev : (data?.viewCount || 0));
        }
      } catch (error) {
        console.error('Failed to increment view count:', error);
        // On error, keep the current count from data
        setViewCount((prev) => prev > 0 ? prev : (data?.viewCount || 0));
      }
    };

    increment();
  }, [data, id, type]);

  // Track view for logged-in user (unique per user)
  useEffect(() => {
    if (!data || !user || hasTrackedViewRef.current) return;

    hasTrackedViewRef.current = true;

    const trackView = async () => {
      try {
        // actorInfo 구성 (현재 활성 프로필 정보)
        // avatarUrl은 조회 시점에 동적으로 가져오므로 생략
        let actorInfo: {
          role: 'fan' | 'brand' | 'artist' | 'creative';
          profileId: string;
          name: string;
          avatarUrl?: string;
        } | undefined;

        if (activeRole && activeRole !== 'customer' && profileId) {
          if (activeRole === 'brand' && nonFanProfile) {
            actorInfo = {
              role: 'brand',
              profileId,
              name: nonFanProfile.record.brand_name || '',
            };
          } else if (activeRole === 'artist' && nonFanProfile) {
            actorInfo = {
              role: 'artist',
              profileId,
              name: nonFanProfile.record.artist_name || '',
            };
          } else if (activeRole === 'creative' && nonFanProfile) {
            actorInfo = {
              role: 'creative',
              profileId,
              name: nonFanProfile.record.nickname || '',
            };
          } else if (activeRole === 'fan' && fanProfile) {
            actorInfo = {
              role: 'fan',
              profileId,
              name: fanProfile.nickname || '',
            };
          }
        }

        await communityService.trackView(id!, type, user.id, actorInfo);
      } catch (error) {
        console.error('Failed to track view:', error);
      }
    };

    trackView();
  }, [data, user, id, type, activeRole, profileId, fanProfile, nonFanProfile]);

  const handleLikeToggle = async () => {
    if (!user) return;

    const newLiked = !isLiked;
    const newCount = newLiked ? likeCount + 1 : likeCount - 1;

    // Optimistic update
    setIsLiked(newLiked);
    setLikeCount(newCount);

    try {
      await communityService.toggleLike(id!, type, user.id);
    } catch (error) {
      // Rollback on error
      setIsLiked(!newLiked);
      setLikeCount(likeCount);
      console.error('Failed to toggle like:', error);
    }
  };

  const handleFollowToggle = async () => {
    // TODO: Implement follow toggle
    setIsFollowed(!isFollowed);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: data?.title,
        text: data?.description,
        url: window.location.href,
      }).catch(() => {
        // User cancelled, do nothing
      });
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('링크가 복사되었어요.');
    }
  };

  const handleCommentFocus = () => setIsCommentSheetOpen(true);
  const handleCloseCommentSheet = () => {
    setIsCommentSheetOpen(false);
    setReplyTarget(null);
  };
  const handleReplySelect = (target: ReplySelectPayload) => {
    setReplyTarget(target);
    setIsCommentSheetOpen(true);
  };

  const handleOpenSupporters = async () => {
    setIsSupporterModalOpen(true);
    setIsSupportersLoading(true);
    try {
      const result = await communityService.getSupporters(id!, type);
      setSupporters(result);
    } catch (err) {
      console.error('Failed to load supporters:', err);
    } finally {
      setIsSupportersLoading(false);
    }
  };

  const handleOpenViewers = async () => {
    setIsViewerModalOpen(true);
    setIsViewersLoading(true);
    try {
      const result = await communityService.getViewers(id!, type);
      setViewers(result);
    } catch (err) {
      console.error('Failed to load viewers:', err);
    } finally {
      setIsViewersLoading(false);
    }
  };

  const theme = useTheme();

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: (theme) => theme.palette.background.default,
        }}
      >
        <LightningLoader />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: (theme) => theme.palette.background.default,
        }}
      >
        <Typography variant="body1" color="text.secondary">
          데이터를 불러오는 중 오류가 발생했어요.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100vh',
        maxWidth: '768px',
        margin: '0 auto',
        backgroundColor: (theme) => theme.palette.background.default,
        position: 'relative',
      }}
    >
      {/* Fixed Header */}
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        <Header
          showBackButton
          onBackClick={() => {
            // location.state에서 진입 경로 확인
            const from = (location.state as { from?: string })?.from;
            if (from === 'lounge') {
              navigate('/lounge?tab=community');
            } else {
              navigate(-1);
            }
          }}
        />
      </Box>

      {/* Scrollable Content */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          bottom: BOTTOM_NAV_HEIGHT,
          left: 0,
          right: 0,
          overflowY: 'auto',
          paddingTop: '64px',
          paddingX: 3,
          paddingBottom: 15,
        }}
      >
        {/* Page Title & Subtitle */}
        <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
          커뮤니티
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          매거진과 커뮤니티가 함께하는 공간
        </Typography>

        {/* Type & Status Chips */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Chip
            label={type === 'project' ? '프로젝트' : '협업'}
            sx={{
              backgroundColor: type === 'project' ? '#eff6ff' : '#fef3f2',
              color: type === 'project' ? '#2563eb' : '#dc2626',
              fontSize: 12,
              fontWeight: 600,
              height: 26,
            }}
          />
          <Chip
            label="진행중"
            sx={{
              bgcolor: theme.palette.icon.default,
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              height: 26,
            }}
          />
        </Box>

        {/* Title & Share */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
            {data.title}
          </Typography>
          <IconButton onClick={handleShare}>
            <ShareOutlinedIcon sx={{ color: theme.palette.icon.default, fontSize: 20 }} />
          </IconButton>
        </Box>

        {/* Cover Image */}
        <CommunityDetailCover
          imageUrl={data.coverImageUrl}
          isLiked={isLiked}
          onLikeToggle={handleLikeToggle}
        />

        {/* Brand/Partner + Progress Card */}
        <Box
          sx={{
            backgroundColor: (theme) => theme.palette.background.paper,
            borderRadius: '15px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            p: 3,
            mb: 3,
          }}
        >
          <BrandPartnerInfoCard
            info={{
              name: data.brandName,
              logoUrl: data.brandLogoUrl,
              primary: data.brandField || data.brandCategory || '',
              secondary: data.brandRole || '',
            }}
            isFollowed={isFollowed}
            onFollowToggle={handleFollowToggle}
            creatorId={data.createdBy}
            sx={{
              backgroundColor: 'transparent',
              p: 0,
              mb: 2,
            }}
          />

          <CommunityProgressStats
            progress={data.progress}
            likeCount={likeCount}
            viewCount={viewCount}
            alignStatsRight
            onLikeClick={handleOpenSupporters}
            onViewClick={handleOpenViewers}
          />
        </Box>

        {/* Team Members */}
        <TeamMembersSection members={data.teamMembers} />

        {/* Content Sections */}
        <CommunityInfoSection
          type={type}
          description={data.description}
          goal={data.goal}
          requirements={data.requirements}
        />

        {/* Budget & Duration */}
        <BudgetDurationRow
          budget={data.budget_range}
          duration={data.duration}
        />

        {/* Tags */}
        <TagChipList tags={data.tags} />

      </Box>

      {/* Comment Sheet Backdrop - 조건부 렌더링으로 DOM에서 완전히 제거 */}
      {isCommentSheetOpen && (
        <Box
          onClick={handleCloseCommentSheet}
          sx={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.25)',
            zIndex: 15,
          }}
        />
      )}

      {/* Comment Sheet */}
      <Box
        sx={{
          position: 'fixed',
          left: '50%',
          bottom: isCommentSheetOpen ? 0 : BOTTOM_NAV_HEIGHT,
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '768px',
          zIndex: 20,
          pointerEvents: 'none',
          transition: 'bottom 0.1s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <Box
          sx={{
            pointerEvents: 'auto',
            backgroundColor: (theme) => theme.palette.background.paper,
            borderRadius: '24px 24px 0 0',
            boxShadow: '0 -10px 28px rgba(0,0,0,0.12)',
            overflow: 'hidden',
            transition: 'max-height 0.35s ease, transform 0.35s ease, box-shadow 0.35s ease',
            maxHeight: isCommentSheetOpen ? '80vh' : 120,
            transform: isCommentSheetOpen ? 'translateY(0)' : 'translateY(14px)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
            <Box sx={{ width: 46, height: 4, borderRadius: 999, backgroundColor: '#D1D5DB' }} />
          </Box>

          <Box
            sx={{
              px: 2,
              pb: 1,
              maxHeight: isCommentSheetOpen ? 'calc(70vh - 150px)' : 0,
              overflow: 'auto',
              transition: 'max-height 0.35s ease, opacity 0.25s ease',
              opacity: isCommentSheetOpen ? 1 : 0,
            }}
          >
            <CommentList itemId={id!} itemType={type} onReplySelect={handleReplySelect} />
          </Box>

          <Box sx={{ px: 2, pb: 12, pt: isCommentSheetOpen ? 1 : 0 }}>
            <CommentInput
              itemId={id!}
              itemType={type}
              parentId={replyTarget?.commentId}
              replyToName={replyTarget?.userName}
              onCommentAdded={() => { }}
              onFocus={handleCommentFocus}
              onCancel={() => setReplyTarget(null)}
              showTopBorder={isCommentSheetOpen}
              onSubmitOverride={replyTarget?.submitReply}
            />
          </Box>
        </Box>
      </Box>

      <SupporterListModal
        open={isSupporterModalOpen}
        supporters={supporters}
        loading={isSupportersLoading}
        onClose={() => setIsSupporterModalOpen(false)}
      />

      <ViewerListModal
        open={isViewerModalOpen}
        viewers={viewers}
        loading={isViewersLoading}
        onClose={() => setIsViewerModalOpen(false)}
      />

      <BottomNavigationBar />
    </Box>
  );
}

/**
 * CommunityCard Component (Phase 2 - Real-time Features)
 *
 * Displays project/collaboration cards with:
 * - Cover image (35.4% height)
 * - Real-time viewer count (Presence)
 * - Type and status chips
 * - Title, brand name, description
 * - Tags
 * - Engagement stats (likes, comments, views)
 * - Supporter avatars with elapsed time
 * - Like button with Optimistic UI
 *
 * Phase 1: Static counts ✅
 * Phase 2: Real-time updates, viewer count, supporter avatars ✅
 * Phase 3: Progress bar with animations (TODO)
 * Phase 4: Floating emoji reactions (TODO)
 */

import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Chip, styled, useTheme } from '@mui/material';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import type { CommunityItem } from '../../types/community.types';
import { useViewerPresence } from '../../hooks/useViewerPresence';
import ViewerCountChip from './ViewerCountChip';
import SupporterAvatars from './SupporterAvatars';
import LikeButton from './LikeButton';
import CommunityProgressBar from './CommunityProgressBar';
import FloatingEmojis from './FloatingEmojis';
import LazyImage from '../common/LazyImage';

// ========== Styled Components ==========
// Follow MUI theme system (NEVER hard-code colors)

const CardContainer = styled(Box)(({ theme }) => ({
  position: 'relative', // For FloatingEmojis positioning
  backgroundColor: theme.palette.background.paper,
  borderRadius: 12,
  // overflow: 'hidden',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: '0px 2px 5px 0px rgba(50, 50, 105, 0.15), 0px 1px 1px 0px rgba(0, 0, 0, 0.05)',
  // '&:hover': {
  //   boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  //   transform: 'translateY(-2px)',
  // },
}));

const CoverSection = styled(Box)({
  position: 'relative',
  width: '100%',
  paddingTop: '49%', // Aspect ratio for cover
  overflow: 'hidden',
  backgroundColor: '#E9E9ED', // Fallback color
  borderRadius: 12,
});

// CoverImage replaced with LazyImage for iOS performance optimization

const ContentSection = styled(Box)({
  padding: '16px',
});

const ChipRow = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
});

const Title = styled(Typography)(({ theme }) => ({
  fontSize: 16,
  fontWeight: 700,
  color: theme.palette.text.primary,
  marginBottom: 4,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  wordBreak: 'keep-all',
}));

const BrandName = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  color: theme.palette.text.secondary,
  marginBottom: 8,
}));

const Description = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  color: theme.palette.text.secondary,
  marginBottom: 12,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  wordBreak: 'keep-all',
  lineHeight: 1.5,
}));

const TagRow = styled(Box)({
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap',
  marginBottom: 16,
});

const StatsRow = styled(Box)({
  display: 'flex',
  gap: 16,
  alignItems: 'center',
});

const StatItem = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
});

const StatIcon = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  color: theme.palette.text.secondary,
}));

const StatText = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.secondary,
}));

// ========== Component ==========

interface CommunityCardProps {
  item: CommunityItem;
  onClick?: () => void;
  isLoggedIn?: boolean;
  onRequireLogin?: () => void;
  isLiked?: boolean; // N+1 방지: 부모에서 배치 조회 후 전달
}
function CommunityCard({
  item,
  onClick,
  isLoggedIn,
  onRequireLogin,
  isLiked: isLikedProp,
}: CommunityCardProps) {
// iOS 성능 최적화: React.memo로 리스트 스크롤 시 불필요한 리렌더링 방지
  const navigate = useNavigate();
  const theme = useTheme();

  // Navigate to detail page when card is clicked
  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/lounge/community/${item.id}?type=${item.type}`, {
        state: { from: 'lounge' },
      });
    }
  };

  // Determine chip colors based on type
  const typeChipColor = item.type === 'project' ? theme.palette.bgColor.blue : theme.palette.bgColor.green;
  const typeChipTextColor = item.type === 'project' ? theme.palette.status.blue : theme.palette.status.green;

  // Real-time viewer count (Phase 2)
  // subscribeOnly: true - 채널 구독만 하고 track하지 않음 (상세 페이지에 있는 사람만 count됨)
  const viewerCount = useViewerPresence({
    itemId: item.id,
    itemType: item.type,
    subscribeOnly: true,
  });

  // N+1 방지: isLiked는 부모(Lounge.tsx)에서 배치 조회 후 props로 전달받음
  // 기존: 각 카드에서 개별 checkLiked() 호출 (20개 카드 = 20개 쿼리)
  // 개선: 부모에서 checkLikedBatch() 1회 호출 (20개 카드 = 2개 쿼리)
  const isLiked = isLikedProp ?? false;

  // Calculate progress percentage based on completed workflow steps (Phase 3)
  const calculateProgress = () => {
    if (!item.workflowSteps || item.workflowSteps.length === 0) {
      return 0;
    }

    const completedSteps = item.workflowSteps.filter((step) => step.isCompleted).length;
    const totalSteps = item.workflowSteps.length;
    return Math.round((completedSteps / totalSteps) * 100);
  };

  return (
    <CardContainer onClick={handleCardClick}>
      {/* Cover Section (35.4%) - LazyImage for iOS performance */}
      <CoverSection>
        <LazyImage
          src={item.coverImageUrl}
          type="background"
          fallbackColor="#E9E9ED"
          alt={item.title}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            borderRadius: '12px',
          }}
        />

        {/* Viewer Count Chip (Phase 2) - Top Right (Projects only) */}
        {item.type === 'project' && (
          <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
            <ViewerCountChip count={viewerCount} />
          </Box>
        )}

        {/* Progress Bar (Phase 3) - Bottom */}
        <CommunityProgressBar percentage={calculateProgress()} />
      </CoverSection>

      {/* Content Section */}
      <ContentSection >
        {/* Row 1: Type chip + Status chip */}
        <ChipRow>
          <Chip
            label={item.type === 'project' ? '프로젝트' : '협업'}
            sx={{
              backgroundColor: typeChipColor,
              color: typeChipTextColor,
              fontSize: 12,
              fontWeight: 600,
              height: 24,
              '& .MuiChip-label': {
                padding: '0 8px',
              },
            }}
          />
          <Chip
            label="진행중"
            sx={{
              backgroundColor: theme.palette.icon.default,
              color: '#fff',
              fontSize: 12,
              fontWeight: 500,
              height: 24,
              '& .MuiChip-label': {
                padding: '0 8px',
              },
            }}
          />
        </ChipRow>

        {/* Row 2: Title */}
        <Title>{item.title}</Title>

        {/* Row 3: Brand name */}
        <BrandName>{item.brandName}</BrandName>

        {/* Row 4: Description */}
        <Description>{item.description}</Description>

        {/* Row 5: Tags */}
        {item.tags && item.tags.length > 0 && (
          <TagRow>
            {item.tags.slice(0, 3).map((tag, idx) => (
              <Chip
                key={idx}
                label={`#${tag}`}
                size="small"
                sx={{
                  backgroundColor: theme.palette.grey[100],
                  color: theme.palette.subText.default,
                  fontSize: 11,
                  height: 22,
                  '& .MuiChip-label': {
                    padding: '0 8px',
                  },
                }}
              />
            ))}
          </TagRow>
        )}

        {/* Row 6: Stats (real-time counts from Phase 2) */}
        <StatsRow>
          <StatItem>
            <StatIcon>
              <FavoriteBorderOutlinedIcon sx={{ fontSize: 16 }} />
            </StatIcon>
            <StatText>{item.likeCount}</StatText>
          </StatItem>

          <StatItem>
            <StatIcon>
              <ChatBubbleOutlineIcon sx={{ fontSize: 16 }} />
            </StatIcon>
            <StatText>{item.commentCount}</StatText>
          </StatItem>

          <StatItem>
            <StatIcon>
              <VisibilityOutlinedIcon sx={{ fontSize: 16 }} />
            </StatIcon>
            <StatText>{item.viewCount}</StatText>
          </StatItem>
        </StatsRow>

        {/* Row 7: Supporter Avatars (Phase 2) */}
        <Box sx={{ mt: 2 }}>
          <SupporterAvatars
            supporters={item.latestSupporters}
            totalCount={item.likeCount}
            latestSupportAt={item.latestSupportAt}
          />
        </Box>

        {/* Row 8: Like Button + Emoji Button (Phase 2 & 4) */}
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 0.4 }}>
          <Box sx={{ flex: '1 1 0', minWidth: '70%' }}>
            <LikeButton
              itemId={item.id}
              itemType={item.type}
              initialLiked={isLiked}
              initialCount={item.likeCount}
              isLoggedIn={isLoggedIn}
              onRequireLogin={onRequireLogin}
            />
          </Box>
          <Box sx={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            <FloatingEmojis supportCount={item.likeCount} />
          </Box>
        </Box>
      </ContentSection>

      {/* Floating Emojis are rendered inside CardContainer for proper positioning */}
    </CardContainer>
  );
}

// iOS 성능 최적화: React.memo로 리스트 스크롤 시 불필요한 리렌더링 방지
export default memo(CommunityCard);

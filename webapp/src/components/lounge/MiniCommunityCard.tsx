/**
 * MiniCommunityCard Component
 *
 * 미니 버전 커뮤니티 카드:
 * - 커버 이미지
 * - 프로젝트인 경우 우상단에 "~명 보는 중" 표시
 * - 제목
 * - 카테고리 chip (한글 label)
 */

import { Box, Typography, Chip, styled } from '@mui/material';
import type { CommunityItem } from '../../types/community.types';
import ViewerCountChip from './ViewerCountChip';
import { useViewerPresence } from '../../hooks/useViewerPresence';
import { getCategoryLabel } from '../../constants/projectConstants';

const CardContainer = styled(Box)({
  position: 'relative',
  width: '59.3%', // 393px 기준 233px 비율
  minWidth: 200, // 최소 너비 보장
  maxWidth: 280, // 최대 너비 제한
  height: 160,
  borderRadius: 18,
  overflow: 'hidden',
  cursor: 'pointer',
  transition: 'transform 0.2s',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#fff',
  flexShrink: 0,
  // '&:hover': {
  //   transform: 'translateY(-2px)',
  // },
});

const CoverImageContainer = styled(Box)({
  position: 'relative',
  width: '100%',
  height: 120, // 고정 높이
  overflow: 'hidden',
  flexShrink: 0,
});

const CoverImage = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

const ContentCard = styled(Box)({
  padding: '10px 12px',
  backgroundColor: '#fff',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 8,
  flex: 1,
  minHeight: 0,
});

const TitleContainer = styled(Box)({
  flex: 1,
  minWidth: 0, // flex item이 축소될 수 있도록
  display: 'flex',
  alignItems: 'center',
});

const Title = styled(Typography)({
  fontSize: 13,
  fontWeight: 700,
  color: '#1f1f1f',
  lineHeight: 1.3,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  wordBreak: 'keep-all',
});

const CategoryChip = styled(Chip)(({ theme }) => ({
  height: 27,
  padding: '0 6px',
  fontSize: 10,
  fontWeight: 600,
  backgroundColor: theme.palette.grey[100],
  color: theme.palette.subText.default,
  flexShrink: 0, // category는 줄바꿈되지 않도록
  '& .MuiChip-label': {
    padding: '0 6px',
  },
}));

interface MiniCommunityCardProps {
  item: CommunityItem;
  onClick?: () => void;
}

export default function MiniCommunityCard({ item, onClick }: MiniCommunityCardProps) {
  // Real-time viewer count for projects
  // subscribeOnly: true - 채널 구독만 하고 track하지 않음 (상세 페이지에 있는 사람만 count됨)
  const viewerCount = useViewerPresence({
    itemId: item.id,
    itemType: item.type,
    subscribeOnly: true,
  });

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
  };

  const categoryLabel = getCategoryLabel(item.category);

  return (
    <CardContainer onClick={onClick}>
      {/* Cover Image Section */}
      <CoverImageContainer>
        {item.coverImageUrl ? (
          <CoverImage
            src={item.coverImageUrl}
            alt={item.title}
            onError={handleImageError}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              backgroundColor: '#E9E9ED',
            }}
          />
        )}

        {/* Viewer Count Chip - Top Right (Projects only) */}
        {item.type === 'project' && (
          <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
            <ViewerCountChip count={viewerCount} />
          </Box>
        )}
      </CoverImageContainer>

      {/* Content Card Section */}
      <ContentCard>
        <TitleContainer>
          <Title>{item.title}</Title>
        </TitleContainer>
        <CategoryChip label={categoryLabel} size="small" />
      </ContentCard>
    </CardContainer>
  );
}


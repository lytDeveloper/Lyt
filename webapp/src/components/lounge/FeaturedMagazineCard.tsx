import { memo, useMemo } from 'react';
import { Box, Chip, Typography, styled } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import type { MagazineListItem } from '../../types/magazine.types';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { useSignedImage } from '../../hooks/useSignedImage';
import { isIOS } from '../../utils/deviceUtils';
import LazyImage from '../common/LazyImage';

// Styled Components (using MUI theme)
const CardContainer = styled(Box)(({ theme }) => ({
  width: '87vw',
  height: '41vh',
  minHeight: '320px',
  borderRadius: 12,
  overflow: 'hidden',
  backgroundColor: theme.palette.background.paper,
  // boxShadow: '0px 3px 5px rgba(0,0,0,0.04)',
  boxShadow: '0px 2px 5px 0px rgba(50, 50, 105, 0.15), 0px 1px 1px 0px rgba(0, 0, 0, 0.05)',
  cursor: 'pointer',
  transition: 'transform 0.2s, box-shadow 0.2s',
  flexShrink: 0,
  margin: '0 auto',
  // '&:hover': {
  //   transform: 'translateY(-4px)',
  //   boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  // },
}));

// CoverImage replaced with LazyImage for iOS performance optimization

const BadgeContainer = styled(Box)({
  position: 'absolute',
  top: 12,
  left: 12,
  right: 12,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
});

const HighlightStack = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  gap: 6,
});

// 추천,트렌딩, 에디터픽 스타일 (iOS Glass Fallback)
const HighlightBadge = styled(Box, {
  shouldForwardProp: (prop) => prop !== '$bg',
})<{ $bg: string }>(({ $bg }) => ({
  // iOS Glass Fallback: blur 축소 + gradient로 보완
  background: isIOS()
    ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.12))'
    : 'rgba(255, 255, 255, 0.2)',
  backdropFilter: isIOS() ? 'blur(4px)' : 'blur(10px)',
  WebkitBackdropFilter: isIOS() ? 'blur(4px)' : 'blur(10px)',
  border: isIOS()
    ? '1px solid rgba(255, 255, 255, 0.25)'
    : '0.1px solid rgba(255, 255, 255, 0.3)',
  color: $bg,
  padding: '0 6px',
  borderRadius: '50%',
  width: 24,
  height: 24,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const ProjectBadge = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  color: theme.palette.primary.main,
  padding: '4px 16px',
  borderRadius: 16,
  fontSize: 12,
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
}));

const ContentSection = styled(Box)({
  height: '50%',
  padding: '14px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
});

const TopRow = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

const CategoryChip = styled(Chip)(({ theme }) => ({
  height: 24,
  fontSize: 12,
  fontWeight: 500,
  backgroundColor: theme.palette.bgColor.blue,
  color: theme.palette.primary.main,
  '& .MuiChip-label': {
    padding: '0 10px',
  },
}));

const ReadingTime = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.secondary,
}));

const Title = styled(Typography)(({ theme }) => ({
  fontSize: 15,
  fontWeight: 700,
  color: theme.palette.text.primary,
  lineHeight: 1.5,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  wordBreak: 'keep-all',
}));

const Subtitle = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.secondary,
  marginBottom: '7px',
  lineHeight: 1.6,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  wordBreak: 'keep-all',
}));

const TagsContainer = styled(Box)({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  overflow: 'hidden',
  maxHeight: '28px',
});

const TagChip = styled(Chip)(({ theme }) => ({
  height: 22,
  fontSize: 10,
  fontWeight: 500,
  backgroundColor: theme.palette.grey[50],
  color: theme.palette.text.secondary,
  '& .MuiChip-label': {
    padding: '0 6px',
  },
}));

const BottomRow = styled(Box)({
  marginTop: 'auto',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

const CreatedAt = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.secondary,
}));

// const ActionButton = styled(Box)(({ theme }) => ({
//   fontSize: 12,
//   color: theme.palette.primary.contrastText,
//   fontWeight: 400,
//   cursor: 'pointer',
//   backgroundColor: theme.palette.primary.main,
//   padding: '6px 12px',
//   borderRadius: 16,
//   display: 'inline-block',
//   transition: 'background-color 0.2s',
// }));

interface FeaturedMagazineCardProps {
  magazine: MagazineListItem;
}

// iOS 성능 최적화: React.memo로 불필요한 리렌더링 방지
function FeaturedMagazineCard({ magazine }: FeaturedMagazineCardProps) {
  const navigate = useNavigate();
  // Private Storage 이미지 서명 URL 변환
  const signedCoverUrl = useSignedImage(magazine.cover_image_url);

  // Defensive: Check for related project and status
  const hasActiveProject = magazine.project && magazine.project.status === 'in_progress';

  // 날짜 포맷팅 메모이제이션
  const formattedDate = useMemo(() => {
    const date = new Date(magazine.created_at);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  }, [magazine.created_at]);

  // Tags array - ensure it's always a string array
  const tags = Array.isArray(magazine.tags)
    ? magazine.tags.map(tag => typeof tag === 'string' ? tag : String(tag))
    : [];

  const handleClick = () => {
    navigate(`/magazine/${magazine.id}`);
  };

  // const handlePartnerSearch = (e: React.MouseEvent) => {
  //   e.stopPropagation(); // Prevent card click
  //   // TODO: Navigate to partner search with filters
  //   console.log('Search partners for:', magazine.category);
  // };

  // 추천 아티클 추천,트렌딩, 에디터픽
  const highlightBadges: Array<{ key: string; label: React.ReactNode; color: string }> = [];
  if (magazine.is_featured) highlightBadges.push({ key: 'featured', label: <WhatshotIcon sx={{ fontSize: 14 }} />, color: '#FF793B' });
  if (magazine.is_trending) highlightBadges.push({ key: 'trending', label: <ThumbUpAltIcon sx={{ fontSize: 14 }} />, color: '#6092FF' });
  if (magazine.is_editor_pick) highlightBadges.push({ key: 'editor_pick', label: <WorkspacePremiumIcon sx={{ fontSize: 14 }} />, color: '#EBBF5E' });

  return (
    <CardContainer onClick={handleClick}>
      <LazyImage
        src={signedCoverUrl}
        type="background"
        fallbackColor="#E5E7EB"
        alt={magazine.title}
        sx={{
          width: '100%',
          height: '50%',
          position: 'relative',
        }}
      >
        <BadgeContainer>
          {highlightBadges.length > 0 && (
            <HighlightStack>
              {highlightBadges.map((badge) => (
                <HighlightBadge key={badge.key} $bg={badge.color}>
                  {badge.label}
                </HighlightBadge>
              ))}
            </HighlightStack>
          )}
          {hasActiveProject && (
            <ProjectBadge>
              <PlayArrowIcon sx={{ fontSize: 14 }} />
              <span>진행중</span>
            </ProjectBadge>
          )}
        </BadgeContainer>
      </LazyImage>

      <ContentSection>
        <TopRow>
          <CategoryChip label={magazine.category} size="small" />
          <ReadingTime>{magazine.reading_time}분</ReadingTime>
        </TopRow>

        <Title>{magazine.title}</Title>

        {magazine.subtitle && <Subtitle>{magazine.subtitle}</Subtitle>}

        {tags.length > 0 && (
          <TagsContainer>
            {tags.map((tag, index) => {
              const tagString = typeof tag === 'string' ? tag : String(tag);
              // Use combination of tag and index to ensure unique keys, even if tags are duplicated
              return <TagChip key={`${tagString}-${index}`} label={`#${tagString}`} size="small" />;
            })}
          </TagsContainer>
        )}

        <BottomRow>
          <CreatedAt>{formattedDate}</CreatedAt>
          {/* <ActionButton onClick={handlePartnerSearch}>관련 파트너 찾기</ActionButton> */}
        </BottomRow>
      </ContentSection>
    </CardContainer>
  );
}

// iOS 성능 최적화: React.memo로 리스트 스크롤 시 불필요한 리렌더링 방지
export default memo(FeaturedMagazineCard);

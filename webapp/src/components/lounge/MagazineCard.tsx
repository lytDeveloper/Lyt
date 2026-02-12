import { memo, useMemo } from 'react';
import { Box, Chip, Typography, styled } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { MagazineListItem } from '../../types/magazine.types';
import { useSignedImage } from '../../hooks/useSignedImage';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { isIOS } from '../../utils/deviceUtils';
import LazyImage from '../common/LazyImage';

// Styled Components
const CardContainer = styled(Box)(({ theme }) => ({
  width: '87vw',
  height: 150,
  display: 'flex',
  gap: 16,
  backgroundColor: theme.palette.background.paper,
  borderRadius: 12,
  overflow: 'hidden',
  cursor: 'pointer',
  transition: 'box-shadow 0.2s',
  // boxShadow: '0px 3px 5px rgba(0,0,0,0.04)',
  boxShadow: '0px 2px 5px 0px rgba(50, 50, 105, 0.15), 0px 1px 1px 0px rgba(0, 0, 0, 0.05)',
}));

// CoverImage replaced with LazyImage for iOS performance optimization

// iOS Glass Fallback: blur 축소
const ProjectBadge = styled(Box)({
  position: 'absolute',
  top: 8,
  right: 8,
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: isIOS() ? 'blur(4px)' : 'blur(8px)',
  WebkitBackdropFilter: isIOS() ? 'blur(4px)' : 'blur(8px)',
  color: '#2563EB',
  padding: '2px 8px',
  borderRadius: 12,
  fontSize: 11,
  fontWeight: 600,
});

const ContentSection = styled(Box)({
  flex: 1,
  padding: '8px 16px 8px 0',
  display: 'flex',
  flexDirection: 'column',
  gap: 7,
  overflow: 'hidden',
});

const TopRow = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

const CategoryChip = styled(Chip)(({ theme }) => ({
  height: 20,
  fontSize: 10,
  fontWeight: 500,
  backgroundColor: theme.palette.bgColor.blue,
  color: theme.palette.primary.main,
  '& .MuiChip-label': {
    padding: '0 8px',
  },
}));

const ReadingTime = styled(Typography)(({ theme }) => ({
  fontSize: 10,
  color: theme.palette.text.secondary,
}));

const Title = styled(Typography)(({ theme }) => ({
  fontSize: 14,
  fontWeight: 700,
  color: theme.palette.text.primary,
  lineHeight: 1.35,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  wordBreak: 'keep-all',
  maxHeight: '38px',
}));

const Subtitle = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.secondary,
  lineHeight: 1.35,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  wordBreak: 'keep-all',
  maxHeight: '30px',
}));

const BottomRow = styled(Box)({
  marginTop: 'auto',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

const CreatedAt = styled(Typography)(({ theme }) => ({
  fontSize: 10,
  color: theme.palette.text.secondary,
}));

// const ActionButton = styled(Box)(({ theme }) => ({
//   fontSize: 10,
//   color: theme.palette.primary.contrastText,
//   fontWeight: 300,
//   cursor: 'pointer',
//   backgroundColor: theme.palette.primary.main,
//   padding: '5px 10px',
//   borderRadius: 14,
//   display: 'inline-block',
//   transition: 'background-color 0.2s',
//   flexShrink: 0,
//   whiteSpace: 'nowrap',
// }));

//  전체 아티클 추천,트렌딩, 에디터픽
const BadgeContainer = styled(Box)({
  position: 'absolute',
  top: 6,
  left: 6,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
});

const HighlightStack = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  gap: 4,
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
  width: 20,
  height: 20,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));


interface MagazineCardProps {
  magazine: MagazineListItem;
}

// iOS 성능 최적화: React.memo로 불필요한 리렌더링 방지
function MagazineCard({ magazine }: MagazineCardProps) {
  const navigate = useNavigate();
  const signedCoverUrl = useSignedImage(magazine.cover_image_url);

  const hasActiveProject = magazine.project && magazine.project.status === 'in_progress';

  // 날짜 포맷팅 메모이제이션
  const formattedDate = useMemo(() => {
    const date = new Date(magazine.created_at);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  }, [magazine.created_at]);

  const handleClick = () => {
    navigate(`/magazine/${magazine.id}`);
  };

  // const handlePartnerSearch = (e: React.MouseEvent) => {
  //   e.stopPropagation();
  //   console.log('Search partners for:', magazine.category);
  // };

  // 전체 아티클 추천,트렌딩, 에디터픽
  const highlightBadges: Array<{ key: string; label: React.ReactNode; color: string }> = [];
  if (magazine.is_featured) highlightBadges.push({ key: 'featured', label: <WhatshotIcon sx={{ fontSize: 12 }} />, color: '#FF793B' });
  if (magazine.is_trending) highlightBadges.push({ key: 'trending', label: <ThumbUpAltIcon sx={{ fontSize: 12 }} />, color: '#6092FF' });
  if (magazine.is_editor_pick) highlightBadges.push({ key: 'editor_pick', label: <WorkspacePremiumIcon sx={{ fontSize: 12 }} />, color: '#EBBF5E' });
  return (
    <CardContainer onClick={handleClick}>
      <LazyImage
        src={signedCoverUrl}
        type="background"
        fallbackColor="#E5E7EB"
        alt={magazine.title}
        sx={{
          width: '37%',
          height: '100%',
          flexShrink: 0,
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
        </BadgeContainer>
        {hasActiveProject && <ProjectBadge>진행중</ProjectBadge>}
      </LazyImage>

      <ContentSection>
        <TopRow>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
            <CategoryChip label={magazine.category} size="small" />
          </Box>
          <ReadingTime>{magazine.reading_time}분</ReadingTime>
        </TopRow>

        <Title>{magazine.title}</Title>

        {magazine.subtitle && <Subtitle>{magazine.subtitle}</Subtitle>}

        <BottomRow>
          <CreatedAt>{formattedDate}</CreatedAt>
          {/* <ActionButton onClick={handlePartnerSearch}>관련 파트너 찾기</ActionButton> */}
        </BottomRow>
      </ContentSection>
    </CardContainer>
  );
}

// iOS 성능 최적화: React.memo로 리스트 스크롤 시 불필요한 리렌더링 방지
export default memo(MagazineCard);

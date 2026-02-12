import { memo } from 'react';
import { Box, Typography, styled } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { MagazineWithProject } from '../../types/magazine.types';
import { useSignedImage } from '../../hooks/useSignedImage';
import LazyImage from '../common/LazyImage';

// Styled Components
const CardContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  height: 70,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  backgroundColor: theme.palette.background.paper,
  cursor: 'pointer',
  transition: 'background-color 0.2s',
}));

// CoverImage replaced with LazyImage for iOS performance optimization

const ContentSection = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  overflow: 'hidden',
});

const Title = styled(Typography)(({ theme }) => ({
  fontSize: 14,
  fontWeight: 600,
  color: theme.palette.text.primary,
  lineHeight: 1.3,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}));

const Category = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.primary.main,
  fontWeight: 500,
}));

const ChevronIcon = styled(ChevronRightIcon)(({ theme }) => ({
  fontSize: 20,
  color: theme.palette.text.secondary,
  flexShrink: 0,
}));

interface CompactMagazineCardProps {
  magazine: MagazineWithProject;
}

// iOS 성능 최적화: React.memo로 불필요한 리렌더링 방지
function CompactMagazineCard({ magazine }: CompactMagazineCardProps) {
  const navigate = useNavigate();
  // Private Storage 이미지 서명 URL 변환
  const signedCoverUrl = useSignedImage(magazine.cover_image_url);

  const handleClick = () => {
    navigate(`/magazine/${magazine.id}`);
  };

  return (
    <CardContainer onClick={handleClick}>
      <LazyImage
        src={signedCoverUrl}
        type="background"
        fallbackColor="#E5E7EB"
        alt={magazine.title}
        sx={{
          width: 80,
          height: 60,
          flexShrink: 0,
          borderRadius: '8px',
        }}
      />

      <ContentSection>
        <Title>{magazine.title}</Title>
        <Category>{magazine.category}</Category>
      </ContentSection>

      <ChevronIcon />
    </CardContainer>
  );
}

// iOS 성능 최적화: React.memo로 리스트 스크롤 시 불필요한 리렌더링 방지
export default memo(CompactMagazineCard);

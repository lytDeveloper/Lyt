import { memo, type RefObject } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { SectionHeader } from './index';
import {
  COLLABORATION_NEEDS,
  HOME_CATEGORY_ICONS,
} from '../../constants/homeConstants';

interface CollaborationSectionProps {
  /** 스크롤 컨테이너 ref */
  containerRef: RefObject<HTMLDivElement | null>;
}

/**
 * 협업 아티스트 섹션 컴포넌트
 * - 협업 니즈 카드 목록
 * - 배경 이미지 및 그라디언트 오버레이
 * - 클릭 시 Explore Partners 탭으로 이동 (해당 카테고리 + 아티스트만 필터)
 */
function CollaborationSection({
  containerRef,
}: CollaborationSectionProps) {
  const navigate = useNavigate();

  const handleCardClick = (category: string) => {
    // Navigate to Explore page with Partners tab, category filter, and artistOnly filter
    navigate(`/explore?tab=partners&category=${category}&artistOnly=true`);
  };

  return (
    <Box sx={{ mb: 6 }}>
      <SectionHeader title="🌠 함께할 아티스트가 필요해요" />

      <Box
        ref={containerRef}
        sx={{
          position: 'relative',
          overflowX: 'auto',
          overflowY: 'hidden',
          width: '100%',
          pb: 2,
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: '16px',
            cursor: 'grab',
            px: 2,
          }}
        >
          {COLLABORATION_NEEDS.map((item) => {
            const IconComponent =
              HOME_CATEGORY_ICONS[item.title as keyof typeof HOME_CATEGORY_ICONS];
            return (
              <Box
                key={item.id}
                onClick={() => handleCardClick(item.category)}
                sx={{
                  position: 'relative',
                  minWidth: 160,
                  height: 160,
                  borderRadius: '18px',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'flex-start',
                  color: '#ffffff',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease',
                  '&:active': {
                    transform: 'scale(0.98)',
                  },
                }}
              >
                <Box
                  component="img"
                  src={item.background}
                  alt={item.title}
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(180deg, rgba(0,0,0,0.1) 5%, rgba(0,0,0,0.75) 95%)',
                  }}
                />
                <Box sx={{ position: 'relative', p: 2 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mb: 0.5,
                      opacity: 0.8,
                    }}
                  >
                    {IconComponent && <IconComponent size={16} color="#ffffff" />}
                    <Typography
                      sx={{
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: 12,
                        color: '#ffffff',
                      }}
                    >
                      협업 제안
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 16,
                      fontWeight: 700,
                      mt: 0,
                    }}
                  >
                    {item.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 11,
                      opacity: 0.8,
                      mt: 0.5,
                      lineHeight: 1.4,
                      wordBreak: 'keep-all',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.subtitle}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

export default memo(CollaborationSection);

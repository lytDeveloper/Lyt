import { memo, type RefObject } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { SectionHeader } from './index';

interface MagazineItem {
  id: string;
  title: string;
  sub_title?: string | null;
  thumbnail_url?: string | null;
}

interface MagazineSectionProps {
  /** 매거진 목록 */
  items: MagazineItem[];
  /** 스크롤 컨테이너 ref */
  containerRef: RefObject<HTMLDivElement | null>;
}

/**
 * 매거진 섹션 컴포넌트
 * - 가로 스크롤 매거진 카드 목록
 * - 그라디언트 오버레이 및 타이틀 표시
 */
function MagazineSection({
  items,
  containerRef,
}: MagazineSectionProps) {
  const navigate = useNavigate();

  return (
    <Box sx={{ mb: 3 }}>
      <SectionHeader
        title="🌟Magazine of the Month"
        onClick={() => navigate('/lounge')}
      />

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
          {items.slice(0, 5).map((magazine) => (
            <Box
              key={magazine.id}
              onClick={() => navigate(`/magazine/${magazine.id}`)}
              sx={{
                minWidth: 140,
                maxWidth: 200,
                height: 220,
                position: 'relative',
                overflow: 'hidden',
                backgroundImage: magazine.thumbnail_url
                  ? `url(${magazine.thumbnail_url})`
                  : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundColor: magazine.thumbnail_url
                  ? 'transparent'
                  : '#f0f0f0',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                // '&:hover': {
                //   transform: 'translateY(-4px)',
                // },
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.65) 100%)',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  p: 2,
                  zIndex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 12,
                    fontWeight: 800,
                    color: '#fff',
                    lineHeight: 1.3,
                    wordBreak: 'keep-all',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {magazine.title}
                </Typography>
                {magazine.sub_title && (
                  <Typography
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 11,
                      fontWeight: 500,
                      color: '#E5E7EB',
                      lineHeight: 1.3,
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {magazine.sub_title}
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

export default memo(MagazineSection);

import { memo, type RefObject } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { COLORS } from '../../styles/onboarding/common.styles';
import { SectionHeader } from './index';
import { getThumbnailUrl } from '../../utils/signedUrl';

interface BrandItem {
  id: string;
  name: string;
  role: 'brand' | 'partner';
  logo_image_url?: string | null;
  category_field?: string | null;
}

interface NewBrandSectionProps {
  /** 브랜드/파트너 목록 */
  items: BrandItem[];
  /** 스크롤 컨테이너 ref */
  containerRef: RefObject<HTMLDivElement | null>;
}

/**
 * 새로운 브랜드/파트너 섹션 컴포넌트
 * - 가로 스크롤 브랜드 카드 목록
 */
function NewBrandSection({
  items,
  containerRef,
}: NewBrandSectionProps) {
  const navigate = useNavigate();

  return (
    <Box sx={{ mb: 3 }}>
      <SectionHeader
        title="💖새로운 파트너"
        onClick={() => navigate('/brands-artists')}
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
          {items.map((item) => (
            <Box
              key={item.id}
              onClick={() => {
                const tab = item.role === 'brand' ? 'brand' : 'partner';
                navigate(`/brands-artists?tab=${tab}&search=${encodeURIComponent(item.name)}`);
              }}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
                cursor: 'pointer',
                '&:active': { opacity: 0.7 },
              }}
            >
              <Box
                sx={{
                  minWidth: 70,
                  height: 70,
                  borderRadius: '15px',
                  backgroundColor: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  ...(item.logo_image_url && {
                    backgroundImage: `url(${getThumbnailUrl(item.logo_image_url, 140, 140, 75)})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundColor: 'transparent',
                  }),
                }}
              >
                {!item.logo_image_url && (
                  <Typography
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontWeight: 700,
                      fontSize: 12,
                      color: '#1f1f1f',
                      textAlign: 'center',
                      px: 1,
                      lineHeight: 1.3,
                    }}
                  >
                    {item.name}
                  </Typography>
                )}
              </Box>
              <Box sx={{ textAlign: 'center', minWidth: 70 }}>
                <Typography
                  sx={{
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 12,
                    fontWeight: 700,
                    color: COLORS.TEXT_PRIMARY,
                    lineHeight: 1.2,
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.name}
                </Typography>
                {item.category_field && (
                  <Typography
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 10,
                      color: COLORS.TEXT_SECONDARY,
                      mt: 0.3,
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.category_field}
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

export default memo(NewBrandSection);

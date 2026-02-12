import { memo, type RefObject } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { COLORS } from '../../styles/onboarding/common.styles';
import MiniCommunityCard from '../lounge/MiniCommunityCard';
import { SectionHeader } from './index';
import type { CommunityItem, CommunityTabKey } from '../../types/community.types';

interface CommunitySectionProps {
  /** 커뮤니티 아이템 목록 */
  items: CommunityItem[];
  /** 스크롤 컨테이너 ref */
  containerRef: RefObject<HTMLDivElement | null>;
  /** 콘텐츠 ref */
  contentRef: RefObject<HTMLDivElement | null>;
  /** 커뮤니티 탭 설정 함수 */
  onSetCommunityTab: (tab: CommunityTabKey) => void;
}

/**
 * 커뮤니티 섹션 컴포넌트
 * - 가로 스크롤 커뮤니티 카드 목록
 * - MiniCommunityCard 사용
 */
function CommunitySection({
  items,
  containerRef,
  contentRef,
  onSetCommunityTab,
}: CommunitySectionProps) {
  const navigate = useNavigate();

  const handleHeaderClick = () => {
    onSetCommunityTab('all');
    navigate('/lounge?tab=community');
  };

  const handleCardClick = (item: CommunityItem) => {
    const targetPath = `/lounge/community/${item.id}?type=${item.type}`;
    navigate(targetPath);
  };

  return (
    <Box sx={{ mb: 2 }}>
      <SectionHeader title="💞커뮤니티" onClick={handleHeaderClick} />

      <Box
        ref={containerRef}
        sx={{
          position: 'relative',
          overflowX: 'auto',
          overflowY: 'hidden',
          width: '100%',
          pb: 2,
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <Box
          ref={contentRef}
          sx={{
            display: 'flex',
            gap: 2,
            width: 'max-content',
          }}
        >
          {items.length > 0 ? (
            items.slice(0, 10).map((item) => (
              <MiniCommunityCard
                key={item.id}
                item={item}
                onClick={() => handleCardClick(item)}
              />
            ))
          ) : (
            <Box
              sx={{
                minWidth: 240,
                height: 160,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f5f5f5',
                borderRadius: '18px',
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 13,
                  color: COLORS.TEXT_SECONDARY,
                }}
              >
                커뮤니티 콘텐츠가 없어요.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default memo(CommunitySection);

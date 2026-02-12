/**
 * ViewerCountChip Component
 *
 * Purpose: 커버 이미지 우상단에 "n명 보는 중" 표시
 *
 * Design Spec:
 * - 반투명 검은색 배경 (rgba(0, 0, 0, 0.6))
 * - 빨간 펄스 점 애니메이션
 * - 흰색 텍스트 (11px, 500 weight)
 * - Backdrop blur 효과
 *
 * Usage:
 * <ViewerCountChip count={viewerCount} />
 *
 * Note: count가 0이면 null을 반환 (아무것도 렌더링 안함)
 */

import { Box, Typography, styled } from '@mui/material';

const ChipContainer = styled(Box)({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 8px',
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  borderRadius: 12,
  backdropFilter: 'blur(4px)',
});

const PulseDot = styled(Box)({
  width: 6,
  height: 6,
  borderRadius: '50%',
  backgroundColor: '#ef4444',
  animation: 'pulse-dot 2s ease-in-out infinite',
  '@keyframes pulse-dot': {
    '0%, 100%': { opacity: 1, transform: 'scale(1)' },
    '50%': { opacity: 0.6, transform: 'scale(1.1)' },
  },
});

const ViewerText = styled(Typography)({
  fontSize: 11,
  fontWeight: 500,
  color: '#fff',
});

interface ViewerCountChipProps {
  count: number;
}

export default function ViewerCountChip({ count }: ViewerCountChipProps) {
  // Don't render if no viewers
  if (count === 0) return null;

  return (
    <ChipContainer>
      <PulseDot />
      <ViewerText>{count}명 보는 중</ViewerText>
    </ChipContainer>
  );
}

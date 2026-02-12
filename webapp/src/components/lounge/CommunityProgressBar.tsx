/**
 * CommunityProgressBar Component (Phase 3)
 *
 * Purpose: 커버 이미지 하단에 진행률 표시
 *
 * Design Spec:
 * - 그라데이션 배경: 초록(#10b981) → 파랑(#3b82f6)
 * - 쉬머 효과: 흰색 반짝임 애니메이션
 * - 호버 시 scale 1.02
 * - "진행률 n%" 흰색 텍스트 (11px, 600 weight)
 * - 반투명 검은색 배경 (하단 그라데이션)
 *
 * Animation:
 * - Progress bar fill: 0% → n% (1초 ease-out)
 * - Shimmer effect: 2초 무한 반복
 *
 * Usage:
 * <CommunityProgressBar percentage={75} />
 */

import { Box, Typography, styled } from '@mui/material';
import { motion } from 'framer-motion';

const ProgressContainer = styled(Box)({
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  padding: '8px 12px',
  background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
});

const ProgressText = styled(Typography)({
  fontSize: 11,
  fontWeight: 600,
  color: '#fff',
  marginBottom: 4,
});

const ProgressBarTrack = styled(Box)({
  width: '100%',
  height: 6,
  backgroundColor: 'rgba(255, 255, 255, 0.3)',
  borderRadius: 100,
  overflow: 'hidden',
});

const ProgressBarFill = styled(motion.div)({
  height: '100%',
  background: 'linear-gradient(90deg, #10b981 0%, #3b82f6 100%)',
  borderRadius: 100,
  position: 'relative',
  overflow: 'hidden',
  transition: 'transform 0.2s',
  // '&:hover': {
  //   transform: 'scaleY(1.2)',
  // },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
    animation: 'shimmer 2s infinite',
  },
  '@keyframes shimmer': {
    '0%': { left: '-100%' },
    '100%': { left: '100%' },
  },
});

interface CommunityProgressBarProps {
  percentage: number;
}

export default function CommunityProgressBar({ percentage }: CommunityProgressBarProps) {
  // Clamp percentage between 0 and 100
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);

  return (
    <ProgressContainer>
      <ProgressText>진행률 {clampedPercentage}%</ProgressText>
      <ProgressBarTrack>
        <ProgressBarFill
          initial={{ width: 0 }}
          animate={{ width: `${clampedPercentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </ProgressBarTrack>
    </ProgressContainer>
  );
}

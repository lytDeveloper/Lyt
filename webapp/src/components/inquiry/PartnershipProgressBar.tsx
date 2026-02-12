import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';

// 진행바 트랙 (회색 배경)
const ProgressTrack = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '8px',
  backgroundColor: theme.palette.divider,
  borderRadius: '9999px',
  overflow: 'hidden',
  position: 'relative',
}));

// 진행바 채우기 (그라데이션)
const GradientFill = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'widthPercent',
})<{ widthPercent: number }>(({ theme, widthPercent }) => ({
  width: `${widthPercent}%`,
  height: '100%',
  borderRadius: '9999px',
  background: `linear-gradient(270deg, #8DA4FF 0%, ${theme.palette.status.blue} 100%)`,
  transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
}));

interface PartnershipProgressBarProps {
  currentStep: number; // 1-based
  totalSteps: number;
}

export default function PartnershipProgressBar({ currentStep, totalSteps }: PartnershipProgressBarProps) {
  const safeTotal = Math.max(totalSteps, 1);
  const clampedStep = Math.min(Math.max(currentStep, 1), safeTotal);
  const widthPercent = (clampedStep / safeTotal) * 100;

  return (
    <Box sx={{ width: '100%', padding: '8px 0' }}>
      <ProgressTrack>
        <GradientFill widthPercent={widthPercent} />
      </ProgressTrack>
    </Box>
  );
}


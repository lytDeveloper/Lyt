/**
 * Create Project Progress Bar
 * 프로젝트 생성 3단계 진행 상태를 표시하는 진행바
 */

import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';

// 진행바 전체 트랙 (회색 배경)
const ProgressTrack = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '8px',
  backgroundColor: theme.palette.divider, // 기본 회색 배경
  borderRadius: '9999px',
  overflow: 'hidden', // 내부 Fill이 둥근 모서리를 넘치지 않게 함
  position: 'relative',
}));

// 진행바 채우기 (그라데이션 + 애니메이션)
const GradientFill = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'widthPercent',
})<{ widthPercent: number }>(({ theme, widthPercent }) => ({
  width: `${widthPercent}%`,
  height: '100%',
  borderRadius: '9999px',
  // 그라데이션 적용: 왼쪽에서 오른쪽으로 (연한 파랑 -> status.blue)
  background: `linear-gradient(270deg, #8DA4FF 0%, ${theme.palette.status.blue} 100%)`,
  transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)', // 부드러운 이동 애니메이션
}));

interface CreateProjectProgressBarProps {
  currentStep: 1 | 2 | 3;
}

export default function CreateProjectProgressBar({ currentStep }: CreateProjectProgressBarProps) {
  const totalSteps = 3;
  // 단계별 퍼센트 계산 (1단계: 33.3%, 2단계: 66.6%, 3단계: 100%)
  const widthPercent = (currentStep / totalSteps) * 100;

  return (
    <Box sx={{ width: '100%', padding: '8px 0' }}>
      <ProgressTrack>
        <GradientFill widthPercent={widthPercent} />
      </ProgressTrack>
    </Box>
  );
}

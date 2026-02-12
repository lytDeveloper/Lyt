import { Box, Typography } from '@mui/material';
import type { WorkflowStep } from '../../services/exploreService';
import { useTheme } from '@mui/material';

interface WorkflowStepsProps {
  steps?: WorkflowStep[];
}

export default function WorkflowSteps({ steps }: WorkflowStepsProps) {
  // steps가 undefined이거나 null인 경우 빈 배열로 처리
  const safeSteps = steps || [];
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      {safeSteps.map((step, index) => (
        <Box
          key={index}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          {/* Status Dot */}
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: step.isCompleted ? theme.palette.status.Success : theme.palette.status.default,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
          </Box>

          {/* Step Name */}
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 12,
              fontWeight: step.isCompleted ? 300 : 300,
              color: step.isCompleted ? theme.palette.status.green : theme.palette.text.secondary,
            }}
          >
            {step.name}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

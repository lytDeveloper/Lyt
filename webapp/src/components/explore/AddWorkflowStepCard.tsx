import { Box, Typography, useTheme } from '@mui/material';
import PostAddIcon from '@mui/icons-material/PostAdd';

interface AddWorkflowStepCardProps {
  onClick: () => void;
}

export default function AddWorkflowStepCard({ onClick }: AddWorkflowStepCardProps) {
  const theme = useTheme();
  return (
    <Box
      onClick={onClick}
      sx={{
        width: '100%',
        backgroundColor: theme.palette.background.paper,
        borderRadius: '12px',
        border: `2px dashed #CFD8DC`, // 테두리 2px로 강화 및 색상 조정
        p: 4,
        display: 'flex',
        flexDirection: 'column', // 상하 배치
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        cursor: 'pointer',
        transition: 'all 0.2s',
        minHeight: '180px',
      }}
    >
      <PostAddIcon
        sx={{
          fontSize: 30,
          color: theme.palette.icon.inner,
          mb: 1
        }}
      />
      <Typography
        sx={{
          fontFamily: 'Pretendard, sans-serif',
          fontSize: 16,
          fontWeight: 400,
          color: theme.palette.subText.default,
        }}
      >
        작업 내용을 추가해 주세요.
      </Typography>
      <Typography
        sx={{
          fontFamily: 'Pretendard, sans-serif',
          fontSize: 12,
          fontWeight: 300,
          color: theme.palette.subText.default,
          textAlign: 'center',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
        }}
      >
        진행한 업무(기획·촬영·편집 등)를{'\n'}구체적으로 작성해 주세요.
      </Typography>
    </Box>
  );
}

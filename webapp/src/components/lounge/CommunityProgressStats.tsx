/**
 * CommunityProgressStats Component
 *
 * Displays progress bar and engagement stats:
 * - Progress percentage with bar
 * - Like count
 * - View count
 */

import { Box, Typography, LinearProgress, styled, useTheme, } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import FavoriteIcon from '@mui/icons-material/FavoriteBorderOutlined';
const StatBox = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
});

interface Props {
  progress: number;
  likeCount: number;
  viewCount: number;
  alignStatsRight?: boolean;
  onLikeClick?: () => void;
  onViewClick?: () => void;
}

export default function CommunityProgressStats({ progress, likeCount, viewCount, alignStatsRight, onLikeClick, onViewClick }: Props) {
  const theme = useTheme();
  return (
    <Box >
      {/* Progress Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          진행률
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          {progress}%
        </Typography>
      </Box>

      {/* Progress Bar */}
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 8,
          borderRadius: 4,
          '& .MuiLinearProgress-bar': {
            background: 'linear-gradient(90deg, #10b981 0%, #3b82f6 100%)',
          },
        }}
      />

      {/* Stats Row */}
      <Box
        sx={{
          display: 'flex',
          gap: 5,
          justifyContent: alignStatsRight ? 'flex-end' : 'flex-start',
          flexWrap: 'wrap',
          mt: 1.5,
        }}
      >
        <StatBox
          onClick={onViewClick}
          sx={{ cursor: onViewClick ? 'pointer' : 'default' }}
        >
          <VisibilityIcon sx={{ fontSize: 20, color: theme.palette.icon.default }} />
          <Typography variant="body2" color="icon.default">
            {viewCount}
          </Typography>
        </StatBox>
        <StatBox
          onClick={onLikeClick}
          sx={{ cursor: onLikeClick ? 'pointer' : 'default' }}
        >
          <FavoriteIcon sx={{ fontSize: 20, color: theme.palette.icon.default }} />
          <Typography variant="body2" color="icon.default">
            {likeCount}
          </Typography>
        </StatBox>
      </Box>
    </Box>
  );
}

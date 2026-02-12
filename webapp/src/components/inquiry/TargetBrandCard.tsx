import { Box, Typography, Avatar } from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import StarIcon from '@mui/icons-material/Star';

interface TargetBrandCardProps {
  coverImageUrl?: string;
  name: string;
  activityField?: string; // "테크 • 브랜드" style
  rating?: number | null;
  projectCount?: number;
}

export default function TargetBrandCard({ coverImageUrl, name, activityField, rating, projectCount }: TargetBrandCardProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        p: 2,
        gap: 2,
        backgroundColor: '#fff',
        borderRadius: '16px',
        // boxShadow: '0px 3px 5px rgba(0,0,0,0.04)',
        boxShadow: '0px 2px 5px 0px rgba(50, 50, 105, 0.15), 0px 1px 1px 0px rgba(0, 0, 0, 0.05)',
        border: '1px solid #F3F4F6',
        mb: 2,
      }}
    >
      {/* Cover Image (Small) */}
      <Avatar
        src={coverImageUrl}
        variant="rounded"
        sx={{
          width: 64,
          height: 64,
          borderRadius: '12px',
          backgroundColor: '#F3F4F6',
        }}
      />

      {/* Middle: Name, Check, Category */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 18,
              fontWeight: 700,
              color: '#111827',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </Typography>
          <VerifiedIcon sx={{ fontSize: 18, color: '#3B82F6', flexShrink: 0 }} />
        </Box>
        <Typography
          sx={{
            fontFamily: 'Pretendard, sans-serif',
            fontSize: 13,
            color: '#6B7280',
          }}
        >
          {activityField}
        </Typography>
      </Box>

      {/* Right: Stats */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
        {rating !== null && rating !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
            <StarIcon sx={{ fontSize: 16, color: '#F59E0B' }} />
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
              {rating.toFixed(1)}
            </Typography>
          </Box>
        )}
        {projectCount !== undefined && (
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 13,
              color: '#6B7280',
            }}
          >
            {projectCount} 프로젝트
          </Typography>
        )}
      </Box>
    </Box>
  );
}


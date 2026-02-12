import { Box, Typography, Avatar, Rating, Paper, Radio, useTheme } from '@mui/material';

export interface ReviewData {
  id: string;
  reviewerName: string;
  reviewerImage: string | null;
  reviewerRole: string;
  rating: number;
  reviewTag?: string;
  content: string;
  date: string;
  projectName?: string;
}

interface ReviewCardProps {
  review: ReviewData;
  showEditButton?: boolean;
  onEdit?: () => void;
  isManageMode?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

export default function ReviewCard({
  review,
  showEditButton = false,
  onEdit,
  isManageMode = false,
  isSelected = false,
  onSelect,
}: ReviewCardProps) {

  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        mb: 2,
        borderRadius: '16px',
        border: '1px solid #F3F4F6',
        width: '100%',
        position: 'relative',
      }}
    >
      {/* Manage Mode - Radio Button (top-left) */}
      {isManageMode && (
        <Box
          sx={{
            position: 'absolute',
            top: -12,
            right: -4,
          }}
        >
          <Radio
            checked={isSelected}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onSelect?.(review.id);
            }}
            sx={{
              p: 0,
              color: theme.palette.status.Error,
              '&.Mui-checked': {
                color: theme.palette.status.Error,
              },
              '& .MuiSvgIcon-root': {
                fontSize: 20,
              },
            }}
          />
        </Box>
      )}

      {/* Edit Button (top-right) */}
      {showEditButton && !isManageMode && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 16,
          }}
        >
          <Typography
            onClick={onEdit}
            sx={{
              fontSize: 13,
              color: theme.palette.primary.main,
              cursor: 'pointer',
              fontWeight: 500,
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            수정
          </Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Avatar
            src={review.reviewerImage || undefined}
            sx={{ width: 48, height: 48 }}
          >
            {review.reviewerName.charAt(0)}
          </Avatar>
          <Box>
            <Typography
              sx={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 15,
                fontWeight: 700,
                color: theme.palette.text.primary,
              }}
            >
              {review.reviewerName}
            </Typography>
            <Typography
              sx={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
                color: theme.palette.text.secondary,
              }}
            >
              {review.reviewerRole}
            </Typography>
            <Rating value={review.rating} readOnly size="small" sx={{ color: theme.palette.status.star }} />
          </Box>
        </Box>
        <Typography
          sx={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 12,
            color: theme.palette.text.secondary,
            mt: showEditButton && !isManageMode ? 3 : 0,
          }}
        >
          {review.date}
        </Typography>
      </Box>

      {/* Review Tag (above content) */}
      {review.reviewTag && (
        <Typography
          sx={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            fontWeight: 400,
            color: theme.palette.subText.secondary,
            mb: 1.5,
          }}
        >
          {review.reviewTag}
        </Typography>
      )}
      <Box sx={{
        display: !review.content ? 'none' : 'flex', flexDirection: 'column'
      }}>
        <Typography sx={{ fontSize: 10, color: theme.palette.icon.default }}>
          추가메시지
        </Typography>
        <Typography
          sx={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            lineHeight: 1.6,
            color: theme.palette.icon.default,
            mb: review.projectName ? 2 : 0,
          }}
        >
          {review.content}
        </Typography>
      </Box>

    </Paper>
  );
}

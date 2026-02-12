import { styled, Chip, Box } from '@mui/material';

/**
 * Status Indicators
 * Used by: ProjectCard, CollaborationCard, ApplicationCard, ProposalCard, etc.
 */

// Status chip with color variants
export const StatusChip = styled(Chip)<{
  status?: 'in_progress' | 'recruiting' | 'completed' | 'pending' | 'open' | 'accepted' | 'rejected'
}>(({ theme, status = 'pending' }) => {
  const statusColors = {
    in_progress: {
      bg: theme.palette.action.selected,
      text: theme.palette.primary.main
    },
    open: {
      bg: theme.palette.action.selected,
      text: theme.palette.primary.main
    },
    recruiting: {
      bg: '#F0FDF4',
      text: '#16A34A'
    },
    completed: {
      bg: '#F3F4F6',
      text: '#6B7280'
    },
    pending: {
      bg: '#FEF3C7',
      text: '#F59E0B'
    },
    accepted: {
      bg: '#ECFDF5',
      text: '#059669'
    },
    rejected: {
      bg: '#FEF2F2',
      text: '#DC2626'
    },
  };

  const colors = statusColors[status] || statusColors.pending;

  return {
    backgroundColor: colors.bg,
    color: colors.text,
    fontSize: 11,
    fontWeight: 500,
    fontFamily: 'Pretendard, sans-serif',
    height: 22,
    padding: '0 8px',
    borderRadius: '4px',
    '& .MuiChip-label': {
      padding: 0,
      lineHeight: '22px',
    },
  };
});

// Large status chip (for detail pages)
export const LargeStatusChip = styled(Chip)<{
  status?: 'in_progress' | 'recruiting' | 'completed' | 'pending' | 'open' | 'accepted' | 'rejected'
}>(({ theme, status = 'pending' }) => {
  const statusColors = {
    in_progress: {
      bg: theme.palette.action.selected,
      text: theme.palette.primary.main
    },
    open: {
      bg: theme.palette.action.selected,
      text: theme.palette.primary.main
    },
    recruiting: {
      bg: '#F0FDF4',
      text: '#16A34A'
    },
    completed: {
      bg: '#F3F4F6',
      text: '#6B7280'
    },
    pending: {
      bg: '#FEF3C7',
      text: '#F59E0B'
    },
    accepted: {
      bg: '#ECFDF5',
      text: '#059669'
    },
    rejected: {
      bg: '#FEF2F2',
      text: '#DC2626'
    },
  };

  const colors = statusColors[status] || statusColors.pending;

  return {
    backgroundColor: colors.bg,
    color: colors.text,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'Pretendard, sans-serif',
    height: 28,
    padding: '0 12px',
    borderRadius: '6px',
    '& .MuiChip-label': {
      padding: 0,
    },
  };
});

// Online indicator dot
export const OnlineDot = styled(Box)(({ theme }) => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  backgroundColor: '#10B981',
  border: `2px solid ${theme.palette.background.paper}`,
  position: 'absolute',
  bottom: 0,
  right: 0,
}));

// Online indicator container (wraps profile image)
export const OnlineIndicatorContainer = styled(Box)({
  position: 'relative',
  display: 'inline-block',
});

// Badge with count (for notifications)
export const CountBadge = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  borderRadius: '9999px',
  minWidth: 18,
  height: 18,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 11,
  fontWeight: 600,
  fontFamily: 'Pretendard, sans-serif',
  padding: '0 6px',
}));

// Verified badge
export const VerifiedBadge = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  borderRadius: '4px',
  padding: '2px 6px',
  fontSize: 10,
  fontWeight: 600,
  fontFamily: 'Pretendard, sans-serif',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '2px',
}));

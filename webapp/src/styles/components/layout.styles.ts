import { styled, Box, Typography } from '@mui/material';

/**
 * Layout Components
 * Used by: All page files (Home, Explore, Manage, Messages, Profile)
 */

// Page container (full screen with bottom nav space)
export const PageContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  paddingBottom: '80px',  // Account for bottom nav
}));

// Content wrapper with responsive padding
export const ContentWrapper = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(3),
  },
  [theme.breakpoints.up('md')]: {
    maxWidth: '768px',
    margin: '0 auto',
  },
}));

// Scrollable section
export const ScrollableSection = styled(Box)({
  overflowY: 'auto',
  overflowX: 'hidden',
  flex: 1,
  WebkitOverflowScrolling: 'touch',
});

// Section (with margin)
export const Section = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  '&:last-child': {
    marginBottom: 0,
  },
}));

// Section header
export const SectionHeader = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 16,
  fontWeight: 600,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(2),
}));

// Section title (larger)
export const SectionTitle = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 18,
  fontWeight: 700,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(2),
}));

// Empty state container
export const EmptyState = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
  textAlign: 'center',
  color: theme.palette.text.secondary,
  minHeight: '200px',
}));

// Empty state icon container
export const EmptyStateIcon = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  color: theme.palette.text.secondary,
  opacity: 0.5,
}));

// Empty state message
export const EmptyStateMessage = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 14,
  fontWeight: 400,
  color: theme.palette.text.secondary,
  lineHeight: 1.5,
}));

// Loading container
export const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
  minHeight: '200px',
}));

// Divider
export const Divider = styled(Box)(({ theme }) => ({
  height: 1,
  backgroundColor: theme.palette.divider,
  margin: theme.spacing(2, 0),
}));

// Grid container (2 columns on mobile, 3 on tablet+)
export const GridContainer = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    gridTemplateColumns: 'repeat(3, 1fr)',
  },
}));

// List container
export const ListContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));

// Fixed bottom container (for FAB, action buttons)
export const FixedBottomContainer = styled(Box)(({ theme }) => ({
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  padding: theme.spacing(2),
  paddingBottom: 'calc(80px + 16px)',  // Bottom nav + spacing
  backgroundColor: theme.palette.background.default,
  borderTop: `1px solid ${theme.palette.divider}`,
  zIndex: 10,
  [theme.breakpoints.up('md')]: {
    left: 'calc(50% - 384px)',  // Center on desktop
    right: 'calc(50% - 384px)',
  },
}));

// Page title
export const PageTitle = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 20,
  fontWeight: 700,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(2),
}));

// Page description
export const PageDescription = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 14,
  fontWeight: 400,
  color: theme.palette.text.secondary,
  lineHeight: 1.5,
  marginBottom: theme.spacing(3),
}));

// Flex row (responsive)
export const FlexRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  flexWrap: 'wrap',
  alignItems: 'center',
}));

// Flex column
export const FlexColumn = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));

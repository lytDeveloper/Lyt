import { styled, Box, Typography } from '@mui/material';

/**
 * Navigation Components
 * Used by: TabBar, Header, BottomNavigationBar, ManageButtonGroup
 */

// Tab button with active state
export const TabButton = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active' && prop !== 'disabled',
})<{ active?: boolean; disabled?: boolean }>(
  ({ theme, active, disabled }) => ({
    flex: 1,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '9999px',
    backgroundColor: theme.palette.background.paper,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    boxShadow: active
      ? 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
      : '0 1px 2px rgba(0,0,0,0.1)',
    opacity: disabled ? 0.5 : 1,
    pointerEvents: disabled ? 'none' : 'auto',
  })
);

// Tab button with active state
export const TabButtonFill = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active' && prop !== 'disabled',
})<{ active?: boolean; disabled?: boolean }>(
  ({ theme, active, disabled }) => ({
    flex: 1,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '9999px',
    backgroundColor: active ? theme.palette.primary.main : theme.palette.background.paper,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    pointerEvents: disabled ? 'none' : 'auto',
  })
);

export const TabButtonBottomline = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active' && prop !== 'disabled',
})<{ active?: boolean; disabled?: boolean }>(
  ({ theme, disabled }) => ({
    minWidth: 'fit-content',
    flex: '0 0 auto',
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingInline: theme.spacing(1),
    backgroundColor: theme.palette.background.paper,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    pointerEvents: disabled ? 'none' : 'auto',
  })
);

// Tab label with color states
export const TabLabel = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'active' && prop !== 'disabled',
})<{ active?: boolean; disabled?: boolean }>(
  ({ theme, active, disabled }) => ({
    fontFamily: 'Pretendard, sans-serif',
    fontSize: 12,
    fontWeight: 600,
    color: active
      ? theme.palette.primary.main
      : disabled
        ? '#9CA3AF'
        : '#6B7280',
    lineHeight: '20px',
  })
);

// Tab label with color states
export const TabLabelFill = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'active' && prop !== 'disabled',
})<{ active?: boolean; disabled?: boolean }>(
  ({ theme, active, disabled }) => ({
    fontFamily: 'Pretendard, sans-serif',
    fontSize: 12,
    fontWeight: 500,
    color: active
      ? theme.palette.primary.contrastText
      : disabled
        ? theme.palette.text.secondary
        : theme.palette.subText.default,
    lineHeight: '20px',
  })
);

export const TabLabelBottomline = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active' && prop !== 'disabled',
})<{ active?: boolean; disabled?: boolean }>(
  ({ theme, active, disabled }) => ({
    fontFamily: 'Pretendard, sans-serif',
    fontSize: 12,
    fontWeight: 500,
    borderBottom: `2px solid ${active ? theme.palette.primary.main : 'transparent'}`,
    color: active
      ? theme.palette.primary.main
      : disabled
        ? theme.palette.text.secondary
        : theme.palette.subText.default,
    lineHeight: '20px',
    paddingInline: theme.spacing(0.3),
    display: 'inline-flex',
    alignItems: 'center',
  })
);

// Tab container (wraps all tabs)
export const TabContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  padding: theme.spacing(0.5),
  overflowX: 'auto',
  whiteSpace: 'nowrap',
  scrollbarWidth: 'none', // Firefox: hide scrollbar
  '&::-webkit-scrollbar': {
    display: 'none', // Chrome/Safari: hide scrollbar
  },
  // backgroundColor: theme.palette.grey[100],
  borderRadius: '9999px',
  width: '100%',
}));

// Sticky header (used on all main pages)
export const StickyHeader = styled(Box)(({ theme }) => ({
  position: 'sticky',
  top: 0,
  zIndex: 100,
  backgroundColor: theme.palette.background.default,
  paddingTop: theme.spacing(2),
  paddingBottom: theme.spacing(1),
}));

// Header container
export const HeaderContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

// Header title
export const HeaderTitle = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 18,
  fontWeight: 600,
  color: theme.palette.text.primary,
}));

// Bottom nav container
export const BottomNavContainer = styled(Box)(({ theme }) => ({
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  height: 80,
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  justifyContent: 'space-around',
  alignItems: 'center',
  padding: theme.spacing(1, 2),
  zIndex: 1000,
}));

// Bottom nav item
export const BottomNavItem = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(
  ({ theme, active }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(0.5),
    flex: 1,
    cursor: 'pointer',
    padding: theme.spacing(1),
    color: active ? theme.palette.primary.main : theme.palette.text.secondary,
    transition: 'color 0.2s',
  })
);

// Bottom nav label
export const BottomNavLabel = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(
  ({ theme, active }) => ({
    fontFamily: 'Pretendard, sans-serif',
    fontSize: 11,
    fontWeight: 500,
    color: active ? theme.palette.primary.main : theme.palette.text.secondary,
  })
);

// Manage button group (for Explore/Manage toggle)
export const ManageButtonGroup = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(2),
}));

// Manage button
export const ManageButton = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(
  ({ theme, active }) => ({
    flex: 1,
    padding: theme.spacing(1.5),
    borderRadius: '8px',
    backgroundColor: active
      ? theme.palette.primary.main
      : theme.palette.background.paper,
    color: active
      ? theme.palette.primary.contrastText
      : theme.palette.text.primary,
    fontFamily: 'Pretendard, sans-serif',
    fontSize: 14,
    fontWeight: 500,
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: `1px solid ${active ? theme.palette.primary.main : theme.palette.divider}`,
  })
);

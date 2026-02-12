import { Box, Typography, styled } from '@mui/material';

/**
 * Shared form-specific styled components for onboarding pages
 * Consolidates duplicated styles across 20+ onboarding step files
 */

// --- Form Section Containers ---

/** Form section container with consistent spacing */
export const FormSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  [theme.breakpoints.up('sm')]: {
    marginBottom: theme.spacing(4.5),
  },
}));

/** Form section with extra bottom spacing (used in some steps) */
export const FormSectionLarge = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(8),
  [theme.breakpoints.up('sm')]: {
    marginBottom: theme.spacing(4.5),
  },
}));

// --- Labels ---

/** Section label (primary heading for form sections) */
export const SectionLabel = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 'clamp(18px, 5vw, 22px)',
  lineHeight: 1.4,
  fontWeight: 600,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(1.5),
  [theme.breakpoints.up('sm')]: {
    fontSize: 20,
  },
  [theme.breakpoints.up('md')]: {
    fontSize: 22,
  },
}));

/** Sub label (secondary text, helper instructions) - Pretendard */
export const SubLabel = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 'clamp(11px, 3vw, 13px)',
  lineHeight: 1.4,
  fontWeight: 400,
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
  [theme.breakpoints.up('sm')]: {
    fontSize: 12,
  },
}));

/** Sub label variant using Abel font (for specific steps) */
export const SubLabelAbel = styled(Typography)(({ theme }) => ({
  fontSize: 'clamp(11px, 3vw, 12px)',
  lineHeight: 1.4,
  fontWeight: 400,
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
  [theme.breakpoints.up('sm')]: {
    fontSize: 12,
  },
}));

// --- Helper Text ---

/** Helper text below inputs (with optional error state) */
export const HelperText = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'error',
})<{ error?: boolean }>(({ theme, error }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 12,
  lineHeight: 1.5,
  color: error ? theme.palette.error.main : theme.palette.text.secondary,
  marginTop: theme.spacing(1),
  paddingLeft: theme.spacing(0.5),
  [theme.breakpoints.up('sm')]: {
    fontSize: 12,
  },
}));

// --- Info Text ---

/** General info text (centered) - Pretendard */
export const InfoText = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 'clamp(14px, 3.5vw, 16px)',
  lineHeight: 1.6,
  fontWeight: 400,
  color: theme.palette.subText.secondary,
  textAlign: 'center',
  marginTop: theme.spacing(32),
  [theme.breakpoints.up('sm')]: {
    fontSize: 14,
  },
}));

/** Info text with auto margin-top (pushes to bottom) */
export const InfoTextBottom = styled(Typography)(({ theme }) => ({
  display: 'block',
  textAlign: 'center',
  color: theme.palette.text.primary,
  fontFamily: 'Pretendard, sans-serif',
  fontWeight: 400,
  fontSize: 'clamp(12px, 3.5vw, 14px)',
  lineHeight: 1.4,
  marginTop: 'auto',
  paddingTop: theme.spacing(4),
  [theme.breakpoints.up('sm')]: {
    fontSize: 14,
  },
}));

/** Bold text within InfoText */
export const InfoTextBold = styled('span')(({ theme }) => ({
  fontWeight: 600,
  color: theme.palette.text.primary,
}));

// --- Icon Selection Grid (for fan/artist/creative steps) ---

/** Grid container for icon buttons */
export const IconGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(4),
  [theme.breakpoints.up('sm')]: {
    gap: theme.spacing(2.5),
  },
}));

/** Individual icon button container */
export const IconButton = styled(Box)<{ selected?: boolean }>(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(1),
  cursor: 'pointer',
  transition: 'all 0.2s ease',
}));

/** Icon wrapper (rounded square background) */
export const IconWrapper = styled(Box)<{ selected?: boolean }>(({ theme, selected }) => ({
  width: 70,
  height: 70,
  borderRadius: '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: selected ? theme.palette.action.selected : theme.palette.background.paper,
  border: `2px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
  transition: 'all 0.2s ease',
  [theme.breakpoints.up('sm')]: {
    width: 80,
    height: 80,
  },
}));

/** Icon label text */
export const IconLabel = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 'clamp(11px, 3vw, 13px)',
  lineHeight: 1.3,
  fontWeight: 500,
  color: theme.palette.text.primary,
  textAlign: 'center',
  [theme.breakpoints.up('sm')]: {
    fontSize: 13,
  },
}));

// --- Image Upload Section ---

/** Container for image upload components */
export const ImageUploadSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  marginBottom: theme.spacing(4),
  [theme.breakpoints.up('sm')]: {
    marginBottom: theme.spacing(5),
  },
}));

/** Title section with specific styling (used in creative step) */
export const TitleSection = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 'clamp(18px, 5vw, 22px)',
  lineHeight: 1.4,
  fontWeight: 600,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(4),
  textAlign: 'left',
  [theme.breakpoints.up('sm')]: {
    fontSize: 20,
    marginBottom: theme.spacing(5),
  },
  [theme.breakpoints.up('md')]: {
    fontSize: 22,
  },
}));

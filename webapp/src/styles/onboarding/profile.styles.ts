import { Box, Typography, styled } from '@mui/material';

/**
 * Shared profile-specific styled components for onboarding pages
 * Used primarily in profile preview/display components
 */

// --- Profile Preview Container ---

/** Main container for profile preview sections */
export const ProfilePreview = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  marginBottom: theme.spacing(4),
  gap: theme.spacing(2),
  width: '100%',
}));

// --- Cover & Logo Image Components ---

/** Cover image preview (full width, cover fit) */
export const CoverPreview = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
});

/** Logo image preview (circular, cover fit) */
export const LogoPreview = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
  borderRadius: '50%',
});

// --- Profile Info Display ---

/** Profile information container */
export const ProfileInfo = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
});

/** Profile name/title text */
export const ProfileName = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 14,
  fontWeight: 600,
  color: theme.palette.text.primary,
}));

/** Profile field/category text (secondary info) */
export const ProfileField = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 12,
  fontWeight: 400,
  color: theme.palette.text.secondary,
}));

// --- Label Components ---

/** Label row container (centered) */
export const LabelRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 2,
  marginTop: theme.spacing(0),
  marginLeft: 6,
}));

/** Small label text (brand/artist name) */
export const SmallLabel = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 12,
  fontWeight: 600,
  color: theme.palette.text.primary,
}));

/** Small emphasized text (category, blue highlight) */
export const SmallEm = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 12,
  color: theme.palette.primary.main,
  fontWeight: 600,
}));

/** Footnote text (helper text below profile) */
export const Footnote = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 12,
  color: theme.palette.text.secondary,
  textAlign: 'center',
  marginTop: theme.spacing(4),
}));

// --- Profile Image Placeholders ---

/** Cover image placeholder (2:1 aspect ratio) */
export const CoverPlaceholder = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: 340,
  aspectRatio: '2 / 1',
  borderRadius: '20px',
  backgroundColor: '#E9E9ED',
  border: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 14,
  color: theme.palette.text.secondary,
  fontWeight: 400,
}));

/** Image row container (horizontal layout) */
export const ImageRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  width: '100%',
  maxWidth: 340,
});

/** Profile image placeholder (circular) */
export const ImagePlaceholder = styled(Box)(({ theme }) => ({
  width: 64,
  height: 64,
  borderRadius: '50%',
  backgroundColor: '#E9E9ED',
  border: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  color: theme.palette.text.secondary,
  fontWeight: 400,
}));

// --- Tags ---

/** Tags row container (horizontal, wrapped, centered) */
export const TagsRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: theme.spacing(1),
  width: '90%',
  margin: '20px auto',
}));

/** Individual tag element */
export const Tag = styled(Box)<{ selected?: boolean }>(({ theme, selected }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 12,
  fontWeight: 400,
  padding: '6px 12px',
  borderRadius: '100px',
  backgroundColor: selected ? theme.palette.action.selected : theme.palette.grey[100],
  color: theme.palette.text.primary,
  cursor: selected ? 'default' : 'pointer',
  pointerEvents: selected ? 'none' : 'auto',
  transition: 'all 0.2s ease',
}));

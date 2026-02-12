import { Box, Typography, styled } from '@mui/material';
import { COLORS, PageTitle, PageSubtitle, StyledTextField, StyledSelect } from '../../../styles/onboarding/common.styles';

// 헤더 (프로필 미리보기 섹션)
export const ProfilePreview = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  marginBottom: theme.spacing(4),
  gap: theme.spacing(2),
  width: '100%',
}));

export const CoverPlaceholder = styled(Box)({
  width: '100%',
  maxWidth: 340,
  aspectRatio: '2 / 1',
  borderRadius: '20px',
  backgroundColor: '#E9E9ED',
  border: `1px solid ${COLORS.BORDER_DEFAULT}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 14,
  color: COLORS.TEXT_SECONDARY,
  fontWeight: 400,
});

export const ImageRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  width: '100%',
  maxWidth: 340,
});

export const ImagePlaceholder = styled(Box)({
  width: 64,
  height: 64,
  borderRadius: '50%',
  backgroundColor: '#E9E9ED',
  border: `1px solid ${COLORS.BORDER_DEFAULT}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  color: COLORS.TEXT_SECONDARY,
  fontWeight: 400,
});

export const ProfileInfo = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
});

export const ProfileName = styled(Typography)({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 14,
  fontWeight: 600,
  color: COLORS.TEXT_PRIMARY,
});

export const ProfileField = styled(Typography)({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 12,
  fontWeight: 400,
  color: COLORS.TEXT_SECONDARY,
});

export const TagsRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'flex-start',
  gap: theme.spacing(1),
  marginTop: theme.spacing(1.5),
  width: '90%',
  margin: '0 auto',
}));

export const Tag = styled(Box)<{ selected?: boolean }>(({ theme, selected }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 14,
  fontWeight: 400,
  padding: '6px 0',
  width: '30%',
  textAlign: 'center',
  borderRadius: '20px',
  backgroundColor: selected ? theme.palette.primary.main : theme.palette.grey[100],
  color: selected ? theme.palette.primary.contrastText : theme.palette.text.primary,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
}));

// 폼 섹션
export const FormSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

export { PageTitle, PageSubtitle, StyledTextField, StyledSelect };


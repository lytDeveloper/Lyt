import { Typography, styled } from '@mui/material';
export { PageTitle, PageSubtitle } from '../../../styles/onboarding/common.styles';
export { CanvasWrapper, Canvas, UploadBadge, LabelRow, SmallLabel, SmallEm } from '../../../styles/onboarding/common.styles';

export const CoverPreview = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
});

// UploadBadge는 공용으로 이동

export const LogoPreview = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
  borderRadius: '50%',
});

// LabelRow/SmallLabel/SmallEm은 공용으로 이동

export const Footnote = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 14,
  color: theme.palette.subText.secondary,
  fontWeight: 400,
  textAlign: 'center',
  marginBottom: theme.spacing(0.5),
}));


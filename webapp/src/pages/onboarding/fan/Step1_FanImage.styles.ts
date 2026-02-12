import { Box, Typography, styled } from '@mui/material';
import { COLORS } from '../../../styles/onboarding/common.styles';

// 타이틀 섹션
export const TitleSection = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 'clamp(18px, 5vw, 22px)',
  lineHeight: 1.4,
  fontWeight: 600,
  color: COLORS.TEXT_PRIMARY,
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

// 이미지 업로드 섹션
export const ImageUploadSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  marginBottom: theme.spacing(4),
  [theme.breakpoints.up('sm')]: {
    marginBottom: theme.spacing(5),
  },
}));

// 이미지 플레이스홀더 (정사각형)
export const ImagePlaceholder = styled(Box)({
  width: '100%',
  maxWidth: 200,
  aspectRatio: '1 / 1',
  borderRadius: '20px',
  backgroundColor: '#E9E9ED',
  border: `1px solid ${COLORS.BORDER_DEFAULT}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  overflow: 'hidden',
  transition: 'all 0.2s ease',
  '&:focus': {
    outline: `2px solid ${COLORS.CTA_BLUE}`,
    outlineOffset: 2,
  },
});

// 헬퍼 텍스트
export const HelperText = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'error',
})<{ error?: boolean }>(({ theme, error }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 12,
  lineHeight: 1.5,
  color: error ? '#ef4444' : COLORS.TEXT_SECONDARY,
  marginTop: theme.spacing(1),
  paddingLeft: theme.spacing(0.5),
  [theme.breakpoints.up('sm')]: {
    fontSize: 12,
  },
}));


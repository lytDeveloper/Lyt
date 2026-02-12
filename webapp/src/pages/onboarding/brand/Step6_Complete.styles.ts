import { Typography, styled } from '@mui/material';
export { PageTitle, PageSubtitle } from '../../../styles/onboarding/common.styles';

// 환영 메시지
export const WelcomeMessage = styled(Typography)(({ theme }) => ({
  fontSize: 'clamp(16px, 4.5vw, 18px)',
  lineHeight: 1.4,
  fontWeight: 400,
  color: theme.palette.subText?.default,
  textAlign: 'center',
  marginTop: theme.spacing(0),
  marginBottom: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    fontSize: 18,
  },
}));

// ProfileCard는 Common.styles.ts의 CanvasWrapper로 통일됨
// CoverImage는 Common.styles.ts의 Canvas로 통일됨
// LogoBadge는 Common.styles.ts의 UploadBadge로 통일됨

// 커버 이미지 프리뷰 (Step3_Images.styles.ts의 CoverPreview와 동일)
export const CoverPreview = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
});

// 로고 이미지
export const LogoImage = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
});

// BrandInfo는 Common.styles.ts의 LabelRow로 통일됨
// BrandName과 BrandCategory는 Common.styles.ts의 SmallLabel과 SmallEm으로 통일됨




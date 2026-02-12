import { Box, Typography, styled } from '@mui/material';
import { COLORS } from '../../../styles/onboarding/common.styles';

// 중앙 콘텐츠
export const CenterContent = styled(Box)({
  flex: '1 1 auto',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '40px 0',
});

// 이모지
export const Emoji = styled('div')(({ theme }) => ({
  fontSize: 80,
  marginBottom: theme.spacing(3),
  [theme.breakpoints.up('sm')]: {
    fontSize: 100,
  },
}));

// 타이틀
export const Title = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 'clamp(24px, 6vw, 28px)',
  lineHeight: 1.3,
  fontWeight: 700,
  color: COLORS.TEXT_PRIMARY,
  marginBottom: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    fontSize: 28,
  },
}));

// 설명
export const Description = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 'clamp(14px, 4vw, 16px)',
  lineHeight: 1.6,
  fontWeight: 400,
  color: COLORS.TEXT_PRIMARY,
  marginBottom: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    fontSize: 16,
  },
}));

// 서브 설명
export const SubDescription = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 'clamp(12px, 3.5vw, 14px)',
  lineHeight: 1.5,
  fontWeight: 400,
  color: COLORS.TEXT_SECONDARY,
  [theme.breakpoints.up('sm')]: {
    fontSize: 14,
  },
}));


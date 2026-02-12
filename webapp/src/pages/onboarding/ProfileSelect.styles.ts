import { Box, Paper, Typography, styled } from '@mui/material';
import { COLORS, CARD_RADIUS } from '../../styles/onboarding/common.styles';
export { TitleSection } from '../../styles/onboarding/common.styles';

// TitleSection은 공용으로 사용

// 메인 타이틀
export const MainTitle = styled(Typography)(({ theme }) => ({
  fontSize: 'clamp(16px, 5vw, 24px)',
  lineHeight: 1.4,
  fontWeight: 400,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(1.5),
  [theme.breakpoints.up('sm')]: {
    fontSize: 22,
  },
  [theme.breakpoints.up('md')]: {
    fontSize: 24,
  },
}));

// 서브타이틀
export const SubTitle = styled(Typography)(({ theme }) => ({
  fontSize: 'clamp(11px, 3.5vw, 14px)',
  lineHeight: 1.5,
  color: theme.palette.text.secondary,
  [theme.breakpoints.up('sm')]: {
    fontSize: 14,
  },
}));

// 카드 그리드 컨테이너
export const CardGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: theme.spacing(2),
  width: '100%',
  maxWidth: '100%',
  margin: '0 auto',
  [theme.breakpoints.up('sm')]: {
    gap: theme.spacing(2.5),
    maxWidth: 360,
  },
  [theme.breakpoints.up('md')]: {
    gap: theme.spacing(3),
    maxWidth: 400,
  },
}));

// 역할 선택 카드
export const RoleCard = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isActive',
})<{ isActive?: boolean }>(({ isActive, theme }) => ({
  width: '100%',
  aspectRatio: '1',
  borderRadius: CARD_RADIUS,
  backgroundColor: isActive ? theme.palette.bgColor.blue : theme.palette.background.paper,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  boxShadow: '0 3px 5px rgba(0,0,0,0.2)',
  transition: 'background .15s ease, box-shadow .15s ease, border-color .15s ease',
}));

// 카드 내부 텍스트
export const CardLabel = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'isActive',
})<{ isActive?: boolean }>(({ theme, isActive }) => ({
  fontWeight: isActive ? 800 : 500,
  fontSize: 16,
  lineHeight: 1.2,
  color: COLORS.TEXT_PRIMARY,
  [theme.breakpoints.up('sm')]: {
    fontSize: 14,
  },
}));

// 안내문
export const InfoText = styled(Typography)(({ theme }) => ({
  display: 'block',
  textAlign: 'center',
  color: COLORS.TEXT_PRIMARY,
  fontFamily: 'Pretendard, sans-serif',
  fontWeight: 400,
  fontSize: 'clamp(11px, 3.5vw, 14px)',
  lineHeight: 1.4,
  [theme.breakpoints.up('sm')]: {
    fontSize: 14,
  },
}));


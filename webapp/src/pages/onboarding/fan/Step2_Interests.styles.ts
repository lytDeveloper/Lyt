import { Box, Typography, styled } from '@mui/material';
import { COLORS } from '../../../styles/onboarding/common.styles';

// 페이지 타이틀
export const PageTitle = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 'clamp(18px, 5vw, 22px)',
  lineHeight: 1.4,
  fontWeight: 600,
  color: COLORS.TEXT_PRIMARY,
  marginBottom: theme.spacing(1),
  [theme.breakpoints.up('sm')]: {
    fontSize: 20,
  },
  [theme.breakpoints.up('md')]: {
    fontSize: 22,
  },
}));

// 서브타이틀
export const PageSubtitle = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 'clamp(12px, 3.5vw, 14px)',
  lineHeight: 1.5,
  fontWeight: 400,
  color: COLORS.TEXT_SECONDARY,
  marginBottom: theme.spacing(4),
  [theme.breakpoints.up('sm')]: {
    fontSize: 14,
  },
}));

// 아이콘 그리드
export const IconGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(4),
  [theme.breakpoints.up('sm')]: {
    gap: theme.spacing(2.5),
  },
}));

// 아이콘 버튼
export const IconButton = styled(Box)<{ selected?: boolean }>(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(1),
  cursor: 'pointer',
  transition: 'all 0.2s ease',
}));

// 아이콘 래퍼 (원형 배경)
export const IconWrapper = styled(Box)<{ selected?: boolean }>(({ theme, selected }) => ({
  width: 70,
  height: 70,
  borderRadius: '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: selected ? COLORS.CARD_SELECTED_BG : COLORS.INPUT_BG,
  border: `2px solid ${selected ? COLORS.CTA_BLUE : COLORS.BORDER_DEFAULT}`,
  transition: 'all 0.2s ease',
  [theme.breakpoints.up('sm')]: {
    width: 80,
    height: 80,
  },
}));

// 아이콘 라벨
export const IconLabel = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 'clamp(11px, 3vw, 13px)',
  lineHeight: 1.3,
  fontWeight: 500,
  color: COLORS.TEXT_PRIMARY,
  textAlign: 'center',
  [theme.breakpoints.up('sm')]: {
    fontSize: 13,
  },
}));

// 하단 안내 문구
export const InfoText = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 'clamp(12px, 3.5vw, 14px)',
  lineHeight: 1.6,
  fontWeight: 400,
  color: COLORS.TEXT_SECONDARY,
  textAlign: 'center',
  marginTop: theme.spacing(24),
  [theme.breakpoints.up('sm')]: {
    fontSize: 14,
  },
}));

export const InfoTextBold = styled('span')(({ theme }) => ({
  fontWeight: 500,
  color: theme.palette.text.primary,
  fontSize: 'clamp(16px, 3.5vw, 18px)',
}));


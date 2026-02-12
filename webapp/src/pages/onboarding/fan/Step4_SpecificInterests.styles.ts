import { Box, Typography, Chip, styled } from '@mui/material';
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

// 칩 그룹
export const ChipGroup = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(1.5),
  marginBottom: theme.spacing(4),
}));

// 커스텀 Chip (해시태그 스타일)
export const StyledChip = styled(Chip)<{ selected?: boolean }>(({ theme, selected }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 14,
  lineHeight: 1.4,
  fontWeight: 500,
  height: 38,
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  borderRadius: '100px',
  border: `2px solid ${selected ? COLORS.CTA_BLUE : COLORS.BORDER_DEFAULT}`,
  backgroundColor: selected ? COLORS.CARD_SELECTED_BG : COLORS.INPUT_BG,
  color: COLORS.TEXT_PRIMARY,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '& .MuiChip-label': {
    padding: 0,
  },
  [theme.breakpoints.up('sm')]: {
    fontSize: 14,
    height: 40,
  },
}));

// 하단 안내 문구
export const InfoText = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 'clamp(12px, 3.5vw, 14px)',
  lineHeight: 1.6,
  fontWeight: 400,
  color: theme.palette.text.secondary,
  textAlign: 'center',
  marginTop: theme.spacing(38),
  [theme.breakpoints.up('sm')]: {
    fontSize: 14,
  },
}));

export const InfoTextBold = styled('span')(({ theme }) => ({
  fontWeight: 500,
  color: theme.palette.text.primary,
  fontSize: 'clamp(16px, 3.5vw, 18px)',
}));


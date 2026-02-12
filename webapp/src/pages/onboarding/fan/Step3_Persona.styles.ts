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

// 옵션 리스트
export const OptionList = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(4),
}));

// 라디오 옵션 아이템
export const RadioOptionItem = styled(Box)<{ selected?: boolean }>(({ theme, selected }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing(1.5),
  paddingTop: theme.spacing(2),
  paddingBottom: theme.spacing(2),
  paddingLeft: theme.spacing(2.5),
  paddingRight: theme.spacing(2.5),
  backgroundColor: selected ? '#EFF6FF' : theme.palette.grey[100], // 선택 시 연한 파란색 배경
  //border: `2px solid ${selected ? COLORS.CTA_BLUE : COLORS.BORDER_DEFAULT}`,
  borderRadius: '30px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: selected ? '#EFF6FF' : theme.palette.grey[200],
  },
}));

// 라디오 버튼 (원형)
export const RadioButton = styled(Box)<{ checked?: boolean }>(({ checked }) => ({
  width: 20,
  height: 20,
  borderRadius: '50%',
  border: `2px solid ${checked ? COLORS.CTA_BLUE : COLORS.BORDER_DEFAULT}`,
  backgroundColor: COLORS.INPUT_BG,
  display: 'none', // radio 버튼 숨김
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  marginTop: 2,
  '&::after': {
    content: '""',
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: checked ? COLORS.CTA_BLUE : 'transparent',
    transition: 'background-color 0.2s ease',
  },
}));

// 옵션 라벨
export const OptionLabel = styled(Typography)<{ selected?: boolean }>(({ theme, selected }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 'clamp(14px, 4vw, 16px)',
  lineHeight: 1.4,
  fontWeight: selected ? 600 : 500,
  color: selected ? COLORS.CTA_BLUE : COLORS.TEXT_PRIMARY,
  transition: 'color 0.2s ease',
  [theme.breakpoints.up('sm')]: {
    fontSize: 15,
  },
}));

// 옵션 설명
export const OptionDescription = styled(Typography)<{ selected?: boolean }>(({ theme, selected }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 'clamp(11px, 3vw, 13px)',
  lineHeight: 1.4,
  fontWeight: 400,
  color: selected ? COLORS.CTA_BLUE : COLORS.TEXT_SECONDARY,
  marginTop: theme.spacing(0.5),
  transition: 'color 0.2s ease',
  opacity: selected ? 0.8 : 1,
  [theme.breakpoints.up('sm')]: {
    fontSize: 12,
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
  marginTop: theme.spacing(0),
  [theme.breakpoints.up('sm')]: {
    fontSize: 14,
  },
}));

export const InfoTextBold = styled('span')(({ theme }) => ({
  fontWeight: 500,
  fontSize: 'clamp(16px, 3.5vw, 18px)',
  color: theme.palette.text.primary,
}));


import { Box, Typography, Chip, styled } from '@mui/material';
import { COLORS } from '../../../styles/onboarding/common.styles';
export { StyledSelect, ScrollableForm } from '../../../styles/onboarding/common.styles';

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
  marginBottom: theme.spacing(3),
  [theme.breakpoints.up('sm')]: {
    fontSize: 14,
  },
}));

// 폼 섹션 컨테이너
export const FormSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  [theme.breakpoints.up('sm')]: {
    marginBottom: theme.spacing(4.5),
  },
}));

// 섹션 라벨
export const SectionLabel = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 'clamp(18px, 5vw, 22px)',
  lineHeight: 1.4,
  fontWeight: 600,
  color: COLORS.TEXT_PRIMARY,
  marginBottom: theme.spacing(1.5),
  [theme.breakpoints.up('sm')]: {
    fontSize: 20,
  },
  [theme.breakpoints.up('md')]: {
    fontSize: 22,
  },
}));

// 서브 라벨 (복수선택 안내문 등)
export const SubLabel = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 'clamp(11px, 3vw, 13px)',
  lineHeight: 1.4,
  fontWeight: 400,
  color: COLORS.TEXT_SECONDARY,
  marginTop: theme.spacing(0.5),
  marginBottom: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    fontSize: 12,
  },
}));


// 칩 버튼 그룹 컨테이너
export const ChipGroup = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(1),
  marginTop: theme.spacing(1.5),
}));

// 커스텀 Chip (선택 버튼)
export const StyledChip = styled(Chip)<{ selected?: boolean }>(({ theme, selected }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 14,
  lineHeight: 1.4,
  fontWeight: 400,
  height: 38,
  paddingLeft: theme.spacing(1.5),
  paddingRight: theme.spacing(1.5),
  borderRadius: '100px',
  backgroundColor: selected ? COLORS.CARD_SELECTED_BG : COLORS.INPUT_BG,
  color: COLORS.TEXT_PRIMARY,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '& .MuiChip-label': {
    padding: 0,
    paddingRight: theme.spacing(0.5), // X버튼과 텍스트 간격
  },
  '& .MuiChip-deleteIcon': {
    margin: 0,
    marginLeft: theme.spacing(0.5), // X버튼 왼쪽 여백
  },
  [theme.breakpoints.up('sm')]: {
    fontSize: 13,
    height: 36,
  },
}));



import { Box, Typography, Select, Chip, styled } from '@mui/material';
import { COLORS } from '../../../styles/onboarding/common.styles';
export { ScrollableForm } from '../../../styles/onboarding/common.styles';

// 페이지 타이틀 (Abel 폰트 사용)
export const PageTitle = styled(Typography)(({ theme }) => ({

  fontSize: 'clamp(18px, 5vw, 18px)',
  lineHeight: 1.4,
  fontWeight: 400,
  color: COLORS.TEXT_PRIMARY,
  marginBottom: theme.spacing(1),
  [theme.breakpoints.up('sm')]: {
    fontSize: 18,
  },
  [theme.breakpoints.up('md')]: {
    fontSize: 18,
  },
}));

// 서브 라벨 (Abel 폰트 사용)
export const SubLabel = styled(Typography)(({ theme }) => ({

  fontSize: 'clamp(11px, 3vw, 12px)',
  lineHeight: 1.4,
  fontWeight: 400,
  color: COLORS.TEXT_SECONDARY,
  marginTop: theme.spacing(0.5),
  [theme.breakpoints.up('sm')]: {
    fontSize: 12,
  },
}));

// 폼 섹션 컨테이너
export const FormSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(8),
  [theme.breakpoints.up('sm')]: {
    marginBottom: theme.spacing(4.5),
  },
}));

// 커스텀 Select 드롭다운
export const StyledSelect = styled(Select)(({ theme }) => ({
  width: '100%',
  backgroundColor: COLORS.INPUT_BG,
  borderRadius: '12px',
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 15,
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: COLORS.BORDER_DEFAULT,
    borderWidth: '1px',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: COLORS.CTA_BLUE,
    borderWidth: '2px',
  },
  '& .MuiSelect-select': {
    padding: '14px 16px',
    color: COLORS.TEXT_PRIMARY,
  },
  '& .MuiSelect-icon': {
    color: COLORS.TEXT_SECONDARY,
  },
  [theme.breakpoints.up('sm')]: {
    fontSize: 14,
  },
}));

// 칩 버튼 그룹 컨테이너 - 반응형 그리드
export const ChipGroup = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)', // 작은 화면: 2열 (아이폰 SE 등)
  gap: theme.spacing(1.2), // 간격 약간 줄임
  marginTop: theme.spacing(0),
  width: '100%',
  maxWidth: '400px',
  margin: '0 auto',
  // 425px 이상 (일반 모바일)
  '@media (min-width: 425px)': {
    gridTemplateColumns: 'repeat(3, 1fr)', // 3열로 변경
    gap: theme.spacing(1.5),
  },
  [theme.breakpoints.up('sm')]: {
    gridTemplateColumns: 'repeat(3, 1fr)', // 태블릿 이상: 3열
    gap: theme.spacing(1.5),
    maxWidth: '450px',
  },
}));

// 커스텀 Chip (선택 버튼) - Abel 폰트 사용
export const StyledChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'selected',
})<{ selected?: boolean }>(({ theme, selected }) => ({

  fontSize: 14, // 작은 화면에서는 폰트 크기 줄임
  lineHeight: 1.6,
  fontWeight: 400,
  height: 38, // 높이도 약간 줄임
  width: '100%',
  paddingLeft: theme.spacing(1),
  paddingRight: theme.spacing(1),
  borderRadius: '20px',
  border: `1px solid ${selected ? COLORS.CTA_BLUE : COLORS.BORDER_DEFAULT}`,
  backgroundColor: selected ? COLORS.CARD_SELECTED_BG : COLORS.INPUT_BG,
  color: COLORS.TEXT_PRIMARY,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '& .MuiChip-label': {
    padding: 0,
    textAlign: 'center',
    whiteSpace: 'nowrap',
  },
  // 425px 이상
  '@media (min-width: 425px)': {
    fontSize: 15,
    height: 40,
    paddingLeft: theme.spacing(1.5),
    paddingRight: theme.spacing(1.5),
  },
  [theme.breakpoints.up('sm')]: {
    fontSize: 16,
    height: 40,
    paddingLeft: theme.spacing(1.5),
    paddingRight: theme.spacing(1.5),
  },
}));


// 안내문 (Pretendard 폰트 사용)
export const InfoText = styled(Typography)(({ theme }) => ({
  display: 'block',
  textAlign: 'center',
  color: COLORS.TEXT_PRIMARY,
  fontFamily: 'Pretendard, sans-serif',
  fontWeight: 400,
  fontSize: 'clamp(12px, 3.5vw, 14px)',
  lineHeight: 1.4,
  marginTop: 'auto',
  paddingTop: theme.spacing(4),
  [theme.breakpoints.up('sm')]: {
    fontSize: 14,
  },
}));


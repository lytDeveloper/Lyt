import { Box, Typography, TextField, Select, styled } from '@mui/material';
export { PageTitle } from '../../../styles/onboarding/common.styles';

// 서브 라벨 (Abel 폰트 사용)
export const SubLabel = styled(Typography)(({ theme }) => ({

  fontSize: 'clamp(11px, 3vw, 12px)',
  lineHeight: 1.4,
  fontWeight: 400,
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
  [theme.breakpoints.up('sm')]: {
    fontSize: 12,
  },
}));

// 폼 섹션 컨테이너
export const FormSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2.5),
  [theme.breakpoints.up('sm')]: {
    marginBottom: theme.spacing(2.5),
  },
}));

// 커스텀 TextField
export const StyledTextField = styled(TextField)(({ theme }) => ({
  width: '100%',
  '& .MuiOutlinedInput-root': {
    backgroundColor: theme.palette.background.paper,
    borderRadius: '10px',

    fontSize: 14,
    height: 47,
    [theme.breakpoints.up('sm')]: {
      fontSize: 14,
    },
    '& fieldset': {
      borderColor: theme.palette.text.secondary,
      borderWidth: '1px',
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
      borderWidth: '2px',
    },
  },
  '& .MuiOutlinedInput-input': {
    padding: '12px 20px',
    color: theme.palette.text.primary,
    '&::placeholder': {
      color: theme.palette.text.secondary,
      opacity: 1,
    },
  },
}));

// 스크롤 가능한 폼 컨테이너
export const ScrollableForm = styled(Box)({
  flex: '1 1 auto',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
});

// 커스텀 Select
export const StyledSelect = styled(Select)(({ theme }) => ({
  width: '100%',
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.text.secondary,
    borderWidth: '1px',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.primary.main,
    borderWidth: '2px',
  },
  '& .MuiSelect-select': {
    backgroundColor: theme.palette.background.paper,
    borderRadius: '10px',

    fontSize: 14,
    height: 30,
    padding: '12px 20px',
    color: theme.palette.text.primary,
    display: 'flex',
    alignItems: 'center', // 텍스트 세로 중앙 정렬
    [theme.breakpoints.up('sm')]: {
      fontSize: 14,
    },
  },
}));

// URL Prefix 컨테이너
export const UrlPrefix = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginTop: 12,
});

// URL Prefix 텍스트
export const PrefixText = styled(Typography)(({ theme }) => ({

  fontSize: 14,
  color: theme.palette.text.secondary,
  whiteSpace: 'nowrap',
}));

// 지역 선택용 Chip 그리드
export const LocationGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: theme.spacing(1),
  justifyContent: 'center',
  paddingLeft: theme.spacing(1),
}));

// 지역 Chip 버튼
export const LocationButton = styled(Box)<{ selected?: boolean }>(({ theme, selected }) => ({
  padding: theme.spacing(1, 1.5),
  backgroundColor: selected ? theme.palette.primary.main : theme.palette.grey[100],
  // border: `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: 999,
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 13,
  fontWeight: 500,
  color: selected ? theme.palette.primary.contrastText : theme.palette.text.primary,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  whiteSpace: 'nowrap',
  textAlign: 'center',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));


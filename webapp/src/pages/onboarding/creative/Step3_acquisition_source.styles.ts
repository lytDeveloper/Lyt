import { Box, styled } from '@mui/material';
import { COLORS } from '../../../styles/onboarding/common.styles';

// 옵션 리스트 컨테이너
export const OptionList = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.2),
  marginTop: theme.spacing(3),
}));

// 라디오 버튼 옵션 아이템
export const RadioOptionItem = styled(Box)<{ selected?: boolean }>(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2),
  borderRadius: '12px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
}));

// 라디오 버튼
export const RadioButton = styled(Box)<{ checked?: boolean }>(({ checked }) => ({
  width: 24,
  height: 24,
  borderRadius: '50%',
  border: `2px solid ${checked ? COLORS.CTA_BLUE : '#D1D5DB'}`,
  backgroundColor: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  position: 'relative',
  '&::after': {
    content: '""',
    display: checked ? 'block' : 'none',
    width: 12,
    height: 12,
    borderRadius: '50%',
    backgroundColor: COLORS.CTA_BLUE,
  },
}));

// 라벨
export const OptionLabel = styled(Box)({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 16,
  fontWeight: 500,
  color: COLORS.TEXT_PRIMARY,
  flex: 1,
  marginLeft: '12px',
});

// 기타 입력 필드 컨테이너
export const OtherInputContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
  paddingLeft: theme.spacing(1),
}));

// 기타 입력 필드
export const OtherInput = styled('input')(({ theme }) => ({
  width: '100%',
  padding: theme.spacing(1.5),
  borderRadius: '8px',
  border: `1px solid ${COLORS.BORDER_DEFAULT}`,
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 14,
  color: COLORS.TEXT_PRIMARY,
  outline: 'none',
  '&:focus': {
    borderColor: COLORS.CTA_BLUE,
  },
  '&::placeholder': {
    color: COLORS.TEXT_SECONDARY,
  },
}));


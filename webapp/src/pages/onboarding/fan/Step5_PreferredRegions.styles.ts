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
  marginBottom: theme.spacing(3),
  [theme.breakpoints.up('sm')]: {
    fontSize: 14,
  },
}));

// 섹션 라벨
export const SectionLabel = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 'clamp(14px, 4vw, 16px)',
  lineHeight: 1.4,
  fontWeight: 600,
  color: theme.palette.subText.default,
  marginBottom: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    fontSize: 16,
  },
}));

// 지역 그리드
export const LocationGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(2),
  paddingLeft: theme.spacing(1),
}));

// 지역 버튼 (Chip 형태)
export const LocationButton = styled(Box)<{ selected?: boolean }>(({ theme, selected }) => ({
  padding: theme.spacing(1, 1.5),
  backgroundColor: selected ? theme.palette.primary.main : theme.palette.grey[100],
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

// 추천 섹션
export const RecommendSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1.5),
  marginBottom: theme.spacing(3),
}));

// 추천 아이템
export const RecommendItem = styled(Box)<{ selected?: boolean }>(({ theme, selected }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  padding: theme.spacing(2),
  backgroundColor: selected ? COLORS.CARD_SELECTED_BG : COLORS.INPUT_BG,
  borderRadius: '12px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
}));

// 체크박스 래퍼 (라디오 버튼 스타일)
export const CheckboxWrapper = styled(Box)<{ selected?: boolean }>(({ selected }) => ({
  width: 20,
  height: 20,
  borderRadius: '50%',
  border: `2px solid ${selected ? COLORS.CTA_BLUE : '#D1D5DB'}`,
  backgroundColor: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  position: 'relative',
  transition: 'all 0.2s ease',

  // 내부 원 (선택 시 표시)
  '&::after': {
    content: '""',
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: COLORS.CTA_BLUE,
    opacity: selected ? 1 : 0,
    transform: selected ? 'scale(1)' : 'scale(0)',
    transition: 'all 0.2s ease-in-out',
  },
}));

// 체크 아이콘 (삭제됨 - 라디오 버튼 스타일로 변경되면서 사용하지 않음)
// export const CheckIcon = styled('span')({ ... });

// 추천 라벨
export const RecommendLabel = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 'clamp(14px, 4vw, 16px)',
  lineHeight: 1.4,
  fontWeight: 500,
  color: COLORS.TEXT_PRIMARY,
  [theme.breakpoints.up('sm')]: {
    fontSize: 15,
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
  marginTop: theme.spacing(3),
  [theme.breakpoints.up('sm')]: {
    fontSize: 14,
  },
}));

export const InfoTextBold = styled('span')(({ theme }) => ({
  fontWeight: 500,
  color: theme.palette.text.primary,
  fontSize: 'clamp(16px, 3.5vw, 18px)',
}));

export const WarningIcon = styled('span')({
  fontSize: 24,
});


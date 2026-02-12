import { Box, Button, Typography, TextField, Select } from '@mui/material';
import { styled, alpha } from '@mui/material/styles';

/**
 * Shared styled components for onboarding pages
 * These components are used across multiple onboarding steps
 * to ensure consistent styling and reduce code duplication
 *
 * Now uses MUI theme system for proper light/dark mode support
 */

// 공통 디자인 토큰
// Note: COLORS는 하위 호환성을 위해 유지하지만, 새 코드는 theme.palette를 직접 사용하세요
export const COLORS = {
  BG: '#f2f2f2',
  CARD_BG: '#ffffff',
  INPUT_BG: '#ffffff',
  TEXT_PRIMARY: '#000000',
  TEXT_SECONDARY: '#949196',
  PLACEHOLDER: '#949196',
  CTA_BLUE: '#2563eb',
  BORDER_DEFAULT: '#E5E7EB',
  CLOSE_BUTTON: '#6B7280',
  CARD_SELECTED_BG: '#F3F4F6',
} as const;

export const CARD_RADIUS = '50px';

// 페이지 메인 컨테이너
export const PageContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.default,
}));

// 닫기 버튼
export const CloseButton = styled(Box)(({ theme }) => ({
  width: 40,
  height: 40,
  borderRadius: '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.text.secondary,
  cursor: 'pointer',
  fontSize: 28,
  marginBottom: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    marginBottom: theme.spacing(3),
  },
}));

// 중앙 콘텐츠 영역 (flex: 1로 상하 공간을 차지)
export const ContentContainer = styled(Box)({
  flex: '1 1 auto',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start', // space-evenly에서 변경하여 상단 정렬하고 버튼을 하단으로 밀어냄
});

// 타이틀 섹션 컨테이너
export const TitleSection = styled(Box)(({ theme }) => ({
  color: theme.palette.subText.default,
  fontSize: 'clamp(14px, 5vw, 16px)',
  fontWeight: 600,
  marginBottom: theme.spacing(1),
}));

// 입력 필드 래퍼
export const InputWrapper = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: '100%',
  margin: '0 auto',
  marginBottom: theme.spacing(5),
}));

// 하단 버튼 컨테이너
export const ButtonContainer = styled(Box)(({ theme }) => ({
  marginTop: 'auto', // 항상 하단에 고정되도록 auto 설정
  paddingTop: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    paddingTop: theme.spacing(3),
  },
}));

// 버튼 래퍼 (최대 너비 제한)
export const ButtonWrapper = styled(Box)(({ theme }) => ({
  maxWidth: '100%',
  margin: '0 auto',
  [theme.breakpoints.up('sm')]: {
    maxWidth: 360,
  },
  [theme.breakpoints.up('md')]: {
    maxWidth: 400,
  },
}));

// 확인 버튼 (CTA)
export const ConfirmButton = styled(Button)(({ theme }) => ({
  height: 52,
  borderRadius: '100px',
  textTransform: 'none',
  fontSize: 17,
  lineHeight: 1.5,
  fontWeight: 400,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  '&.Mui-disabled': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    opacity: 0.5,
  },
  [theme.breakpoints.up('sm')]: {
    height: 50,
    fontSize: 16,
  },
}));

// 모달 뒷배경 (어둡게 처리)
export const Backdrop = styled('div')(
  ({ theme }) => `
  position: fixed;
  inset: 0;
  background-color: ${alpha(theme.palette.common.black, 0.5)};
  z-index: 1300; // MUI Modal 기본 z-index
`,
);

// 하단 팝업(시트) 컨테이너
export const AgreementSheetContainer = styled(Box)(
  ({ theme }) => `
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: ${theme.palette.background.paper};
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  padding: ${theme.spacing(3)};
  padding-bottom: ${theme.spacing(5)}; // 하단 여백 추가
  box-shadow: ${theme.shadows[5]};
  z-index: 1301;
`,
);

// 약관 동의 각 행
export const AgreementRow = styled(Box)(
  ({ theme }) => `
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing(1.5)} 0;
  cursor: pointer;
`,
);

// 약관 동의 텍스트 래퍼
export const AgreementTextWrapper = styled(Box)`
  display: flex;
  flex-direction: column;
  margin-left: 8px;
`;

// 메인 타이틀 (Pretendard)
export const Title = styled(Box)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 'clamp(16px, 5vw, 18px)',
  lineHeight: 1.4,
  fontWeight: 500,
  color: theme.palette.subText.default,
  marginBottom: theme.spacing(2),
  textAlign: 'left',
  [theme.breakpoints.up('sm')]: {
    fontSize: 18,
  },
  [theme.breakpoints.up('md')]: {
    fontSize: 24,
  },
}));

// 공통 TextField
export const StyledTextField = styled(TextField)(({ theme }) => ({
  width: '100%',
  '& .MuiOutlinedInput-root': {
    backgroundColor: theme.palette.background.paper,
    borderRadius: '12px',
    fontFamily: 'Pretendard, sans-serif',
    fontSize: 15,
    [theme.breakpoints.up('sm')]: {
      fontSize: 15,
    },
    '& fieldset': {
      borderColor: theme.palette.divider,
      borderWidth: '1px',
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
      borderWidth: '2px',
    },
  },
  '& .MuiOutlinedInput-input': {
    padding: '16px 18px',
    color: theme.palette.text.primary,
    '&::placeholder': {
      color: theme.palette.text.secondary,
      opacity: 1,
    },
  },
}));

// 공통 Select
export const StyledSelect = styled(Select)(({ theme }) => ({
  width: '100%',
  backgroundColor: theme.palette.background.paper,
  borderRadius: '12px',
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 14,
  fontWeight: 300,
  wordBreak: 'keep-all',
  whiteSpace: 'pre-wrap',
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.divider,
    borderWidth: '1px',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.primary.main,
    borderWidth: '2px',
  },
  '& .MuiSelect-select': {
    padding: '14px 16px',
    color: theme.palette.text.primary,
  },
  '& .MuiSelect-icon': {
    color: theme.palette.text.secondary,
  },
  [theme.breakpoints.up('sm')]: {
    fontSize: 14,
  },
}));

// 스크롤 가능한 폼 컨테이너 (여러 스텝 동일)
export const ScrollableForm = styled(Box)({
  flex: '1 1 auto',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
});

// 공통 캔버스 계열 (Step3_Images 기준 공통화)
export const CanvasWrapper = styled(Box)({
  position: 'relative',
  width: '100%',
  maxWidth: 340,
  margin: '0 auto',
});

export const Canvas = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  aspectRatio: '1 / 1',
  borderRadius: CARD_RADIUS,
  overflow: 'hidden',
  backgroundColor: theme.palette.background.default,
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  cursor: 'pointer',
}));

export const UploadBadge = styled(Box)(({ theme }) => ({
  position: 'absolute',
  left: 16,
  bottom: -32,
  width: 80,
  height: 80,
  borderRadius: '50%',
  backgroundColor: '#E9E9ED',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.text.secondary,
  fontSize: 12,
  cursor: 'pointer',
  border: `1px solid ${theme.palette.divider}`,
  overflow: 'hidden',
  zIndex: 1,
}));

// Page Title
export const PageTitle = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 'clamp(16px, 5vw, 18px)',
  lineHeight: 1.4,
  fontWeight: 500,
  color: theme.palette.subText?.default,
  marginBottom: theme.spacing(1),
  [theme.breakpoints.up('sm')]: {
    fontSize: 18,
  },
  [theme.breakpoints.up('md')]: {
    fontSize: 20,
  },
}));

// Page Subtitle
export const PageSubtitle = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 'clamp(12px, 3.5vw, 14px)',
  lineHeight: 1.5,
  fontWeight: 400,
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(4),
  [theme.breakpoints.up('sm')]: {
    fontSize: 14,
  },
  wordBreak: 'keep-all',
}));

// Form Section Container
export const FormSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  [theme.breakpoints.up('sm')]: {
    marginBottom: theme.spacing(4.5),
  },
}));

// Section Label (for form subsections)
export const SectionLabel = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 'clamp(18px, 5vw, 22px)',
  lineHeight: 1.4,
  fontWeight: 600,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(1.5),
  [theme.breakpoints.up('sm')]: {
    fontSize: 20,
  },
  [theme.breakpoints.up('md')]: {
    fontSize: 22,
  },
}));

// SubLabel (helper text, instructions)
export const SubLabel = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 'clamp(11px, 3vw, 13px)',
  lineHeight: 1.4,
  fontWeight: 400,
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
  [theme.breakpoints.up('sm')]: {
    fontSize: 12,
  },
}));

// Footnote (small text below sections)
export const Footnote = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 'clamp(12px, 3vw, 14px)',
  lineHeight: 1.5,
  fontWeight: 400,
  color: theme.palette.text.secondary,
  textAlign: 'center',
  marginTop: 0,
  marginBottom: theme.spacing(0.5),
  [theme.breakpoints.up('sm')]: {
    fontSize: 14,
  },
}));

// Label Row (for displaying name and category below canvas)
export const LabelRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 2,
  marginTop: theme.spacing(0),
  marginLeft: '100px',
}));

// Small Label
export const SmallLabel = styled(Typography)({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 12,
  fontWeight: 600,
});

// Small Emphasis (colored text)
export const SmallEm = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 12,
  color: theme.palette.primary.main,
  fontWeight: 600,
}));

// Welcome Message (used in complete pages)
export const WelcomeMessage = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 'clamp(16px, 4.5vw, 20px)',
  lineHeight: 1.6,
  fontWeight: 600,
  color: theme.palette.text.primary,
  textAlign: 'center',
  marginBottom: theme.spacing(3),
  [theme.breakpoints.up('sm')]: {
    fontSize: 18,
  },
  [theme.breakpoints.up('md')]: {
    fontSize: 20,
  },
}));



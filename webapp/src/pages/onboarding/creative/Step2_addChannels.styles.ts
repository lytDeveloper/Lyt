import { Box, styled } from '@mui/material';
import { COLORS } from '../../../styles/onboarding/common.styles';

// 채널 리스트 컨테이너
export const ChannelListContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(3),
}));

// 채널 추가 버튼
export const AddChannelButton = styled(Box)(({ theme }) => ({
  width: '100%',
  padding: theme.spacing(1.4),
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(4),
  borderRadius: '20px',
  backgroundColor: theme.palette.grey[100],
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 16,
  fontWeight: 600,
  color: theme.palette.text.primary,
  transition: 'all 0.2s ease',
}));

// 설명 텍스트
export const DescriptionText = styled(Box)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 14,
  lineHeight: 1.6,
  color: COLORS.TEXT_SECONDARY,
  marginBottom: theme.spacing(3),
}));

// 모달 타이틀
export const ModalTitle = styled(Box)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 18,
  fontWeight: 600,
  color: COLORS.TEXT_PRIMARY,
  marginBottom: theme.spacing(3),
}));

// SNS 채널 옵션 리스트
export const ChannelOptionList = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));

// SNS 채널 옵션 아이템
export const ChannelOptionItem = styled(Box)<{ selected?: boolean }>(({ theme, selected }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingTop: theme.spacing(1.2),
  paddingBottom: theme.spacing(1.2),
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  borderRadius: '20px',
  borderBottomLeftRadius: selected ? '0px' : '20px',
  borderBottomRightRadius: selected ? '0px' : '20px',
  backgroundColor: theme.palette.grey[100],
  // border: `1px solid ${selected ? COLORS.CTA_BLUE : COLORS.BORDER_DEFAULT}`,
  borderBottom: selected ? 'none' : `1px solid ${COLORS.BORDER_DEFAULT}`,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
}));

// SNS 아이콘과 이름 컨테이너
export const ChannelInfo = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
});

// SNS 아이콘
export const ChannelIcon = styled(Box)<{ $bgColor: string }>(({ $bgColor }) => ({
  width: 36,
  height: 36,
  borderRadius: '8px',
  backgroundColor: $bgColor,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}));

// SNS 이름
export const ChannelName = styled(Box)({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 16,
  fontWeight: 500,
  color: COLORS.TEXT_PRIMARY,
});

// 체크 아이콘 (라디오 버튼 스타일)
export const CheckIcon = styled(Box)<{ checked?: boolean }>(({ checked }) => ({
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

  // 내부 원 (선택 시 표시)
  '&::after': {
    content: '""',
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: '50%',
    backgroundColor: COLORS.CTA_BLUE,
    opacity: checked ? 1 : 0,
    transform: checked ? 'scale(1)' : 'scale(0)',
    transition: 'all 0.2s ease-in-out',
  },
}));

// 선택된 채널 카드
export const SelectedChannelCard = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: '12px',
  // border: `1px solid ${COLORS.BORDER_DEFAULT}`,
  backgroundColor: theme.palette.grey[100],
}));

// 채널 헤더 (아이콘 + 이름 + 삭제 버튼)
export const ChannelHeader = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '12px',
});

// 삭제 버튼
export const DeleteButton = styled(Box)(({ theme }) => ({
  width: 36,
  height: 36,
  fontSize: 22,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  borderRadius: '50%',
  color: theme.palette.subText.default,
}));

// URL 입력 필드 컨테이너
export const UrlInputContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(1.5),
}));

// URL 입력 필드
export const UrlInput = styled('input')(({ theme }) => ({
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

// URL 프리픽스 (삭제 불가능한 도메인)
export const UrlPrefix = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  width: '100%',
  padding: theme.spacing(1.5),
  borderRadius: '8px',
  backgroundColor: theme.palette.background.default,
  marginBottom: theme.spacing(1),
  overflow: 'hidden',
  gap: '2px',
}));

export const PrefixText = styled('span')({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 14,
  color: COLORS.TEXT_PRIMARY,
  flexShrink: 1,
});

export const UrlSuffixInput = styled('input')({
  flex: 1,
  border: 'none',
  outline: 'none',
  backgroundColor: 'transparent',
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 14,
  color: COLORS.TEXT_SECONDARY,
  '&::placeholder': {
    color: COLORS.TEXT_SECONDARY,
  },
  minWidth: 0,
  wordBreak: 'break-all',
});

// 확장 영역 컨테이너
export const ExpandedSection = styled(Box)(({ theme }) => ({
  marginTop: 0,
  marginBottom: theme.spacing(2),
  padding: theme.spacing(1.5),
  // border: `1px solid ${COLORS.CTA_BLUE}`,
  borderTop: 'none',
  borderBottomLeftRadius: '12px',
  borderBottomRightRadius: '12px',
  backgroundColor: theme.palette.grey[100],
}));

// 메인 채널 체크박스 컨테이너
export const MainChannelCheckbox = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  cursor: 'pointer',
  marginTop: '8px',
});

// 체크박스 (라디오 버튼 스타일)
export const Checkbox = styled(Box)<{ checked?: boolean }>(({ checked }) => ({
  width: 16,
  height: 16,
  borderRadius: '50%',
  border: `2px solid ${checked ? COLORS.CTA_BLUE : '#D1D5DB'}`,
  backgroundColor: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  position: 'relative',

  // 내부 원 (선택 시 표시)
  '&::after': {
    content: '""',
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: COLORS.CTA_BLUE,
    opacity: checked ? 1 : 0,
    transform: checked ? 'scale(1)' : 'scale(0)',
    transition: 'all 0.2s ease-in-out',
  },
}));

// 체크박스 라벨
export const CheckboxLabel = styled(Box)({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 14,
  color: COLORS.TEXT_PRIMARY,
});

// 성공 메시지
export const SuccessMessage = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: theme.spacing(1),
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 12,
  color: '#10b981',
  marginTop: theme.spacing(0.5),
}));


import { styled, keyframes } from '@mui/material/styles';
import { Box } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';

// 애니메이션 정의
const scaleUp = keyframes`
  0% {
    transform: scale(0);
    opacity: 0;
  }
  60% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

const checkAppear = keyframes`
  0% {
    opacity: 0;
    transform: translateY(10px) scale(0.5);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

// 체크 아이콘 컨테이너
export const CheckIconContainer = styled(Box)(({ theme }) => ({
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  backgroundColor: theme.palette.status.blue,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto',
  animation: `${scaleUp} 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards`,
}),
);

// 체크 아이콘
export const CheckIcon = styled(CheckRoundedIcon)({
  fontSize: 40,
  color: '#FFFFFF',
  opacity: 0, // 초기 상태 투명
  animation: `${checkAppear} 0.4s ease-out forwards`,
  animationDelay: '0.4s', // 배경 애니메이션이 어느 정도 진행된 후 시작
});

// 완료 메시지
export const CompleteMessage = styled('div')({
  fontSize: '20px',
  fontWeight: 600,
  color: '#000000',
  textAlign: 'center',
  lineHeight: 1.5,
  marginTop: '24px',
});

// 경고 텍스트
export const WarningText = styled('div')({
  fontSize: '13px',
  fontWeight: 400,
  color: '#666666',
  textAlign: 'center',
  lineHeight: 1.5,
  marginTop: '40px',
});


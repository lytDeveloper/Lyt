import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthContext.tsx'; // AuthProvider 경로
import { Box, Typography, useTheme } from '@mui/material';
import { CheckIconContainer, CheckIcon } from '../../pages/onboarding/creative/Step4_Complete.styles';

export default function Welcome() {
  const navigate = useNavigate();
  const { profile } = useAuth(); // AuthProvider에서 프로필(닉네임) 정보 가져오기

  const nickname = profile?.nickname || '사용자'; // 닉네임이 없을 경우 대비

  // 2.5초 후에 다음 온보딩 단계로 자동 이동
  useEffect(() => {
    // 이 화면에 진입했으면 플래그 제거 (재방문 시에는 홈 흐름 유지)
    try {
      sessionStorage.removeItem('justCreatedNickname');
    } catch (e) { void e; }

    const timer = setTimeout(() => {
      navigate('/home', { replace: true }); // 홈으로 이동 (온보딩 히스토리 제거)
    }, 2500); // 2.5초

    return () => clearTimeout(timer); // 컴포넌트 언마운트 시 타이머 제거
  }, [navigate]);

  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
        textAlign: 'center',
        paddingTop: '24px',
        paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
        paddingLeft: '24px',
        paddingRight: '24px',
      }}
    >
      {/* 체크 아이콘 */}
      <Box sx={{ mb: 6 }}>
        <CheckIconContainer>
          <CheckIcon>✓</CheckIcon>
        </CheckIconContainer>
      </Box>

      {/* 환영 메시지 */}
      <Typography variant="h5" component="p" sx={{ fontWeight: 'bold' }}>
        {nickname} 님,
      </Typography>
      <Typography variant="h5" component="p">
        라잇에
      </Typography>
      <Typography variant="h5" component="p">
        오신 것을 환영합니다.
      </Typography>
    </Box>
  );
}

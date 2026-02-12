import './App.css'
import { Button, SvgIcon } from '@mui/material'
import background from './assets/splash.png'
import { supabase } from './lib/supabase.ts'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SignupInquiryModal from './components/common/SignupInquiryModal'
import ActionSuccessModal from './components/notification/ActionSuccessModal'

// Google 아이콘 SVG (인라인)
const GoogleIcon = (props: React.ComponentProps<typeof SvgIcon>) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </SvgIcon>
);

// Apple 아이콘 SVG (인라인, 흰색)
const AppleIcon = (props: React.ComponentProps<typeof SvgIcon>) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path
      fill="white"
      d="M12.01,16.06c-1.23,0-2.25-1.01-2.25-2.25s1.01-2.25,2.25-2.25s2.25,1.01,2.25,2.25S13.24,16.06,12.01,16.06z M19.4,18.5 c-0.12,0.67-0.5,1.29-1.07,1.83c-0.78,0.73-1.68,1.38-2.71,1.39c-1,0.01-1.31-0.61-2.62-0.61s-1.63,0.6-2.62,0.61 c-1.06,0-2-0.68-2.8-1.42c-1.12-1.02-1.8-2.5-1.8-4.18c0-2.61,1.54-3.84,3.02-3.84c0.98,0,1.82,0.63,2.44,0.63 c0.59,0,1.64-0.68,2.7-0.68c1.39,0,2.83,1.21,2.83,3.75C19.8,16.66,19.64,17.65,19.4,18.5z M17.06,8.23 c0.67-0.79,1.08-1.86,1.08-2.99c0-0.07-0.01-0.14-0.01-0.21C16.97,5.03,15.93,4.42,15.1,4.4c-0.89-0.02-1.92,0.56-2.58,1.34 c-0.62,0.73-1.13,1.8-1.13,2.89c0,0.1,0.01,0.2,0.02,0.29C12.59,8.96,13.65,9.59,14.5,9.61C15.42,9.63,16.42,9,17.06,8.23z"
    />
  </SvgIcon>
);

function App() {
  const navigate = useNavigate();

  // 로그인 페이지 진입 시 이전 세션 정리
  const [isInquiryOpen, setIsInquiryOpen] = useState(false)
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  // 세션 정리가 완료되었는지 추적 (둘러보기 클릭 시 race condition 방지)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    const clearOldSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('세션 확인 오류:', error);
          // 에러가 있어도 준비 완료 처리
          setSessionReady(true);
        } else if (data.session) {
          console.log('기존 세션 발견, 로그아웃 처리:', data.session.user.id);

          // 이전 세션 로그아웃
          await supabase.auth.signOut();
          console.log('✅ 이전 세션 로그아웃 완료');

          // localStorage 클리어 (Supabase 관련 모든 키)
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-')) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => localStorage.removeItem(key));
          console.log('✅ localStorage 정리 완료:', keysToRemove);

          // 세션 정리 완료
          setSessionReady(true);
        } else {
          console.log('기존 세션 없음 - 로그인 페이지 준비 완료');
          // 세션이 이미 없으므로 즉시 준비 완료
          setSessionReady(true);
        }
      } catch (error) {
        console.error('세션 정리 오류:', error);
        // 에러가 있어도 준비 완료 처리 (사용자가 둘러보기를 할 수 있도록)
        setSessionReady(true);
      }
    };

    clearOldSession();
  }, []);

  const handleHelpClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setIsInquiryOpen(true);
  };

  const handleGoogleLogin = async () => {
    console.log('Google 로그인 클릭');
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
      console.log('Google 로그인 성공:', data);
    } catch (error) {
      console.error('Google 로그인 에러:', error);
    }
  };

  const handleAppleLogin = async () => {
    console.log('Apple 로그인 클릭');
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      console.log('Apple 로그인 성공:', data);
    } catch (error) {
      console.error('Apple 로그인 에러:', error);
    }
  };

  const handleBrowseClick = () => {
    // 세션 정리가 완료된 경우 바로 네비게이션
    if (sessionReady) {
      navigate('/home', { replace: true });
    } else {
      // 아직 세션 정리 중이면 잠시 후 네비게이션 (race condition 방지)
      console.log('⏳ 세션 정리 대기 중...');
      const checkAndNavigate = () => {
        // 100ms 후 네비게이션 (세션 정리가 완료되었을 것으로 예상)
        setTimeout(() => {
          navigate('/home', { replace: true });
        }, 100);
      };
      checkAndNavigate();
    }
  };

  return (
    <div className="app">
      {/* Main Content */}
      <div className="main-content">
        {/* Background Image with Overlay */}
        <div className="background-container">
          <img
            src={background}
            alt="background"
            className="bg-img"
          />
        </div>
        {/* Login Buttons */}
        <div className="login-section">
          {/* Google 로그인 버튼 */}
          <Button
            variant="contained"
            fullWidth
            onClick={handleGoogleLogin}
            sx={{
              backgroundColor: 'white',
              color: 'black',
              height: 52,
              borderRadius: '26px',
              textTransform: 'none',
              fontWeight: 'bold',
              fontSize: '16px',
            }}
            startIcon={<GoogleIcon />}
          >
            Google로 계속하기
          </Button>

          {/* Apple 로그인 버튼 */}
          <Button
            variant="contained"
            fullWidth
            onClick={handleAppleLogin}
            sx={{
              backgroundColor: 'black',
              color: 'white',
              height: 52,
              borderRadius: '26px',
              textTransform: 'none',
              fontWeight: 'bold',
              fontSize: '16px',
              border: '1px solid white',
              mt: 2, // 버튼 사이 간격
            }}
            startIcon={<AppleIcon />}
          >
            Apple로 계속하기
          </Button>

          {/* Browse without login */}
          <Button
            variant="outlined"
            onClick={handleBrowseClick}
            sx={{
              display: 'block',
              width: 120,
              mx: 'auto',
              mt: 2,
              height: 48,
              borderRadius: '24px',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '15px',
              color: '#111827',
              borderColor: '#D1D5DB',
              backgroundColor: '#F9FAFB',
              '&:hover': {
                backgroundColor: '#F3F4F6',
                borderColor: '#9CA3AF',
              },
            }}
          >
            둘러보기
          </Button>
        </div>

        {/* Help Link */}
        <div className="help-section">
          <span>가입하는데 문제가 있나요? </span>
          <a href="#" className="help-link" onClick={handleHelpClick}>문의하기</a>
        </div>

      </div>
      {/* Signup Inquiry Modal */}
      <SignupInquiryModal
        open={isInquiryOpen}
        onClose={() => setIsInquiryOpen(false)}
        onSubmitted={() => {
          setIsInquiryOpen(false);
          setIsSuccessOpen(true);
        }}
      />

      {/* Success Modal */}
      <ActionSuccessModal
        open={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        message={'문의 제출 완료!\n영업일 기준 1-2일 내에 답변드릴게요.'}
      />
    </div>
  )

  // Modal is outside of main return to keep type checker happy
}

export default App

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingIndicator } from './Guards.tsx';
import { useAuth } from '../providers/AuthContext.tsx';
import { supabase } from '../lib/supabase';
import { loginStreakService } from '../services/loginStreakService';
import { badgeAutoGrantService } from '../services/badgeAutoGrantService';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const hasProcessedLoginRef = useRef(false);

  useEffect(() => {
    const handleSessionFromUrl = async () => {
      // URL에 access_token이나 code가 존재하는 경우에만 처리
      const hasHashParams = typeof window !== 'undefined' && window.location.hash.includes('access_token');
      const hasCodeParam = typeof window !== 'undefined' && window.location.search.includes('code=');

      if (!hasHashParams && !hasCodeParam) {
        return;
      }

      try {
        if (hasCodeParam) {
          console.log('AuthCallback: detected auth code in URL, exchanging for session');
          const url = new URL(window.location.href);
          const code = url.searchParams.get('code');
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              console.error('AuthCallback: failed to exchange code for session:', error);
            }
            // code 파라미터 제거
            url.searchParams.delete('code');
            window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
          }
        } else if (hasHashParams) {
          console.log('AuthCallback: detected implicit flow params, storing session from URL');
          const rawHash = window.location.hash;
          const hash = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;
          const params = new URLSearchParams(hash);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          // refresh_token 유효성 검증 (최소 20자 이상이어야 유효한 토큰)
          const isValidRefreshToken = refreshToken && refreshToken.length > 20;

          console.log('AuthCallback: hash params detected', {
            hasAccessToken: Boolean(accessToken),
            hasRefreshToken: Boolean(refreshToken),
            isValidRefreshToken,
            refreshTokenLength: refreshToken?.length,
            rawHash: rawHash.slice(0, 80) + (rawHash.length > 80 ? '...' : ''),
          });

          if (params.get('error')) {
            console.error('AuthCallback: received error from Supabase callback:', {
              error: params.get('error'),
              description: params.get('error_description'),
            });
          }

          if (accessToken && isValidRefreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('AuthCallback: failed to set session from URL params:', error);
              alert('로그인 처리 중 오류가 발생했어요. 다시 시도해주세요.');
              navigate('/login', { replace: true });
            } else {
              console.log('AuthCallback: session set successfully, waiting for onAuthStateChange event', {
                userId: data.session?.user?.id,
                expiresAt: data.session?.expires_at,
              });

              // onAuthStateChange 이벤트가 발생하여 AuthProvider가 세션을 감지할 것임
              // 수동 확인 루프 제거 - 이벤트 기반으로 처리
            }

            // setSession 완료 후 해시 제거
            const url = new URL(window.location.href);
            url.hash = '';
            window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
          } else if (accessToken && !isValidRefreshToken) {
            // refresh_token이 없거나 유효하지 않지만 access_token은 있는 경우
            console.warn('AuthCallback: invalid or missing refresh_token, attempting to use access_token only');

            try {
              // Supabase의 getUser로 access_token 검증
              const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);

              if (userError || !user) {
                console.error('AuthCallback: access_token validation failed:', userError);
                alert('로그인 토큰이 유효하지 않아요. 다시 시도해주세요.');
                navigate('/login', { replace: true });
              } else {
                console.log('AuthCallback: access_token validated, user:', user.id);

                // 수동으로 세션 설정 (localStorage에 직접 저장)
                const session = {
                  access_token: accessToken,
                  token_type: 'bearer',
                  expires_in: parseInt(params.get('expires_in') || '3600'),
                  expires_at: parseInt(params.get('expires_at') || String(Math.floor(Date.now() / 1000) + 3600)),
                  refresh_token: '', // refresh_token 없이
                  user,
                };

                // Supabase 클라이언트에 세션 설정 (refresh_token 없이도 시도)
                const { error: setError } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: '', // 빈 문자열로 시도
                });

                if (setError) {
                  console.error('AuthCallback: setSession without refresh_token failed:', setError);

                  // Supabase URL에서 프로젝트 ID 추출
                  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
                  const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

                  if (projectId) {
                    // 수동으로 localStorage에 저장
                    const storageKey = `sb-${projectId}-auth-token`;
                    localStorage.setItem(storageKey, JSON.stringify(session));
                    console.log(`AuthCallback: session saved to localStorage manually (key: ${storageKey})`);
                  } else {
                    console.error('AuthCallback: could not extract project ID from Supabase URL');
                  }
                }

                // 해시 제거
                const url = new URL(window.location.href);
                url.hash = '';
                window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);

                // 강제로 페이지 새로고침하여 AuthProvider가 세션을 다시 읽도록 함
                window.location.reload();
              }
            } catch (err) {
              console.error('AuthCallback: error handling access_token only flow:', err);
              alert('로그인 처리 중 오류가 발생했어요. 다시 시도해주세요.');
              navigate('/login', { replace: true });
            }
          } else {
            console.warn('AuthCallback: missing access_token in URL hash');
            alert('로그인 정보를 찾을 수 없어요. 다시 시도해주세요.');
            navigate('/login', { replace: true });
          }
        }
      } catch (err) {
        console.error('AuthCallback: unexpected error while processing callback URL:', err);
      }
    };

    void handleSessionFromUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // 세션이 생성되면 로그인 스트릭 업데이트 및 배지 부여 후 루트로 이동
    if (session && !hasProcessedLoginRef.current) {
      hasProcessedLoginRef.current = true;
      const userId = session.user?.id;

      console.log('AuthCallback: session detected via onAuthStateChange, processing login activities');

      // 로그인 스트릭 업데이트 및 연결고리 배지 부여 (비동기, 에러 무시)
      if (userId) {
        Promise.all([
          loginStreakService.updateStreak(userId).catch((err) => {
            console.warn('AuthCallback: failed to update login streak:', err);
          }),
          badgeAutoGrantService.checkConnectorBadge(userId).catch((err) => {
            console.warn('AuthCallback: failed to check connector badge:', err);
          }),
        ]).finally(() => {
          console.log('AuthCallback: login activities processed, navigating to home');
          navigate('/', { replace: true });
        });
      } else {
        navigate('/', { replace: true });
      }
      return;
    } else if (session) {
      // 이미 처리된 경우 바로 이동
      navigate('/', { replace: true });
      return;
    }

    // 안전 타임아웃: 10초 (이벤트 기반이므로 더 짧게)
    const timer = setTimeout(() => {
      if (!session) {
        console.error('AuthCallback: timeout - session not received from onAuthStateChange event');
        alert('로그인 처리 시간이 초과되었어요. 다시 시도해주세요.');
        navigate('/login', { replace: true });
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [session, navigate]);

  // 로딩 중에는 스피너 유지
  if (loading || !session) {
    return <LoadingIndicator />;
  }
  return null;
}



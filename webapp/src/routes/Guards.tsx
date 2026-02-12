import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { useAuth } from '../providers/AuthContext.tsx';
import { LightningLoader } from '../components/common';

export function LoadingIndicator() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <LightningLoader />
    </Box>
  );
}

function ProfileErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 2,
        height: '100vh',
        textAlign: 'center',
        px: 2,
      }}
    >
      <Typography variant="h6">프로필 정보를 불러오지 못했어요.</Typography>
      <Typography variant="body2" color="text.secondary">
        네트워크 상태를 확인한 뒤 다시 시도해주세요.
      </Typography>
      <Button variant="contained" onClick={onRetry}>
        다시 시도
      </Button>
    </Box>
  );
}

export function RootRedirect() {
  const { session, profile, loading, profileStatus, refetchProfile } = useAuth();
  const [consentChecked, setConsentChecked] = useState(false);
  const [hasConsented, setHasConsented] = useState<boolean | null>(null);
  const isProfilePending = profileStatus === 'idle' || profileStatus === 'loading';
  const shouldShowErrorFallback = profileStatus === 'error' && !profile;

  // 동의 여부 확인 (AuthProvider의 profile에서 직접 가져옴)
  useEffect(() => {
    if (!session) {
      setConsentChecked(true);
      setHasConsented(null);
      return;
    }

    if (profile) {
      setHasConsented(profile.terms_agreed_at !== null);
      setConsentChecked(true);
    } else if (profileStatus === 'not_found') {
      // 프로필이 없는 경우 (신규 사용자)
      setHasConsented(null);
      setConsentChecked(true);
    }
  }, [session, profile, profileStatus]);

  if (loading || isProfilePending || !consentChecked) return <LoadingIndicator />;
  if (shouldShowErrorFallback) {
    return <ProfileErrorFallback onRetry={refetchProfile} />;
  }

  if (!session) {
    // 1. 로그인 안 됨 -> /login
    return <Navigate to="/login" replace />;
  }

  // 동의하지 않은 경우 동의 페이지로 리다이렉트
  if (hasConsented === false) {
    return <Navigate to="/onboarding/consent" replace />;
  }

  // 닉네임 확인 (role은 customer로 자동 설정되며 /onboarding/profile은 선택사항)
  if (profile && profile.nickname === null) {
    return <Navigate to="/onboarding/nickname" replace />;
  }

  if (profileStatus === 'not_found') {
    // 프로필이 없으면 닉네임 생성부터 시작
    return <Navigate to="/onboarding/nickname" replace />;
  }

  // 3. 로그인 O, 닉네임 O -> /home
  return <Navigate to="/home" replace />;
}

export function OptionalAuthRoute({ children }: { children: React.ReactElement }) {
  const { session, profile, loading, profileStatus, refetchProfile } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const [consentChecked, setConsentChecked] = useState(false);
  const [hasConsented, setHasConsented] = useState<boolean | null>(null);
  const [consentTimeout, setConsentTimeout] = useState(false);
  const isProfilePending = profileStatus === 'idle' || profileStatus === 'loading';
  const shouldShowErrorFallback = profileStatus === 'error' && !profile;

  useEffect(() => {
    if (!session) {
      setConsentChecked(true);
      setHasConsented(null);
      return;
    }

    if (profile) {
      setHasConsented(profile.terms_agreed_at !== null);
      setConsentChecked(true);
    } else if (profileStatus === 'not_found') {
      setHasConsented(null);
      setConsentChecked(true);
    }
  }, [session, profile, profileStatus]);

  useEffect(() => {
    if (consentChecked || !session) return;
    const timer = setTimeout(() => {
      if (!consentChecked) {
        console.warn('[OptionalAuthRoute] Consent check timeout, proceeding anyway');
        setConsentTimeout(true);
        setConsentChecked(true);
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [consentChecked, session]);

  if (loading || isProfilePending || (!consentChecked && !consentTimeout)) return <LoadingIndicator />;
  if (shouldShowErrorFallback) {
    return <ProfileErrorFallback onRetry={refetchProfile} />;
  }

  if (!session) {
    return children;
  }

  if (hasConsented === false && currentPath !== '/onboarding/consent') {
    return <Navigate to="/onboarding/consent" replace />;
  }

  if (currentPath === '/onboarding/consent') {
    return children;
  }

  if (profile && profile.banned_until) {
    const bannedUntil = new Date(profile.banned_until);
    const now = new Date();
    const permanentBanDate = new Date('2099-12-31T23:59:59Z');
    const isPermanent = bannedUntil.getTime() >= permanentBanDate.getTime();

    if (isPermanent || bannedUntil > now) {
      if (currentPath !== '/banned') {
        return <Navigate to="/banned" replace />;
      }
      return children;
    }
  }

  if (profile) {
    const hasNickname = profile.nickname !== null;

    if (!hasNickname) {
      if (currentPath !== '/onboarding/nickname') {
        return <Navigate to="/onboarding/nickname" replace />;
      }
      return children;
    }

    if (currentPath === '/onboarding/nickname') {
      let shouldShowWelcome = false;
      try {
        shouldShowWelcome = sessionStorage.getItem('justCreatedNickname') === '1';
      } catch (e) { void e; }

      if (shouldShowWelcome) {
        return <Navigate to="/onboarding/welcome" replace />;
      }
      return <Navigate to="/home" replace />;
    }
  } else if (profile === null && profileStatus === 'not_found') {
    if (currentPath !== '/onboarding/nickname') {
      return <Navigate to="/onboarding/nickname" replace />;
    }
    return children;
  }

  return children;
}

export function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { session, profile, loading, profileStatus, refetchProfile } = useAuth(); // session 대신 profile 사용
  const location = useLocation();
  const currentPath = location.pathname;
  const [consentChecked, setConsentChecked] = useState(false);
  const [hasConsented, setHasConsented] = useState<boolean | null>(null);
  const [consentTimeout, setConsentTimeout] = useState(false);
  const isProfilePending = profileStatus === 'idle' || profileStatus === 'loading';
  const shouldShowErrorFallback = profileStatus === 'error' && !profile;

  // 동의 여부 확인 (AuthProvider의 profile에서 직접 가져옴)
  useEffect(() => {
    // 동의 페이지나 로그인 페이지에서는 체크하지 않음
    if (currentPath === '/onboarding/consent' || currentPath === '/login') {
      setConsentChecked(true);
      return;
    }

    if (!session) {
      setConsentChecked(true);
      setHasConsented(null);
      return;
    }

    if (profile) {
      setHasConsented(profile.terms_agreed_at !== null);
      setConsentChecked(true);
    } else if (profileStatus === 'not_found') {
      // 프로필이 없는 경우 (신규 사용자)
      setHasConsented(null);
      setConsentChecked(true);
    }
  }, [session, profile, profileStatus, currentPath]);

  // 동의 체크 타임아웃 (10초 후 강제 진행)
  useEffect(() => {
    if (consentChecked) return;
    const timer = setTimeout(() => {
      if (!consentChecked) {
        console.warn('[ProtectedRoute] Consent check timeout, proceeding anyway');
        setConsentTimeout(true);
        setConsentChecked(true);
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [consentChecked]);

  if (loading || isProfilePending || (!consentChecked && !consentTimeout)) return <LoadingIndicator />;
  if (shouldShowErrorFallback) {
    return <ProfileErrorFallback onRetry={refetchProfile} />;
  }

  if (!session) {
    // 2. 로그인이 안 되어있다면 /login으로 리다이렉트
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 동의하지 않은 경우 동의 페이지로 리다이렉트 (동의 페이지 자체는 제외)
  if (hasConsented === false && currentPath !== '/onboarding/consent') {
    return <Navigate to="/onboarding/consent" replace />;
  }

  // 동의 페이지는 닉네임 유무와 관계없이 진입 허용
  if (currentPath === '/onboarding/consent') {
    return children;
  }

  // --- 제재 체크 (banned_until) ---
  if (profile && profile.banned_until) {
    const bannedUntil = new Date(profile.banned_until);
    const now = new Date();

    // 영구 제재 체크 (99년 후 날짜)
    const permanentBanDate = new Date('2099-12-31T23:59:59Z');
    const isPermanent = bannedUntil.getTime() >= permanentBanDate.getTime();

    // 제재가 아직 유효한지 체크
    if (isPermanent || bannedUntil > now) {
      // /banned 페이지가 아닌 경우에만 리다이렉트
      if (currentPath !== '/banned') {
        return <Navigate to="/banned" replace />;
      }
      // /banned 페이지라면 children 렌더링 (제재 안내 페이지 표시)
      return children;
    }
  }

  // --- role 및 닉네임 분기 처리 (핵심) ---
  // 닉네임은 필수, role(/onboarding/profile)은 선택사항
  if (profile) {
    const hasNickname = profile.nickname !== null;

    // 닉네임이 없는 경우
    if (!hasNickname) {
      if (currentPath !== '/onboarding/nickname') {
        // 닉네임 설정 페이지가 아닌 다른 모든 보호된 경로 접근 시
        // /onboarding/nickname으로 강제 리다이렉트
        return <Navigate to="/onboarding/nickname" replace />;
      }
      // (만약 /onboarding/nickname 페이지라면 'children'이 렌더링됨)
      return children;
    }

    // 닉네임이 있는 경우
    if (currentPath === '/onboarding/nickname') {
      // 이미 닉네임이 있는데 닉네임 설정 페이지 접근 시
      // 이번 세션에서 방금 닉네임을 만든 경우에만 환영 페이지로 이동
      let shouldShowWelcome = false;
      try {
        shouldShowWelcome = sessionStorage.getItem('justCreatedNickname') === '1';
      } catch (e) { void e; }

      if (shouldShowWelcome) {
        return <Navigate to="/onboarding/welcome" replace />;
      }
      return <Navigate to="/home" replace />;
    }
    // (그 외의 페이지라면 'children'이 렌더링됨)
  } else if (profile === null && profileStatus === 'not_found') {
    // profile이 null이고 로딩이 완료된 경우 (프로필이 아직 생성되지 않음)
    // 닉네임 생성부터 시작
    if (currentPath !== '/onboarding/nickname') {
      return <Navigate to="/onboarding/nickname" replace />;
    }
    // /onboarding/nickname 페이지라면 children 렌더링
    return children;
  }

  // 위 조건에 해당하지 않는 정상 케이스에서는 자식 컴포넌트를 렌더링
  return children;
}

export default {};



import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { upsertMyPushToken, type PushDeviceType, type PushTokenProvider } from '../../services/pushTokenService';
import { setNativeBootTypeHint, isFeatureEnabled } from '../../lib/featureFlags';
import { queryClient } from '../../lib/queryClient';
import { logStability, recordForegroundResume, recordSessionRefresh } from '../../lib/stabilityTelemetry';

type NativeBridgeMessage =
  | {
    type: 'PUSH_TOKEN';
    token: string;
    provider: PushTokenProvider;
    device_type: PushDeviceType;
  }
  | {
    type: 'PUSH_RECEIVED';
    title?: string | null;
    body?: string | null;
    data?: Record<string, unknown>;
  }
  | {
    type: 'PUSH_OPEN';
    data?: Record<string, unknown>;
  }
  | {
    type: 'NAV_STATE_SYNC';
    canGoBack: boolean;
    canGoForward: boolean;
  }
  | {
    type: 'REQUEST_GO_BACK';
  }
  | {
    type: 'BOOT_TYPE_HINT';
    nativeBootType: 'cold' | 'recovered' | 'resume';
    timestamp: number;
  };

const STORAGE_KEY = 'bridge_native_push_tokens_v1';

function safeJsonParse(input: unknown): unknown {
  if (typeof input !== 'string') return input;
  try {
    return JSON.parse(input);
  } catch {
    return input;
  }
}

function readStoredTokens(): Array<{ token: string; provider: PushTokenProvider; device_type: PushDeviceType }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean) as Array<{ token: string; provider: PushTokenProvider; device_type: PushDeviceType }>;
  } catch {
    return [];
  }
}

function writeStoredTokens(tokens: Array<{ token: string; provider: PushTokenProvider; device_type: PushDeviceType }>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  } catch {
    // ignore
  }
}

function upsertAndStoreToken(input: { token: string; provider: PushTokenProvider; device_type: PushDeviceType }) {
  const existing = readStoredTokens();
  const next = [
    ...existing.filter((t) => t.token !== input.token),
    { token: input.token, provider: input.provider, device_type: input.device_type },
  ];
  writeStoredTokens(next);
  // non-blocking upsert (RLS로 본인만 등록 가능)
  upsertMyPushToken({ token: input.token, provider: input.provider, deviceType: input.device_type }).catch((e) => {
    console.warn('[NativeBridgeListener] upsertMyPushToken failed:', e);
  });
}

async function flushStoredTokens() {
  const tokens = readStoredTokens();
  if (tokens.length === 0) return;
  for (const t of tokens) {
    try {
      const res = await upsertMyPushToken({ token: t.token, provider: t.provider, deviceType: t.device_type });
      if (!res.ok) {
        // not signed in -> stop
        return;
      }
    } catch (e) {
      console.warn('[NativeBridgeListener] flush upsert failed:', e);
      return;
    }
  }
}

function routeFromPushData(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;

  // 알림 타입에 따른 라우팅 (route보다 우선 - Edge Function의 잘못된 경로 오버라이드)
  const notificationType = typeof data.type === 'string' ? data.type : null;

  // 초대/지원/대화 요청 관련 알림 → InvitationsTab으로 라우팅 (최우선)
  const invitationTypes = [
    'project_invitation',       // 프로젝트 초대
    'collaboration_invitation', // 콜라보 초대
    'invitation',               // 일반 초대 (Edge Function에서 설정)
    'talk_request',             // 대화 요청
    'talk_request_received',    // 대화 요청 수신
    'application_received',     // 지원서 수신
    'project_application',      // 프로젝트 지원
    'collaboration_application', // 콜라보 지원
    'application',              // 지원 (Edge Function에서 설정)
  ];
  if (notificationType && invitationTypes.includes(notificationType)) {
    return '/manage?tab=invitations&mode=received';
  }

  // 지원 수락/거절 알림 → 보낸 요청 탭으로 라우팅
  if (notificationType === 'application_accepted' || notificationType === 'application_rejected') {
    return '/manage?tab=invitations&mode=sent';
  }

  // 초대 수락/거절 알림 → 보낸 요청 탭으로 라우팅
  if (notificationType === 'invitation_accepted' || notificationType === 'invitation_rejected') {
    return '/manage?tab=invitations&mode=sent';
  }

  // 프로젝트 업데이트 알림 (예산 변경, 정산 완료 등) → ExploreProjectDetail로 라우팅
  if (notificationType === 'project_update') {
    const relatedId = typeof data.related_id === 'string' ? data.related_id : null;
    const projectId = relatedId ||
      (typeof data.projectId === 'string' ? data.projectId : null) ||
      (typeof data.project_id === 'string' ? data.project_id : null);
    if (projectId) {
      return `/explore/project/${projectId}`;
    }
  }

  // 파트너십 문의 알림 - 관리 페이지의 프로젝트 탭 > 파트너십 하위 탭으로 이동
  if (notificationType === 'partnership_inquiry') {
    return '/manage?tab=projects&subTab=partnership';
  }

  // 명시적 route가 있으면 사용
  const route = typeof data.route === 'string' ? data.route : null;
  if (route && route.startsWith('/')) return route;

  const url = typeof data.url === 'string' ? data.url : null;
  if (url && url.startsWith('/')) return url;

  const messageRoomId =
    (typeof data.message_room_id === 'string' ? data.message_room_id : null) ||
    (typeof data.room_id === 'string' ? data.room_id : null) ||
    (typeof data.chat_room_id === 'string' ? data.chat_room_id : null);
  if (messageRoomId) return `/messages/${messageRoomId}`;

  // invitation_id가 있으면 InvitationsTab으로 라우팅
  const invitationId =
    (typeof data.invitation_id === 'string' ? data.invitation_id : null) ||
    (typeof data.invitationId === 'string' ? data.invitationId : null);
  if (invitationId) return '/manage?tab=invitations&mode=received';

  // talk_request_id가 있으면 InvitationsTab으로 라우팅
  const talkRequestId =
    (typeof data.talk_request_id === 'string' ? data.talk_request_id : null) ||
    (typeof data.talkRequestId === 'string' ? data.talkRequestId : null);
  if (talkRequestId) return '/manage?tab=invitations&mode=received';

  // application_id가 있으면 InvitationsTab으로 라우팅
  const applicationId =
    (typeof data.application_id === 'string' ? data.application_id : null) ||
    (typeof data.applicationId === 'string' ? data.applicationId : null);
  if (applicationId) return '/manage?tab=invitations&mode=received';

  const projectId =
    (typeof data.project_id === 'string' ? data.project_id : null) ||
    (typeof data.projectId === 'string' ? data.projectId : null);
  if (projectId) return `/manage/project/${projectId}`;

  const collaborationId =
    (typeof data.collaboration_id === 'string' ? data.collaboration_id : null) ||
    (typeof data.collaborationId === 'string' ? data.collaborationId : null);
  if (collaborationId) return `/manage/collaboration/${collaborationId}`;

  return null;
}

export default function NativeBridgeListener() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  const lastHandledRef = useRef<string>('');
  const lastGoBackTimeRef = useRef<number>(0);

  // ========== Web → Native: 뒤로가기 차단 경로 리포트 ==========
  // Native에서 직접 URL 파싱하므로 postMessage 제거됨 ('WEB_ROUTE_STATE' 미사용)
  // Native Single Source of Truth 원칙 준수

  useEffect(() => {
    // 로그인 완료/토큰 갱신 시 저장된 토큰을 한번 더 등록 (네이티브가 토큰을 먼저 준 경우 대비)
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        // Non-blocking: AuthProvider의 프로필 fetch를 블로킹하지 않도록 지연 실행
        // await 제거하여 앱 초기화 무한 로딩 방지
        setTimeout(() => {
          flushStoredTokens().catch((e) => {
            console.warn('[NativeBridgeListener] flushStoredTokens failed:', e);
          });
        }, 500);
      }
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  // ========== Web → Native: 상태바 색상 설정 ==========
  useEffect(() => {
    // RN WebView 환경에서만 동작
    if (typeof (window as any).ReactNativeWebView?.postMessage !== 'function') return;

    // 상태바를 흰색 배경, 검은색 텍스트로 설정
    try {
      (window as any).ReactNativeWebView.postMessage(JSON.stringify({
        type: 'SET_STATUS_BAR',
        backgroundColor: '#ffffff',
        barStyle: 'dark-content', // 검은색 텍스트/아이콘
      }));
    } catch (e) {
      console.warn('[NativeBridgeListener] Failed to set status bar:', e);
    }
  }, []);

  // ========== Web → Native: 경로 동기화 ==========
  useEffect(() => {
    if (typeof (window as any).ReactNativeWebView?.postMessage !== 'function') return;

    const currentPath = location.pathname;
    const TAB_ROOTS = ['/home', '/explore', '/lounge', '/messages', '/manage', '/profile'];
    const isRoot = TAB_ROOTS.includes(currentPath);

    try {
      (window as any).ReactNativeWebView.postMessage(JSON.stringify({
        type: 'WEB_ROUTE_STATE',
        currentPath,
        isRoot,
      }));
    } catch (e) {
      // ignore
    }
  }, [location]);

  useEffect(() => {
    const handler = (evt: MessageEvent) => {
      // RN WebView에서 들어오는 이벤트는 string payload가 대부분
      const once = safeJsonParse(evt.data);
      const twice = safeJsonParse(once);
      const msg = twice as Partial<NativeBridgeMessage>;

      if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') return;

      // Native에서 뒤로가기 요청 - fingerprint 체크 이전에 처리 (매번 실행되어야 함)
      if (msg.type === 'REQUEST_GO_BACK') {
        // 이중 발송 차단 (window + document 이벤트 리스너로 인한 중복 호출)
        const now = Date.now();
        if (now - lastGoBackTimeRef.current < 100) return;
        lastGoBackTimeRef.current = now;

        const currentPath = locationRef.current.pathname;
        console.log('[NativeBridgeListener] REQUEST_GO_BACK received, currentPath:', currentPath);

        // 탭 루트 경로 정의 (Home 제외 - Native에서 이미 처리됨)
        const NON_HOME_TAB_PATHS = ['/explore', '/lounge', '/messages', '/manage', '/profile'];
        const isNonHomeTab = NON_HOME_TAB_PATHS.some(path => currentPath === path || currentPath === path + '/');

        // 탭 루트 (Home 제외)에서 뒤로가기 -> Home으로 이동
        if (isNonHomeTab) {
          console.log('[NativeBridgeListener] Tab root -> navigating to /home');
          navigate('/home', { replace: true });
          return;
        }

        // Home에서는 아무것도 하지 않음 (Native에서 앱 종료 로직 처리)
        if (currentPath === '/home' || currentPath === '/home/') {
          console.log('[NativeBridgeListener] Already at /home, ignoring');
          return;
        }

        // 서브 페이지에서 뒤로가기 처리
        // 1. Header의 back 버튼 클릭 시도 (가장 좋은 UX - 커스텀 로직 활용)
        const headerBackButton = document.getElementById('header-back-button');
        if (headerBackButton) {
          console.log('[NativeBridgeListener] Clicking header back button');
          headerBackButton.click();
          return;
        }

        // 2. React Router의 navigate(-1) 사용 (SPA 히스토리 활용)
        // window.history.length는 신뢰할 수 없으므로 무조건 시도
        console.log('[NativeBridgeListener] Using navigate(-1)');
        navigate(-1);

        // 3. 만약 navigate(-1)이 효과가 없는 경우를 대비한 fallback
        // (100ms 후 같은 경로에 있으면 상위 경로로 이동)
        const pathBeforeNav = currentPath;
        setTimeout(() => {
          const pathAfterNav = locationRef.current.pathname;
          if (pathAfterNav === pathBeforeNav) {
            console.log('[NativeBridgeListener] navigate(-1) had no effect, using fallback');
            // 경로 패턴에 따른 상위 경로 추론
            if (currentPath.startsWith('/messages/')) {
              navigate('/messages', { replace: true });
            } else if (currentPath.startsWith('/manage/')) {
              navigate('/manage', { replace: true });
            } else if (currentPath.startsWith('/profile/')) {
              navigate('/profile', { replace: true });
            } else if (currentPath.startsWith('/explore/')) {
              navigate('/explore', { replace: true });
            } else {
              navigate('/home', { replace: true });
            }
          }
        }, 100);
        return;
      }

      // 중복 이벤트 방지(같은 payload 연속 수신)
      const fingerprint = typeof evt.data === 'string' ? evt.data : JSON.stringify(msg);
      if (fingerprint && lastHandledRef.current === fingerprint) return;
      lastHandledRef.current = fingerprint;

      if (msg.type === 'PUSH_TOKEN') {
        if (typeof (msg as any).token !== 'string') return;
        upsertAndStoreToken({
          token: (msg as any).token,
          provider: ((msg as any).provider as PushTokenProvider) || 'fcm',
          device_type: ((msg as any).device_type as PushDeviceType) || 'web',
        });
        return;
      }

      if (msg.type === 'PUSH_RECEIVED') {
        // Foreground 푸시 수신 시 인앱 배너 fallback
        const data = (msg as any).data as Record<string, unknown> | undefined;
        const title = (msg as any).title as string | null | undefined;
        const body = (msg as any).body as string | null | undefined;

        // React Query 캐시 무효화
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });

        // 커스텀 이벤트 발행 (InAppNotificationProvider에서 구독)
        window.dispatchEvent(new CustomEvent('bridge:push-received', {
          detail: { data, title, body }
        }));

        console.log('[NativeBridgeListener] PUSH_RECEIVED handled, cache invalidated');
        return;
      }

      if (msg.type === 'PUSH_OPEN') {
        const data = (msg as any).data as Record<string, unknown> | undefined;
        const route = routeFromPushData(data);
        if (route) {
          console.log('[NativeBridgeListener] PUSH_OPEN navigating to:', route, 'data:', data);
          // WebView가 완전히 로드될 때까지 대기 (React Router 초기화 대기)
          const attemptNavigate = () => {
            try {
              navigate(route);
            } catch (error) {
              console.warn('[NativeBridgeListener] Navigation failed, retrying...', error);
              // React Router가 아직 준비되지 않은 경우 재시도
              setTimeout(attemptNavigate, 100);
            }
          };
          // 약간의 지연을 두어 React Router 초기화 대기
          setTimeout(attemptNavigate, 100);
        } else {
          console.warn('[NativeBridgeListener] PUSH_OPEN: No route found for data:', data);
          // 기본 경로로 이동 (흰 화면 방지)
          setTimeout(() => {
            try {
              navigate('/home');
            } catch (error) {
              console.error('[NativeBridgeListener] Failed to navigate to fallback route:', error);
            }
          }, 100);
        }
        return;
      }

      // Native에서 Boot Type 힌트 수신
      if (msg.type === 'BOOT_TYPE_HINT') {
        const bootType = (msg as any).nativeBootType;
        if (bootType === 'cold' || bootType === 'recovered' || bootType === 'resume') {
          setNativeBootTypeHint(bootType);
        }
        return;
      }

      // ========== Phase 1: Foreground Resume 처리 ==========
      // Native에서 앱이 foreground로 복귀했음을 알림
      if (msg.type === 'NAV_STATE_SYNC') {
        // 0. 장시간 백그라운드 후 복귀 시 자동 새로고침 (30분)
        if (isFeatureEnabled('SESSION_REFRESH_ON_FOREGROUND')) {
          const STALE_THRESHOLD_MS = 30 * 60 * 1000;
          const lastActiveTime = localStorage.getItem('bridge_last_active_time');
          const now = Date.now();

          if (lastActiveTime && now - parseInt(lastActiveTime) > STALE_THRESHOLD_MS) {
            console.log('[NativeBridgeListener] Stale session detected, reloading page...');
            localStorage.setItem('bridge_last_active_time', now.toString());
            window.location.reload();
            return; // 새로고침하므로 이후 로직 스킵
          }
          localStorage.setItem('bridge_last_active_time', now.toString());
        }

        // 로깅
        recordForegroundResume();
        logStability('foreground_resume', {
          canGoBack: (msg as any).canGoBack,
        });

        // 1. 세션 refresh (장시간 백그라운드 후 401 방지)
        if (isFeatureEnabled('SESSION_REFRESH_ON_FOREGROUND')) {
          logStability('session_refresh_triggered', {});
          supabase.auth.refreshSession()
            .then(({ error }) => {
              if (error) {
                logStability('session_refresh_failed', { error: error.message });
                console.warn('[NativeBridgeListener] Session refresh failed:', error);
              } else {
                recordSessionRefresh();
                logStability('session_refresh_success', {});
                console.log('[NativeBridgeListener] Session refreshed on foreground');
              }
            })
            .catch((err) => {
              logStability('session_refresh_failed', { error: String(err) });
              console.warn('[NativeBridgeListener] Session refresh exception:', err);
            });
        }

        // 2. React Query 캐시 무효화 (stale 데이터 방지)
        if (isFeatureEnabled('CACHE_INVALIDATE_ON_FOREGROUND')) {
          logStability('cache_invalidate_triggered', {});
          // 중요한 실시간성 쿼리만 무효화 (전체 무효화는 성능 이슈)
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['messageRooms'] });
          queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
          console.log('[NativeBridgeListener] Cache invalidated on foreground');
        }

        return;
      }
    };

    // RN WebView 플랫폼별로 window/document 중 하나로만 들어오는 경우가 있어 둘 다 등록
    window.addEventListener('message', handler);
    document.addEventListener('message', handler as any);
    return () => {
      window.removeEventListener('message', handler);
      document.removeEventListener('message', handler as any);
    };
  }, [navigate]);

  return null;
}



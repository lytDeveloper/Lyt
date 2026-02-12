import { useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react'; // ReactNode를 type import로 분리
import { supabase } from '../lib/supabase';
import type { Session, User, PostgrestError, PostgrestSingleResponse } from '@supabase/supabase-js';
import { AuthContext } from './AuthContext.tsx';
import type { Profile, ProfileStatus } from './AuthContext.tsx';
import { usePresence } from '../hooks/usePresence';
import {
  isFeatureEnabled,
  getBootType,
  getCachedProfile,
  getCachedSession,
  cacheSession,
  cacheProfile,
  clearSessionCache,
  webTelemetry,
  type BootType,
} from '../lib/featureFlags';

type ProfileRow = {
  nickname: string | null;
  roles: string[] | null;
  banned_until: string | null;
  terms_agreed_at: string | null;
};

const PROFILE_FETCH_TIMEOUT_MS = 3000;
const PROFILE_FETCH_MAX_RETRIES = 3;
const PROFILE_FETCH_MIN_INTERVAL_MS = 120000; // 2분 내 중복 호출 방지
const INITIAL_PROFILE_FETCH_TIMEOUT_MS = PROFILE_FETCH_TIMEOUT_MS * 5;

type FetchProfileOptions = {
  silent?: boolean;
  deferIfHidden?: boolean;
  reason?: string;
  timeoutMs?: number;
};

// 타입은 AuthContext 쪽에서 가져옵니다.

// Provider 컴포넌트
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null); // user 상태 추가
  const [profile, setProfile] = useState<Profile | null>(null); // profile 상태 추가
  const [loading, setLoading] = useState(true);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('idle');
  const initialCheckDoneRef = useRef(false);
  const authEventHappenedRef = useRef(false);

  // --- 프로필을 불러오는 함수 ---
  // useCallback으로 감싸서 value 객체가 매번 새로 생성되지 않도록 함
  const profileRetryRef = useRef<{ count: number; timerId: number | null }>({ count: 0, timerId: null });
  const deferredProfileUserRef = useRef<User | null>(null);
  const currentFetchControllerRef = useRef<AbortController | null>(null);
  const currentFetchUserRef = useRef<string | null>(null);
  const lastProfileFetchRef = useRef<number>(0);
  const visibilityStateRef = useRef<typeof document.visibilityState | null>(typeof document !== 'undefined' ? document.visibilityState : null);

  const isDocumentHidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';

  // ========== Stage 3: Boot Type 판별 ==========
  const bootTypeRef = useRef<BootType | null>(null);

  // 컴포넌트 마운트 시 boot type 판별 (한 번만 계산)
  if (bootTypeRef.current === null && isFeatureEnabled('AUTH_COLD_WARM_SPLIT')) {
    bootTypeRef.current = getBootType();
    webTelemetry('auth_boot_type', {
      type: bootTypeRef.current,
      hasCache: getCachedSession() !== null,
    });
  }

  const clearProfileRetry = useCallback(() => {
    if (profileRetryRef.current.timerId) {
      clearTimeout(profileRetryRef.current.timerId);
      profileRetryRef.current.timerId = null;
    }
    profileRetryRef.current.count = 0;
  }, []);

  const fetchProfile = useCallback(async (currentUser: User | null, options?: FetchProfileOptions): Promise<void> => {
    if (!currentUser) {
      console.log("No user, setting profile to null");
      setProfile(null);
      setProfileStatus('not_found');
      clearProfileRetry();
      return;
    }

    const isFetchInFlightForUser =
      currentFetchControllerRef.current !== null &&
      currentFetchUserRef.current === currentUser.id;
    if (isFetchInFlightForUser) {
      console.log("⏳ [AuthProvider] Profile fetch already in progress for user:", currentUser.id);
      return;
    }

    const shouldDefer = options?.deferIfHidden !== false && isDocumentHidden();
    if (shouldDefer) {
      deferredProfileUserRef.current = currentUser;
      console.log("⏸️ [AuthProvider] Tab hidden, deferring profile fetch");
      return;
    }

    if (deferredProfileUserRef.current?.id === currentUser.id) {
      deferredProfileUserRef.current = null;
    }

    const reasonLabel = options?.reason ? ` (${options.reason})` : '';
    console.log(`🔍 [AuthProvider] Fetching profile for user: ${currentUser.id}${reasonLabel}`);
    if (!options?.silent) {
      setProfileStatus('loading');
    }

    try {
      // 타임아웃 Promise (5초)
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const timeoutMs = options?.timeoutMs ?? PROFILE_FETCH_TIMEOUT_MS;
      const controller = new AbortController();
      currentFetchControllerRef.current = controller;
      currentFetchUserRef.current = currentUser.id;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          controller.abort();
          reject(new Error(`Profile fetch timeout after ${timeoutMs / 1000}s`));
        }, timeoutMs);
      });

      // 프로필 조회 시 banned_until, terms_agreed_at 포함
      const fetchPromise = supabase
        .from('profiles')
        .select('nickname, roles, banned_until, terms_agreed_at')
        .eq('id', currentUser.id)
        .abortSignal(controller.signal)
        .single();

      // 타임아웃과 경쟁
      const result = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as PostgrestSingleResponse<ProfileRow>;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (currentFetchControllerRef.current === controller) {
        currentFetchControllerRef.current = null;
        currentFetchUserRef.current = null;
      }
      const { data: profileData, error } = result;

      if (error) {
        // 0 row (프로필 없음)인 경우에는 not_found로 간주
        const isNoRowsError =
          (error as PostgrestError).code === 'PGRST116' ||
          (error as PostgrestError).details?.includes('Results contain 0 rows');
        if (isNoRowsError) {
          console.warn("⚠️ [AuthProvider] Profile not found for user:", currentUser.id);
          setProfile(null);
          setProfileStatus('not_found');
          clearProfileRetry();
          return;
        }

        console.error("❌ [AuthProvider] Error fetching profile:", error);
        console.error("❌ [AuthProvider] Error details:", {
          message: error.message,
          code: error.code,
          details: error.details,
        });
        setProfileStatus('error');
        return;
      }

      if (!profileData) {
        console.warn("⚠️ [AuthProvider] Profile data empty, marking as not_found");
        setProfile(null);
        setProfileStatus('not_found');
        clearProfileRetry();
        return;
      }

      console.log("✅ [AuthProvider] Profile fetched successfully:", profileData);
      const fetchedProfile = {
        nickname: profileData.nickname ?? null,
        roles: Array.isArray(profileData.roles) ? profileData.roles : [],
        banned_until: profileData.banned_until ?? null,
        terms_agreed_at: profileData.terms_agreed_at ?? null,
      };
      setProfile(fetchedProfile);
      setProfileStatus('success');
      lastProfileFetchRef.current = Date.now();
      clearProfileRetry();

      // Stage 3: 프로필 캐시 저장
      if (isFeatureEnabled('AUTH_COLD_WARM_SPLIT')) {
        cacheProfile({
          ...fetchedProfile,
          cachedAt: Date.now(),
        });
      }

      // last_access 업데이트 (비동기로 실행, 에러 무시)
      supabase
        .from('profiles')
        .update({ last_access: new Date().toISOString() })
        .eq('id', currentUser.id)
        .then(({ error: updateError }) => {
          if (updateError) {
            console.warn("Failed to update last_access:", updateError);
          }
        });
    } catch (err) {
      console.error("❌ [AuthProvider] Exception in fetchProfile:", err);
      if (currentFetchControllerRef.current) {
        currentFetchControllerRef.current = null;
        currentFetchUserRef.current = null;
      }
      if (err instanceof Error && err.message.includes('timeout')) {
        console.error("⏱️ [AuthProvider] Profile fetch timed out - continuing without profile");
        console.error("⏱️ [AuthProvider] Possible causes: RLS policy, network issue, or slow database");
      } else if (err instanceof DOMException && err.name === 'AbortError') {
        console.log("🛑 [AuthProvider] Profile fetch aborted (likely due to tab hidden)");
        return;
      }
      setProfileStatus('error');
    }
  }, [clearProfileRetry]);

  // 프로필 사전 로드 (중복 호출 방지)
  const preloadProfilesRef = useRef(false);

  const preloadProfiles = useCallback(async (currentUser: User) => {
    if (preloadProfilesRef.current) return; // 중복 방지
    preloadProfilesRef.current = true;

    try {
      const { preloadProfiles: preloadFn } = await import('../services/profilePreloadService');
      await preloadFn(currentUser.id);
    } catch (error) {
      console.error('[AuthProvider] Preload failed:', error);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    initialCheckDoneRef.current = false;

    // 먼저 세션을 확인하여 빠르게 로딩 완료
    const initialSessionCheck = async () => {
      let completed = false;
      try {
        const isAuthCallback = typeof window !== 'undefined' && window.location.pathname === '/auth/callback';

        // /auth/callback 경로에서는 AuthCallback이 처리하므로 초기 체크 건너뛰기
        if (isAuthCallback) {
          console.log("🔀 [AuthProvider] on /auth/callback, skipping initial check, will rely on onAuthStateChange event");
          // 초기 상태를 null로 설정하고 이벤트만 기다림
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false); // ← 로딩 완료 표시
          setProfileStatus('idle');
          initialCheckDoneRef.current = true;
          console.log("✅ [AuthProvider] loading set to false for /auth/callback");
          completed = true;
          return;
        }

        console.log("AuthProvider: checking initial session");

        // 세션 체크 (타임아웃 없음 - onAuthStateChange 이벤트에 의존)
        let sessionResult: { data: { session: Session | null }, error: { message?: string } | null };
        try {
          sessionResult = await supabase.auth.getSession();
          console.log("AuthProvider: session check completed", {
            hasSession: Boolean(sessionResult.data.session),
          });
        } catch (err) {
          console.error("AuthProvider: error during session check:", err);
          sessionResult = { data: { session: null }, error: { message: String(err) } };
        }

        const { data: { session }, error } = sessionResult;

        if (error) {
          console.error("Error getting initial session:", error);
          // ERR_CONNECTION_REFUSED 같은 네트워크 에러 처리
          if (error.message?.includes('Failed to fetch') || error.message?.includes('network') || error.message?.includes('timeout')) {
            console.error("네트워크 연결 오류: Supabase 서버에 연결할 수 없어요. .env 파일의 VITE_SUPABASE_URL을 확인하세요.");
          }
          // 이미 인증 이벤트가 발생하여 세션이 설정되었을 수 있음. 이 경우 초기 체크가 상태를 덮어쓰지 않도록 방지
          if (!authEventHappenedRef.current) {
            setSession(null);
            setUser(null);
            setProfile(null);
            setProfileStatus('idle');
          } else {
            console.log("AuthProvider: auth event occurred; skipping error-state nullify in initial check");
          }
          completed = true;
          return;
        }

        if (session) {
          console.log("AuthProvider: initial session found", session.user?.id);
          setSession(session);
          const sessionUser = session.user || null;
          setUser(sessionUser);

          // Stage 3: 세션 캐시 저장
          if (isFeatureEnabled('AUTH_COLD_WARM_SPLIT') && session.expires_at) {
            cacheSession(session.user?.id ?? '', session.expires_at);
          }

          // 프로필 사전 로드 (백그라운드)
          if (sessionUser) {
            preloadProfiles(sessionUser).catch((err) => {
              console.error('[AuthProvider] Preload error:', err);
            });
          }

          // Non-blocking profile fetch - app renders immediately while profile loads
          // Stage 3: Warm start시 캐시된 프로필 즈시 사용
          if (isFeatureEnabled('AUTH_COLD_WARM_SPLIT') && bootTypeRef.current === 'warm') {
            const cachedProfile = getCachedProfile();
            if (cachedProfile) {
              console.log('💾 [AuthProvider] Warm start - using cached profile:', cachedProfile);
              setProfile({
                nickname: cachedProfile.nickname,
                roles: cachedProfile.roles,
                banned_until: cachedProfile.banned_until,
                terms_agreed_at: cachedProfile.terms_agreed_at,
              });
              setProfileStatus('success');
              // 백그라운드에서 프로필 갱신 (silent)
              fetchProfile(sessionUser, {
                silent: true,
                reason: 'warm-start-refresh',
                timeoutMs: PROFILE_FETCH_TIMEOUT_MS,
              }).catch((err) => console.error('[AuthProvider] Warm refresh error:', err));
            } else {
              // 캐시 무효 - 일반 fetch
              fetchProfile(sessionUser, {
                reason: 'initial-session-check',
                timeoutMs: INITIAL_PROFILE_FETCH_TIMEOUT_MS,
              }).catch((profileError) => {
                console.error("Error fetching profile:", profileError);
              });
            }
          } else {
            fetchProfile(sessionUser, {
              reason: 'initial-session-check',
              timeoutMs: INITIAL_PROFILE_FETCH_TIMEOUT_MS,
            }).catch((profileError) => {
              console.error("Error fetching profile:", profileError);
            });
          }
        } else {
          // 인증 이벤트가 이미 와서 세션이 설정되었을 수 있으므로 상태 덮어쓰기 방지
          if (authEventHappenedRef.current) {
            console.log("AuthProvider: auth event already handled; skipping nullify in initial check");
          } else {
            console.log("AuthProvider: no initial session found");
            setSession(null);
            setUser(null);
            setProfile(null);
            setProfileStatus('idle');
          }
        }
        completed = true;
      } catch (err) {
        console.error("Error during initial session check:", err);
        // 네트워크 에러나 연결 거부 에러 처리
        if (err instanceof Error) {
          if (err.message.includes('Failed to fetch') || err.message.includes('ERR_CONNECTION_REFUSED') || err.message.includes('timeout')) {
            console.error("❌ Supabase 연결 실패: .env 파일의 VITE_SUPABASE_URL을 확인하세요.");
          }
          console.error("Full error:", err);
        }
        if (!authEventHappenedRef.current) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setProfileStatus('idle');
        } else {
          console.log("AuthProvider: auth event occurred; skipping catch-state nullify in initial check");
        }
        completed = true;
      } finally {
        // 항상 실행되도록 보장
        if (!completed) {
          console.warn("⚠️ [AuthProvider] forcing completion due to unexpected state");
        }
        setLoading(false);
        initialCheckDoneRef.current = true;
        console.log("✅ [AuthProvider] initial check completed, loading set to false");
      }
    };

    // 초기 세션 체크 실행
    initialSessionCheck();

    // 인증 상태 변경 리스너를 등록하여 이후 변경사항 추적
    let subscription: { unsubscribe: () => void } | null = null;

    try {
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          try {
            const initialCheckCompletedBeforeEvent = initialCheckDoneRef.current;
            if (!initialCheckCompletedBeforeEvent) {
              console.log("AuthProvider: auth change received before initial check completed:", _event);
            } else {
              console.log("AuthProvider detected auth change:", _event, session);
            }

            // 인증 이벤트가 발생했음을 표시하여 초기 체크가 상태를 덮어쓰지 않도록 함
            authEventHappenedRef.current = true;
            // 초기 체크를 사실상 종료 상태로 표시
            initialCheckDoneRef.current = true;

            const sessionUser = session?.user || null;
            setSession(session);
            setUser(sessionUser);

            // OAuth 로그인 시 프로필 사전 로드
            if (_event === 'SIGNED_IN' && sessionUser) {
              preloadProfiles(sessionUser).catch((err) => {
                console.error('[AuthProvider] Preload error on sign-in:', err);
              });
            }

            // 모든 경로에서 다음 이벤트 발생 시 프로필을 다시 불러옴
            // - INITIAL_SESSION: 새 세션 로드
            // - SIGNED_IN: 특히 SSO 직후 즉시 프로필 필요
            // - TOKEN_REFRESHED: 토큰 갱신 시 최신 상태 유지
            const shouldFetchProfile =
              _event === 'INITIAL_SESSION' ||
              _event === 'SIGNED_IN' ||
              _event === 'TOKEN_REFRESHED';

            const now = Date.now();
            const recentlyFetched = now - lastProfileFetchRef.current < PROFILE_FETCH_MIN_INTERVAL_MS;
            const shouldDelayForInitialCheck = _event === 'SIGNED_IN' && !initialCheckCompletedBeforeEvent;
            let fetchAttempted = false;

            if (shouldFetchProfile) {
              const isTabHidden = isDocumentHidden();
              if (shouldDelayForInitialCheck) {
                console.log("⏳ [AuthProvider] Deferring SIGNED_IN profile fetch until initial session completes");
              } else if (_event === 'SIGNED_IN' && recentlyFetched) {
                console.log("⏭️ [AuthProvider] Skipping redundant SIGNED_IN profile fetch (recent data)");
              } else if (isTabHidden) {
                console.log("⏸️ [AuthProvider] Tab hidden; deferring profile fetch until visible");
                deferredProfileUserRef.current = sessionUser;
                // 기존 프로필 유지
              } else {
                console.log(`🔍 [AuthProvider] Fetching profile for event: ${_event}`);
                fetchAttempted = true;
                // Non-blocking profile fetch
                fetchProfile(sessionUser, {
                  reason: `event:${_event}`,
                  timeoutMs: _event === 'SIGNED_IN'
                    ? INITIAL_PROFILE_FETCH_TIMEOUT_MS
                    : (initialCheckCompletedBeforeEvent
                      ? PROFILE_FETCH_TIMEOUT_MS
                      : INITIAL_PROFILE_FETCH_TIMEOUT_MS),
                }).catch((profileError) => {
                  console.error("Error fetching profile in auth change:", profileError);
                });
              }
            } else if (_event === 'SIGNED_OUT') {
              setProfile(null);
              setProfileStatus('idle');
              // Stage 3: 로그아웃 시 캐시 클리어
              if (isFeatureEnabled('AUTH_COLD_WARM_SPLIT')) {
                clearSessionCache();
              }
            }

            // 🔍 디버그: 이벤트 처리 완료
            console.log(`✅ [AuthProvider] Event ${_event} processed (fetchAttempted: ${fetchAttempted})`)
          } catch (err) {
            console.error("Error in onAuthStateChange callback:", err);
            setProfile(null);
            setProfileStatus('idle');
          }
        }
      );
      subscription = sub;
    } catch (err) {
      console.error("Error setting up auth state change listener:", err);
    }

    // 클린업 함수
    return () => {
      // 인증 리스너 구독 취소
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (err) {
          console.error("Error unsubscribing auth listener:", err);
        }
      }
      initialCheckDoneRef.current = false;
    };
  }, [fetchProfile]);

  useEffect(() => {
    if (profileStatus === 'success' || profileStatus === 'not_found') {
      clearProfileRetry();
      return;
    }

    if (profileStatus === 'error' && user) {
      if (isDocumentHidden()) {
        deferredProfileUserRef.current = user;
        console.log("⏸️ [AuthProvider] Retry deferred because tab hidden");
        return;
      }
      const { count } = profileRetryRef.current;
      if (count >= PROFILE_FETCH_MAX_RETRIES) {
        console.warn("⚠️ [AuthProvider] Profile fetch retries exhausted");
        return;
      }
      const delay = Math.min(2000 * 2 ** count, 8000);
      if (profileRetryRef.current.timerId) {
        clearTimeout(profileRetryRef.current.timerId);
      }
      profileRetryRef.current.count += 1;
      const attemptNumber = profileRetryRef.current.count;
      profileRetryRef.current.timerId = window.setTimeout(() => {
        console.log(`🔁 [AuthProvider] Retrying profile fetch (attempt ${attemptNumber})`);
        fetchProfile(user, {
          silent: true,
          reason: `retry:${attemptNumber}`,
          timeoutMs: PROFILE_FETCH_TIMEOUT_MS * 2,
        }).catch((retryErr) => {
          console.error("❌ [AuthProvider] Retry fetch failed:", retryErr);
        });
      }, delay);
    }
  }, [profileStatus, user, fetchProfile, clearProfileRetry]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleVisibilityChange = () => {
      visibilityStateRef.current = document.visibilityState;
      if (document.visibilityState === 'hidden') {
        if (currentFetchControllerRef.current) {
          console.log("🛑 [AuthProvider] Aborting in-flight profile fetch due to tab hidden");
          deferredProfileUserRef.current = user || null;
          currentFetchControllerRef.current.abort();
        }
        return;
      }

      if (document.visibilityState === 'visible') {
        if (deferredProfileUserRef.current) {
          const deferredUser = deferredProfileUserRef.current;
          deferredProfileUserRef.current = null;
          console.log("👁️ [AuthProvider] Resuming deferred profile fetch after tab became visible");
          fetchProfile(deferredUser, {
            silent: true,
            deferIfHidden: false,
            reason: 'resume:visible',
            timeoutMs: PROFILE_FETCH_TIMEOUT_MS * 2,
          }).catch((err) => console.error(err));
          return;
        }

        if (user && profileStatus === 'error') {
          console.log("👀 [AuthProvider] Tab visible again, retrying profile fetch immediately");
          fetchProfile(user, {
            silent: true,
            deferIfHidden: false,
            reason: 'resume:error-visible',
            timeoutMs: PROFILE_FETCH_TIMEOUT_MS * 2,
          }).catch((err) => console.error(err));
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, profileStatus, fetchProfile]);

  // --- 외부에서 프로필을 갱신할 수 있도록 함수를 만듦 ---
  const refetchProfile = useCallback(async () => {
    // 현재 user 상태를 기준으로 프로필을 강제 갱신
    if (user) {
      setLoading(true); // 로딩 중 표시
      await fetchProfile(user, { reason: 'manual-refetch' });
      setLoading(false);
    }
  }, [user, fetchProfile]); // user, fetchProfile 의존

  // --- Realtime Presence 연동 (온라인 상태 추적) ---
  // user가 로그인되면 Presence 채널에 연결, 로그아웃 시 자동 해제
  const { disconnect: disconnectPresence } = usePresence(user?.id ?? null);

  // SIGNED_OUT 이벤트 시 명시적으로 Presence 연결 해제
  useEffect(() => {
    return () => {
      // 컴포넌트 언마운트 시 Presence 연결 해제
      disconnectPresence();
    };
  }, [disconnectPresence]);

  // Note: 전역 실시간 알림 구독은 InAppNotificationProvider 내부에서 처리

  const value = {
    session,
    user,
    profile,
    loading,
    profileStatus,
    refetchProfile, // <-- value에 추가
  };

  // 로딩이 완료될 때까지 기다림 (선택 사항: 로딩 스피너 표시 가능)
  // if (loading) {
  //   return <div>App Loading...</div>;
  // }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}


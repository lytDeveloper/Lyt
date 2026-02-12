/**
 * Feature Flags for WebApp
 * React Native shell과 동기화되며, 세션 관리 전략을 제어합니다.
 */

export const FEATURE_FLAGS = {
    // Stage 3: AuthProvider cold/warm start separation
    AUTH_COLD_WARM_SPLIT: true,

    // Telemetry for debugging
    TELEMETRY_ENABLED: true,

    // Phase 1: Low-Risk Stability Fixes
    SESSION_REFRESH_ON_FOREGROUND: true,    // 세션 refresh on foreground return
    CACHE_INVALIDATE_ON_FOREGROUND: true,   // React Query cache invalidation on resume

    // Phase 2: Medium-Risk (테스트 후 활성화)
    REALTIME_HEALTH_CHECK: false,           // Realtime 연결 헬스체크

    // Phase 3: High-Risk (선택적)
    NETWORK_STATUS_DETECTION: false,        // 네트워크 offline/online 감지
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

/**
 * Feature flag 상태 확인
 */
export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
    return FEATURE_FLAGS[flag] ?? false;
}

/**
 * Boot Type 정의
 * - cold: 앱 처음 시작 (세션 캐시 없음)
 * - warm: 앱 재시작 (세션 캐시 있음)
 * - resume: 백그라운드에서 복귀
 */
export type BootType = 'cold' | 'warm' | 'resume';

/**
 * Native Boot Type 힌트 (expo-shell에서 전달)
 */
type NativeBootTypeHint = 'cold' | 'recovered' | 'resume' | null;
let nativeBootTypeHint: NativeBootTypeHint = null;
let nativeBootTypeTimestamp = 0;
const HINT_TTL_MS = 10000; // 힌트 유효 시간: 10초

/**
 * Native에서 전달받은 boot type 힌트 저장
 */
export function setNativeBootTypeHint(type: 'cold' | 'recovered' | 'resume'): void {
    nativeBootTypeHint = type;
    nativeBootTypeTimestamp = Date.now();
    webTelemetry('native_boot_type_hint_received', { type });
}

// 세션 캐시 키
const SESSION_CACHE_KEY = 'bridge_session_cache_v1';
const PROFILE_CACHE_KEY = 'bridge_profile_cache_v1';
const BOOT_STATE_KEY = 'bridge_boot_state_v1';

export interface CachedSession {
    userId: string;
    expiresAt: number;
    cachedAt: number;
}

export interface CachedProfile {
    nickname: string | null;
    roles: string[];
    banned_until: string | null;
    terms_agreed_at: string | null;
    cachedAt: number;
}

/**
 * 세션 캐시 저장
 */
export function cacheSession(userId: string, expiresAt: number): void {
    try {
        const cache: CachedSession = {
            userId,
            expiresAt,
            cachedAt: Date.now(),
        };
        localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cache));
    } catch {
        // Ignore storage errors
    }
}

/**
 * 캐시된 세션 읽기
 */
export function getCachedSession(): CachedSession | null {
    try {
        const raw = localStorage.getItem(SESSION_CACHE_KEY);
        if (!raw) return null;
        const cache = JSON.parse(raw) as CachedSession;
        // 만료되었거나 1시간 이상 된 캐시는 무효
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        if (cache.expiresAt * 1000 < now || cache.cachedAt + oneHour < now) {
            localStorage.removeItem(SESSION_CACHE_KEY);
            return null;
        }
        return cache;
    } catch {
        return null;
    }
}

/**
 * 프로필 캐시 저장
 */
export function cacheProfile(profile: CachedProfile): void {
    try {
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    } catch {
        // Ignore storage errors
    }
}

/**
 * 캐시된 프로필 읽기
 */
export function getCachedProfile(): CachedProfile | null {
    try {
        const raw = localStorage.getItem(PROFILE_CACHE_KEY);
        if (!raw) return null;
        const cache = JSON.parse(raw) as CachedProfile;
        // 5분 이상 된 캐시는 무효 (프로필은 자주 변할 수 있음)
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        if (cache.cachedAt + fiveMinutes < now) {
            return null; // 무효지만 삭제하지 않음 - warm start 판별용
        }
        return cache;
    } catch {
        return null;
    }
}

/**
 * Boot type 판별
 * - Native WebView 환경에서는 expo-shell에서 전달받은 힌트를 우선 사용
 * - 웹 브라우저 환경에서는 sessionStorage 기반으로 판별
 */
export function getBootType(): BootType {
    try {
        const isNativeWebView = typeof (window as any).ReactNativeWebView !== 'undefined';
        const hintAge = Date.now() - nativeBootTypeTimestamp;

        // Native WebView 환경에서 최근 힌트가 있으면 우선 사용
        if (isNativeWebView && nativeBootTypeHint && hintAge < HINT_TTL_MS) {
            // Native boot type을 webapp boot type으로 매핑
            if (nativeBootTypeHint === 'recovered') {
                // recovered = 앱 재시작 (5분 이내) → warm으로 처리 (캐시 활용)
                return 'warm';
            }
            if (nativeBootTypeHint === 'resume') {
                // resume = 백그라운드 복귀
                return 'resume';
            }
            // cold = 완전히 새로 시작
            return 'cold';
        }

        // 기존 sessionStorage 기반 로직
        const bootState = sessionStorage.getItem(BOOT_STATE_KEY);
        const cachedSession = getCachedSession();

        if (bootState === 'active') {
            // 이미 이 탭에서 한 번 부팅됨 → resume
            return 'resume';
        }

        // 첫 번째 탭 방문 표시
        sessionStorage.setItem(BOOT_STATE_KEY, 'active');

        if (cachedSession) {
            // 캐시된 세션 있음 → warm start
            return 'warm';
        }

        // 캐시 없음 → cold start
        return 'cold';
    } catch {
        return 'cold';
    }
}

/**
 * 캐시 전체 삭제 (로그아웃 시)
 */
export function clearSessionCache(): void {
    try {
        localStorage.removeItem(SESSION_CACHE_KEY);
        localStorage.removeItem(PROFILE_CACHE_KEY);
        sessionStorage.removeItem(BOOT_STATE_KEY);
    } catch {
        // Ignore
    }
}

/**
 * Telemetry 로깅
 */
export function webTelemetry(event: string, payload: Record<string, unknown> = {}): void {
    if (!isFeatureEnabled('TELEMETRY_ENABLED')) return;

    const enrichedPayload = {
        ...payload,
        timestamp: Date.now(),
        isNativeWebView: typeof (window as any).ReactNativeWebView !== 'undefined',
    };

    if (import.meta.env.DEV) {
        console.log(`[WebTelemetry] ${event}`, enrichedPayload);
    }
}

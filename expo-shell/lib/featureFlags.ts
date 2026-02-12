/**
 * Feature Flags for Safe WebView Navigation
 * 모든 플래그는 기본값이 true (기존 동작 유지)
 * 문제 발생 시 false로 전환하여 이전 동작으로 롤백
 */

export const FEATURE_FLAGS = {
    // Stage 1: BackHandler + iOS gesture 동적 제어
    SAFE_WEBVIEW_NAV: true,

    // Stage 2: Enhanced Native-Web bridge with AppState
    ENHANCED_NAV_SYNC: true,

    // Boot Type Detection: cold/recovered/resume 판별
    BOOT_TYPE_DETECTION: true,

    // Splash Optimization: boot type에 따라 스플래시 시간 조정
    SPLASH_OPTIMIZATION: true,

    // Stage 3: AuthProvider cold/warm start separation
    AUTH_COLD_WARM_SPLIT: true,

    // Telemetry
    TELEMETRY_ENABLED: true,
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

/**
 * Feature flag 상태 확인
 * @param flag - 확인할 feature flag 키
 * @returns feature flag가 활성화되어 있으면 true
 */
export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
    return FEATURE_FLAGS[flag] ?? false;
}

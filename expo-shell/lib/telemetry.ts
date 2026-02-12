/**
 * Telemetry for WebView Navigation Diagnostics
 * 진단용 로깅 - 프로덕션에서는 분석 서비스로 전송 가능
 */
import { Platform } from 'react-native';
import { isFeatureEnabled } from './featureFlags';

export type TelemetryEvent =
    | 'safe_webview_nav_enabled'
    | 'safe_webview_nav_disabled'
    | 'back_handler_triggered'
    | 'back_handler_blocked'
    | 'ios_gesture_toggled'
    | 'history_state_sync'
    | 'nav_state_throttled'
    | 'double_press_exit'
    | 'app_state_changed'
    | 'auth_boot_type'
    | 'native_boot_type'
    | 'native_boot_type_changed'
    | 'splash_timing';

export type TelemetryPayload = {
    feature?: string;
    enabled?: boolean;
    canGoBack?: boolean;
    historyLength?: number;
    platform?: string;
    timestamp?: number;
    action?: string;
    allowed?: boolean;
    path?: string;
    source?: 'web' | 'native';
    type?: 'cold' | 'warm' | 'resume' | 'recovered';
    splashDuration?: number;
    requestedDelay?: number;
    bootType?: 'cold' | 'recovered' | 'resume';
    previousState?: string;
    hasCache?: boolean;
    appState?: string;
    [key: string]: unknown;
};

/**
 * 텔레메트리 이벤트 전송
 * @param event - 이벤트 이름
 * @param payload - 이벤트 데이터
 */
export function telemetry(event: TelemetryEvent, payload: TelemetryPayload = {}): void {
    // Telemetry가 비활성화되어 있으면 무시
    if (!isFeatureEnabled('TELEMETRY_ENABLED')) {
        return;
    }

    const enrichedPayload: TelemetryPayload = {
        ...payload,
        timestamp: Date.now(),
        platform: Platform.OS,
    };

    // 진단용 로그 (프로덕션에서는 실제 분석 서비스로 전송)
    if (__DEV__) {
        console.log(`[Telemetry] ${event}`, enrichedPayload);
    }

    // TODO: 실제 분석 서비스 연동 (예: Amplitude, Firebase Analytics)
    // analytics.track(event, enrichedPayload);
}

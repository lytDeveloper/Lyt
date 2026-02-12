/**
 * Stability Telemetry Utility
 * 안정성 관련 이벤트 로깅 및 진단 도구
 */

import { webTelemetry, isFeatureEnabled } from './featureFlags';

export type StabilityEvent =
    | 'foreground_resume'
    | 'session_refresh_triggered'
    | 'session_refresh_success'
    | 'session_refresh_failed'
    | 'cache_invalidate_triggered'
    | 'realtime_reconnect_triggered'
    | 'realtime_connection_lost'
    | 'network_offline'
    | 'network_online'
    | 'error_boundary_triggered';

interface StabilityPayload {
    timestamp?: number;
    sessionAge?: number;
    cacheAge?: number;
    connectionState?: string;
    error?: string;
    [key: string]: unknown;
}

/**
 * 안정성 관련 이벤트 로깅
 */
export function logStability(event: StabilityEvent, payload: StabilityPayload = {}): void {
    if (!isFeatureEnabled('TELEMETRY_ENABLED')) return;

    const enrichedPayload = {
        ...payload,
        timestamp: payload.timestamp ?? Date.now(),
        eventType: 'stability',
    };

    webTelemetry(`stability:${event}`, enrichedPayload);
}

/**
 * 마지막 foreground 복귀 시점 저장
 */
let lastForegroundTime = 0;

export function recordForegroundResume(): void {
    const now = Date.now();
    const backgroundDuration = lastForegroundTime > 0 ? now - lastForegroundTime : 0;
    lastForegroundTime = now;

    logStability('foreground_resume', {
        backgroundDurationMs: backgroundDuration,
    });
}

export function getLastForegroundTime(): number {
    return lastForegroundTime;
}

/**
 * 세션 age 계산 (마지막 refresh 이후 경과 시간)
 */
let lastSessionRefreshTime = Date.now();

export function recordSessionRefresh(): void {
    lastSessionRefreshTime = Date.now();
}

export function getSessionAge(): number {
    return Date.now() - lastSessionRefreshTime;
}

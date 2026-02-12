import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import * as Sentry from '@sentry/react';

// 무한 새로고침 방지용 상수
const RELOAD_KEY = 'lazyWithRetry_reloadAttempts';
const MAX_RELOAD_ATTEMPTS = 2;
const RELOAD_RESET_TIME = 60_000; // 1분 후 리셋

/**
 * 동적 import를 재시도하는 lazy 래퍼입니다.
 * 네트워크 불안정 등으로 청크 로드 실패 시 정해진 횟수만큼 재시도하고,
 * 최종 실패 시 페이지를 새로고침하여 복구를 시도합니다.
 *
 * @param importFn 동적 import 함수 (예: () => import('./Page'))
 * @param retries 재시도 횟수 (기본값: 3)
 * @param delay 재시도 간격 (ms, 기본값: 1000)
 */
export function lazyWithRetry<T extends ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    retries = 3,
    delay = 1000
): LazyExoticComponent<T> {
    return lazy(async () => {
        for (let i = 0; i < retries; i++) {
            try {
                const startTime = Date.now();
                const result = await importFn();
                const loadTime = Date.now() - startTime;

                // 성공 시 로드 시간 로깅 (3초 이상 걸린 경우만)
                if (loadTime > 3000) {
                    console.warn(`[lazyWithRetry] Slow chunk load: ${loadTime}ms`);
                    Sentry.addBreadcrumb({
                        category: 'chunk-load',
                        message: `Slow chunk load: ${loadTime}ms`,
                        level: 'warning',
                    });
                }

                // 성공 시 재로드 카운터 리셋
                try {
                    sessionStorage.removeItem(RELOAD_KEY);
                } catch (_) { /* sessionStorage 접근 실패 무시 */ }

                return result;
            } catch (error) {
                console.warn(`[lazyWithRetry] Failed to load module (attempt ${i + 1}/${retries})`, error);

                // Sentry에 에러 기록
                Sentry.addBreadcrumb({
                    category: 'chunk-load',
                    message: `Chunk load attempt ${i + 1}/${retries} failed`,
                    level: 'warning',
                    data: {
                        error: error instanceof Error ? error.message : String(error),
                        userAgent: navigator.userAgent,
                    },
                });

                // 마지막 시도 실패 시
                if (i === retries - 1) {
                    // 청크 로드 에러인지 확인
                    const isChunkError = error instanceof Error &&
                        (error.message.includes('dynamically imported module') ||
                         error.message.includes('Importing a module script failed') ||
                         error.message.includes('Loading chunk') ||
                         error.message.includes('Failed to fetch'));

                    // Sentry에 최종 에러 전송
                    Sentry.captureException(error, {
                        tags: {
                            errorType: 'chunk_load_failed',
                            isChunkError: String(isChunkError),
                        },
                        extra: {
                            retries,
                            userAgent: navigator.userAgent,
                            url: window.location.href,
                        },
                    });

                    if (isChunkError) {
                        // 무한 새로고침 방지 체크
                        try {
                            const stored = sessionStorage.getItem(RELOAD_KEY);
                            const reloadData = stored ? JSON.parse(stored) : { count: 0, timestamp: Date.now() };

                            // 1분이 지났으면 카운터 리셋
                            if (Date.now() - reloadData.timestamp > RELOAD_RESET_TIME) {
                                reloadData.count = 0;
                                reloadData.timestamp = Date.now();
                            }

                            if (reloadData.count >= MAX_RELOAD_ATTEMPTS) {
                                console.error('[lazyWithRetry] Max reload attempts reached. Not reloading.');
                                Sentry.captureMessage('Chunk load failed - max reload attempts reached', 'error');
                                // 새로고침하지 않고 에러를 던짐
                                throw error;
                            }

                            // 카운터 증가 후 저장
                            reloadData.count++;
                            reloadData.timestamp = Date.now();
                            sessionStorage.setItem(RELOAD_KEY, JSON.stringify(reloadData));
                        } catch (_) {
                            // sessionStorage 접근 실패 시 그냥 새로고침
                        }

                        console.error('[lazyWithRetry] Chunk load failed. Reloading page...');
                        window.location.reload();
                    }

                    // React.lazy는 Promise를 반환해야 하므로 에러를 다시 던짐
                    throw error;
                }

                // 재시도 대기 (지수 백오프)
                const backoffDelay = delay * Math.pow(1.5, i);
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
            }
        }
        throw new Error('Failed to load module after retries');
    });
}

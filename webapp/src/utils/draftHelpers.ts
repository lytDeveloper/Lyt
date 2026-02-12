/**
 * Draft Helpers
 * 자동 저장 및 페이지 이탈 감지를 위한 유틸리티 훅
 */

import { useEffect, useRef, useCallback } from 'react';

/**
 * Debounce 훅
 * @param callback - 실행할 함수
 * @param delay - 지연 시간 (ms)
 * @returns debounced 함수
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * 페이지 이탈 감지 훅 (브라우저 탭 닫기/새로고침)
 * @param hasUnsavedChanges - 저장되지 않은 변경사항이 있는지 여부
 * @param onSave - 저장 함수 (확인 시 호출)
 */
export function useBeforeUnload(
  hasUnsavedChanges: boolean,
  onSave: () => void
) {
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // 브라우저 기본 경고 표시
      e.preventDefault();
      e.returnValue = '';

      // 확인 다이얼로그는 브라우저 기본 경고만 표시
      // 실제 저장은 사용자가 확인을 누른 후 처리하기 어려우므로
      // 여기서는 경고만 표시하고, 실제 저장은 페이지가 닫히기 전에
      // 다른 메커니즘(예: visibilitychange)으로 처리할 수 있음
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, onSave]);
}

/**
 * React Router 네비게이션 차단 훅
 * @param hasUnsavedChanges - 저장되지 않은 변경사항이 있는지 여부
 * @param onSave - 저장 함수 (확인 시 호출)
 * @returns blocker 객체와 다이얼로그 상태 관리
 * 
 * Note: BrowserRouter를 사용하는 경우 useBlocker를 사용할 수 없으므로,
 * 이 훅은 다이얼로그를 표시하지 않습니다. 대신 useBeforeUnload를 사용하여
 * 브라우저 탭 닫기/새로고침 시에만 경고를 표시합니다.
 */
export function useNavigationBlocker(
  _hasUnsavedChanges: boolean,
  onSave: () => void
) {
  // BrowserRouter에서는 useBlocker를 사용할 수 없으므로
  // 다이얼로그를 표시하지 않고 항상 false를 반환합니다.
  // 실제 네비게이션 차단은 useBeforeUnload로 처리됩니다.

  const handleConfirm = () => {
    onSave();
  };

  const handleCancel = () => {
    // 취소 시 아무 작업도 하지 않음
  };

  return {
    showDialog: false, // BrowserRouter에서는 다이얼로그 표시 안 함
    handleConfirm,
    handleCancel,
  };
}

/**
 * 자동 저장 훅
 * @param saveFn - 저장 함수
 * @param data - 저장할 데이터
 * @param delay - debounce 지연 시간 (ms, 기본값 500)
 */
export function useAutoSave<T>(
  saveFn: (data: T) => Promise<void> | void,
  data: T,
  delay: number = 500
) {
  const debouncedSave = useDebounce(saveFn, delay);
  const previousDataRef = useRef<T>(data);

  useEffect(() => {
    // 데이터가 변경되었을 때만 저장
    if (JSON.stringify(previousDataRef.current) !== JSON.stringify(data)) {
      previousDataRef.current = data;
      debouncedSave(data);
    }
  }, [data, debouncedSave]);

  // 컴포넌트 언마운트 시 즉시 저장
  useEffect(() => {
    return () => {
      // cleanup 시 즉시 저장 (debounce 무시)
      if (previousDataRef.current) {
        saveFn(previousDataRef.current);
      }
    };
  }, [saveFn]);
}


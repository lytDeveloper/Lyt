/**
 * useElapsedTime Hook
 *
 * Purpose: 경과 시간을 "n분 전" 형식으로 실시간 업데이트
 *
 * Features:
 * - 1분마다 자동 업데이트
 * - CLAUDE.md UI/UX 규칙 준수 (초/분/시간 단위 절삭)
 * - 빈 값 방어 처리
 *
 * Usage:
 * const elapsed = useElapsedTime(item.latestSupportAt);
 * // Returns: "2분 전", "3시간 전", "5일 전" etc.
 */

import { useState, useEffect } from 'react';
import { formatElapsedTime } from '../utils/timeFormatter';

export function useElapsedTime(timestamp?: string) {
  const [elapsed, setElapsed] = useState(() =>
    timestamp ? formatElapsedTime(timestamp) : ''
  );

  useEffect(() => {
    if (!timestamp) {
      setElapsed('');
      return;
    }

    // Initial set
    setElapsed(formatElapsedTime(timestamp));

    // Update every minute (60000ms)
    const interval = setInterval(() => {
      setElapsed(formatElapsedTime(timestamp));
    }, 60000);

    return () => clearInterval(interval);
  }, [timestamp]);

  return elapsed;
}

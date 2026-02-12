/**
 * Time Formatter Utility
 *
 * Purpose: 경과 시간을 "n분 전" 형식으로 포맷
 *
 * CLAUDE.md UI/UX 규칙 (MUST FOLLOW):
 * - 1분 미만: '방금 전'
 * - 1분 이상: 초 단위 절삭 (ex: 2분 18초 전 → '2분 전')
 * - 1시간 이상: 분 단위 절삭 (ex: 3시간 52분 전 → '3시간 전')
 * - 1일 이상: 시간 단위 절삭 (ex: 4일 23시간 전 → '4일 전')
 * - 2주일 (14일) 이상: 일 단위 절삭 (ex: 14일 경과부터 '2주 전', 21일 경과부터 '3주 전')
 * - 1개월 (30일) 이상: 주 단위 절삭 (ex: 4주 전 → '1개월 전')
 * - 1년 (365일) 이상: 개월 단위 절삭 (ex: 12개월 전 → '1년 전')
 *
 * Usage:
 * formatElapsedTime('2024-01-15T10:30:00Z') // '2분 전'
 */

export function formatElapsedTime(timestamp: string): string {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();

  // Negative time (future date) - return empty
  if (diffMs < 0) return '';

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  // 1분 미만: '방금 전'
  if (diffMin < 1) return '방금 전';

  // 1분 이상 1시간 미만: 'n분 전' (초 단위 절삭)
  if (diffMin < 60) return `${diffMin}분 전`;

  // 1시간 이상 24시간 미만: 'n시간 전' (분 단위 절삭)
  if (diffHour < 24) return `${diffHour}시간 전`;

  // 1일 이상 14일 미만: 'n일 전' (시간 단위 절삭)
  if (diffDay < 14) return `${diffDay}일 전`;

  // 14일 이상 30일 미만: 'n주 전' (일 단위 절삭)
  const diffWeek = Math.floor(diffDay / 7);
  if (diffDay < 30) return `${diffWeek}주 전`;

  // 30일 이상 365일 미만: 'n개월 전' (주 단위 절삭)
  const diffMonth = Math.floor(diffDay / 30);
  if (diffDay < 365) return `${diffMonth}개월 전`;

  // 365일 이상: 'n년 전' (개월 단위 절삭)
  const diffYear = Math.floor(diffDay / 365);
  return `${diffYear}년 전`;
}

// Alias for getRelativeTime (used in activity components)
export const getRelativeTime = formatElapsedTime;

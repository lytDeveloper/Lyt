/**
 * Business Day Utilities for Korean Context
 * Calculates business days excluding weekends and Korean national holidays
 *
 * MAINTENANCE NOTE: Update Korean holidays annually (typically in December for next year)
 */

/**
 * Korean national holidays for 2025-2026
 * Format: 'YYYY-MM-DD'
 *
 * Note: Some holidays like 설날 and 추석 vary by year based on lunar calendar.
 * These dates should be updated annually.
 */
const KOREAN_HOLIDAYS_2025: string[] = [
  // 2025년
  '2025-01-01', // 신정
  '2025-01-28', // 설날 연휴
  '2025-01-29', // 설날
  '2025-01-30', // 설날 연휴
  '2025-03-01', // 삼일절
  '2025-05-05', // 어린이날
  '2025-05-06', // 대체공휴일 (석가탄신일)
  '2025-05-15', // 석가탄신일 (음력 4/8)
  '2025-06-06', // 현충일
  '2025-08-15', // 광복절
  '2025-10-03', // 개천절
  '2025-10-05', // 추석 연휴
  '2025-10-06', // 추석
  '2025-10-07', // 추석 연휴
  '2025-10-08', // 대체공휴일 (추석)
  '2025-10-09', // 한글날
  '2025-12-25', // 크리스마스
];

const KOREAN_HOLIDAYS_2026: string[] = [
  // 2026년
  '2026-01-01', // 신정
  '2026-02-16', // 설날 연휴
  '2026-02-17', // 설날
  '2026-02-18', // 설날 연휴
  '2026-03-01', // 삼일절
  '2026-03-02', // 대체공휴일 (삼일절)
  '2026-05-05', // 어린이날
  '2026-05-24', // 석가탄신일 (음력 4/8)
  '2026-05-25', // 대체공휴일 (석가탄신일)
  '2026-06-06', // 현충일
  '2026-08-15', // 광복절
  '2026-08-17', // 대체공휴일 (광복절)
  '2026-09-24', // 추석 연휴
  '2026-09-25', // 추석
  '2026-09-26', // 추석 연휴
  '2026-10-03', // 개천절
  '2026-10-05', // 대체공휴일 (개천절)
  '2026-10-09', // 한글날
  '2026-12-25', // 크리스마스
];

// Combined holiday set for fast lookup
const KOREAN_HOLIDAYS = new Set([
  ...KOREAN_HOLIDAYS_2025,
  ...KOREAN_HOLIDAYS_2026,
]);

/**
 * Format date to 'YYYY-MM-DD' string for comparison
 */
function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Check if a date is a Korean national holiday
 */
function isKoreanHoliday(date: Date): boolean {
  const dateKey = formatDateKey(date);
  return KOREAN_HOLIDAYS.has(dateKey);
}

/**
 * Check if a date is a business day (not weekend and not holiday)
 */
export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date) && !isKoreanHoliday(date);
}

/**
 * Add business days to a date
 * @param startDate - Starting date
 * @param businessDays - Number of business days to add
 * @returns New date after adding business days
 */
export function addBusinessDays(startDate: Date, businessDays: number): Date {
  const result = new Date(startDate);
  let daysAdded = 0;

  while (daysAdded < businessDays) {
    result.setDate(result.getDate() + 1);
    if (isBusinessDay(result)) {
      daysAdded++;
    }
  }

  return result;
}

/**
 * Count business days between two dates (exclusive of end date)
 * @param startDate - Starting date
 * @param endDate - Ending date
 * @returns Number of business days between the dates
 */
export function countBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  current.setDate(current.getDate() + 1); // Start counting from day after startDate

  while (current < endDate) {
    if (isBusinessDay(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Check if current date is within N business days from a given date
 * Used for cancellation policy (e.g., within 7 business days of payment)
 *
 * @param paymentDate - The date of payment (Date object or ISO string)
 * @param businessDays - Number of business days allowed (default: 7)
 * @returns true if cancellation is allowed (within business days limit)
 *
 * @example
 * // Check if within 7 business days of payment
 * const paymentDate = new Date('2025-01-15T10:00:00Z');
 * const canCancel = isWithinBusinessDays(paymentDate, 7);
 */
export function isWithinBusinessDays(
  paymentDate: Date | string | null | undefined,
  businessDays: number = 7
): boolean {
  if (!paymentDate) {
    return false;
  }

  const payment = typeof paymentDate === 'string'
    ? new Date(paymentDate)
    : paymentDate;

  if (isNaN(payment.getTime())) {
    console.warn('[businessDayUtils] Invalid payment date:', paymentDate);
    return false;
  }

  const now = new Date();

  // Reset time to start of day for accurate day comparison
  const paymentStart = new Date(payment);
  paymentStart.setHours(0, 0, 0, 0);

  const nowStart = new Date(now);
  nowStart.setHours(0, 0, 0, 0);

  // If payment date is in the future, return true (edge case)
  if (paymentStart > nowStart) {
    return true;
  }

  // Count business days from payment date to now
  const businessDaysElapsed = countBusinessDays(paymentStart, nowStart);

  return businessDaysElapsed < businessDays;
}

/**
 * Get the deadline date (last day for cancellation)
 * @param paymentDate - The date of payment
 * @param businessDays - Number of business days allowed
 * @returns The last date when cancellation is possible
 */
export function getCancellationDeadline(
  paymentDate: Date | string | null | undefined,
  businessDays: number = 7
): Date | null {
  if (!paymentDate) {
    return null;
  }

  const payment = typeof paymentDate === 'string'
    ? new Date(paymentDate)
    : paymentDate;

  if (isNaN(payment.getTime())) {
    return null;
  }

  return addBusinessDays(payment, businessDays);
}

/**
 * Get remaining business days until cancellation deadline
 * @param paymentDate - The date of payment
 * @param businessDays - Total business days allowed
 * @returns Number of remaining business days (0 if expired)
 */
export function getRemainingBusinessDays(
  paymentDate: Date | string | null | undefined,
  businessDays: number = 7
): number {
  if (!paymentDate) {
    return 0;
  }

  const payment = typeof paymentDate === 'string'
    ? new Date(paymentDate)
    : paymentDate;

  if (isNaN(payment.getTime())) {
    return 0;
  }

  const now = new Date();

  const paymentStart = new Date(payment);
  paymentStart.setHours(0, 0, 0, 0);

  const nowStart = new Date(now);
  nowStart.setHours(0, 0, 0, 0);

  const businessDaysElapsed = countBusinessDays(paymentStart, nowStart);
  const remaining = businessDays - businessDaysElapsed;

  return Math.max(0, remaining);
}

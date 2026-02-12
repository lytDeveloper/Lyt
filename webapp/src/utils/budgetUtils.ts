/**
 * Budget Utilities
 * Utilities for parsing and validating project budget ranges
 */

/**
 * Budget range mapping: Korean string -> min/max values in KRW
 */
export const BUDGET_RANGE_MAP: Record<string, { min: number; max: number | null }> = {
  '50만원 이하': { min: 0, max: 500000 },
  '50-100만원': { min: 500000, max: 1000000 },
  '100-300만원': { min: 1000000, max: 3000000 },
  '300-500만원': { min: 3000000, max: 5000000 },
  '500-1000만원': { min: 5000000, max: 10000000 },
  '1000만원 이상': { min: 10000000, max: null },
};

/**
 * Parse a budget range string to get min/max values
 * @param budgetRange - Budget range string (e.g., "50-100만원")
 * @returns Object with min and max values, or null if invalid
 *
 * @example
 * parseBudgetRange('50-100만원') // { min: 500000, max: 1000000 }
 * parseBudgetRange('1000만원 이상') // { min: 10000000, max: null }
 */
export function parseBudgetRange(budgetRange: string | null | undefined): { min: number; max: number | null } | null {
  if (!budgetRange) {
    return null;
  }

  const trimmed = budgetRange.trim();
  return BUDGET_RANGE_MAP[trimmed] || null;
}

/**
 * Validate if a confirmed budget meets the minimum requirement of a budget range
 * @param confirmedBudget - The confirmed budget amount in KRW
 * @param budgetRange - The budget range string
 * @returns true if valid, false otherwise
 *
 * @example
 * validateConfirmedBudget(700000, '50-100만원') // true (700000 >= 500000)
 * validateConfirmedBudget(400000, '50-100만원') // false (400000 < 500000)
 */
export function validateConfirmedBudget(confirmedBudget: number, budgetRange: string | null | undefined): boolean {
  const range = parseBudgetRange(budgetRange);

  if (!range) {
    // If no budget range specified, any positive amount is valid
    return confirmedBudget > 0;
  }

  return confirmedBudget >= range.min;
}

/**
 * Format a number as Korean currency string
 * @param amount - Amount in KRW
 * @returns Formatted string with thousand separators
 *
 * @example
 * formatCurrency(1234567) // "1,234,567"
 */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString('ko-KR');
}

/**
 * Parse a formatted currency string to number
 * @param formatted - Formatted string (e.g., "1,234,567")
 * @returns Parsed number
 *
 * @example
 * parseCurrency('1,234,567') // 1234567
 */
export function parseCurrency(formatted: string): number {
  const cleaned = formatted.replace(/,/g, '');
  const parsed = parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Get a user-friendly error message for budget validation failure
 * @param _confirmedBudget - The confirmed budget amount (unused but kept for API compatibility)
 * @param budgetRange - The budget range string
 * @returns Error message string
 */
export function getBudgetValidationError(_confirmedBudget: number, budgetRange: string | null | undefined): string {
  const range = parseBudgetRange(budgetRange);

  if (!range) {
    return '유효한 금액을 입력해주세요.';
  }

  const minFormatted = formatCurrency(range.min);
  return `확정 금액은 최소 ${minFormatted}원 이상이어야 해요.`;
}

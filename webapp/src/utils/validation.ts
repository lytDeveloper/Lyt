/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Form validation utilities
 * Centralized validation logic for onboarding and forms
 */

// --- Regex Patterns ---

/** Allows Korean, English, numbers, spaces, and limited special characters (., -, &) */
export const ID_REGEX = /^[가-힣a-zA-Z0-9.\-& ]+$/;

/** Email validation */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** URL validation (http/https) */
export const URL_REGEX = /^https?:\/\/.+/;

/** Korean business registration number (10 digits with optional hyphens) */
export const BUSINESS_NUMBER_REGEX = /^\d{3}-?\d{2}-?\d{5}$/;

// --- Validation Functions ---

/**
 * Validate nickname/ID
 * @param value - The nickname to validate
 * @param options - Validation options
 * @returns Error message or null if valid
 */
export function validateNickname(
  value: string,
  options: { minLength?: number; maxLength?: number } = {}
): string | null {
  const { minLength = 1, maxLength = 20 } = options;

  if (!value.trim()) {
    return '닉네임을 입력해주세요.';
  }

  if (value.length < minLength) {
    return `${minLength}자 이상 입력해주세요.`;
  }

  if (value.length > maxLength) {
    return `${maxLength}자 이하로 입력해주세요.`;
  }

  // Check if the value ends with a space
  if (value.endsWith(' ')) {
    return '닉네임은 공백으로 끝날 수 없어요.';
  }

  if (!ID_REGEX.test(value)) {
    return '한글, 영문, 숫자만 입력해주세요. (특수문자는 .,-,&만 사용 가능)';
  }

  return null;
}

/**
 * Validate email address
 * @param email - The email to validate
 * @returns Error message or null if valid
 */
export function validateEmail(email: string): string | null {
  if (!email.trim()) {
    return '이메일을 입력해주세요.';
  }

  if (!EMAIL_REGEX.test(email)) {
    return '올바른 이메일 형식이 아니에요.';
  }

  return null;
}

/**
 * Validate URL
 * @param url - The URL to validate
 * @param required - Whether URL is required
 * @returns Error message or null if valid
 */
export function validateUrl(url: string, required: boolean = false): string | null {
  if (!url.trim()) {
    return required ? 'URL을 입력해주세요.' : null;
  }

  if (!URL_REGEX.test(url)) {
    return 'http:// 또는 https://로 시작하는 URL을 입력해주세요.';
  }

  return null;
}

/**
 * Validate business registration number
 * @param number - The business registration number
 * @returns Error message or null if valid
 */
export function validateBusinessNumber(number: string): string | null {
  if (!number.trim()) {
    return '사업자등록번호를 입력해주세요.';
  }

  const cleanNumber = number.replace(/-/g, '');

  if (cleanNumber.length !== 10) {
    return '사업자등록번호는 10자리 숫자에요.';
  }

  if (!/^\d+$/.test(cleanNumber)) {
    return '숫자만 입력해주세요.';
  }

  return null;
}

/**
 * Validate required field
 * @param value - The value to check
 * @param fieldName - Name of the field for error message
 * @returns Error message or null if valid
 */
export function validateRequired(value: any, fieldName: string = '필드'): string | null {
  if (value === null || value === undefined || value === '') {
    return `${fieldName}를 입력해주세요.`;
  }

  if (typeof value === 'string' && !value.trim()) {
    return `${fieldName}를 입력해주세요.`;
  }

  if (Array.isArray(value) && value.length === 0) {
    return `${fieldName}를 선택해주세요.`;
  }

  return null;
}

/**
 * Validate minimum selection count
 * @param selected - Array of selected items
 * @param min - Minimum count required
 * @param fieldName - Name of the field for error message
 * @returns Error message or null if valid
 */
export function validateMinSelection(
  selected: any[],
  min: number,
  fieldName: string = '항목'
): string | null {
  if (selected.length < min) {
    return `최소 ${min}개의 ${fieldName}을 선택해주세요.`;
  }
  return null;
}

/**
 * Validate maximum selection count
 * @param selected - Array of selected items
 * @param max - Maximum count allowed
 * @returns Error message or null if valid
 */
export function validateMaxSelection(
  selected: any[],
  max: number
): string | null {
  if (selected.length > max) {
    return `최대 ${max}개까지 선택 가능해요.`;
  }
  return null;
}

/**
 * Validate text length
 * @param text - Text to validate
 * @param options - Min/max length options
 * @returns Error message or null if valid
 */
export function validateLength(
  text: string,
  options: { min?: number; max?: number; fieldName?: string } = {}
): string | null {
  const { min, max, fieldName = '텍스트' } = options;

  if (min !== undefined && text.length < min) {
    return `${fieldName}는 최소 ${min}자 이상이어야 해요.`;
  }

  if (max !== undefined && text.length > max) {
    return `${fieldName}는 최대 ${max}자까지 입력 가능해요.`;
  }

  return null;
}

/**
 * Validate file
 * @param file - File to validate
 * @param options - Validation options
 * @returns Error message or null if valid
 */
export function validateFile(
  file: File | null,
  options: {
    required?: boolean;
    maxSize?: number; // in MB
    allowedTypes?: string[];
    fieldName?: string;
  } = {}
): string | null {
  const { required = false, maxSize, allowedTypes, fieldName = '파일' } = options;

  if (!file) {
    return required ? `${fieldName}을 선택해주세요.` : null;
  }

  if (maxSize && file.size > maxSize * 1024 * 1024) {
    return `${fieldName} 크기는 ${maxSize}MB 이하여야 해요.`;
  }

  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return `허용되지 않는 파일 형식이에요.`;
  }

  return null;
}

/**
 * Validate phone number (Korean format)
 * @param phone - Phone number to validate
 * @returns Error message or null if valid
 */
export function validatePhone(phone: string): string | null {
  if (!phone.trim()) {
    return '전화번호를 입력해주세요.';
  }

  const cleaned = phone.replace(/[\s-]/g, '');

  if (!/^0\d{9,10}$/.test(cleaned)) {
    return '올바른 전화번호 형식이 아니에요.';
  }

  return null;
}

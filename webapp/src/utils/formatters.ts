/**
 * Formatting utilities
 * Centralized formatting functions for display and data transformation
 */

// --- Number Formatting ---

/**
 * Format number with commas (thousands separator)
 * @param num - Number to format
 * @returns Formatted string
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('ko-KR');
}

/**
 * Format currency (Korean Won)
 * @param amount - Amount to format
 * @param showSymbol - Whether to show ₩ symbol
 * @returns Formatted string
 */
export function formatCurrency(amount: number, showSymbol: boolean = true): string {
  const formatted = formatNumber(amount);
  return showSymbol ? `₩${formatted}` : formatted;
}

/**
 * Format number as compact (e.g., 1.2K, 3.5M)
 * @param num - Number to format
 * @returns Compact formatted string
 */
export function formatCompactNumber(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  if (num < 1000000000) return `${(num / 1000000).toFixed(1)}M`;
  return `${(num / 1000000000).toFixed(1)}B`;
}

/**
 * Format percentage
 * @param value - Decimal value (0-1)
 * @param decimals - Number of decimal places
 * @returns Formatted string with % symbol
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

// --- Date/Time Formatting ---

/**
 * Format date to Korean format (YYYY년 MM월 DD일)
 * @param date - Date to format
 * @returns Formatted string
 */

// export function formatDate(date: Date | string): string {
//   const d = typeof date === 'string' ? new Date(date) : date;

export function formatDate(date: Date | string | null | undefined): string {
  // null이나 undefined 체크
  if (!date) {
    return '';
  }

  let d: Date;

  if (typeof date === 'string') {
    // 빈 문자열 체크
    if (date.trim() === '') {
      return '';
    }

    // ISO 형식인지 확인 (T 또는 - 포함)
    if (date.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(date)) {
      d = new Date(date);
    } else {
      // 한국어 형식 파싱 시도: "2026. 1. 23. 오후 3:30" 또는 "2026.1.23"
      const match = date.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
      if (match) {
        const [, year, month, day] = match;
        d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        d = new Date(date);
      }
    }

    // Invalid Date 체크
    if (isNaN(d.getTime())) {
      console.warn('Invalid date format:', date);
      return '';
    }
  } else {
    d = date;

    // Invalid Date 체크
    if (isNaN(d.getTime())) {
      console.warn('Invalid date object:', date);
      return '';
    }
  }

  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${year}년 ${month}월 ${day}일`;
}

/**
 * Format date to short format (YYYY.MM.DD)
 * @param date - Date to format
 * @returns Formatted string
 */

// export function formatDateShort(date: Date | string): string {
//   const d = typeof date === 'string' ? new Date(date) : date;

export function formatDateShort(date: Date | string | null | undefined): string {
  // null이나 undefined 체크
  if (!date) {
    return '';
  }

  let d: Date;

  if (typeof date === 'string') {
    // 빈 문자열 체크
    if (date.trim() === '') {
      return '';
    }

    // ISO 형식인지 확인 (T 또는 - 포함)
    if (date.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(date)) {
      d = new Date(date);
    } else {
      // 한국어 형식 파싱 시도: "2026. 1. 23. 오후 3:30" 또는 "2026.1.23"
      const match = date.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
      if (match) {
        const [, year, month, day] = match;
        d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        d = new Date(date);
      }
    }

    // Invalid Date 체크
    if (isNaN(d.getTime())) {
      console.warn('Invalid date format:', date);
      return '';
    }
  } else {
    d = date;

    // Invalid Date 체크
    if (isNaN(d.getTime())) {
      console.warn('Invalid date object:', date);
      return '';
    }
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

/**
 * Format date and time
 * @param date - Date to format
 * @returns Formatted string
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const datePart = formatDateShort(d);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${datePart} ${hours}:${minutes}`;
}

/**
 * Format relative time (e.g., "2시간 전", "3일 전")
 * @param date - Date to compare from
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 30) return `${days}일 전`;
  if (months < 12) return `${months}개월 전`;
  return `${years}년 전`;
}

// --- Phone Number Formatting ---

/**
 * Format phone number (Korean format)
 * @param phone - Phone number string
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10) {
    // 010-XXX-XXXX or 02-XXXX-XXXX
    if (cleaned.startsWith('02')) {
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  if (cleaned.length === 11) {
    // 010-XXXX-XXXX
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }

  return phone;
}

// --- Business Number Formatting ---

/**
 * Format business registration number
 * @param number - Business registration number
 * @returns Formatted number (XXX-XX-XXXXX)
 */
export function formatBusinessNumber(number: string): string {
  const cleaned = number.replace(/\D/g, '');

  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
  }

  return number;
}

// --- Text Formatting ---

/**
 * Truncate text to specified length
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add when truncated
 * @returns Truncated text
 */
export function truncate(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Capitalize first letter
 * @param text - Text to capitalize
 * @returns Capitalized text
 */
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Convert to title case
 * @param text - Text to convert
 * @returns Title case text
 */
export function toTitleCase(text: string): string {
  return text
    .split(' ')
    .map((word) => capitalize(word))
    .join(' ');
}

/**
 * Convert Korean text to hashtag format
 * @param text - Text to convert
 * @returns Hashtag formatted text
 */
export function toHashtag(text: string): string {
  return text.startsWith('#') ? text : `#${text}`;
}

/**
 * Remove hashtag symbol
 * @param text - Hashtag text
 * @returns Text without #
 */
export function removeHashtag(text: string): string {
  return text.startsWith('#') ? text.slice(1) : text;
}

// --- Array Formatting ---

/**
 * Join array with Korean conjunction
 * @param items - Array of strings
 * @param conjunction - Conjunction to use
 * @returns Joined string
 */
export function joinWithConjunction(items: string[], conjunction: string = '와'): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;

  const lastItem = items[items.length - 1];
  const otherItems = items.slice(0, -1);
  return `${otherItems.join(', ')} ${conjunction} ${lastItem}`;
}

// --- URL Formatting ---

/**
 * Ensure URL has protocol
 * @param url - URL string
 * @returns URL with protocol
 */
export function ensureProtocol(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}

/**
 * Extract domain from URL
 * @param url - URL string
 * @returns Domain name
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(ensureProtocol(url));
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

// --- SNS Formatting ---

/**
 * Format SNS channel type for display
 * @param type - Channel type (e.g., 'instagram', 'youtube')
 * @returns Formatted display name
 */
export function formatSnsType(type: string): string {
  const mapping: Record<string, string> = {
    instagram: 'Instagram',
    youtube: 'YouTube',
    tiktok: 'TikTok',
    twitter: 'Twitter',
    facebook: 'Facebook',
    blog: 'Blog',
    website: 'Website',
  };

  return mapping[type.toLowerCase()] || capitalize(type);
}

// --- Status Formatting ---

/**
 * Format user status for display
 * @param status - User status
 * @returns Formatted status
 */
export function formatUserStatus(status: string): string {
  const mapping: Record<string, string> = {
    active: '활성',
    inactive: '비활성',
    pending: '대기중',
    suspended: '정지',
    banned: '차단',
  };

  return mapping[status.toLowerCase()] || status;
}

/**
 * Format approval status
 * @param status - Approval status
 * @returns Formatted status
 */
export function formatApprovalStatus(status: string): string {
  const mapping: Record<string, string> = {
    pending: '승인 대기',
    approved: '승인됨',
    rejected: '거부됨',
  };

  return mapping[status.toLowerCase()] || status;
}

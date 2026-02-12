/**
 * Spam Detector Utility
 * 스팸 감지 유틸리티
 * 
 * 감지 대상:
 * 1. 반복 메시지 (최근 5개 메시지 중 90% 이상 유사)
 * 2. 의심스러운 URL (단축 URL, 알 수 없는 도메인)
 * 3. 개인정보 패턴 (전화번호, 계좌번호 등)
 */

// 메시지 히스토리 (사용자별로 관리)
const messageHistory = new Map<string, string[]>();
const MAX_HISTORY_SIZE = 5;

// 알려진 단축 URL 도메인
const SHORTENED_URL_DOMAINS = [
    'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly',
    'is.gd', 'buff.ly', 'adf.ly', 'bl.ink', 'short.io',
    'tiny.cc', 'cutt.ly', 'han.gl', 'me2.do', 'vo.la',
];

// 허용된 도메인 (화이트리스트)
const ALLOWED_DOMAINS = [
    'lyt-app.io', 'bridge-app.io', 'youtube.com', 'youtu.be',
    'instagram.com', 'twitter.com', 'x.com', 'facebook.com',
    'naver.com', 'kakao.com', 'google.com', 'github.com',
    'figma.com', 'behance.net', 'dribbble.com', 'notion.so',
    'spotify.com', 'soundcloud.com', 'apple.com', 'melon.com',
];

// 민감 정보 패턴
const PHONE_PATTERN = /01[0-9]-?\d{3,4}-?\d{4}/g;
const ACCOUNT_NUMBER_PATTERN = /\d{3,4}-?\d{2,4}-?\d{4,6}/g;
const EMAIL_PATTERN = /[\w.-]+@[\w.-]+\.\w{2,}/g;

/**
 * 스팸 감지 결과
 */
export interface SpamCheckResult {
    isSpam: boolean;
    reason?: SpamReason;
    confidence: number; // 0-1
    details?: string;
}

export type SpamReason =
    | 'repetitive_message'
    | 'suspicious_url'
    | 'personal_info'
    | 'rate_limit'
    | 'bulk_message';

/**
 * 두 문자열의 유사도 계산 (Levenshtein 거리 기반)
 */
function calculateSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;

    const len1 = str1.length;
    const len2 = str2.length;

    // 매우 짧은 문자열은 정확히 비교
    if (len1 < 3 || len2 < 3) {
        return str1 === str2 ? 1 : 0;
    }

    // 길이 차이가 너무 크면 유사도 낮음
    if (Math.abs(len1 - len2) > Math.max(len1, len2) * 0.5) {
        return 0;
    }

    // 간단한 유사도: 공통 문자 비율
    const set1 = new Set(str1.toLowerCase().split(''));
    const set2 = new Set(str2.toLowerCase().split(''));
    const intersection = [...set1].filter(x => set2.has(x)).length;
    const union = new Set([...set1, ...set2]).size;

    return intersection / union;
}

/**
 * 반복 메시지 감지
 */
export function checkRepetitiveMessage(userId: string, message: string): boolean {
    const history = messageHistory.get(userId) || [];

    if (history.length < 2) {
        // 히스토리에 추가
        history.push(message);
        if (history.length > MAX_HISTORY_SIZE) {
            history.shift();
        }
        messageHistory.set(userId, history);
        return false;
    }

    // 최근 메시지들과 유사도 확인
    let similarCount = 0;
    for (const prevMessage of history) {
        if (calculateSimilarity(message, prevMessage) > 0.9) {
            similarCount++;
        }
    }

    // 히스토리에 추가
    history.push(message);
    if (history.length > MAX_HISTORY_SIZE) {
        history.shift();
    }
    messageHistory.set(userId, history);

    // 90% 이상이 유사하면 스팸
    return similarCount >= history.length * 0.9;
}

/**
 * URL 추출
 */
function extractUrls(text: string): string[] {
    const urlPattern = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
    return text.match(urlPattern) || [];
}

/**
 * URL에서 도메인 추출
 */
function extractDomain(url: string): string {
    try {
        return new URL(url).hostname.toLowerCase();
    } catch {
        return '';
    }
}

/**
 * 의심스러운 URL 감지
 */
export function checkSuspiciousUrl(text: string): { hasSuspicious: boolean; urls: string[] } {
    const urls = extractUrls(text);
    const suspiciousUrls: string[] = [];

    for (const url of urls) {
        const domain = extractDomain(url);
        if (!domain) continue;

        // 단축 URL 체크
        const isShortened = SHORTENED_URL_DOMAINS.some(d => domain.includes(d));

        // 알려진 도메인 체크
        const isAllowed = ALLOWED_DOMAINS.some(d => domain.includes(d));

        if (isShortened || !isAllowed) {
            suspiciousUrls.push(url);
        }
    }

    return {
        hasSuspicious: suspiciousUrls.length > 0,
        urls: suspiciousUrls,
    };
}

/**
 * 개인정보 패턴 감지
 */
export function checkPersonalInfo(text: string): { hasPersonalInfo: boolean; types: string[] } {
    const types: string[] = [];

    if (PHONE_PATTERN.test(text)) {
        types.push('phone');
    }
    if (ACCOUNT_NUMBER_PATTERN.test(text)) {
        types.push('account_number');
    }
    if (EMAIL_PATTERN.test(text)) {
        types.push('email');
    }

    return {
        hasPersonalInfo: types.length > 0,
        types,
    };
}

/**
 * 종합 스팸 검사
 */
export function checkSpam(userId: string, message: string): SpamCheckResult {
    // 1. 반복 메시지 체크
    if (checkRepetitiveMessage(userId, message)) {
        return {
            isSpam: true,
            reason: 'repetitive_message',
            confidence: 0.9,
            details: '동일하거나 유사한 메시지를 반복적으로 전송하고 있어요.',
        };
    }

    // 2. 의심스러운 URL 체크
    const urlCheck = checkSuspiciousUrl(message);
    if (urlCheck.hasSuspicious) {
        return {
            isSpam: true,
            reason: 'suspicious_url',
            confidence: 0.7,
            details: `의심스러운 링크가 감지되었어요: ${urlCheck.urls.join(', ')}`,
        };
    }

    // 3. 개인정보 패턴 체크 (경고만, 차단하지 않음)
    const personalInfoCheck = checkPersonalInfo(message);
    if (personalInfoCheck.hasPersonalInfo) {
        return {
            isSpam: false, // 차단하지 않고 경고만
            reason: 'personal_info',
            confidence: 0.5,
            details: `개인정보가 포함된 것 같아요: ${personalInfoCheck.types.join(', ')}`,
        };
    }

    return {
        isSpam: false,
        confidence: 0,
    };
}

/**
 * 메시지 히스토리 초기화 (로그아웃 시 호출)
 */
export function clearMessageHistory(userId: string): void {
    messageHistory.delete(userId);
}

/**
 * 허용된 도메인 추가
 */
export function addAllowedDomain(domain: string): void {
    if (!ALLOWED_DOMAINS.includes(domain)) {
        ALLOWED_DOMAINS.push(domain);
    }
}

// 기본 export
export const spamDetector = {
    checkSpam,
    checkRepetitiveMessage,
    checkSuspiciousUrl,
    checkPersonalInfo,
    clearMessageHistory,
    addAllowedDomain,
};

/**
 * Profanity Filter Utility
 * 비속어 감지 및 마스킹 유틸리티
 * 
 * 사용 라이브러리: badwords-ko
 * 접근 방식: 전송 후 마스킹 (카카오톡, 당근마켓 방식)
 */

import Filter from 'badwords-ko';

// 필터 인스턴스 생성
const filter = new Filter();

// 커스텀 비속어 추가 (서비스에 맞게 확장 가능)
const customBadWords = [
    // 사기/금전 관련
    '먹튀', '사기꾼', '돈먹고',
    // 서비스 악용 관련  
    '개인거래', '외부거래', '현금결제',
];

// 커스텀 단어 추가
try {
    customBadWords.forEach(word => {
        filter.addWords(word);
    });
} catch (e) {
    console.warn('Failed to add custom bad words:', e);
}

/**
 * 텍스트에 비속어가 포함되어 있는지 확인
 */
export function containsProfanity(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    try {
        // badwords-ko는 clean()을 호출해야 비속어를 마스킹하므로
        // 원본과 clean 결과를 비교하여 비속어 존재 여부 확인
        const cleaned = filter.clean(text);
        return cleaned !== text;
    } catch {
        return false;
    }
}

/**
 * 비속어를 마스킹 처리
 * 예: "욕설" -> "욕**"
 */
export function maskProfanity(text: string): string {
    if (!text || typeof text !== 'string') return text;
    try {
        return filter.clean(text);
    } catch {
        return text;
    }
}

/**
 * 비속어 필터 결과 반환
 */
export interface ProfanityCheckResult {
    hasProfanity: boolean;
    originalText: string;
    maskedText: string;
}

export function checkAndMaskProfanity(text: string): ProfanityCheckResult {
    if (!text || typeof text !== 'string') {
        return {
            hasProfanity: false,
            originalText: text,
            maskedText: text,
        };
    }

    try {
        const maskedText = filter.clean(text);
        const hasProfanity = maskedText !== text;

        return {
            hasProfanity,
            originalText: text,
            maskedText,
        };
    } catch {
        return {
            hasProfanity: false,
            originalText: text,
            maskedText: text,
        };
    }
}

/**
 * 커스텀 비속어 추가
 */
export function addCustomBadWords(words: string[]): void {
    try {
        words.forEach(word => filter.addWords(word));
    } catch (e) {
        console.warn('Failed to add custom bad words:', e);
    }
}

/**
 * 특정 단어를 화이트리스트에 추가 (비속어에서 제외)
 */
export function addWhitelistWords(words: string[]): void {
    try {
        words.forEach(word => filter.removeWords(word));
    } catch (e) {
        console.warn('Failed to add whitelist words:', e);
    }
}

// 기본 export
export const profanityFilter = {
    containsProfanity,
    maskProfanity,
    checkAndMaskProfanity,
    addCustomBadWords,
    addWhitelistWords,
};


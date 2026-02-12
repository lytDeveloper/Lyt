
export const formatRelativeTime = (dateString: string | Date): string => {
    if (!dateString) return '';

    let targetDate: Date;

    if (typeof dateString === 'string') {
        // Always use JavaScript's Date constructor as-is
        // It correctly handles all formats:
        // - "2024-11-28T12:00:00.000Z" -> UTC time
        // - "2024-11-28T03:00:00+09:00" -> KST time, internally converted to UTC
        targetDate = new Date(dateString);
    } else {
        targetDate = dateString;
    }

    const now = new Date();
    const diff = now.getTime() - targetDate.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (diff < 0) {
        // If the time is in the future (e.g. slight clock skew), show "Just now"
        return '방금 전';
    }

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 30) return `${days}일 전`;
    if (months < 12) return `${months}개월 전`;
    return `${years}년 전`;
};

export const formatDateToYMD = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
  
    try {
      // 한국어 형식 문자열 (예: "2025.01.15. 오후 3:30") 처리
      const koreanFormatMatch = dateString.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})/);
      if (koreanFormatMatch) {
        const year = koreanFormatMatch[1];
        const month = koreanFormatMatch[2].padStart(2, '0');
        const day = koreanFormatMatch[3].padStart(2, '0');
        return `${year}년 ${month}월 ${day}일`;
      }
  
      // ISO 형식 또는 기타 날짜 형식 처리
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // 유효하지 않은 날짜면 원본 반환
  
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
  
      return `${year}년 ${month}월 ${day}일`;
    } catch {
      return dateString; // 파싱 실패 시 원본 반환
    }
  };
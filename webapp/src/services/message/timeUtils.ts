export const formatTime = (dateString: string) => {
  let normalizedDateString = dateString;
  const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(dateString);
  if (!hasTimezone) {
    normalizedDateString = `${dateString}Z`;
  }

  const date = new Date(normalizedDateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const oneMinute = 60 * 1000;
  const oneHour = 60 * oneMinute;
  const oneDay = 24 * oneHour;
  const sevenDays = 7 * oneDay;

  if (diff < oneMinute) return '방금 전';
  if (diff < oneHour) return `${Math.floor(diff / oneMinute)}분 전`;
  if (diff < oneDay) return `${Math.floor(diff / oneHour)}시간 전`;
  if (diff < sevenDays) return `${Math.floor(diff / oneDay)}일 전`;

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

export const getKstNowIsoWithOffset = (): string => {
  const now = new Date();
  const kstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kstTime.toISOString().replace('Z', '+09:00');
};

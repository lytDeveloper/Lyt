/**
 * 썸네일 크기 상수
 *
 * Supabase Image Transformation 비용 절감을 위해
 * 이미지 업로드 시 미리 생성되는 썸네일 크기 정의
 *
 * 모든 크기는 2x retina 대응 (실제 표시 크기의 2배)
 */
export const THUMBNAIL_SIZES = {
  /** 아바타 소형: 32px 표시용 (64px 저장) */
  XS: 64,
  /** 아바타 중형: 48px 표시용 (96px 저장) - 팀원, 메시지 아바타 */
  SM: 96,
  /** 아바타 대형: 80-88px 표시용 (176px 저장) - 추천 프로필 */
  MD: 176,
  /** 카드 썸네일: 160px 카드용 (320px 저장) */
  LG: 320,
  /** 커버 이미지: 대형 카드용 (640px 저장) */
  XL: 640,
} as const;

export type ThumbnailSize = keyof typeof THUMBNAIL_SIZES;

/**
 * 썸네일 파일명 접미사
 * 예: logo_123456789_sm.webp
 */
export const THUMBNAIL_SUFFIXES: Record<ThumbnailSize, string> = {
  XS: '_xs',
  SM: '_sm',
  MD: '_md',
  LG: '_lg',
  XL: '_xl',
};

/**
 * 기본 썸네일 생성 크기
 * 업로드 시 자동으로 생성되는 크기 목록
 */
export const DEFAULT_THUMBNAIL_SIZES: ThumbnailSize[] = ['SM', 'MD', 'LG'];

/**
 * 아바타 전용 썸네일 크기
 * 프로필 이미지, 로고 등 정사각형 이미지용
 */
export const AVATAR_THUMBNAIL_SIZES: ThumbnailSize[] = ['XS', 'SM', 'MD'];

/**
 * 커버 이미지 전용 썸네일 크기
 * 배너, 커버 등 가로형 이미지용
 */
export const COVER_THUMBNAIL_SIZES: ThumbnailSize[] = ['LG', 'XL'];

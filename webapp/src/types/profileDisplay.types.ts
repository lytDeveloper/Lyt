/**
 * 프로필 표시 타입 정의
 *
 * 모든 컴포넌트와 서비스에서 사용하는 통합 프로필 표시 인터페이스
 * 기존 DisplayInfo, UserDisplayInfo를 하나로 통합
 *
 * 우선순위: brand > artist > creative > fan > customer(fallback)
 */

/**
 * 프로필 타입
 * - brand: 브랜드 프로필 (profile_brands)
 * - artist: 아티스트 프로필 (profile_artists)
 * - creative: 크리에이티브 프로필 (profile_creatives)
 * - fan: 팬 프로필 (profile_fans + profiles)
 * - customer: 온보딩 미완료 사용자 (profiles only)
 */
export type ProfileType = 'brand' | 'artist' | 'creative' | 'fan' | 'customer';

/**
 * 비팬 프로필 타입 (Nonfan)
 * brand, artist, creative만 포함
 */
export type NonfanProfileType = 'brand' | 'artist' | 'creative';

/**
 * 프로필 표시 정보 소스
 */
export type ProfileDisplaySource =
  | 'brand' // profile_brands 테이블
  | 'artist' // profile_artists 테이블
  | 'creative' // profile_creatives 테이블
  | 'fan' // profile_fans 테이블
  | 'profile' // profiles 테이블 (폴백)
  | 'fallback'; // 기본값

/**
 * 통합 프로필 표시 정보 인터페이스
 *
 * 모든 프로필 관련 표시 정보를 하나의 인터페이스로 통합
 * 기존 DisplayInfo, UserDisplayInfo를 대체
 */
export interface ProfileDisplayInfo {
  /** 표시 이름 (brand_name, artist_name, nickname 등) */
  name: string;

  /** 프로필 이미지 URL (logo_image_url 또는 profile_image_url) */
  avatar?: string;

  /** 활동 분야 (activity_field) */
  activityField?: string;

  /** 프로필 타입 */
  profileType: ProfileType;

  /** 데이터 소스 */
  source: ProfileDisplaySource;

  /** 사용자 ID */
  userId: string;

  /** 활성 상태 */
  isActive?: boolean;
}

/**
 * 프로필 표시 맵 타입
 * userId -> ProfileDisplayInfo
 */
export type ProfileDisplayMap = Map<string, ProfileDisplayInfo>;

/**
 * 데이터베이스 테이블 설정
 * 각 프로필 타입별 테이블명, 필드명 매핑
 */
export interface ProfileTableConfig {
  table: string;
  nameField: string | null;
  avatarField: string;
  selectFields: string;
}

/**
 * 프로필 타입별 테이블 설정
 */
export const PROFILE_TABLE_CONFIG: Record<Exclude<ProfileType, 'customer'>, ProfileTableConfig> = {
  brand: {
    table: 'profile_brands',
    nameField: 'brand_name',
    avatarField: 'logo_image_url',
    selectFields: 'profile_id, brand_name, logo_image_url, activity_field, is_active',
  },
  artist: {
    table: 'profile_artists',
    nameField: 'artist_name',
    avatarField: 'logo_image_url',
    selectFields: 'profile_id, artist_name, logo_image_url, activity_field, is_active',
  },
  creative: {
    table: 'profile_creatives',
    nameField: 'nickname',
    avatarField: 'profile_image_url',
    selectFields: 'profile_id, nickname, profile_image_url, activity_field, is_active',
  },
  fan: {
    table: 'profile_fans',
    nameField: null, // fan은 profiles.nickname 사용
    avatarField: 'profile_image_url',
    selectFields: 'profile_id, profile_image_url, is_active',
  },
};

/**
 * 프로필 타입별 기본 활동 분야 레이블
 */
export const DEFAULT_ACTIVITY_FIELD: Record<ProfileType, string> = {
  brand: '브랜드',
  artist: '아티스트',
  creative: '크리에이티브',
  fan: '팬',
  customer: '',
};

/**
 * 프로필 우선순위 순서
 * brand > artist > creative > fan
 * customer는 폴백용이므로 제외
 */
export const PROFILE_PRIORITY: Exclude<ProfileType, 'customer'>[] = ['brand', 'artist', 'creative', 'fan'];

/**
 * 레거시 DisplaySource 타입 (기존 exploreTypes.ts와 동일)
 */
export type LegacyDisplaySource = 'partner' | 'brand' | 'profile' | 'fallback';

/**
 * 레거시 DisplayInfo 호환 타입
 * @deprecated 신규 코드에서는 ProfileDisplayInfo 사용 권장
 */
export interface LegacyDisplayInfo {
  displayName: string;
  displayAvatar?: string;
  displayField?: string;
  displayCategory?: string;
  displaySource: LegacyDisplaySource;
}

/**
 * ProfileDisplayInfo -> LegacyDisplayInfo 변환 함수 타입
 */
export type ToLegacyDisplayInfoFn = (info: ProfileDisplayInfo) => LegacyDisplayInfo;

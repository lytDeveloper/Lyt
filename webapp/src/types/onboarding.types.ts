/**
 * Onboarding type definitions
 * Type definitions for all onboarding flows
 */

// --- Common Types ---

/** SNS channel information */
export interface SnsChannel {
  type: string;
  url: string;
  is_main: boolean;
}

/** User type options */
export type UserType = 'brand' | 'artist' | 'creative' | 'fan';

// --- Brand Onboarding Types ---

/** Brand onboarding data */
export interface BrandOnboardingData {
  // Step 1
  brandName: string;
  description: string;
  // Step 2
  category: string;
  targetAudiences: string[];
  preferredCreatorTypes: string[];

  // Step 3
  coverFile: File | null;
  logoFile: File | null;

  // Step 4
  collaborationTypes: string[];
  monthlyBudget: string;

  // Step 5
  businessRegistrationNumber: string;
  websiteUrl: string | null;
  snsChannel: string | null;
  contactInfo: string | null;
  region: string | null;
}

/** Brand category options */
export type BrandCategory =
  | '패션'
  | '뷰티'
  | '테크'
  | '식음료'
  | '라이프스타일'
  | '반려용품'
  | '기타';

/** Collaboration type options */
export type CollaborationType =
  | '제품 협찬'
  | '유료 광고'
  | '장기 계약'
  | '이벤트 협업'
  | '기타';

/** Monthly budget options */
export type MonthlyBudget =
  | '100만원 미만'
  | '100~300만원'
  | '300~500만원'
  | '500~1000만원'
  | '1000만원 이상';

// --- Artist Onboarding Types ---

/** Artist onboarding data */
export interface ArtistOnboardingData {
  // Step 1
  artistName: string;
  activityField: string;
  tags: string[];
  coverFile: File | null;
  logoFile: File | null;

  // Step 2
  specializedRoles: string[];

  // Step 3
  highlightKeywords: string[];
  bio: string;
  portfolioUrl: string;
}

/** Artist activity field options */
export type ArtistActivityField = '음악' | '미술' | '영상' | '디자인' | '문학' | '뷰티';

/** Artist specialized roles (music) */
export type MusicRole =
  | '싱어송라이터'
  | '보컬리스트'
  | '작곡가'
  | '프로듀서'
  | '믹싱/마스터링'
  | '기타';

/** Artist specialized roles (visual) */
export type VisualRole =
  | '일러스트레이터'
  | '그래픽 디자이너'
  | 'UI/UX 디자이너'
  | '사진작가'
  | '영상 편집'
  | '기타';

// --- Creative Onboarding Types ---

/** Creative onboarding data */
export interface CreativeOnboardingData {
  // Step 1
  nickname: string;
  profileImage: File | null;

  // Step 2
  snsChannels: SnsChannel[];

  // Step 3
  acquisitionSource: string;
}

/** Acquisition source options */
export type AcquisitionSource =
  | '인스타그램'
  | '유튜브'
  | '틱톡'
  | '지인 추천'
  | '검색'
  | '기타';

// --- Fan Onboarding Types ---

/** Fan onboarding data */
export interface FanOnboardingData {
  // Step 1
  interests: string[];

  // Step 2
  persona: string;

  // Step 3
  specificInterests: string[];

  // Step 4
  preferredRegions: string[];

  // Step 5
  notificationPreferences: string[];
}

/** Fan interest categories */
export type FanInterest =
  | '패션'
  | '뷰티'
  | '테크'
  | '뮤직'
  | '아트'
  | '라이프스타일'
  | '푸드'
  | '반려동물';

/** Fan persona options */
export type FanPersona =
  | '얼리어답터'
  | '트렌드세터'
  | '실속파'
  | '충성고객'
  | '탐험가';

/** Notification preference options */
export type NotificationPreference =
  | '신규 브랜드 소식'
  | '협업 프로젝트'
  | '이벤트 및 할인'
  | '크리에이터 업데이트'
  | '맞춤 추천';

// --- Onboarding Step Props ---

/** Props for onboarding step components */
export interface OnboardingStepProps {
  onNext?: () => void;
  onBack?: () => void;
  onSkip?: () => void;
}

// --- Validation Types ---

/** Validation error object */
export interface ValidationError {
  field: string;
  message: string;
}

/** Form validation result */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

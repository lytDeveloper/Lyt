/**
 * Project Constants
 * 프로젝트 생성 시 사용되는 상수 정의
 */

import { type ProjectCategory, type ProjectStatus } from '../types/exploreTypes';
import type { SvgIconComponent } from '@mui/icons-material';
import { HeadphonesOutlinedIcon, CheckroomRoundedIcon, AutoAwesomeOutlinedIcon, ViewInArOutlinedIcon, FavoriteBorderRoundedIcon, StorefrontOutlinedIcon, CelebrationOutlinedIcon, ConfirmationNumberOutlinedIcon, DesktopWindowsOutlinedIcon, DoorbellOutlinedIcon, ShopOutlinedIcon, SavingsOutlinedIcon } from '../components/common/ExploreFilters';
// ============================================================================
// Label Mappings (English DB values → Korean UI labels)
// ============================================================================

export const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  music: '음악',
  fashion: '패션',
  beauty: '뷰티',
  liveShopping: '라이브쇼핑',
  Investment: '재테크',
  contents: '콘텐츠',
  event: '이벤트',
  healing: '힐링',
  ticket: '문화',
  market: '마켓',
  life: '라이프',
  tech: '디지털',
};

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: '작성중',
  open: '모집중',
  in_progress: '진행중',
  completed: '완료',
  cancelled: '취소',
  on_hold: '보류',
  deleted: '삭제됨',
};



// Reverse mappings (Korean UI labels → English DB values)
export const CATEGORY_VALUES: Record<string, ProjectCategory> = {
  음악: 'music',
  패션: 'fashion',
  뷰티: 'beauty',
  콘텐츠: 'contents',
  마켓: 'market',
  재테크: 'Investment',
  라이브쇼핑: 'liveShopping',
  이벤트: 'event',
  문화: 'ticket',
  디지털: 'tech',
  라이프: 'life',
  힐링: 'healing'
};

export const STATUS_VALUES: Record<string, ProjectStatus> = {
  작성중: 'draft',
  모집중: 'open',
  진행중: 'in_progress',
  완료: 'completed',
  취소: 'cancelled',
  보류: 'on_hold',
  삭제됨: 'deleted',
};

// Work type mappings (Korean UI labels → English DB values)
export const WORK_TYPE_VALUES: Record<string, string> = {
  '온라인': 'remote',
  '오프라인': 'onsite',
  '온오프라인 병행': 'hybrid',
};

// ============================================================================
// Category Options
// ============================================================================

// 카테고리 옵션 (DB values)
export const PROJECT_CATEGORIES: ProjectCategory[] = [
  'music', 'fashion', 'beauty', 'contents', 'market', 'Investment', 'liveShopping', 'event', 'ticket', 'tech', 'life', 'healing',
];

// 카테고리 옵션 (UI labels for display)
export const PROJECT_CATEGORY_LABELS = PROJECT_CATEGORIES.map(cat => CATEGORY_LABELS[cat]);

// Extended categories (for backward compatibility with CreateProject forms)
export const EXTENDED_CATEGORIES = PROJECT_CATEGORIES;

// 예산 범위 옵션
export const BUDGET_OPTIONS = [
  '50만원 이하',
  '50-100만원',
  '100-300만원',
  '300-500만원',
  '500-1000만원',
  '1000만원 이상',
] as const;

// 프로젝트 기간 옵션
export const DURATION_OPTIONS = [
  '1주일 이내',
  '2-4주',
  '1-2개월',
  '3-6개월',
  '6개월 이상',
  '기간협의',
] as const;

// 필요한 스킬 옵션
export const SKILL_OPTIONS = [
  '보컬',
  '작곡',
  '편곡',
  '믹싱',
  '마스터링',
  '뮤직비디오',
  '안무',
  '패션디자인',
  '스타일링',
  '포토그래피',
  '영상편집',
  '그래픽디자인',
  '메이크업',
  '헤어',
  '네일아트',
  '요리',
  '베이킹',
  '푸드스타일링',
] as const;

// 협업 예상 기간 옵션
export const COLLABORATION_DURATION_OPTIONS = [
  '1주일',
  '2주일',
  '1개월',
  '2개월',
  '3개월',
  '기간 협의',
] as const;

// 협업 진행 방식 옵션
export const WORK_TYPE_OPTIONS = [
  '온라인',
  '오프라인',
  '온오프라인 병행',
] as const;


// 카테고리 아이콘 매핑 (react-icons/lu 아이콘 컴포넌트) - DB values
export const CATEGORY_ICONS: Record<ProjectCategory, SvgIconComponent> = {
  music: HeadphonesOutlinedIcon,
  fashion: CheckroomRoundedIcon,
  beauty: AutoAwesomeOutlinedIcon,
  contents: ViewInArOutlinedIcon,
  healing: FavoriteBorderRoundedIcon,
  market: StorefrontOutlinedIcon,
  event: CelebrationOutlinedIcon,
  ticket: ConfirmationNumberOutlinedIcon,
  tech: DesktopWindowsOutlinedIcon,
  life: DoorbellOutlinedIcon,
  liveShopping: ShopOutlinedIcon,
  Investment: SavingsOutlinedIcon,
};

// 기간을 날짜로 변환하는 유틸리티 함수
export function calculateDeadline(duration: string): Date {
  const now = new Date();
  const deadline = new Date(now);

  switch (duration) {
    case '1주일 이내':
      deadline.setDate(now.getDate() + 7);
      break;
    case '2-4주':
      deadline.setDate(now.getDate() + 28); // 4주
      break;
    case '1-2개월':
      deadline.setMonth(now.getMonth() + 2);
      break;
    case '3-6개월':
      deadline.setMonth(now.getMonth() + 6);
      break;
    case '6개월 이상':
      deadline.setMonth(now.getMonth() + 12);
      break;
    case '기간협의':
      deadline.setMonth(now.getMonth() + 3); // 기본 3개월
      break;
    default:
      deadline.setMonth(now.getMonth() + 3);
  }

  return deadline;
}

/**
 * Convert Korean label to DB value
 * For backward compatibility with existing code
 */
export function mapToProjectCategory(category: string): ProjectCategory {
  // Check if already an English DB value
  if (PROJECT_CATEGORIES.includes(category as ProjectCategory)) {
    return category as ProjectCategory;
  }

  // Convert Korean label to English DB value
  const dbValue = CATEGORY_VALUES[category];
  if (dbValue) {
    return dbValue;
  }

  // Fallback for unknown values
  console.warn(`[mapToProjectCategory] Unknown category: ${category}, using 'fashion' as fallback`);
  return 'fashion';
}

/**
 * Get Korean label for a category DB value
 */
export function getCategoryLabel(category: ProjectCategory | string): string {
  if (category in CATEGORY_LABELS) {
    return CATEGORY_LABELS[category as ProjectCategory];
  }
  return category; // Return as-is if not found
}

/**
 * Get Korean label for a status DB value
 */
export function getStatusLabel(status: ProjectStatus | string): string {
  if (status in STATUS_LABELS) {
    return STATUS_LABELS[status as ProjectStatus];
  }
  return status; // Return as-is if not found
}


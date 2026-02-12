/**
 * Home Page Constants
 * 홈페이지에서 사용되는 상수 및 정적 데이터 정의
 */

import React from 'react';
import type { ProjectCategory } from '../types/exploreTypes';
import {
  HeadphonesOutlinedIcon,
  CheckroomRoundedIcon,
  AutoAwesomeOutlinedIcon,
  ViewInArOutlinedIcon,
  FavoriteBorderRoundedIcon,
  StorefrontOutlinedIcon,
  CelebrationOutlinedIcon,
  ConfirmationNumberOutlinedIcon,
  DesktopWindowsOutlinedIcon,
  DoorbellOutlinedIcon,
  ShopOutlinedIcon,
  SavingsOutlinedIcon,
} from '../components/common/ExploreFilters';

// ============================================================================
// Types
// ============================================================================

export interface IconProps {
  size?: number;
  color?: string;
}

export interface CollaborationNeedItem {
  id: number;
  title: string;
  subtitle: string;
  emoji: string;
  background: string;
  /** ProjectCategory value for navigation (e.g., 'music', 'fashion') */
  category: ProjectCategory;
}

// ============================================================================
// Category Configuration
// ============================================================================

/**
 * 홈페이지 카테고리 목록 (UI 표시 순서)
 */
export const HOME_CATEGORY_LIST = [
  '음악',
  '라이브쇼핑',
  '패션',
  '이벤트',
  '뷰티',
  '문화',
  '콘텐츠',
  '디지털',
  '마켓',
  '라이프',
  '재테크',
  '힐링',
] as const;

export type HomeCategoryType = (typeof HOME_CATEGORY_LIST)[number];

/**
 * MUI 아이콘을 IconProps 형식으로 래핑하는 헬퍼 함수
 */
const wrapMuiIcon = (
  Icon: React.ComponentType<{ sx?: object }>
): React.ComponentType<IconProps> => {
  const WrappedIcon = ({ size, color }: IconProps) => {
    return React.createElement(Icon, { sx: { fontSize: size, color: color } });
  };
  WrappedIcon.displayName = `Wrapped${Icon.displayName || 'Icon'}`;
  return WrappedIcon;
};

/**
 * 카테고리별 아이콘 매핑 (한글 키 사용)
 */
export const HOME_CATEGORY_ICONS: Record<
  HomeCategoryType,
  React.ComponentType<IconProps>
> = {
  음악: wrapMuiIcon(HeadphonesOutlinedIcon),
  패션: wrapMuiIcon(CheckroomRoundedIcon),
  뷰티: wrapMuiIcon(AutoAwesomeOutlinedIcon),
  콘텐츠: wrapMuiIcon(ViewInArOutlinedIcon),
  마켓: wrapMuiIcon(StorefrontOutlinedIcon),
  재테크: wrapMuiIcon(SavingsOutlinedIcon),
  라이브쇼핑: wrapMuiIcon(ShopOutlinedIcon),
  이벤트: wrapMuiIcon(CelebrationOutlinedIcon),
  문화: wrapMuiIcon(ConfirmationNumberOutlinedIcon),
  디지털: wrapMuiIcon(DesktopWindowsOutlinedIcon),
  라이프: wrapMuiIcon(DoorbellOutlinedIcon),
  힐링: wrapMuiIcon(FavoriteBorderRoundedIcon),
};

// ============================================================================
// Recommended Profiles Configuration
// ============================================================================

export const RECOMMENDED_PROFILE_CONFIG = {
  /** 최대 로드 개수 */
  MAX_COUNT: 30,
  /** 아이템 너비 (px) */
  ITEM_WIDTH: 100,
  /** 스크롤 스텝 (px) - 아이템 너비 + gap */
  ITEM_STEP: 116,
  /** 한 번에 로드할 개수 */
  LOAD_LIMIT: 10,
} as const;

// ============================================================================
// Panel Drag Configuration
// ============================================================================

export const PANEL_DRAG_CONFIG = {
  /** 헤더와 패널 사이 간격 (px) */
  DOCK_GAP: 10,
  /** 드래그 임계값 (px) - 이 값 이상 드래그해야 상태 전환 */
  DRAG_THRESHOLD: 10,
  /** 속도 임계값 - 빠른 스와이프 감지용 */
  VELOCITY_THRESHOLD: 10,
  /** 드래그 핸들 높이 (px) */
  HANDLE_HEIGHT: 40,
  /** 방향 감지를 위한 최소 이동거리 (px) */
  DIRECTION_DETECTION_THRESHOLD: 10,
  /** 수직 방향으로 판단하는 최소 각도 (degrees) */
  VERTICAL_ANGLE_MIN: 60,
  /** 수평 방향으로 판단하는 최대 각도 (degrees) */
  HORIZONTAL_ANGLE_MAX: 30,
} as const;

// ============================================================================
// Collaboration Needs Data (Static)
// ============================================================================

/**
 * "함께할 아티스트가 필요해요" 섹션의 정적 데이터
 */
export const COLLABORATION_NEEDS: CollaborationNeedItem[] = [
  {
    id: 1,
    title: '음악',
    subtitle: '팝업부터 런칭행사, 네트워킹까지 특별한 이벤트의 모든 순간',
    emoji: '🎵',
    background:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    category: 'music',
  },
  {
    id: 2,
    title: '패션',
    subtitle: '트렌디한 스타일링과 패션 디자인, 브랜드 협업까지',
    emoji: '👗',
    background:
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8JUVEJThDJUE4JUVDJTg1JTk4fGVufDB8fDB8fHww',
    category: 'fashion',
  },
  {
    id: 3,
    title: '뷰티',
    subtitle: '뷰티 브랜드와 메이크업 아티스트 협업',
    emoji: '💄',
    background:
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=1160&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    category: 'beauty',
  },
  {
    id: 4,
    title: '콘텐츠',
    subtitle: '영상, 사진, 디자인, SNS까지. 창작 콘텐츠의 모든 과정',
    emoji: '🎬',
    background:
      'https://plus.unsplash.com/premium_photo-1684017834245-f714094ca936?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    category: 'contents',
  },
  {
    id: 5,
    title: '마켓',
    subtitle: '공동구매부터 굿즈 제작, 온라인 판매까지',
    emoji: '🏪',
    background:
      'https://plus.unsplash.com/premium_photo-1666739387925-5841368970a7?q=80&w=1653&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    category: 'market',
  },
  {
    id: 6,
    title: '재테크',
    subtitle: '인사이트로 채우는 스마트 자산관리 경험',
    emoji: '💰',
    background:
      'https://plus.unsplash.com/premium_photo-1677692593965-28c886409cfb?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8JUVDJUEwJTgwJUVBJUI4JTg4JUVEJTg2JUI1fGVufDB8fDB8fHww',
    category: 'Investment',
  },
  {
    id: 7,
    title: '라이브쇼핑',
    subtitle: '실시간 소통으로 완성되는 새로운 쇼핑의 매력',
    emoji: '�️',
    background:
      'https://plus.unsplash.com/premium_photo-1684529562808-7845127b991a?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTd8fCVFQiU5RCVCQyVFQyU5RCVCNCVFQiVCOCU4QyVFQyU4NyVCQyVFRCU5NSU5MXxlbnwwfHwwfHx8MA%3D%3D',
    category: 'liveShopping',
  },
  {
    id: 8,
    title: '이벤트',
    subtitle: '팝업부터 런칭행사, 네트워킹까지 특별한 이벤트의 모든 순간',
    emoji: '🎉',
    background:
      'https://images.unsplash.com/photo-1511317559916-56d5ddb62563?q=80&w=786&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    category: 'event',
  },
  {
    id: 9,
    title: '문화',
    subtitle: '공연, 전시, 페스티벌 등 다채로운 문화 체험과 창작 활동',
    emoji: '🎭',
    background:
      'https://images.unsplash.com/photo-1571173069043-82a7a13cee9f?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    category: 'ticket',
  },
  {
    id: 10,
    title: '디지털',
    subtitle: '최신 기술과 디지털 트렌드를 경험하는 테크 기반 프로젝트',
    emoji: '💻',
    background:
      'https://images.unsplash.com/photo-1597733336794-12d05021d510?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8JUVEJTg1JThDJUVEJTgxJUFDfGVufDB8fDB8fHww',
    category: 'tech',
  },
  {
    id: 11,
    title: '라이프',
    subtitle: '인테리어, 반려동물, 홈카페 등 일상을 풍요롭게 만드는 아이디어',
    emoji: '🏠',
    background:
      'https://images.unsplash.com/photo-1534040385115-33dcb3acba5b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8JUVDJTlEJUJDJUVDJTgzJTgxfGVufDB8fDB8fHww',
    category: 'life',
  },
  {
    id: 12,
    title: '힐링',
    subtitle: '여행, 요가, 명상, 웰니스로 마음과 몸을 채우는 힐링 경험',
    emoji: '🌿',
    background:
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTh8fCVFRCU5RSU5MCVFQiVBNyU4MXxlbnwwfHwwfHx8MA%3D%3D',
    category: 'healing',
  },
];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 오늘 날짜를 'YYYY-MM-DD' 형식으로 반환
 */
export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 링크 URL을 정규화 (프로토콜 추가)
 * @param link - 원본 링크 URL
 * @returns 정규화된 URL 또는 undefined
 */
export function normalizeLinkUrl(link?: string | null): string | undefined {
  if (!link) return undefined;
  const trimmed = link.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  return `https://${trimmed}`;
}

// ============================================================================
// Local Storage Keys
// ============================================================================

export const HOME_STORAGE_KEYS = {
  /** 광고 오늘 안보기 날짜 */
  ADS_HIDE_TODAY_DATE: 'global_ads_hide_today_date',
} as const;

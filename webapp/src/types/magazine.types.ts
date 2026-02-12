// Magazine feature type definitions

// Category type matching DB constraint + special '브랜드 스토리' filter
export const MAGAZINE_CATEGORIES = [
  '전체',
  '트렌드',
  '인터뷰',
  '가이드',
  '뉴스',
  '리뷰',
  '케이스스터디',
  '인사이트',
  '브랜드 스토리',
] as const;

export type MagazineCategory = (typeof MAGAZINE_CATEGORIES)[number];

// DB Category (without '전체')
export type DBMagazineCategory = Exclude<MagazineCategory, '전체'>;

export const DB_MAGAZINE_CATEGORIES: DBMagazineCategory[] = [
  '트렌드',
  '인터뷰',
  '가이드',
  '뉴스',
  '리뷰',
  '케이스스터디',
  '인사이트',
  '브랜드 스토리',
];

// Status enum
export type MagazineStatus = 'draft' | 'published' | 'archived' | 'deleted';

export type MagazineContentBlockType = 'text' | 'image';

export interface MagazineContentBlock {
  type: MagazineContentBlockType;
  content?: string | null;
  url?: string | null;
  caption?: string | null;
}

// Base Magazine interface (from DB)
export interface Magazine {
  id: string;
  author_id: string | null;
  title: string;
  subtitle: string | null;
  content: string;
  content_blocks?: MagazineContentBlock[] | null;
  excerpt: string | null;
  category: DBMagazineCategory;
  tags: string[];
  cover_image_url: string;
  images: string[];
  video_url: string | null;
  reading_time: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  bookmark_count: number;
  share_count: number;
  status: MagazineStatus;
  is_featured: boolean;
  is_trending: boolean;
  is_editor_pick: boolean;
  display_order: number;
  related_project: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  slug: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string[] | null;
}

// Related Project info (for badge display)
export interface RelatedProject {
  id: string;
  title: string;
  status: 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  budget_range?: string | null;
  deadline?: string | null;
}

// 리스트용 경량 타입 (content_blocks, images, content 제외 - 데이터 전송량 90% 감소)
export interface MagazineListItem {
  id: string;
  title: string;
  subtitle: string | null;
  category: DBMagazineCategory;
  tags: string[];
  cover_image_url: string;
  reading_time: number;
  view_count: number;
  like_count: number;
  is_featured: boolean;
  is_trending: boolean;
  is_editor_pick: boolean;
  display_order: number;
  created_at: string;
  related_project: string | null;
  project?: RelatedProject | null;
}

// Extended Magazine with related project data
export interface MagazineWithProject extends Magazine {
  project?: RelatedProject | null;
}

// Author profile (minimal info for display)
export interface MagazineAuthor {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  roles: string[];
}

// Magazine detail (includes author)
export interface MagazineDetail extends MagazineWithProject {
  author?: MagazineAuthor | null;
}

// Like state
export interface MagazineLike {
  id: string;
  user_id: string;
  magazine_id: string;
  created_at: string;
}

// Bookmark state
export interface MagazineBookmark {
  id: string;
  user_id: string;
  magazine_id: string;
  folder_name: string | null;
  note: string | null;
  created_at: string;
}

// Query filters
export interface MagazineFilters {
  category?: DBMagazineCategory;
  featured?: boolean;
  trending?: boolean;
  editorPick?: boolean;
}

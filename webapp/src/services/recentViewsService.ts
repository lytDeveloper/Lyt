// =====================================================
// Recent Views Service
// =====================================================
// Description: Service for managing recently viewed items
// - 로그인 사용자: 서버 DB (user_recently_viewed) 저장
// - 비로그인 사용자: LocalStorage 저장 (fallback)
// =====================================================

import { supabase } from '../lib/supabase';
import { BlockService } from './blockService';

export type RecentViewType = 'project' | 'partner' | 'collaboration';

export interface RecentViewItem {
  id: string;
  type: RecentViewType;
  title: string;
  image?: string | null;
  subtitle?: string;
  date: string; // ISO timestamp
}

// 상세 정보가 포함된 프로젝트 타입
export interface RecentViewProjectItem extends RecentViewItem {
  type: 'project';
  budgetRange?: string | null;
  deadline?: string | null;
  category?: string | null;
}

// 상세 정보가 포함된 협업 타입
export interface RecentViewCollaborationItem extends RecentViewItem {
  type: 'collaboration';
  category?: string | null;
  categoryLabel?: string | null; // 한글 라벨
  duration?: string | null;
}

const STORAGE_KEY = 'bridge_recent_views';
const MAX_ITEMS_PER_TYPE = 30;

// =====================================================
// 서버 저장 함수 (로그인 사용자용)
// =====================================================

/**
 * 서버에 최근 본 콘텐츠 저장 (upsert)
 */
export async function addRecentlyViewedToServer(
  userId: string,
  item: Omit<RecentViewItem, 'date'>
): Promise<void> {
  if (!userId) return;

  const { error } = await supabase
    .from('user_recently_viewed')
    .upsert(
      {
        user_id: userId,
        item_id: item.id,
        item_type: item.type,
        title: item.title,
        image_url: item.image,
        subtitle: item.subtitle,
        viewed_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,item_id,item_type',
      }
    );

  if (error) {
    console.error('Error saving recently viewed to server:', error);
  }
}

/**
 * 서버에서 최근 본 콘텐츠 조회
 * Filters out blocked partners when type is 'partner'
 */
export async function getRecentlyViewedFromServer(
  userId: string,
  type?: RecentViewType,
  limit: number = 10
): Promise<RecentViewItem[]> {
  if (!userId) return [];

  let query = supabase
    .from('user_recently_viewed')
    .select('*')
    .eq('user_id', userId)
    .order('viewed_at', { ascending: false })
    .limit(limit);

  if (type) {
    query = query.eq('item_type', type);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching recently viewed from server:', error);
    return [];
  }

  let items = (data || []).map((item) => ({
    id: item.item_id,
    type: item.item_type as RecentViewType,
    title: item.title,
    image: item.image_url,
    subtitle: item.subtitle,
    date: item.viewed_at,
  }));

  // Filter out blocked partners if type is 'partner' or if no type filter
  if (!type || type === 'partner') {
    try {
      const blockedUserIds = await BlockService.getBlockedUserIds(userId);
      items = items.filter((item) => {
        if (item.type === 'partner') {
          return !blockedUserIds.includes(item.id);
        }
        return true;
      });
    } catch (error) {
      console.error('Error filtering blocked partners from recent views:', error);
    }
  }

  return items;
}

/**
 * 서버에서 최근 본 프로젝트 조회 (상세 정보 포함)
 * projects 테이블과 JOIN하여 budget_range, deadline 등 조회
 */
export async function getRecentlyViewedProjectsWithDetails(
  userId: string,
  limit: number = 10
): Promise<RecentViewProjectItem[]> {
  if (!userId) return [];

  // 먼저 최근 본 프로젝트 ID 목록 조회
  const { data: recentData, error: recentError } = await supabase
    .from('user_recently_viewed')
    .select('item_id, viewed_at')
    .eq('user_id', userId)
    .eq('item_type', 'project')
    .order('viewed_at', { ascending: false })
    .limit(limit);

  if (recentError || !recentData || recentData.length === 0) {
    if (recentError) console.error('Error fetching recent project IDs:', recentError);
    return [];
  }

  const projectIds = recentData.map((r) => r.item_id);
  const viewedAtMap = new Map(recentData.map((r) => [r.item_id, r.viewed_at]));

  // 프로젝트 상세 정보 조회
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, title, cover_image_url, budget_range, deadline, category')
    .in('id', projectIds);

  if (projectsError) {
    console.error('Error fetching project details:', projectsError);
    return [];
  }

  // 최근 본 순서 유지하면서 상세 정보 매핑
  return projectIds
    .map<RecentViewProjectItem | null>((id) => {
      const project = projects?.find((p) => p.id === id);
      if (!project) return null;
      return {
        id: project.id,
        type: 'project' as const,
        title: project.title || '',
        image: project.cover_image_url ?? null,
        date: viewedAtMap.get(id) || new Date().toISOString(),
        budgetRange: project.budget_range ?? null,
        deadline: project.deadline ?? null,
        category: project.category ?? null,
      };
    })
    .filter((item): item is RecentViewProjectItem => item !== null);
}

/**
 * 서버에서 최근 본 협업 조회 (상세 정보 포함)
 * collaborations 테이블과 JOIN하여 category, duration 등 조회
 */
export async function getRecentlyViewedCollaborationsWithDetails(
  userId: string,
  limit: number = 10
): Promise<RecentViewCollaborationItem[]> {
  if (!userId) return [];

  // 먼저 최근 본 협업 ID 목록 조회
  const { data: recentData, error: recentError } = await supabase
    .from('user_recently_viewed')
    .select('item_id, viewed_at')
    .eq('user_id', userId)
    .eq('item_type', 'collaboration')
    .order('viewed_at', { ascending: false })
    .limit(limit);

  if (recentError || !recentData || recentData.length === 0) {
    if (recentError) console.error('Error fetching recent collaboration IDs:', recentError);
    return [];
  }

  const collabIds = recentData.map((r) => r.item_id);
  const viewedAtMap = new Map(recentData.map((r) => [r.item_id, r.viewed_at]));

  // 협업 상세 정보 조회
  const { data: collabs, error: collabsError } = await supabase
    .from('collaborations')
    .select('id, title, cover_image_url, category, duration')
    .in('id', collabIds);

  if (collabsError) {
    console.error('Error fetching collaboration details:', collabsError);
    return [];
  }

  // 카테고리 한글 라벨 매핑
  const categoryLabels: Record<string, string> = {
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

  // 최근 본 순서 유지하면서 상세 정보 매핑
  return collabIds
    .map<RecentViewCollaborationItem | null>((id) => {
      const collab = collabs?.find((c) => c.id === id);
      if (!collab) return null;
      return {
        id: collab.id,
        type: 'collaboration' as const,
        title: collab.title || '',
        image: collab.cover_image_url ?? null,
        date: viewedAtMap.get(id) || new Date().toISOString(),
        category: collab.category ?? null,
        categoryLabel: collab.category ? categoryLabels[collab.category] || collab.category : null,
        duration: collab.duration ?? null,
      };
    })
    .filter((item): item is RecentViewCollaborationItem => item !== null);
}

/**
 * 서버에서 특정 최근 본 콘텐츠 삭제
 */
export async function removeRecentlyViewedFromServer(
  userId: string,
  itemId: string,
  itemType: RecentViewType
): Promise<void> {
  if (!userId) return;

  const { error } = await supabase
    .from('user_recently_viewed')
    .delete()
    .eq('user_id', userId)
    .eq('item_id', itemId)
    .eq('item_type', itemType);

  if (error) {
    console.error('Error removing recently viewed from server:', error);
  }
}

/**
 * 서버에서 모든 최근 본 콘텐츠 삭제
 */
export async function clearRecentViewsFromServer(userId: string): Promise<void> {
  if (!userId) return;

  const { error } = await supabase
    .from('user_recently_viewed')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error clearing recently viewed from server:', error);
  }
}

/**
 * LocalStorage 데이터를 서버로 마이그레이션
 * (첫 로그인 시 호출)
 */
export async function migrateLocalStorageToServer(userId: string): Promise<void> {
  if (!userId) return;

  const localViews = getAllRecentViews();
  if (localViews.length === 0) return;

  // 서버에 일괄 저장 (upsert)
  const records = localViews.map((item) => ({
    user_id: userId,
    item_id: item.id,
    item_type: item.type,
    title: item.title,
    image_url: item.image,
    subtitle: item.subtitle,
    viewed_at: item.date,
  }));

  const { error } = await supabase
    .from('user_recently_viewed')
    .upsert(records, { onConflict: 'user_id,item_id,item_type' });

  if (error) {
    console.error('Error migrating recently viewed to server:', error);
  } else {
    // 마이그레이션 성공 시 LocalStorage 비우기 (선택적)
    // clearRecentViews();
    console.log(`Migrated ${localViews.length} recently viewed items to server`);
  }
}

// =====================================================
// LocalStorage 함수 (기존 유지 - 비로그인 사용자용)
// =====================================================

/**
 * Get all recent views from LocalStorage
 */
function getAllRecentViews(): RecentViewItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as RecentViewItem[];
  } catch (error) {
    console.error('Error reading recent views from LocalStorage:', error);
    return [];
  }
}

/**
 * Save recent views to LocalStorage
 */
function saveRecentViews(views: RecentViewItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
  } catch (error) {
    console.error('Error saving recent views to LocalStorage:', error);
  }
}

/**
 * Add a recently viewed item
 * Removes duplicates and keeps only the most recent MAX_ITEMS_PER_TYPE items per type
 */
export function addRecentlyViewed(item: Omit<RecentViewItem, 'date'>): void {
  const views = getAllRecentViews();
  
  // Remove existing item with same id and type (if exists)
  const filtered = views.filter(
    (v) => !(v.id === item.id && v.type === item.type)
  );
  
  // Add new item at the beginning
  const newView: RecentViewItem = {
    ...item,
    date: new Date().toISOString(),
  };
  
  const updated = [newView, ...filtered];
  
  // Group by type and limit each type to MAX_ITEMS_PER_TYPE
  const grouped = new Map<RecentViewType, RecentViewItem[]>();
  
  updated.forEach((view) => {
    if (!grouped.has(view.type)) {
      grouped.set(view.type, []);
    }
    grouped.get(view.type)!.push(view);
  });
  
  // Limit each type and flatten
  const limited: RecentViewItem[] = [];
  grouped.forEach((items) => {
    limited.push(...items.slice(0, MAX_ITEMS_PER_TYPE));
  });
  
  // Sort by date (most recent first)
  limited.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  saveRecentViews(limited);
}

/**
 * Get recently viewed items by type
 */
export function getRecentlyViewed(type: RecentViewType, limit?: number): RecentViewItem[] {
  const views = getAllRecentViews();
  const filtered = views.filter((v) => v.type === type);
  
  if (limit !== undefined) {
    return filtered.slice(0, limit);
  }
  
  return filtered;
}

/**
 * Get all recently viewed items (all types)
 */
export function getAllRecentlyViewed(limit?: number): RecentViewItem[] {
  const views = getAllRecentViews();
  
  if (limit !== undefined) {
    return views.slice(0, limit);
  }
  
  return views;
}

/**
 * Clear all recent views
 */
export function clearRecentViews(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing recent views from LocalStorage:', error);
  }
}

/**
 * Clear recent views for a specific type
 */
export function clearRecentViewsByType(type: RecentViewType): void {
  const views = getAllRecentViews();
  const filtered = views.filter((v) => v.type !== type);
  saveRecentViews(filtered);
}

/**
 * Remove a specific item from recent views
 */
export function removeRecentlyViewed(id: string, type: RecentViewType): void {
  const views = getAllRecentViews();
  const filtered = views.filter((v) => !(v.id === id && v.type === type));
  saveRecentViews(filtered);
}


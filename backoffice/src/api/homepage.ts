import { supabase } from '../lib/supabase';
import type {
  HomepageSliderImage,
  HomepageTrendingProject,
  HomepageMagazine,
  ExploreFeaturedItem,
} from '../types/database.types';
import { uploadFile } from '../upload/uploader';

/**
 * 세션 확인 유틸리티
 * API 호출 전에 세션이 유효한지 확인하고, 없으면 에러를 던짐
 */
async function ensureSession(): Promise<void> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(`세션 확인 실패: ${error.message}`);
  }
  if (!session) {
    throw new Error('로그인이 필요합니다. 다시 로그인해주세요.');
  }
}

// ============================================
// 이미지/비디오 업로드
// ============================================
// 새로운 업로드 파이프라인 사용 (자동 WebP/WebM 변환)
export async function uploadHomepageImage(
  file: File, 
  adminUserId: string, 
  section?: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  return uploadFile(file, adminUserId, {
    bucket: 'homepage-images',
    folder: section,
    onProgress,
  });
}

// ============================================
// 슬라이더 이미지
// ============================================
export async function listSliderImages() {
  const { data, error } = await supabase
    .from('homepage_slider_images')
    .select('*')
    .order('display_order', { ascending: true });
  
  if (error) throw error;
  return (data as HomepageSliderImage[]) || [];
}

export async function createSliderImage(
  input: Omit<HomepageSliderImage, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>,
  adminUserId: string
) {
  // 세션 확인 (RLS 정책 통과를 위해 필수)
  await ensureSession();

  const { data, error } = await supabase
    .from('homepage_slider_images')
    .insert({
      ...input,
      created_by: adminUserId,
      updated_by: adminUserId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as HomepageSliderImage;
}

export async function updateSliderImage(
  id: string,
  input: Partial<Omit<HomepageSliderImage, 'id' | 'created_at' | 'updated_at'>>,
  adminUserId: string
) {
  // 세션 확인 (RLS 정책 통과를 위해 필수)
  await ensureSession();

  const { data, error } = await supabase
    .from('homepage_slider_images')
    .update({
      ...input,
      updated_by: adminUserId,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as HomepageSliderImage;
}

export async function deleteSliderImage(id: string) {
  // 세션 확인 (RLS 정책 통과를 위해 필수)
  await ensureSession();

  const { error } = await supabase
    .from('homepage_slider_images')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function updateSliderImageOrder(ids: string[], adminUserId: string) {
  // 세션 확인 (RLS 정책 통과를 위해 필수)
  await ensureSession();

  const updates = ids.map((id, index) => ({
    id,
    display_order: index,
    updated_by: adminUserId,
  }));

  for (const update of updates) {
    const { error } = await supabase
      .from('homepage_slider_images')
      .update({ display_order: update.display_order, updated_by: update.updated_by })
      .eq('id', update.id);

    if (error) throw error;
  }
}

// ============================================
// 급상승 프로젝트
// ============================================
export async function listTrendingProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('id,title,category,cover_image_url,display_order,is_trending,status,created_at,updated_at')
    .eq('is_trending', true)
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as HomepageTrendingProject[]) || [];
}

export async function toggleProjectTrending(projectId: string, isTrending: boolean) {
  const { data, error } = await supabase
    .from('projects')
    .update({ is_trending: isTrending })
    .eq('id', projectId)
    .select('id,title,category,cover_image_url,display_order,is_trending,status,created_at,updated_at')
    .single();

  if (error) throw error;
  return data as HomepageTrendingProject;
}

export async function listProjectsForTrending(options?: { search?: string; limit?: number }) {
  const limit = options?.limit ?? 50;
  let query = supabase
    .from('projects')
    .select('id,title,category,cover_image_url,status,is_trending,display_order')
    .neq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (options?.search) {
    query = query.ilike('title', `%${options.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as HomepageTrendingProject[];
}

export async function createTrendingProject(
  input: { project_id: string; display_order?: number | null }
) {
  const { data, error } = await supabase
    .from('projects')
    .update({
      is_trending: true,
      display_order: input.display_order ?? 0,
    })
    .eq('id', input.project_id)
    .select('id,title,category,cover_image_url,display_order,is_trending,status,created_at,updated_at')
    .single();

  if (error) throw error;
  return data as HomepageTrendingProject;
}

export async function updateTrendingProject(
  id: string,
  input: Partial<Pick<HomepageTrendingProject, 'display_order' | 'is_trending'>>
) {
  const { data, error } = await supabase
    .from('projects')
    .update({
      ...input,
    })
    .eq('id', id)
    .select('id,title,category,cover_image_url,display_order,is_trending,status,created_at,updated_at')
    .single();

  if (error) throw error;
  return data as HomepageTrendingProject;
}

export async function deleteTrendingProject(id: string) {
  const { error } = await supabase
    .from('projects')
    .update({ is_trending: false, display_order: null })
    .eq('id', id);

  if (error) throw error;
}

export async function updateTrendingProjectOrder(ids: string[]) {
  const updates = ids.map((id, index) => ({
    id,
    display_order: index,
  }));

  for (const update of updates) {
    const { error } = await supabase
      .from('projects')
      .update({ display_order: update.display_order, is_trending: true })
      .eq('id', update.id);

    if (error) throw error;
  }
}

// ============================================
// 홈 매거진
// ============================================
// ============================================
// Explore Featured (projects + collaborations)
// ============================================
type ExploreFeaturedType = 'project' | 'collaboration';

export async function listExploreFeaturedItems() {
  const [projectsResult, collaborationsResult] = await Promise.all([
    supabase
      .from('projects')
      .select('id,title,category,cover_image_url,explore_order,status')
      .eq('is_explore_featured', true)
      .order('explore_order', { ascending: true, nullsFirst: false }),
    supabase
      .from('collaborations')
      .select('id,title,category,cover_image_url,explore_order,status')
      .eq('is_explore_featured', true)
      .order('explore_order', { ascending: true, nullsFirst: false }),
  ]);

  if (projectsResult.error) throw projectsResult.error;
  if (collaborationsResult.error) throw collaborationsResult.error;

  const projects = (projectsResult.data || []).map((item) => ({
    ...item,
    type: 'project' as const,
  }));
  const collaborations = (collaborationsResult.data || []).map((item) => ({
    ...item,
    type: 'collaboration' as const,
  }));

  return [...projects, ...collaborations]
    .sort((a, b) => (a.explore_order ?? 999) - (b.explore_order ?? 999)) as ExploreFeaturedItem[];
}

export async function addExploreFeaturedItem(id: string, type: ExploreFeaturedType, order: number) {
  const table = type === 'project' ? 'projects' : 'collaborations';
  const { data, error } = await supabase
    .from(table)
    .update({ is_explore_featured: true, explore_order: order })
    .eq('id', id)
    .select('id,title,category,cover_image_url,explore_order,status')
    .single();

  if (error) throw error;
  return { ...data, type } as ExploreFeaturedItem;
}

export async function removeExploreFeaturedItem(id: string, type: ExploreFeaturedType) {
  const table = type === 'project' ? 'projects' : 'collaborations';
  const { error } = await supabase
    .from(table)
    .update({ is_explore_featured: false, explore_order: null })
    .eq('id', id);

  if (error) throw error;
}

export async function updateExploreFeaturedOrder(
  items: Array<{ id: string; type: ExploreFeaturedType; explore_order: number }>
) {
  await Promise.all(
    items.map((item) => {
      const table = item.type === 'project' ? 'projects' : 'collaborations';
      return supabase
        .from(table)
        .update({ explore_order: item.explore_order, is_explore_featured: true })
        .eq('id', item.id);
    })
  );
}

// ============================================
// Magazines
// ============================================
export async function listHomepageMagazines() {
  const { data, error } = await supabase
    .from('magazines')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) throw error;
  return (data as HomepageMagazine[]) || [];
}

export async function createHomepageMagazine(
  input: Omit<HomepageMagazine, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>,
  adminUserId: string
) {
  const { data, error } = await supabase
    .from('magazines')
    .insert({
      ...input,
      created_by: adminUserId,
      updated_by: adminUserId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as HomepageMagazine;
}

export async function updateHomepageMagazine(
  id: string,
  input: Partial<Omit<HomepageMagazine, 'id' | 'created_at' | 'updated_at'>>,
  adminUserId: string
) {
  const { data, error } = await supabase
    .from('magazines')
    .update({
      ...input,
      updated_by: adminUserId,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as HomepageMagazine;
}

export async function deleteHomepageMagazine(id: string) {
  const { error } = await supabase
    .from('magazines')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function updateHomepageMagazineOrder(ids: string[], adminUserId: string) {
  const updates = ids.map((id, index) => ({
    id,
    display_order: index,
    updated_by: adminUserId,
  }));

  for (const update of updates) {
    const { error } = await supabase
      .from('magazines')
      .update({ display_order: update.display_order, updated_by: update.updated_by })
      .eq('id', update.id);

    if (error) throw error;
  }
}

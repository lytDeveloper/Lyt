import { supabase } from '../lib/supabase';
import type { Magazine } from '../types/database.types';
import { uploadFile } from '../upload/uploader';

// ============================================
// 이미지/비디오 업로드
// ============================================
// 새로운 업로드 파이프라인 사용 (자동 WebP/WebM 변환)
export async function uploadMagazineImage(file: File, adminUserId: string): Promise<string> {
  return uploadFile(file, adminUserId, {
    bucket: 'homepage-images',
    folder: 'magazines',
  });
}

// ============================================
// 매거진 목록 조회
// ============================================
export interface MagazineFilters {
  category?: Magazine['category'];
  status?: Magazine['status'];
  search?: string;
}

export async function listMagazines(filters?: MagazineFilters): Promise<Magazine[]> {
  let query = supabase
    .from('magazines')
    .select(`
      *,
      author:profiles!magazines_author_id_fkey(
        id,
        nickname
      )
    `)
    .order('created_at', { ascending: false });

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data as Magazine[]) || [];
}

// ============================================
// 단일 매거진 조회
// ============================================
export async function getMagazine(id: string): Promise<Magazine | null> {
  const { data, error } = await supabase
    .from('magazines')
    .select(`
      *,
      author:profiles!magazines_author_id_fkey(
        id,
        nickname
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Magazine | null;
}

// ============================================
// 매거진 생성
// ============================================
export async function createMagazine(
  input: Omit<Magazine, 'id' | 'created_at' | 'updated_at' | 'view_count' | 'like_count' | 'comment_count' | 'bookmark_count' | 'share_count'>,
): Promise<Magazine> {
  const { data, error } = await supabase
    .from('magazines')
    .insert({
      ...input,
      view_count: 0,
      like_count: 0,
      comment_count: 0,
      bookmark_count: 0,
      share_count: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Magazine;
}

// ============================================
// 매거진 수정
// ============================================
export async function updateMagazine(
  id: string,
  input: Partial<Omit<Magazine, 'id' | 'created_at' | 'updated_at' | 'updated_by'>>,
  adminUserId?: string,
): Promise<Magazine> {
  // updated_at과 updated_by를 명시적으로 설정
  const updateData: Partial<Magazine> = {
    ...input,
    updated_at: new Date().toISOString(),
  };

  // adminUserId가 제공된 경우 updated_by 설정
  if (adminUserId) {
    updateData.updated_by = adminUserId;
  }

  console.log('매거진 업데이트 payload:', { id, updateData });
  console.log('is_featured:', updateData.is_featured, typeof updateData.is_featured);
  console.log('is_trending:', updateData.is_trending, typeof updateData.is_trending);
  console.log('is_editor_pick:', updateData.is_editor_pick, typeof updateData.is_editor_pick);

  const { data, error } = await supabase
    .from('magazines')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('매거진 수정 오류:', error);
    throw error;
  }

  console.log('매거진 업데이트 결과:', data);
  return data as Magazine;
}

// ============================================
// 매거진 삭제
// ============================================
export async function deleteMagazine(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('magazines')
    .delete()
    .eq('id', id)
    .select();

  if (error) {
    console.error('매거진 삭제 오류:', error);
    throw error;
  }

  // 삭제가 실제로 이루어졌는지 확인
  if (!data || data.length === 0) {
    throw new Error('매거진을 삭제할 수 없어요. 권한을 확인해주세요.');
  }
}


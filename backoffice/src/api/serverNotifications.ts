import { supabase } from '../lib/supabase';

export type ServerNotificationType = 'announcement' | 'version_update' | 'maintenance' | 'advertisement';

export interface ServerNotificationRow {
  id: string;
  title: string;
  body: string;
  type: ServerNotificationType;
  audiences: string[];
  locale: string | null;
  app_min_version: string | null;
  app_max_version: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  priority: number;
  require_ack: boolean;
  link_url: string | null;
  image_urls: string[] | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface UpsertServerNotificationInput {
  id?: string;
  title: string;
  body: string;
  type: ServerNotificationType;
  audiences: string[];
  locale?: string | null;
  app_min_version?: string | null;
  app_max_version?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active: boolean;
  priority?: number;
  require_ack?: boolean;
  link_url?: string | null;
  image_urls?: string[] | null;
}

export async function listServerNotifications(params?: {
  q?: string;
  type?: ServerNotificationType | 'all';
  isActive?: boolean | 'all';
}) {
  // 관리자 권한 확인
  const { data: { user } } = await supabase.auth.getUser();
  let isAdmin = false;
  
  if (user) {
    const { data: adminCheck } = await supabase
      .from('admins')
      .select('profile_id')
      .eq('profile_id', user.id)
      .single();
    isAdmin = !!adminCheck;
  }

  // 관리자는 RPC 함수로 모든 항목 조회 (RLS 우회)
  if (isAdmin) {
    const { data, error } = await supabase.rpc('get_all_notifications_for_admin');
    
    if (error) {
      console.warn('RPC 함수 실패, 일반 쿼리로 fallback:', error);
      // fallback to normal query
    } else if (data) {
      // jsonb 배열을 파싱
      const allNotifications = Array.isArray(data) ? data : (data as unknown as ServerNotificationRow[]);
      
      // 클라이언트에서 필터링
      let result = allNotifications;
      
      // 타입 필터
      if (params?.type && params.type !== 'all') {
        result = result.filter(r => r.type === params.type);
      }
      
      // 활성/비활성 필터
      if (typeof params?.isActive === 'boolean') {
        result = result.filter(r => r.is_active === params.isActive);
      }
      
      // 검색 필터
      if (params?.q) {
        const searchLower = params.q.toLowerCase();
        result = result.filter(r => 
          r.title.toLowerCase().includes(searchLower) || 
          r.body.toLowerCase().includes(searchLower)
        );
      }
      
      console.log(`📋 관리자 조회 결과: 전체 ${allNotifications.length}개 → 필터 후 ${result.length}개`, {
        params,
        activeCount: result.filter(r => r.is_active).length,
        inactiveCount: result.filter(r => !r.is_active).length,
      });
      
      return result;
    }
  }

  // 일반 사용자 또는 RPC 실패 시 기존 로직
  let query = supabase.from('server_notifications').select('*').order('created_at', { ascending: false });

  if (params?.type && params.type !== 'all') {
    query = query.eq('type', params.type);
  }
  if (typeof params?.isActive === 'boolean') {
    query = query.eq('is_active', params.isActive);
  }
  if (params?.q) {
    query = query.or(`title.ilike.%${params.q}%,body.ilike.%${params.q}%`);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('❌ listServerNotifications 에러:', error);
    throw error;
  }
  
  const result = (data as ServerNotificationRow[]) || [];
  console.log(`📋 일반 조회 결과: ${result.length}개`, {
    params,
    activeCount: result.filter(r => r.is_active).length,
    inactiveCount: result.filter(r => !r.is_active).length,
  });
  
  return result;
}

export async function getServerNotification(id: string) {
  const { data, error } = await supabase
    .from('server_notifications')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as ServerNotificationRow;
}

export async function upsertServerNotification(input: UpsertServerNotificationInput, adminUserId: string) {
  const payload: Record<string, unknown> = {
    title: input.title,
    body: input.body,
    type: input.type,
    audiences: input.audiences?.length ? input.audiences : ['all'],
    locale: input.locale ?? null,
    app_min_version: input.app_min_version ?? null,
    app_max_version: input.app_max_version ?? null,
    starts_at: input.starts_at ?? null,
    ends_at: input.ends_at ?? null,
    is_active: input.is_active,
    priority: input.priority ?? 0,
    require_ack: input.require_ack ?? false,
    link_url: input.link_url ?? null,
    image_urls: input.image_urls ?? null,
    created_by: adminUserId,
  };

  const query = supabase.from('server_notifications');
  if (input.id) {
    const { data, error } = await query.update(payload).eq('id', input.id).select('*').single();
    if (error) throw error;
    return data as ServerNotificationRow;
  }
  const { data, error } = await query.insert(payload).select('*').single();
  if (error) throw error;
  return data as ServerNotificationRow;
}

export async function deactivateServerNotification(id: string) {
  // soft delete: 실제로 삭제하지 않고 비활성화만 처리
  const { error } = await supabase
    .from('server_notifications')
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteServerNotification(id: string) {
  // hard delete: RPC 함수를 통해 RLS를 우회하여 실제 데이터 삭제
  const { data, error } = await supabase.rpc('delete_server_notification_for_admin', {
    p_notification_id: id
  });

  if (error) {
    console.error('❌ deleteServerNotification RPC 에러:', error);
    throw error;
  }

  // RPC 함수 결과 확인
  const result = data as { success: boolean; error?: string; deleted_count?: number } | null;

  if (!result?.success) {
    const errorMessage = result?.error || '삭제에 실패했습니다';
    console.error('❌ deleteServerNotification 실패:', errorMessage);
    throw new Error(errorMessage);
  }

  console.log('✅ 공지 삭제 완료:', { id, deleted_count: result.deleted_count });
}

export async function autoDeactivateExpiredNotifications() {
  // 데이터베이스 함수를 사용하여 만료된 공지 비활성화 (더 안정적)
  try {
    const { data, error } = await supabase.rpc('auto_deactivate_expired_notifications');
    
    if (error) {
      // RPC 함수가 없으면 기존 로직 사용 (fallback)
      console.warn('RPC function not available, using fallback logic:', error);
      
      const now = new Date().toISOString();
      
      // 먼저 만료된 공지 조회
      const { data: expiredNotifications, error: selectError } = await supabase
        .from('server_notifications')
        .select('id, title')
        .eq('is_active', true)
        .lt('ends_at', now)
        .not('ends_at', 'is', null);

      if (selectError) {
        console.error('Failed to fetch expired notifications:', selectError);
        throw selectError;
      }

      if (!expiredNotifications || expiredNotifications.length === 0) {
        return [];
      }

      // 조회된 ID들로 업데이트
      const ids = expiredNotifications.map(n => n.id);
      const { error: updateError } = await supabase
        .from('server_notifications')
        .update({ is_active: false })
        .in('id', ids);

      if (updateError) {
        console.error('Failed to deactivate expired notifications:', updateError);
        throw updateError;
      }

      console.log(`Auto-deactivated ${expiredNotifications.length} expired notifications:`, expiredNotifications.map(n => n.title));
      return expiredNotifications;
    }

    // RPC 함수가 성공적으로 실행됨
    // data는 { count: number, ids: string[], success: boolean } 형태
    const result = data as { count: number; ids: string[]; success: boolean } | null;
    if (result && result.count > 0) {
      console.log(`✅ Auto-deactivate function executed: ${result.count} notifications deactivated`);
    }
    return result?.ids?.map((id) => ({ id, title: '' })) || [];
  } catch (error) {
    console.error('Failed to auto-deactivate expired notifications:', error);
    throw error;
  }
}

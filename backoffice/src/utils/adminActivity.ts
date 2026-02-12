import { supabase } from '../lib/supabase';
import type { AdminActivityLog } from '../types/database.types';

/**
 * 관리자 활동 로그 기록
 */
export async function logAdminActivity(
  adminProfileId: string,
  action: string,
  targetAdminProfileId: string | null = null,
  details: Record<string, unknown> = {}
): Promise<void> {
  try {
    const { error } = await supabase
      .from('admin_activity_logs')
      .insert({
        admin_profile_id: adminProfileId,
        target_admin_profile_id: targetAdminProfileId,
        action,
        details,
      });

    if (error) {
      console.error('활동 로그 기록 실패:', error);
      // 에러가 발생해도 작업은 계속 진행
    }
  } catch (error) {
    console.error('활동 로그 기록 중 예외 발생:', error);
  }
}

/**
 * 활동 로그 조회
 */
export async function getAdminActivityLogs(
  adminProfileId?: string,
  limit: number = 50
): Promise<AdminActivityLog[]> {
  try {
    let query = supabase
      .from('admin_activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (adminProfileId) {
      query = query.eq('admin_profile_id', adminProfileId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('활동 로그 조회 실패:', error);
    return [];
  }
}


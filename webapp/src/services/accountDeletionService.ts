/**
 * Account Deletion Service
 *
 * 계정 삭제 관련 서비스 함수
 */

import { supabase } from '../lib/supabase';

interface DeleteAccountResponse {
  success: boolean;
  message: string;
  deletedData?: {
    profiles: number;
    projects: number;
    collaborations: number;
    messages: number;
    notifications: number;
  };
  error?: string;
}

/**
 * 사용자 계정 완전 삭제
 *
 * @param userId - 삭제할 사용자 ID
 * @param requestId - 계정 삭제 요청 ID (선택)
 * @param reason - 삭제 사유 (선택)
 * @returns 삭제 결과
 */
export async function deleteUserAccount(
  userId: string,
  requestId?: string,
  reason?: string
): Promise<DeleteAccountResponse> {
  try {
    console.log('Starting account deletion for user:', userId);

    // Supabase Edge Function 호출
    const { data, error } = await supabase.functions.invoke('delete-user-account', {
      body: {
        userId,
        requestId,
        reason,
      },
    });

    if (error) {
      console.error('Error invoking delete-user-account function:', error);
      throw error;
    }

    console.log('Account deletion response:', data);
    return data as DeleteAccountResponse;
  } catch (error) {
    console.error('Failed to delete user account:', error);
    throw error;
  }
}

/**
 * 계정 삭제 가능 여부 확인
 *
 * - 진행 중인 프로젝트가 있는지 확인
 * - 진행 중인 협업이 있는지 확인
 *
 * @param userId - 확인할 사용자 ID
 * @returns 삭제 가능 여부 및 경고 메시지
 */
export async function checkDeletionEligibility(userId: string): Promise<{
  canDelete: boolean;
  warnings: string[];
}> {
  const warnings: string[] = [];

  try {
    // 진행 중인 프로젝트 확인
    const { count: activeProjects, error: projectError } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', userId)
      .eq('status', 'active');

    if (projectError) {
      console.error('Error checking active projects:', projectError);
    } else if (activeProjects !== null && activeProjects > 0) {
      warnings.push(`진행 중인 프로젝트가 ${activeProjects}건 있습니다.`);
    }

    // 진행 중인 협업 확인
    const { count: activeCollaborations, error: collaborationError } = await supabase
      .from('collaborations')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', userId)
      .eq('status', 'active');

    if (collaborationError) {
      console.error('Error checking active collaborations:', collaborationError);
    } else if (activeCollaborations !== null && activeCollaborations > 0) {
      warnings.push(`진행 중인 협업이 ${activeCollaborations}건 있습니다.`);
    }

    // 경고가 있어도 삭제는 가능하도록 설정 (사용자 선택)
    return {
      canDelete: true,
      warnings,
    };
  } catch (error) {
    console.error('Failed to check deletion eligibility:', error);
    return {
      canDelete: false,
      warnings: ['삭제 가능 여부를 확인하는 중 오류가 발생했습니다.'],
    };
  }
}

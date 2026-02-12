/**
 * Account Deletion Service (Backoffice)
 *
 * 계정 삭제 관련 서비스 함수 (관리자용)
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
 * 사용자 계정 완전 삭제 (관리자용)
 *
 * @param userId - 삭제할 사용자 ID
 * @param requestId - 계정 삭제 요청 ID (선택)
 * @param notes - 관리자 메모 (선택)
 * @returns 삭제 결과
 */
export async function deleteUserAccount(
  userId: string,
  requestId?: string,
  notes?: string
): Promise<DeleteAccountResponse> {
  try {
    console.log('Starting account deletion for user:', userId);

    // Supabase Edge Function 호출
    const { data, error } = await supabase.functions.invoke('delete-user-account', {
      body: {
        userId,
        requestId,
        reason: notes,
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

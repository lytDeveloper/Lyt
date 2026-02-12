/**
 * Talk Request Service
 * 대화 요청 관리 서비스
 */

import { supabase } from '../lib/supabase';
import type {
  TalkRequest,
  TalkRequestRow,
  CreateTalkRequestInput,
} from '../types/talkRequest.types';
import { getProfileDisplayMap } from './profileDisplayService';
import { activityService } from './activityService';
import { badgeAutoGrantService } from './badgeAutoGrantService';

// ============================================================================
// Helper Functions
// ============================================================================

const mapTalkRequestRow = (row: TalkRequestRow): TalkRequest => ({
  id: row.id,
  senderId: row.sender_id,
  receiverId: row.receiver_id,
  status: row.status,
  templateMessage: row.template_message,
  additionalMessage: row.additional_message,
  sentAt: row.sent_at,
  respondedAt: row.responded_at,
  expiresAt: row.expires_at,
  isHiddenBySender: row.is_hidden_by_sender,
  isHiddenByReceiver: row.is_hidden_by_receiver,
  rejectionReason: row.rejection_reason,
  createdChatRoomId: row.created_chat_room_id,
  viewedAt: (row as any).viewed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const enrichTalkRequests = async (
  rows: TalkRequestRow[],
  mode: 'sender' | 'receiver'
): Promise<TalkRequest[]> => {
  if (rows.length === 0) return [];

  const userIds =
    mode === 'sender'
      ? [...new Set(rows.map((r) => r.receiver_id))]
      : [...new Set(rows.map((r) => r.sender_id))];

  const profileMap = await getProfileDisplayMap(userIds);

  return rows.map((row) => {
    const request = mapTalkRequestRow(row);

    const targetId = mode === 'sender' ? row.receiver_id : row.sender_id;
    const profile = profileMap.get(targetId);

    if (mode === 'sender') {
      request.receiver = {
        id: targetId,
        name: profile?.name || '알 수 없음',
        avatarUrl: profile?.avatar,
        activityField: profile?.activityField,
        profileType: profile?.profileType === 'customer' ? undefined : (profile?.profileType as any),
      };
    } else {
      request.sender = {
        id: targetId,
        name: profile?.name || '알 수 없음',
        avatarUrl: profile?.avatar,
        activityField: profile?.activityField,
        profileType: profile?.profileType === 'customer' ? undefined : (profile?.profileType as any),
      };
    }

    return request;
  });
};

// ============================================================================
// Main Service Functions
// ============================================================================

/**
 * 대화 요청 생성
 */
export const createTalkRequest = async (
  input: CreateTalkRequestInput
): Promise<string> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('로그인이 필요합니다');
  }

  // 자기 자신에게 요청 불가
  if (input.receiverId === user.id) {
    throw new Error('자기 자신에게 대화 요청을 보낼 수 없습니다');
  }

  // 추가 메시지 길이 검증
  if (input.additionalMessage && input.additionalMessage.length > 500) {
    throw new Error('추가 내용은 500자를 초과할 수 없습니다');
  }

  // 이미 pending 상태의 요청이 있는지 확인
  const { data: existingPending } = await supabase
    .from('talk_requests')
    .select('id')
    .eq('sender_id', user.id)
    .eq('receiver_id', input.receiverId)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingPending) {
    throw new Error('이미 대기 중인 대화 요청이 있습니다');
  }

  // 만료일 계산 (7일 후)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data: newRequest, error: insertError } = await supabase
    .from('talk_requests')
    .insert({
      sender_id: user.id,
      receiver_id: input.receiverId,
      template_message: input.templateMessage,
      additional_message: input.additionalMessage || null,
      expires_at: expiresAt.toISOString(),
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('[talkRequestService] createTalkRequest failed:', insertError);
    throw new Error(`대화 요청 전송에 실패했습니다: ${insertError.message}`);
  }

  return newRequest.id;
};

/**
 * 보낸 대화 요청 조회
 */
export const getSentTalkRequests = async (
  includeHidden: boolean = false
): Promise<TalkRequest[]> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('로그인이 필요합니다');
  }

  let query = supabase
    .from('talk_requests')
    .select('*')
    .eq('sender_id', user.id)
    .neq('status', 'withdrawn');

  if (!includeHidden) {
    query = query.eq('is_hidden_by_sender', false);
  }

  const { data, error } = await query.order('sent_at', { ascending: false });

  if (error) {
    console.error('[talkRequestService] getSentTalkRequests failed:', error);
    throw new Error(`보낸 대화 요청을 불러오는데 실패했습니다: ${error.message}`);
  }

  return enrichTalkRequests(data || [], 'sender');
};

/**
 * 받은 대화 요청 조회
 */
export const getReceivedTalkRequests = async (
  includeHidden: boolean = false
): Promise<TalkRequest[]> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('로그인이 필요합니다');
  }

  let query = supabase
    .from('talk_requests')
    .select('*')
    .eq('receiver_id', user.id)
    .neq('status', 'withdrawn');

  if (!includeHidden) {
    query = query.eq('is_hidden_by_receiver', false);
  }

  const { data, error } = await query.order('sent_at', { ascending: false });

  if (error) {
    console.error('[talkRequestService] getReceivedTalkRequests failed:', error);
    throw new Error(`받은 대화 요청을 불러오는데 실패했습니다: ${error.message}`);
  }

  return enrichTalkRequests(data || [], 'receiver');
};

/**
 * 대화 요청 응답 (수락/거절)
 */
export const respondToTalkRequest = async (
  requestId: string,
  status: 'accepted' | 'rejected',
  reason?: string
): Promise<string | undefined> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('로그인이 필요합니다');
  }

  // 요청 정보 확인
  const { data: request, error: fetchError } = await supabase
    .from('talk_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchError || !request) {
    throw new Error('대화 요청을 찾을 수 없습니다');
  }

  // 권한 확인
  if (request.receiver_id !== user.id) {
    throw new Error('이 대화 요청에 응답할 권한이 없습니다');
  }

  // 상태 확인
  if (request.status !== 'pending') {
    throw new Error('이미 처리된 대화 요청입니다');
  }

  // 만료 확인
  if (new Date(request.expires_at) < new Date()) {
    throw new Error('만료된 대화 요청입니다');
  }

  const updateData: {
    status: string;
    responded_at: string;
    rejection_reason?: string;
  } = {
    status,
    responded_at: new Date().toISOString(),
  };

  if (status === 'rejected' && reason) {
    updateData.rejection_reason = reason;
  }

  // 거절 시에는 created_chat_room_id 필드를 조회하지 않음 (트리거에서 생성되지 않음)
  if (status === 'rejected') {
    const { error: updateError } = await supabase
      .from('talk_requests')
      .update(updateData)
      .eq('id', requestId);

    if (updateError) {
      console.error('[talkRequestService] respondToTalkRequest failed:', updateError);
      throw new Error(`대화 요청 응답에 실패했습니다: ${updateError.message}`);
    }

    return undefined;
  }

  // 수락 시에는 created_chat_room_id를 조회
  const { data: updatedRequest, error: updateError } = await supabase
    .from('talk_requests')
    .update(updateData)
    .eq('id', requestId)
    .select('created_chat_room_id')
    .single();

  if (updateError) {
    console.error('[talkRequestService] respondToTalkRequest failed:', updateError);
    throw new Error(`대화 요청 응답에 실패했어요: ${updateError.message}`);
  }

  // 대화 요청 수락 시 활동 기록 및 배지 체크
  // 양측에게 파트너 연결 활동 기록
  try {
    // sender와 receiver 이름 조회
    const profileMap = await getProfileDisplayMap([request.sender_id, user.id]);
    const senderName = profileMap.get(request.sender_id)?.name || '사용자';
    const receiverName = profileMap.get(user.id)?.name || '사용자';

    // sender에게 활동 기록 (receiver 이름으로)
    activityService
      .createActivityViaRPC({
        userId: request.sender_id,
        activityType: 'talk_request_accepted',
        relatedEntityType: 'user',
        relatedEntityId: user.id,
        title: `새로운 파트너 ${receiverName}님과 연결되었어요`,
        description: '',
        metadata: {
          receiver_id: user.id,
          receiver_name: receiverName,
          chat_room_id: updatedRequest?.created_chat_room_id,
        },
      })
      .catch((err) =>
        console.warn('[talkRequestService] Failed to record sender activity:', err)
      );

    // receiver(수락자)에게도 활동 기록 (sender 이름으로)
    activityService
      .createActivityViaRPC({
        userId: user.id,
        activityType: 'talk_request_accepted',
        relatedEntityType: 'user',
        relatedEntityId: request.sender_id,
        title: `새로운 파트너 ${senderName}님과 연결되었어요`,
        description: '',
        metadata: {
          sender_id: request.sender_id,
          sender_name: senderName,
          chat_room_id: updatedRequest?.created_chat_room_id,
        },
      })
      .catch((err) =>
        console.warn('[talkRequestService] Failed to record receiver activity:', err)
      );
  } catch (err) {
    console.warn('[talkRequestService] Failed to record partner connection activities:', err);
  }

  // 연결 메이커 배지 체크 (sender에게)
  badgeAutoGrantService
    .checkLinkMakerBadge(request.sender_id)
    .catch((err) =>
      console.warn('[talkRequestService] Failed to check link maker badge:', err)
    );

  // 수락된 경우 생성된 채팅방 ID 반환
  return updatedRequest?.created_chat_room_id || undefined;
};

/**
 * 대화 요청 철회
 */
export const withdrawTalkRequest = async (requestId: string): Promise<void> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('로그인이 필요해요');
  }

  // 요청 정보 확인
  const { data: request, error: fetchError } = await supabase
    .from('talk_requests')
    .select('sender_id, status')
    .eq('id', requestId)
    .single();

  if (fetchError || !request) {
    throw new Error('대화 요청을 찾을 수 없어요');
  }

  // 권한 확인
  if (request.sender_id !== user.id) {
    throw new Error('대화 요청 철회 권한이 없어요');
  }

  // 상태 확인
  if (request.status !== 'pending') {
    throw new Error('대기 중인 요청만 철회할 수 있어요');
  }

  const { error: updateError } = await supabase
    .from('talk_requests')
    .update({
      status: 'withdrawn',
      responded_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (updateError) {
    console.error('[talkRequestService] withdrawTalkRequest failed:', updateError);
    throw new Error(`대화 요청 철회에 실패했어요: ${updateError.message}`);
  }
};

/**
 * 대화 요청 숨기기
 */
export const hideTalkRequests = async (
  ids: string[],
  role: 'sender' | 'receiver'
): Promise<void> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('로그인이 필요해요');
  }

  const column = role === 'sender' ? 'is_hidden_by_sender' : 'is_hidden_by_receiver';
  const userColumn = role === 'sender' ? 'sender_id' : 'receiver_id';

  const { error } = await supabase
    .from('talk_requests')
    .update({ [column]: true })
    .in('id', ids)
    .eq(userColumn, user.id);

  if (error) {
    console.error('[talkRequestService] hideTalkRequests failed:', error);
    throw new Error(`대화 요청 숨기기에 실패했어요: ${error.message}`);
  }
};

/**
 * 대화 요청 숨기기 해제
 */
export const unhideTalkRequests = async (
  ids: string[],
  role: 'sender' | 'receiver'
): Promise<void> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('로그인이 필요해요');
  }

  const column = role === 'sender' ? 'is_hidden_by_sender' : 'is_hidden_by_receiver';
  const userColumn = role === 'sender' ? 'sender_id' : 'receiver_id';

  const { error } = await supabase
    .from('talk_requests')
    .update({ [column]: false })
    .in('id', ids)
    .eq(userColumn, user.id);

  if (error) {
    console.error('[talkRequestService] unhideTalkRequests failed:', error);
    throw new Error(`대화 요청 숨기기 해제에 실패했어요: ${error.message}`);
  }
};

/**
 * 특정 사용자에 대한 pending 대화 요청 존재 여부 확인
 */
export const hasPendingTalkRequest = async (receiverId: string): Promise<boolean> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('talk_requests')
    .select('id')
    .eq('sender_id', user.id)
    .eq('receiver_id', receiverId)
    .eq('status', 'pending')
    .maybeSingle();

  return !!data;
};

/**
 * 단일 대화 요청 조회
 */
export const getTalkRequestById = async (requestId: string): Promise<TalkRequest | null> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('로그인이 필요해요');
  }

  const { data, error } = await supabase
    .from('talk_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('[talkRequestService] getTalkRequestById failed:', error);
    throw new Error(`대화 요청을 불러오는데 실패했어요: ${error.message}`);
  }

  if (!data) return null;

  const isSender = data.sender_id === user.id;
  const enriched = await enrichTalkRequests([data], isSender ? 'sender' : 'receiver');
  return enriched[0] || null;
};

/**
 * 대화 요청을 확인됨으로 표시 (receiver용)
 */
export const markTalkRequestAsViewed = async (requestId: string): Promise<void> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('로그인이 필요해요');
  }

  const { error } = await supabase
    .from('talk_requests')
    .update({ viewed_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('receiver_id', user.id)
    .is('viewed_at', null);

  if (error) {
    console.error('[talkRequestService] markTalkRequestAsViewed failed:', error);
  }
};

export const talkRequestService = {
  createTalkRequest,
  getSentTalkRequests,
  getReceivedTalkRequests,
  respondToTalkRequest,
  withdrawTalkRequest,
  hideTalkRequests,
  unhideTalkRequests,
  hasPendingTalkRequest,
  getTalkRequestById,
  markTalkRequestAsViewed,
};

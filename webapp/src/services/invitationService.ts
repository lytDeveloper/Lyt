/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Invitation Service
 * 통합 초대 시스템 서비스
 * 프로젝트 제안(Proposal)과 협업 초대(Invitation)를 통합 관리
 */

import { supabase } from '../lib/supabase';
import type {
  Invitation,
  InvitationType,
  InvitationQAItem,
  CreateInvitationInput,
  InvitableTarget,
  InvitationRow,
} from '../types/invitation.types';
import { BlockService } from './blockService';
import { UserNotificationService } from './userNotificationService';
import { getProfileDisplay, getProfileDisplayMap } from './profileDisplayService';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Q&A 배열을 파싱하는 헬퍼 함수
 */
const mapQuestionAnswers = (raw: any): InvitationQAItem[] => {
  if (!raw) return [];

  let parsed: any[] = [];
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  } else if (Array.isArray(raw)) {
    parsed = raw;
  } else {
    return [];
  }

  return parsed
    .filter((item) => item && typeof item === 'object' && item.question)
    .map((item) => ({
      question: item.question,
      answer: item.answer || undefined,
      askedAt: item.askedAt || item.asked_at || new Date().toISOString(),
      answeredAt: item.answeredAt || item.answered_at || undefined,
    }));
};

/**
 * Q&A 배열을 DB에 저장할 수 있는 형태로 직렬화
 */
const serializeQuestionAnswers = (answers: InvitationQAItem[]): string => {
  return JSON.stringify(
    answers.map((a) => ({
      question: a.question,
      answer: a.answer,
      askedAt: a.askedAt,
      answeredAt: a.answeredAt,
    }))
  );
};

/**
 * DB 행에서 Q&A 배열을 추출하고 최신순으로 정렬
 */
const buildQuestionAnswers = (row: any): InvitationQAItem[] => {
  const answers = mapQuestionAnswers(row?.question_answers);
  return answers.sort(
    (a, b) => new Date(b.askedAt).getTime() - new Date(a.askedAt).getTime()
  );
};

/**
 * DB 행을 Invitation 객체로 매핑
 */
const mapInvitationRow = (row: InvitationRow): Invitation => {
  const questionAnswers = buildQuestionAnswers(row);

  return {
    id: row.id,
    invitationType: row.invitation_type,
    targetId: row.target_id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    status: row.status,
    message: row.message,
    position: row.position,
    responsibilities: row.responsibilities,
    budgetRange: row.budget_range,
    duration: row.duration,
    questionAnswers,
    isHiddenBySender: row.is_hidden_by_sender || false,
    isHiddenByReceiver: row.is_hidden_by_receiver || false,
    sentDate: row.sent_date,
    viewedDate: row.viewed_date,
    responseDate: row.response_date,
    expiryDate: row.expiry_date,
    rejectionReason: row.rejection_reason,
    acceptanceNote: row.acceptance_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

// ============================================================================
// Main Service Functions
// ============================================================================

/**
 * 초대 생성
 */
export const createInvitation = async (input: CreateInvitationInput): Promise<string> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    // 자기 자신에게 초대 불가
    if (input.receiverId === user.id) {
      throw new Error('자기 자신에게 초대를 보낼 수 없습니다');
    }

    // 양방향 차단 확인: 내가 상대를 차단했거나 상대가 나를 차단한 경우
    const isBlocked = await BlockService.isBlockedBidirectional(user.id, input.receiverId);
    if (isBlocked) {
      throw new Error('차단된 사용자에게 초대를 보낼 수 없습니다');
    }

    // 대상 존재 확인
    if (input.invitationType === 'project') {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, created_by, status, team_size, current_team_size')
        .eq('id', input.targetId)
        .single();

      if (projectError || !project) {
        throw new Error('프로젝트를 찾을 수 없습니다');
      }

      // 프로젝트 소유자만 초대 가능
      if (project.created_by !== user.id) {
        throw new Error('프로젝트 소유자만 초대할 수 있습니다');
      }

      // 팀 사이즈 제한 확인
      if (project.team_size && project.current_team_size >= project.team_size) {
        throw new Error('팀 인원이 이미 가득 찼습니다');
      }

      // 이미 멤버인지 확인
      const { data: existingMember } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', input.targetId)
        .eq('user_id', input.receiverId)
        .eq('status', 'active')
        .maybeSingle();

      if (existingMember) {
        throw new Error('이미 프로젝트 멤버입니다');
      }
    } else {
      const { data: collaboration, error: collabError } = await supabase
        .from('collaborations')
        .select('id, created_by, status, team_size, current_team_size')
        .eq('id', input.targetId)
        .single();

      if (collabError || !collaboration) {
        throw new Error('협업을 찾을 수 없습니다');
      }

      // 협업 소유자만 초대 가능
      if (collaboration.created_by !== user.id) {
        throw new Error('협업 소유자만 초대할 수 있습니다');
      }

      // 팀 사이즈 제한 확인
      if (collaboration.team_size && collaboration.current_team_size >= collaboration.team_size) {
        throw new Error('팀 인원이 이미 가득 찼습니다');
      }

      // 이미 멤버인지 확인
      const { data: existingMember } = await supabase
        .from('collaboration_members')
        .select('id')
        .eq('collaboration_id', input.targetId)
        .eq('user_id', input.receiverId)
        .eq('status', 'active')
        .maybeSingle();

      if (existingMember) {
        throw new Error('이미 협업 멤버입니다');
      }
    }

    // 기존 초대가 있는지 확인 (sender_id 포함)
    const { data: existingInvitation } = await supabase
      .from('invitations')
      .select('id, status')
      .eq('invitation_type', input.invitationType)
      .eq('target_id', input.targetId)
      .eq('sender_id', user.id)
      .eq('receiver_id', input.receiverId)
      .maybeSingle();

    if (existingInvitation) {
      if (existingInvitation.status === 'pending') {
        throw new Error('이미 대기 중인 초대가 있습니다');
      }

      // 거절된 초대가 있으면 업데이트
      if (existingInvitation.status === 'rejected' || existingInvitation.status === 'withdrawn') {
        const { error: updateError } = await supabase
          .from('invitations')
          .update({
            status: 'pending',
            message: input.message,
            position: input.position,
            responsibilities: input.responsibilities,
            budget_range: input.budgetRange,
            duration: input.duration,
            sent_date: new Date().toISOString(),
            question_answers: '[]',
            is_hidden_by_sender: false,
            is_hidden_by_receiver: false,
            rejection_reason: null,
            acceptance_note: null,
          })
          .eq('id', existingInvitation.id);

        if (updateError) {
          throw new Error(`초대 재전송 실패: ${updateError.message}`);
        }

        return existingInvitation.id;
      }
    }

    // 새 초대 생성
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7); // 7일 후 만료

    const { data: newInvitation, error: insertError } = await supabase
      .from('invitations')
      .insert({
        invitation_type: input.invitationType,
        target_id: input.targetId,
        sender_id: user.id,
        receiver_id: input.receiverId,
        message: input.message,
        position: input.position,
        responsibilities: input.responsibilities,
        budget_range: input.budgetRange,
        duration: input.duration,
        expiry_date: expiryDate.toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      throw new Error(`초대 생성 실패: ${insertError.message}`);
    }

    // 초대 발송 활동 기록 (sender에게)
    try {
      const { activityService } = await import('./activityService');

      // receiver 이름 및 타겟 제목 조회
      const receiverDisplay = await getProfileDisplay(input.receiverId);
      const receiverName = receiverDisplay?.name || '사용자';

      let targetTitle = '';
      if (input.invitationType === 'project') {
        const { data: project } = await supabase
          .from('projects')
          .select('title')
          .eq('id', input.targetId)
          .maybeSingle();
        targetTitle = project?.title || '프로젝트';
      } else {
        const { data: collaboration } = await supabase
          .from('collaborations')
          .select('title')
          .eq('id', input.targetId)
          .maybeSingle();
        targetTitle = collaboration?.title || '협업';
      }

      await activityService.createActivityViaRPC({
        userId: user.id,
        activityType: 'invitation_sent',
        relatedEntityType: input.invitationType,
        relatedEntityId: input.targetId,
        title: `${targetTitle} 초대에 대한 응답을 기다리고 있어요`,
        description: receiverName,
        metadata: {
          receiver_id: input.receiverId,
          receiver_name: receiverName,
          target_title: targetTitle,
          invitation_id: newInvitation.id,
        },
      });
    } catch (activityError) {
      console.warn('[invitationService] Failed to record invitation_sent activity:', activityError);
    }

    return newInvitation.id;
  } catch (error) {
    console.error('[invitationService] createInvitation failed:', error);
    throw error;
  }
};

/**
 * 보낸 초대 조회
 */
export const getSentInvitations = async (
  type?: InvitationType,
  includeHidden: boolean = false
): Promise<Invitation[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    let query = supabase
      .from('invitations')
      .select('*')
      .eq('sender_id', user.id);

    if (type) {
      query = query.eq('invitation_type', type);
    }

    if (!includeHidden) {
      query = query.eq('is_hidden_by_sender', false);
    }

    const { data, error } = await query.order('sent_date', { ascending: false });

    if (error) {
      throw new Error(`보낸 초대를 불러오는데 실패했습니다: ${error.message}`);
    }

    // 대상 정보 enrichment
    const invitations = await enrichInvitations(data || [], 'sender');
    return invitations;
  } catch (error) {
    console.error('[invitationService] getSentInvitations failed:', error);
    throw error;
  }
};

/**
 * 받은 초대 조회
 */
export const getReceivedInvitations = async (
  type?: InvitationType,
  includeHidden: boolean = false
): Promise<Invitation[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    let query = supabase
      .from('invitations')
      .select('*')
      .eq('receiver_id', user.id);

    if (type) {
      query = query.eq('invitation_type', type);
    }

    if (!includeHidden) {
      query = query.eq('is_hidden_by_receiver', false);
    }

    const { data, error } = await query.order('sent_date', { ascending: false });

    if (error) {
      throw new Error(`받은 초대를 불러오는데 실패했습니다: ${error.message}`);
    }

    // 대상 정보 enrichment
    const invitations = await enrichInvitations(data || [], 'receiver');
    return invitations;
  } catch (error) {
    console.error('[invitationService] getReceivedInvitations failed:', error);
    throw error;
  }
};

/**
 * 초대에 대상 및 사용자 정보 추가
 */
const enrichInvitations = async (
  rows: any[],
  mode: 'sender' | 'receiver'
): Promise<Invitation[]> => {
  if (rows.length === 0) return [];

  // 프로젝트와 협업 ID 분리
  const projectIds = rows
    .filter((r) => r.invitation_type === 'project')
    .map((r) => r.target_id);
  const collaborationIds = rows
    .filter((r) => r.invitation_type === 'collaboration')
    .map((r) => r.target_id);

  // 프로젝트 정보 조회
  const projectsMap = new Map<string, any>();
  if (projectIds.length > 0) {
    const { data: projects } = await supabase
      .from('projects')
      .select('id, title, cover_image_url, category, status, created_by')
      .in('id', projectIds);

    if (projects) {
      // 브랜드 이름 조회
      const createdByIds = [...new Set(projects.map((p) => p.created_by))];
      const brandNamesMap = new Map<string, string>();

      if (createdByIds.length > 0) {
        const { data: brands } = await supabase
          .from('profile_brands')
          .select('profile_id, brand_name')
          .in('profile_id', createdByIds);

        if (brands) {
          brands.forEach((b) => brandNamesMap.set(b.profile_id, b.brand_name));
        }
      }

      projects.forEach((p) => {
        projectsMap.set(p.id, {
          id: p.id,
          title: p.title,
          coverImageUrl: p.cover_image_url,
          category: p.category,
          status: p.status,
          createdBy: p.created_by,
          brandName: brandNamesMap.get(p.created_by) || '브랜드',
        });
      });
    }
  }

  // 협업 정보 조회
  const collaborationsMap = new Map<string, any>();
  if (collaborationIds.length > 0) {
    const { data: collaborations } = await supabase
      .from('collaborations')
      .select('id, title, cover_image_url, category, status, created_by')
      .in('id', collaborationIds);

    if (collaborations) {
      collaborations.forEach((c) => {
        collaborationsMap.set(c.id, {
          id: c.id,
          title: c.title,
          coverImageUrl: c.cover_image_url,
          category: c.category,
          status: c.status,
          createdBy: c.created_by,
        });
      });
    }
  }

  // 사용자 정보 조회 (sender 또는 receiver)
  const userIds = mode === 'sender'
    ? [...new Set(rows.map((r) => r.receiver_id))]
    : [...new Set(rows.map((r) => r.sender_id))];

  const usersMap = new Map<string, any>();
  if (userIds.length > 0) {
    const displayMap = await getProfileDisplayMap(userIds);

    userIds.forEach((id) => {
      const display = displayMap.get(id);
      if (display) {
        usersMap.set(id, {
          id,
          name: display.name || '알 수 없음',
          avatarUrl: display.avatar,
          activityField: display.activityField,
          profileType: display.profileType !== 'customer' ? display.profileType : undefined,
        });
      }
    });
  }

  // 최종 매핑
  return rows.map((row) => {
    const invitation = mapInvitationRow(row);

    // 대상 정보
    if (row.invitation_type === 'project') {
      invitation.target = projectsMap.get(row.target_id);
    } else {
      invitation.target = collaborationsMap.get(row.target_id);
    }

    // 사용자 정보
    if (mode === 'sender') {
      invitation.receiver = usersMap.get(row.receiver_id);
    } else {
      invitation.sender = usersMap.get(row.sender_id);
    }

    return invitation;
  });
};

/**
 * 초대 응답 (수락/거절)
 */
export const respondToInvitation = async (
  invitationId: string,
  status: 'accepted' | 'rejected',
  reason?: string
): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    // 초대 정보 확인
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (invitationError || !invitation) {
      throw new Error('초대를 찾을 수 없습니다');
    }

    // 권한 확인
    if (invitation.receiver_id !== user.id) {
      throw new Error('이 초대에 응답할 권한이 없습니다');
    }

    // 상태 확인
    if (invitation.status !== 'pending' && invitation.status !== 'viewed') {
      throw new Error('이미 처리된 초대입니다');
    }

    // 수락하는 경우 팀 사이즈 제한 확인
    if (status === 'accepted') {
      if (invitation.invitation_type === 'project') {
        const { data: project } = await supabase
          .from('projects')
          .select('team_size, current_team_size')
          .eq('id', invitation.target_id)
          .single();

        if (project && project.team_size && project.current_team_size >= project.team_size) {
          throw new Error('팀 인원이 이미 가득 찼습니다');
        }
      } else {
        const { data: collaboration } = await supabase
          .from('collaborations')
          .select('team_size, current_team_size')
          .eq('id', invitation.target_id)
          .single();

        if (collaboration && collaboration.team_size && collaboration.current_team_size >= collaboration.team_size) {
          throw new Error('팀 인원이 이미 가득 찼습니다');
        }
      }
    }

    // 초대 상태 업데이트
    const updateData: any = {
      status,
      response_date: new Date().toISOString(),
    };

    if (status === 'rejected' && reason) {
      updateData.rejection_reason = reason;
    }

    const { error: updateError } = await supabase
      .from('invitations')
      .update(updateData)
      .eq('id', invitationId);

    if (updateError) {
      throw new Error(`초대 응답 실패: ${updateError.message}`);
    }

    // 초대 응답 활동 기록
    try {
      const { activityService } = await import('./activityService');

      // 타겟(프로젝트/협업) 제목 조회
      let targetTitle = '';
      if (invitation.invitation_type === 'project') {
        const { data: project } = await supabase
          .from('projects')
          .select('title')
          .eq('id', invitation.target_id)
          .maybeSingle();
        targetTitle = project?.title || '프로젝트';
      } else {
        const { data: collaboration } = await supabase
          .from('collaborations')
          .select('title')
          .eq('id', invitation.target_id)
          .maybeSingle();
        targetTitle = collaboration?.title || '협업';
      }

      const receiverDisplay = await getProfileDisplay(user.id);
      const receiverName = receiverDisplay?.name || '사용자';

      if (status === 'accepted') {
        // 수락: receiver(수락자)에게 활동 기록
        activityService
          .createActivityViaRPC({
            userId: user.id,
            activityType: 'invitation_accepted',
            relatedEntityType: invitation.invitation_type,
            relatedEntityId: invitation.target_id,
            title: `${targetTitle} 초대를 수락했어요`,
            description: '',
            metadata: {
              target_title: targetTitle,
              sender_id: invitation.sender_id,
            },
          })
          .catch((err) => console.warn('[invitationService] Failed to record receiver activity:', err));

        // 수락: sender에게도 활동 기록
        activityService
          .createActivityViaRPC({
            userId: invitation.sender_id,
            activityType: 'invitation_accepted',
            relatedEntityType: invitation.invitation_type,
            relatedEntityId: invitation.target_id,
            title: `${targetTitle} 초대가 수락되었어요`,
            description: receiverName,
            metadata: {
              target_title: targetTitle,
              receiver_id: user.id,
              receiver_name: receiverName,
            },
          })
          .catch((err) => console.warn('[invitationService] Failed to record sender activity:', err));
      } else {
        // 거절: sender에게만 활동 기록
        activityService
          .createActivityViaRPC({
            userId: invitation.sender_id,
            activityType: 'invitation_rejected',
            relatedEntityType: invitation.invitation_type,
            relatedEntityId: invitation.target_id,
            title: `${targetTitle} 초대가 거절되었어요`,
            description: receiverName,
            metadata: {
              target_title: targetTitle,
              receiver_id: user.id,
              receiver_name: receiverName,
              rejection_reason: reason,
            },
          })
          .catch((err) => console.warn('[invitationService] Failed to record rejection activity:', err));
      }
    } catch (activityError) {
      console.warn('[invitationService] Failed to record invitation response activities:', activityError);
    }

    // 멤버 추가는 DB 트리거에서 처리됨 (handle_invitation_accepted)
  } catch (error) {
    console.error('[invitationService] respondToInvitation failed:', error);
    throw error;
  }
};

/**
 * 초대 철회
 */
export const withdrawInvitation = async (invitationId: string): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    // 초대 정보 확인
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select('sender_id, status')
      .eq('id', invitationId)
      .single();

    if (invitationError || !invitation) {
      throw new Error('초대를 찾을 수 없습니다');
    }

    // 권한 확인
    if (invitation.sender_id !== user.id) {
      throw new Error('초대 철회 권한이 없습니다');
    }

    // 상태 확인
    if (invitation.status !== 'pending' && invitation.status !== 'viewed') {
      throw new Error('대기 중인 초대만 철회할 수 있습니다');
    }

    // 철회
    const { error: updateError } = await supabase
      .from('invitations')
      .update({
        status: 'withdrawn',
        response_date: new Date().toISOString(),
      })
      .eq('id', invitationId);

    if (updateError) {
      throw new Error(`초대 철회 실패: ${updateError.message}`);
    }
  } catch (error) {
    console.error('[invitationService] withdrawInvitation failed:', error);
    throw error;
  }
};

/**
 * 질문 등록 (받은 초대에서)
 */
export const askQuestionOnInvitation = async (
  invitationId: string,
  question: string
): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    // 초대 정보 확인 (sender_id, target_id 포함)
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select('receiver_id, sender_id, target_id, invitation_type, status, question_answers')
      .eq('id', invitationId)
      .single();

    if (invitationError || !invitation) {
      throw new Error('초대를 찾을 수 없습니다');
    }

    // 권한 확인 (receiver만 질문 가능)
    if (invitation.receiver_id !== user.id) {
      throw new Error('질문 권한이 없습니다');
    }

    // 상태 확인
    if (invitation.status !== 'pending' && invitation.status !== 'viewed') {
      throw new Error('대기 중인 초대에만 질문할 수 있습니다');
    }

    // 기존 Q&A에 새 질문 추가
    const existingQA = mapQuestionAnswers(invitation.question_answers);
    const newQA: InvitationQAItem = {
      question,
      askedAt: new Date().toISOString(),
    };

    const updatedQA = [newQA, ...existingQA];

    const { error: updateError } = await supabase
      .from('invitations')
      .update({
        question_answers: serializeQuestionAnswers(updatedQA),
      })
      .eq('id', invitationId);

    if (updateError) {
      throw new Error(`질문 등록 실패: ${updateError.message}`);
    }

    // 질문 알림 생성 (sender에게)
    try {
      // 질문한 사용자(receiver)의 표시 정보 조회
      const receiverDisplay = await getProfileDisplay(user.id);
      const receiverName = receiverDisplay?.name || '사용자';
      const receiverAvatar = receiverDisplay?.avatar;

      // 초대 대상(프로젝트/협업) 정보 조회
      let targetTitle = '';
      if (invitation.invitation_type === 'project') {
        const { data: project } = await supabase
          .from('projects')
          .select('title')
          .eq('id', invitation.target_id)
          .maybeSingle();
        targetTitle = project?.title || '프로젝트';
      } else {
        const { data: collaboration } = await supabase
          .from('collaborations')
          .select('title')
          .eq('id', invitation.target_id)
          .maybeSingle();
        targetTitle = collaboration?.title || '협업';
      }

      await UserNotificationService.createNotification({
        receiverId: invitation.sender_id,
        type: 'question',
        title: '새 질문이 도착했습니다',
        content: `${receiverName}님이 "${targetTitle}" 초대에 대해 질문했습니다: ${question}`,
        relatedId: invitationId,
        relatedType: 'invitation',
        metadata: {
          invitation_id: invitationId,
          sender_id: user.id,
          sender_name: receiverName,
          sender_avatar: receiverAvatar,
          question,
          target_title: targetTitle,
          mode: 'sent', // 알림 수신자(sender)는 보낸 초대 탭에서 확인
        },
      });
    } catch (notificationError) {
      console.error('[invitationService] Failed to create question notification:', notificationError);
      // 알림 실패해도 질문 등록은 성공으로 처리
    }
  } catch (error) {
    console.error('[invitationService] askQuestionOnInvitation failed:', error);
    throw error;
  }
};

/**
 * 답변 등록 (보낸 초대에서)
 * @param invitationId - 초대 ID
 * @param answer - 답변 내용
 * @param questionAskedAt - 답변할 질문의 askedAt (선택 사항, 미지정 시 최신 질문에 답변)
 */
export const answerQuestionOnInvitation = async (
  invitationId: string,
  answer: string,
  questionAskedAt?: string
): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    // 초대 정보 확인 (receiver_id, target_id 포함)
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select('sender_id, receiver_id, target_id, invitation_type, status, question_answers')
      .eq('id', invitationId)
      .single();

    if (invitationError || !invitation) {
      throw new Error('초대를 찾을 수 없습니다');
    }

    // 권한 확인 (sender만 답변 가능)
    if (invitation.sender_id !== user.id) {
      throw new Error('답변 권한이 없습니다');
    }

    // 상태 확인
    if (invitation.status !== 'pending' && invitation.status !== 'viewed') {
      throw new Error('대기 중인 초대에만 답변할 수 있습니다');
    }

    const existingQA = mapQuestionAnswers(invitation.question_answers);

    if (existingQA.length === 0) {
      throw new Error('답변할 질문이 없습니다');
    }

    // 특정 질문에 답변 또는 최신 질문에 답변
    let targetQA: InvitationQAItem | undefined;
    let targetIndex: number = -1;

    if (questionAskedAt) {
      // 특정 질문 찾기
      targetIndex = existingQA.findIndex((qa) => qa.askedAt === questionAskedAt);
      if (targetIndex === -1) {
        throw new Error('해당 질문을 찾을 수 없습니다');
      }
      targetQA = existingQA[targetIndex];
    } else {
      // 최신 질문 (답변이 없는 첫 번째 질문)
      targetIndex = existingQA.findIndex((qa) => !qa.answer);
      if (targetIndex === -1) {
        throw new Error('답변할 질문이 없습니다');
      }
      targetQA = existingQA[targetIndex];
    }

    if (targetQA.answer) {
      throw new Error('이미 답변된 질문입니다');
    }

    // 답변 추가
    targetQA.answer = answer;
    targetQA.answeredAt = new Date().toISOString();
    existingQA[targetIndex] = targetQA;

    const { error: updateError } = await supabase
      .from('invitations')
      .update({
        question_answers: serializeQuestionAnswers(existingQA),
      })
      .eq('id', invitationId);

    if (updateError) {
      throw new Error(`답변 등록 실패: ${updateError.message}`);
    }

    // 답변 알림 생성 (receiver에게)
    try {
      // 답변한 사용자(sender)의 표시 정보 조회
      const senderDisplay = await getProfileDisplay(user.id);
      const senderName = senderDisplay?.name || '사용자';
      const senderAvatar = senderDisplay?.avatar;

      // 초대 대상(프로젝트/협업) 정보 조회
      let targetTitle = '';
      if (invitation.invitation_type === 'project') {
        const { data: project } = await supabase
          .from('projects')
          .select('title')
          .eq('id', invitation.target_id)
          .maybeSingle();
        targetTitle = project?.title || '프로젝트';
      } else {
        const { data: collaboration } = await supabase
          .from('collaborations')
          .select('title')
          .eq('id', invitation.target_id)
          .maybeSingle();
        targetTitle = collaboration?.title || '협업';
      }

      await UserNotificationService.createNotification({
        receiverId: invitation.receiver_id,
        type: 'answer',
        title: '답변이 도착했습니다',
        content: `${senderName}님이 "${targetTitle}" 초대의 질문에 답변했습니다: ${answer}`,
        relatedId: invitationId,
        relatedType: 'invitation',
        metadata: {
          invitation_id: invitationId,
          sender_id: user.id,
          sender_name: senderName,
          sender_avatar: senderAvatar,
          question: targetQA.question,
          answer,
          target_title: targetTitle,
          mode: 'received', // 알림 수신자(receiver)는 받은 초대 탭에서 확인
        },
      });
    } catch (notificationError) {
      console.error('[invitationService] Failed to create answer notification:', notificationError);
      // 알림 실패해도 답변 등록은 성공으로 처리
    }
  } catch (error) {
    console.error('[invitationService] answerQuestionOnInvitation failed:', error);
    throw error;
  }
};

/**
 * 초대 숨기기
 */
export const hideInvitations = async (
  ids: string[],
  role: 'sender' | 'receiver'
): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    const column = role === 'sender' ? 'is_hidden_by_sender' : 'is_hidden_by_receiver';
    const userColumn = role === 'sender' ? 'sender_id' : 'receiver_id';

    const { error } = await supabase
      .from('invitations')
      .update({ [column]: true })
      .in('id', ids)
      .eq(userColumn, user.id);

    if (error) {
      throw new Error(`초대 숨기기 실패: ${error.message}`);
    }
  } catch (error) {
    console.error('[invitationService] hideInvitations failed:', error);
    throw error;
  }
};

/**
 * 초대 숨기기 해제
 */
export const unhideInvitations = async (
  ids: string[],
  role: 'sender' | 'receiver'
): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    const column = role === 'sender' ? 'is_hidden_by_sender' : 'is_hidden_by_receiver';
    const userColumn = role === 'sender' ? 'sender_id' : 'receiver_id';

    const { error } = await supabase
      .from('invitations')
      .update({ [column]: false })
      .in('id', ids)
      .eq(userColumn, user.id);

    if (error) {
      throw new Error(`초대 숨기기 해제 실패: ${error.message}`);
    }
  } catch (error) {
    console.error('[invitationService] unhideInvitations failed:', error);
    throw error;
  }
};

/**
 * 초대를 확인됨으로 표시 (receiver용)
 * @param invitationId - 초대 ID
 */
export const markInvitationAsViewed = async (invitationId: string): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    // 초대 정보 확인 (receiver인지 체크)
    const { data: invitation, error: fetchError } = await supabase
      .from('invitations')
      .select('id, receiver_id, status')
      .eq('id', invitationId)
      .single();

    if (fetchError || !invitation) {
      console.error('[invitationService] markInvitationAsViewed: invitation not found');
      return;
    }

    // receiver인지 확인
    if (invitation.receiver_id !== user.id) {
      // 권한 없음 - 조용히 무시
      return;
    }

    // pending 상태일 때만 viewed로 변경
    if (invitation.status === 'pending') {
      const { error } = await supabase
        .from('invitations')
        .update({
          status: 'viewed',
          viewed_date: new Date().toISOString(),
        })
        .eq('id', invitationId)
        .eq('status', 'pending');

      if (error) {
        console.error('[invitationService] markInvitationAsViewed failed:', error);
      }
    }
  } catch (error) {
    console.error('[invitationService] markInvitationAsViewed error:', error);
  }
};

/**
 * 초대 가능한 대상(프로젝트/협업) 목록 조회
 */
export const getInvitableTargets = async (
  type: InvitationType,
  excludeReceiverId?: string
): Promise<InvitableTarget[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    if (type === 'project') {
      // 내가 생성한 open 또는 in_progress 상태의 프로젝트
      const { data: projects, error } = await supabase
        .from('projects')
        .select('id, title, category, cover_image_url, status')
        .eq('created_by', user.id)
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`프로젝트 목록 조회 실패: ${error.message}`);
      }

      let filteredProjects = projects || [];

      // 이미 해당 사용자에게 pending 초대를 보낸 프로젝트 제외
      if (excludeReceiverId) {
        const { data: existingInvitations } = await supabase
          .from('invitations')
          .select('target_id')
          .eq('invitation_type', 'project')
          .eq('receiver_id', excludeReceiverId)
          .eq('status', 'pending');

        const excludeTargetIds = new Set(
          (existingInvitations || []).map((inv) => inv.target_id)
        );

        filteredProjects = filteredProjects.filter(
          (p) => !excludeTargetIds.has(p.id)
        );

        // 이미 멤버인 프로젝트 제외
        const { data: memberships } = await supabase
          .from('project_members')
          .select('project_id')
          .eq('user_id', excludeReceiverId)
          .eq('status', 'active');

        const memberProjectIds = new Set(
          (memberships || []).map((m) => m.project_id)
        );

        filteredProjects = filteredProjects.filter(
          (p) => !memberProjectIds.has(p.id)
        );
      }

      return filteredProjects.map((p) => ({
        id: p.id,
        title: p.title,
        category: p.category,
        coverImageUrl: p.cover_image_url,
        status: p.status,
      }));
    } else {
      // 내가 생성한 open 또는 in_progress 상태의 협업
      const { data: collaborations, error } = await supabase
        .from('collaborations')
        .select('id, title, category, cover_image_url, status')
        .eq('created_by', user.id)
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`협업 목록 조회 실패: ${error.message}`);
      }

      let filteredCollabs = collaborations || [];

      // 이미 해당 사용자에게 pending 초대를 보낸 협업 제외
      if (excludeReceiverId) {
        const { data: existingInvitations } = await supabase
          .from('invitations')
          .select('target_id')
          .eq('invitation_type', 'collaboration')
          .eq('receiver_id', excludeReceiverId)
          .eq('status', 'pending');

        const excludeTargetIds = new Set(
          (existingInvitations || []).map((inv) => inv.target_id)
        );

        filteredCollabs = filteredCollabs.filter(
          (c) => !excludeTargetIds.has(c.id)
        );

        // 이미 멤버인 협업 제외
        const { data: memberships } = await supabase
          .from('collaboration_members')
          .select('collaboration_id')
          .eq('user_id', excludeReceiverId)
          .eq('status', 'active');

        const memberCollabIds = new Set(
          (memberships || []).map((m) => m.collaboration_id)
        );

        filteredCollabs = filteredCollabs.filter(
          (c) => !memberCollabIds.has(c.id)
        );
      }

      return filteredCollabs.map((c) => ({
        id: c.id,
        title: c.title,
        category: c.category,
        coverImageUrl: c.cover_image_url,
        status: c.status,
      }));
    }
  } catch (error) {
    console.error('[invitationService] getInvitableTargets failed:', error);
    throw error;
  }
};

/**
 * 초대 거절 (사유 포함)
 */
export const rejectInvitationWithReason = async (
  invitationId: string,
  reason?: string
): Promise<void> => {
  return respondToInvitation(invitationId, 'rejected', reason);
};

// ============================================================================
// Export
// ============================================================================

export const invitationService = {
  createInvitation,
  getSentInvitations,
  getReceivedInvitations,
  respondToInvitation,
  withdrawInvitation,
  askQuestionOnInvitation,
  answerQuestionOnInvitation,
  hideInvitations,
  unhideInvitations,
  getInvitableTargets,
  rejectInvitationWithReason,
  markInvitationAsViewed,
};

export default invitationService;

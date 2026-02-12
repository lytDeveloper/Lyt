/**
 * 통합 초대 시스템 타입 정의
 * 프로젝트 제안(Proposal)과 협업 초대(Invitation)를 통합
 */

// 초대 타입
export type InvitationType = 'project' | 'collaboration';

// 초대 상태 (통일)
export type InvitationStatus =
  | 'pending'    // 대기중
  | 'viewed'     // 확인됨
  | 'accepted'   // 수락됨
  | 'rejected'   // 거절됨
  | 'expired'    // 만료됨
  | 'withdrawn'  // 철회됨
  | 'cancelled'; // 취소됨

// Q&A 항목
export interface InvitationQAItem {
  question: string;
  answer?: string;
  askedAt: string;
  answeredAt?: string;
}

// 대상 정보 (프로젝트 또는 협업)
export interface InvitationTarget {
  id: string;
  title: string;
  coverImageUrl?: string;
  category?: string;
  status?: string;
  createdBy?: string;
  brandName?: string; // 프로젝트인 경우
}

// 사용자 정보
export interface InvitationUser {
  id: string;
  name: string;
  avatarUrl?: string;
  activityField?: string;
  profileType?: 'brand' | 'artist' | 'creative' | 'fan';
}

// 초대 인터페이스
export interface Invitation {
  id: string;
  invitationType: InvitationType;
  targetId: string;
  senderId: string;
  receiverId: string;
  status: InvitationStatus;
  message?: string;
  position?: string;
  responsibilities?: string;
  budgetRange?: string;
  duration?: string;
  questionAnswers: InvitationQAItem[];
  isHiddenBySender: boolean;
  isHiddenByReceiver: boolean;
  sentDate: string;
  viewedDate?: string;
  responseDate?: string;
  expiryDate?: string;
  rejectionReason?: string;
  acceptanceNote?: string;
  createdAt: string;
  updatedAt: string;

  // Enriched data (조회 시 포함)
  target?: InvitationTarget;
  sender?: InvitationUser;
  receiver?: InvitationUser;
}

// 초대 생성 입력
export interface CreateInvitationInput {
  invitationType: InvitationType;
  targetId: string;
  receiverId: string;
  message: string;
  position?: string;
  responsibilities?: string;
  budgetRange?: string;
  duration?: string;
}

// 초대 응답 입력
export interface RespondToInvitationInput {
  invitationId: string;
  status: 'accepted' | 'rejected';
  reason?: string; // 거절 사유
  note?: string;   // 수락 메모
}

// 초대 가능한 대상 (프로젝트/협업)
export interface InvitableTarget {
  id: string;
  title: string;
  category?: string;
  coverImageUrl?: string;
  status?: string;
}

// 상태 라벨 및 색상 설정
export const INVITATION_STATUS_CONFIG: Record<InvitationStatus, { label: string; bgcolor: string; color: string }> = {
  pending: { label: '대기중', bgcolor: '#EFF6FF', color: '#2563EB' },
  viewed: { label: '확인됨', bgcolor: '#F3F4F6', color: '#4B5563' },
  accepted: { label: '수락됨', bgcolor: '#ECFDF5', color: '#059669' },
  rejected: { label: '거절됨', bgcolor: '#FEF2F2', color: '#DC2626' },
  expired: { label: '만료됨', bgcolor: '#F3F4F6', color: '#4B5563' },
  withdrawn: { label: '철회됨', bgcolor: '#F3F4F6', color: '#4B5563' },
  cancelled: { label: '취소됨', bgcolor: '#F3F4F6', color: '#4B5563' },
};

// 타입 라벨
export const INVITATION_TYPE_LABELS: Record<InvitationType, string> = {
  project: '프로젝트',
  collaboration: '협업',
};

// DB 행을 Invitation 객체로 변환하는 매퍼 타입
export interface InvitationRow {
  id: string;
  invitation_type: InvitationType;
  target_id: string;
  sender_id: string;
  receiver_id: string;
  status: InvitationStatus;
  message?: string;
  position?: string;
  responsibilities?: string;
  budget_range?: string;
  duration?: string;
  question_answers: InvitationQAItem[] | string;
  is_hidden_by_sender: boolean;
  is_hidden_by_receiver: boolean;
  sent_date: string;
  viewed_date?: string;
  response_date?: string;
  expiry_date?: string;
  rejection_reason?: string;
  acceptance_note?: string;
  created_at: string;
  updated_at: string;
}

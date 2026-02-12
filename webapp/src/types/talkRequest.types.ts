/**
 * 대화 요청(Talk Request) 타입 정의
 */

export type TalkRequestStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';

export interface TalkRequestUser {
  id: string;
  name: string;
  avatarUrl?: string;
  activityField?: string;
  profileType?: 'brand' | 'artist' | 'creative' | 'fan';
}

export interface TalkRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: TalkRequestStatus;
  templateMessage: string;
  additionalMessage?: string;
  sentAt: string;
  respondedAt?: string;
  expiresAt: string;
  isHiddenBySender: boolean;
  isHiddenByReceiver: boolean;
  rejectionReason?: string;
  createdChatRoomId?: string;
  viewedAt?: string;
  createdAt: string;
  updatedAt: string;

  // Enriched data (조회 시 포함)
  sender?: TalkRequestUser;
  receiver?: TalkRequestUser;
}

// DB 행 타입 (snake_case)
export interface TalkRequestRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: TalkRequestStatus;
  template_message: string;
  additional_message?: string;
  sent_at: string;
  responded_at?: string;
  expires_at: string;
  is_hidden_by_sender: boolean;
  is_hidden_by_receiver: boolean;
  rejection_reason?: string;
  created_chat_room_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTalkRequestInput {
  receiverId: string;
  templateMessage: string;
  additionalMessage?: string;
}

// 템플릿 메시지 (7개) - 파트너에게 대화 요청할 때
export const TALK_REQUEST_TEMPLATES = [
  '프로젝트/협업 관련해 짧게 문의드리고 싶어 연락드렸어요.',
  '현재 진행 중인 프로젝트/협업과 잘 맞아 보여 메시지 드려요.',
  '포트폴리오가 인상 깊어 간단히 이야기 나누고 싶어요.',
  '제 경험이 도움이 될 수 있을 것 같아 대화를 요청드려요.',
  '함께 진행해볼 수 있는 방향이 있을 것 같아 연락드려요.',
  '편하게 소통해보고 싶어요.',
  '가볍게 이야기 나누고 싶어요.',
] as const;

// 외부인이 프로젝트/협업 참여를 위해 마스터에게 요청할 때
export const JOIN_REQUEST_TEMPLATES = [
  '프로젝트/협업에 참여하고 싶어 연락드려요.',
  '프로젝트에 관심이 있어 문의드려요.',
  '저의 역량이 프로젝트에 도움이 될 것 같아 지원해요.',
  '함께 협업하고 싶어 대화를 요청드려요.',
  '프로젝트 참여 방법에 대해 여쭤보고 싶어요.',
  '제 경험이 프로젝트에 맞을 것 같아 연락드려요.',
  '프로젝트에 기여하고 싶어 지원해요.',
] as const;

// 상태 설정 (UI 표시용)
export const TALK_REQUEST_STATUS_CONFIG: Record<
  TalkRequestStatus,
  { label: string; bgcolor: string; color: string }
> = {
  pending: { label: '대기중', bgcolor: '#EFF6FF', color: '#2563EB' },
  accepted: { label: '수락됨', bgcolor: '#ECFDF5', color: '#059669' },
  rejected: { label: '거절됨', bgcolor: '#FEF2F2', color: '#DC2626' },
  withdrawn: { label: '철회됨', bgcolor: '#F3F4F6', color: '#4B5563' },
  expired: { label: '만료됨', bgcolor: '#F3F4F6', color: '#4B5563' },
};

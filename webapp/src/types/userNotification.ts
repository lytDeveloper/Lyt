/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * User Notification Types
 *
 * 유저 간 알림 시스템 (2단계 구현 예정)
 * - 초대 (프로젝트/협업 통합)
 * - 채팅 메시지
 * - 기한 임박 알림
 */

export type UserNotificationType =
  | 'invitation'      // 초대 (프로젝트/협업 통합)
  | 'message'         // 채팅 메시지
  | 'deadline'        // 기한 임박
  | 'application'     // 지원 알림
  | 'status_change'   // 상태 변경 (제안 수락/거절 등)
  | 'withdrawal'      // 철회 알림 (제안/지원 철회)
  | 'follow'          // 팔로우 알림
  | 'like'            // 좋아요 알림
  | 'question'        // 제안 관련 질문
  | 'answer'          // 질문에 대한 답변
  | 'partnership_inquiry' // 파트너십 문의
  | 'talk_request'        // 대화 요청
  | 'talk_request_accepted'  // 대화 요청 수락
  | 'talk_request_rejected' // 대화 요청 거절
  | 'member_left'           // 멤버가 스스로 퇴장
  | 'member_removed'        // 멤버가 강제 퇴장당함
  | 'project_update'        // 프로젝트/협업 업데이트 (workflow, file, member 추가 등)
  | 'project_complete'      // 프로젝트/협업 완료
  | 'mention'               // 멘션 알림 (채팅에서 언급)
  | 'group_message'         // 그룹 채팅 메시지
  | 'security'              // 보안 알림
  | 'marketing';            // 마케팅 알림


export interface UserNotification {
  id: string;
  type: UserNotificationType;
  title: string;
  description: string;
  relatedId: string;          // 관련 엔티티 ID (activity_id와 동일하게 사용하거나, 알림 원본 ID)
  senderId: string;           // 알림 발신자 ID
  receiverId: string;         // 알림 수신자 ID
  isRead: boolean;
  isStarred: boolean;
  createdAt: string;
  actionUrl?: string;         // 알림 클릭 시 이동할 URL
  metadata?: Record<string, any>;  // 추가 메타데이터

  // 추가 필드 (뷰에서 가져옴)
  senderName?: string;
  senderAvatar?: string;
  activityId?: string;        // 프로젝트/협업/채팅방 ID
  activityType?: string;      // 'project', 'collaboration', 'chat'
  activityTitle?: string;
  activityImage?: string;
  status?: string;            // 제안/초대/지원 상태
}

// UI 전용 확장 타입 (In-App Notification)
export interface InAppNotification extends UserNotification {
  // 필요한 경우 여기에 추가 UI 상태 필드 정의
  // 현재는 기본 UserNotification과 동일하게 유지하되, 
  // 향후 애니메이션 상태나 로컬 전용 플래그 등을 위해 확장 가능성 열어둠
  duration?: number; // 알림 표시 시간 (ms)
}

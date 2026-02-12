/* eslint-disable @typescript-eslint/no-explicit-any */
import type { UserNotificationType } from '../types/userNotification';

/**
 * 알림 description 동적 생성 함수
 *
 * 알림 타입과 메타데이터를 기반으로 한국어 description을 생성합니다.
 * 문자열 교체 방식(replaceLeadingNameWithVfanName) 대신 타입 기반 동적 생성 방식 사용
 *
 * @param type - 알림 타입 (invitation, application, talk_request 등)
 * @param action - 액션 ('new', 'accepted', 'rejected' 등, metadata.action)
 * @param senderName - 발신자 이름 (활성 프로필 기준)
 * @param targetTitle - 대상 제목 (프로젝트/협업/채팅방 이름 등, metadata.target_title)
 * @param metadata - 추가 메타데이터 (옵션)
 * @returns 한국어 description 문자열
 *
 * @example
 * // 새 초대
 * buildNotificationDescription('invitation', undefined, '브랜드A', '프로젝트X')
 * // => "브랜드A님이 "프로젝트X"에 초대했습니다."
 *
 * @example
 * // 초대 수락
 * buildNotificationDescription('invitation', 'accepted', '아티스트B', '협업Y')
 * // => "아티스트B님이 "협업Y" 초대를 수락했습니다."
 *
 * @example
 * // 메시지 (멘션 파싱)
 * buildNotificationDescription('message', undefined, '사용자C', undefined, {
 *   messageContent: '@[홍길동](user-123) 확인 부탁드립니다'
 * })
 * // => "사용자C: @홍길동 확인 부탁드립니다"
 */
export function buildNotificationDescription(
  type: UserNotificationType,
  action: string | undefined,
  senderName: string,
  targetTitle?: string,
  metadata?: Record<string, any>
): string {
  // 폴백: 이름이 비어있으면 '사용자'
  const name = senderName || '사용자';

  switch (type) {
    case 'invitation':
      if (action === 'accepted') {
        return `${name}님이 "${targetTitle || ''}" 초대를 수락했어요.`;
      }
      if (action === 'rejected') {
        return `${name}님이 "${targetTitle || ''}" 초대를 거절했어요.`;
      }
      // 새 초대 (action이 'new' 또는 undefined)
      return `${name}님이 "${targetTitle || '프로젝트'}"에 초대했어요.`;

    case 'application':
      if (action === 'accepted') {
        return `${name}님이 "${targetTitle || ''}" 지원을 수락했어요.`;
      }
      if (action === 'rejected') {
        return `${name}님이 "${targetTitle || ''}" 지원을 거절했어요.`;
      }
      // 새 지원: collaboration_title이 있으면 협업, project_title이 있으면 프로젝트
      const hasCollaborationTitle = !!(metadata?.collaboration_title as string | undefined);
      const hasProjectTitle = !!(metadata?.project_title as string | undefined);
      const defaultTarget = hasCollaborationTitle ? '협업' : hasProjectTitle ? '프로젝트' : '프로젝트';
      return `${name}님이 "${targetTitle || defaultTarget}"에 지원했어요.`;

    case 'talk_request':
      return `${name}님이 대화를 요청했어요.`;

    case 'talk_request_accepted':
      return `${name}님이 대화 요청을 수락했어요.`;

    case 'talk_request_rejected':
      return `${name}님이 대화 요청을 거절했어요.`;

    case 'question':
      return `${name}님이 질문을 남겼어요.`;

    case 'answer':
      return `${name}님이 답변을 남겼어요.`;

    case 'message':
      // 메시지 알림: "발신자: 메시지내용" 형태
      // 멘션 패턴 @[이름](userId) → @이름 으로 변환
      const messageContent = metadata?.messageContent || '';
      const parsedMessage = messageContent.replace(
        /@\[([^\]]+)\]\([^)]+\)/g,
        '@$1'
      );
      // 시스템 메시지인 경우 (입장/퇴장 등) 발신자 이름 prefix 생략
      const isSystemMessage =
        parsedMessage.includes('입장했어요') ||
        parsedMessage.includes('퇴장했어요') ||
        parsedMessage.includes('내보냈어요') ||
        parsedMessage.includes('초대했어요') ||
        parsedMessage.includes('권한을') ||
        parsedMessage === '대화가 시작되었어요.';
      if (isSystemMessage) {
        return parsedMessage;
      }
      return `${name}: ${parsedMessage}`;

    default:
      // 기본 폴백
      return `${name}님의 알림`;
  }
}

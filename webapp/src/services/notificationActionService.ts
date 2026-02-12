import { messageService } from './messageService';
import { respondToInvitation } from './invitationService';
import { respondToTalkRequest, withdrawTalkRequest } from './talkRequestService';

export const notificationActionService = {
  /**
   * 채팅 메시지 답장 전송
   */
  replyToMessage: async (roomId: string, content: string): Promise<void> => {
    if (!roomId || !content.trim()) {
      throw new Error('메시지 전송에 필요한 정보가 부족합니다.');
    }
    await messageService.sendMessage(roomId, content);
  },

  /**
   * 초대 수락 (프로젝트/협업 통합)
   */
  acceptInvitation: async (invitationId: string): Promise<void> => {
    await respondToInvitation(invitationId, 'accepted');
  },

  /**
   * 초대 거절 (프로젝트/협업 통합)
   */
  rejectInvitation: async (invitationId: string, reason?: string): Promise<void> => {
    await respondToInvitation(invitationId, 'rejected', reason);
  },
  
  /**
   * 지원서 수락 (프로젝트/협업)
   */
 
  // acceptApplication: async (applicationId: string, type: 'project' | 'collaboration'): Promise<void> => {
  //     // 구현 예정
  // },

  // /**
  //  * 지원서 거절 (프로젝트/협업)
  //  */

  // rejectApplication: async (applicationId: string, type: 'project' | 'collaboration'): Promise<void> => {
  //     // 구현 예정
  // }

  /**
   * 대화 요청 수락
   */
  acceptTalkRequest: async (talkRequestId: string): Promise<string | undefined> => {
    return await respondToTalkRequest(talkRequestId, 'accepted');
  },

  /**
   * 대화 요청 거절
   */
  rejectTalkRequest: async (talkRequestId: string, reason?: string): Promise<void> => {
    await respondToTalkRequest(talkRequestId, 'rejected', reason);
  },

  /**
   * 대화 요청 철회
   */
  withdrawTalkRequest: async (talkRequestId: string): Promise<void> => {
    await withdrawTalkRequest(talkRequestId);
  },
};


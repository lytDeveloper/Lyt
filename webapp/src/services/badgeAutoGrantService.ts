/**
 * 배지 자동 할당 서비스
 * - 조건 충족 시 자동으로 배지 부여
 * - 배지 획득 시 활동 기록 생성
 * - 배지 획득 축하 모달 표시
 */

import { supabase } from '../lib/supabase';
import { activityService } from './activityService';
import { useBadgeModalStore } from '../stores/useBadgeModalStore';

// 배지 ID 상수 (badges 테이블의 id와 일치해야 함)
export const BADGE_IDS = {
  CONNECTOR: '65cb169c-83f9-4386-af6e-122eddbbdba1',           // 연결고리: SSO 로그인 완료
  PROFILE_COMPLETE: '7dd20fbc-0cea-4f6f-acd8-f7c7807d1aa8',      // 프로필 완성: 온보딩 완료
  COMMUNICATOR: 'b20dda76-670e-467b-8d01-91921657d6a4',     // 소통왕: 커뮤니티 댓글 10개 이상
  PROJECT_MASTER: 'e8a63079-e2ba-4ced-ba8c-4be5ef0cd9c9', // 프로젝트 마스터: 첫 프로젝트 완료
  COLLAB_MASTER: 'ebca4823-0639-49a6-8592-c3ad6eb0988e',   // 협업 마스터: 첫 협업 완료
  LINK_MAKER: '4e0b75ad-2c62-4321-b245-ddfd02a06660',         // 연결 메이커: 3명 이상 대화요청 성공
  EXPLORER: 'c831a6c0-573d-4a56-a028-7c6677701fbb',             // 기능 탐험가: 프로젝트/협업 각 1개 완료
  PERSISTENT: '0901911c-f5d9-4f86-8646-0d961b3c1a1e',         // 꾸준함의 힘: 7일 연속 출석
  COLLECTOR: 'e1f8d6ea-54a2-4316-82a5-3e782c1d7810',           // 배지 수집가: 배지 5개 이상
  REPRESENTATIVE: '8b9c096c-2107-4f5f-b3f1-bf57d6240f54', // 대표유저: 프로젝트/협업 생성+참여 20개 이상
} as const;

export type BadgeId = (typeof BADGE_IDS)[keyof typeof BADGE_IDS];

export class BadgeAutoGrantService {
  /**
   * 배지 할당 (이미 있으면 무시)
   * @returns true if badge was newly granted, false if already owned or error
   */
  static async grantBadge(userId: string, badgeId: BadgeId): Promise<boolean> {
    try {
      // 이미 보유 중인지 확인
      const { data: existing } = await supabase
        .from('user_badges')
        .select('user_id')
        .eq('user_id', userId)
        .eq('badge_id', badgeId)
        .maybeSingle();

      if (existing) {
        return false; // 이미 보유
      }

      // 배지 할당
      const { error: insertError } = await supabase.from('user_badges').insert({
        user_id: userId,
        badge_id: badgeId,
        obtained_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;

      // 배지 정보 조회
      const { data: badge } = await supabase
        .from('badges')
        .select('id, name, icon, description')
        .eq('id', badgeId)
        .single();

      // 활동 기록 생성
      if (badge) {
        await activityService.createActivity({
          userId,
          activityType: 'badge_earned',
          title: `새 배지 "${badge.name}"을(를) 획득했어요.`,
          relatedEntityType: 'badge',
          relatedEntityId: badgeId,
          metadata: {
            badgeName: badge.name,
            badgeIcon: badge.icon,
          },
        });

        // 배지 획득 축하 모달 트리거
        const badgeModalStore = useBadgeModalStore.getState();
        badgeModalStore.addBadgeToQueue({
          badgeId: badge.id,
          badgeName: badge.name,
          badgeIcon: badge.icon,
          badgeDescription: badge.description,
        });
      }

      // 배지 수집가 배지 체크 (재귀 방지: collector 배지는 제외)
      if (badgeId !== BADGE_IDS.COLLECTOR) {
        await this.checkBadgeCollector(userId);
      }

      return true;
    } catch (error) {
      console.error('[BadgeAutoGrantService] grantBadge failed:', error);
      return false;
    }
  }

  /**
   * 사용자가 특정 배지를 보유하고 있는지 확인
   */
  static async hasBadge(userId: string, badgeId: BadgeId): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('user_badges')
        .select('user_id')
        .eq('user_id', userId)
        .eq('badge_id', badgeId)
        .maybeSingle();

      return !!data;
    } catch (error) {
      console.error('[BadgeAutoGrantService] hasBadge failed:', error);
      return false;
    }
  }

  // ============================================
  // 개별 배지 체크 메서드
  // ============================================

  /**
   * 연결고리 배지: SSO 로그인 완료 시
   * 트리거 위치: AuthCallback.tsx (로그인 완료 후)
   */
  static async checkConnectorBadge(userId: string): Promise<boolean> {
    return this.grantBadge(userId, BADGE_IDS.CONNECTOR);
  }

  /**
   * 프로필 완성 배지: 온보딩 완료 시
   * 트리거 위치: 각 온보딩 마지막 스텝 (Step7_Complete 등)
   */
  static async checkProfileCompleteBadge(userId: string): Promise<boolean> {
    return this.grantBadge(userId, BADGE_IDS.PROFILE_COMPLETE);
  }

  /**
   * 소통왕 배지: 커뮤니티 댓글 10개 이상
   * 트리거 위치: communityService.addComment 후
   */
  static async checkCommunicatorBadge(userId: string): Promise<boolean> {
    try {
      // 이미 보유 중이면 스킵
      if (await this.hasBadge(userId, BADGE_IDS.COMMUNICATOR)) {
        return false;
      }

      const { count, error } = await supabase
        .from('lounge_comments')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', userId);

      if (error) throw error;

      if ((count || 0) >= 10) {
        return this.grantBadge(userId, BADGE_IDS.COMMUNICATOR);
      }
      return false;
    } catch (error) {
      console.error('[BadgeAutoGrantService] checkCommunicatorBadge failed:', error);
      return false;
    }
  }

  /**
   * 프로젝트 마스터 배지: 첫 프로젝트 완료
   * 트리거 위치: 프로젝트 status -> 'completed' 변경 시
   */
  static async checkProjectMasterBadge(userId: string): Promise<boolean> {
    try {
      // 이미 보유 중이면 스킵
      if (await this.hasBadge(userId, BADGE_IDS.PROJECT_MASTER)) {
        return false;
      }

      // 내가 생성했거나 멤버로 참여한 완료된 프로젝트 확인
      const { count: createdCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId)
        .eq('status', 'completed');

      const { count: memberCount } = await supabase
        .from('project_members')
        .select('projects!inner(*)', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'active')
        .eq('projects.status', 'completed');

      if ((createdCount || 0) + (memberCount || 0) >= 1) {
        return this.grantBadge(userId, BADGE_IDS.PROJECT_MASTER);
      }
      return false;
    } catch (error) {
      console.error('[BadgeAutoGrantService] checkProjectMasterBadge failed:', error);
      return false;
    }
  }

  /**
   * 협업 마스터 배지: 첫 협업 완료
   * 트리거 위치: 협업 status -> 'completed' 변경 시
   */
  static async checkCollabMasterBadge(userId: string): Promise<boolean> {
    try {
      // 이미 보유 중이면 스킵
      if (await this.hasBadge(userId, BADGE_IDS.COLLAB_MASTER)) {
        return false;
      }

      // 내가 생성했거나 멤버로 참여한 완료된 협업 확인
      const { count: createdCount } = await supabase
        .from('collaborations')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId)
        .eq('status', 'completed');

      const { count: memberCount } = await supabase
        .from('collaboration_members')
        .select('collaborations!inner(*)', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'active')
        .eq('collaborations.status', 'completed');

      if ((createdCount || 0) + (memberCount || 0) >= 1) {
        return this.grantBadge(userId, BADGE_IDS.COLLAB_MASTER);
      }
      return false;
    } catch (error) {
      console.error('[BadgeAutoGrantService] checkCollabMasterBadge failed:', error);
      return false;
    }
  }

  /**
   * 연결 메이커 배지: 3명 이상 파트너와 대화요청 성공
   * 트리거 위치: talkRequestService.respondToTalkRequest (accepted)
   * 
   * NOTE: RPC 함수 사용 이유
   * - 대화 수락 시 receiver의 auth context로 실행됨
   * - RLS 정책으로 인해 sender의 다른 accepted 요청 조회 불가
   * - SECURITY DEFINER RPC로 RLS 우회하여 정확한 카운트 조회
   */
  static async checkLinkMakerBadge(userId: string): Promise<boolean> {
    try {
      // 이미 보유 중이면 스킵
      if (await this.hasBadge(userId, BADGE_IDS.LINK_MAKER)) {
        return false;
      }

      // RPC 함수로 고유 수신자 수 조회 (RLS 우회)
      const { data, error } = await supabase.rpc('get_accepted_talk_request_count', {
        p_sender_id: userId,
      });

      if (error) throw error;

      // 3명 이상이면 배지 부여
      if ((data ?? 0) >= 3) {
        return this.grantBadge(userId, BADGE_IDS.LINK_MAKER);
      }
      return false;
    } catch (error) {
      console.error('[BadgeAutoGrantService] checkLinkMakerBadge failed:', error);
      return false;
    }
  }

  /**
   * 기능 탐험가 배지: 프로젝트/협업 각 1개씩 완료
   * 트리거 위치: 프로젝트/협업 완료 시
   */
  static async checkExplorerBadge(userId: string): Promise<boolean> {
    try {
      // 이미 보유 중이면 스킵
      if (await this.hasBadge(userId, BADGE_IDS.EXPLORER)) {
        return false;
      }

      // 프로젝트 완료 수 (생성 + 멤버)
      const { count: projectCreated } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId)
        .eq('status', 'completed');

      const { count: projectMember } = await supabase
        .from('project_members')
        .select('projects!inner(*)', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'active')
        .eq('projects.status', 'completed');

      const totalProjects = (projectCreated || 0) + (projectMember || 0);

      // 협업 완료 수 (생성 + 멤버)
      const { count: collabCreated } = await supabase
        .from('collaborations')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId)
        .eq('status', 'completed');

      const { count: collabMember } = await supabase
        .from('collaboration_members')
        .select('collaborations!inner(*)', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'active')
        .eq('collaborations.status', 'completed');

      const totalCollabs = (collabCreated || 0) + (collabMember || 0);

      if (totalProjects >= 1 && totalCollabs >= 1) {
        return this.grantBadge(userId, BADGE_IDS.EXPLORER);
      }
      return false;
    } catch (error) {
      console.error('[BadgeAutoGrantService] checkExplorerBadge failed:', error);
      return false;
    }
  }

  /**
   * 꾸준함의 힘 배지: 7일 연속 앱 출석
   * 트리거 위치: 로그인 시 스트릭 업데이트 후
   */
  static async checkPersistentBadge(userId: string): Promise<boolean> {
    try {
      // 이미 보유 중이면 스킵
      if (await this.hasBadge(userId, BADGE_IDS.PERSISTENT)) {
        return false;
      }

      const { data, error } = await supabase
        .from('user_login_streaks')
        .select('current_streak')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if ((data?.current_streak || 0) >= 7) {
        return this.grantBadge(userId, BADGE_IDS.PERSISTENT);
      }
      return false;
    } catch (error) {
      console.error('[BadgeAutoGrantService] checkPersistentBadge failed:', error);
      return false;
    }
  }

  /**
   * 배지 수집가 배지: 배지 5개 이상 획득
   * 트리거 위치: 다른 배지 획득 시 자동 체크
   */
  static async checkBadgeCollector(userId: string): Promise<boolean> {
    try {
      // 이미 보유 중이면 스킵
      if (await this.hasBadge(userId, BADGE_IDS.COLLECTOR)) {
        return false;
      }

      const { count, error } = await supabase
        .from('user_badges')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) throw error;

      // 5개 이상 (collector 배지 자체는 제외하고 카운트되므로 5개 이상이면 부여)
      if ((count || 0) >= 5) {
        return this.grantBadge(userId, BADGE_IDS.COLLECTOR);
      }
      return false;
    } catch (error) {
      console.error('[BadgeAutoGrantService] checkBadgeCollector failed:', error);
      return false;
    }
  }

  /**
   * 대표유저 배지: 프로젝트/협업 생성+참여 20개 이상
   * 트리거 위치: 프로젝트/협업 완료 시
   */
  static async checkRepresentativeBadge(userId: string): Promise<boolean> {
    try {
      // 이미 보유 중이면 스킵
      if (await this.hasBadge(userId, BADGE_IDS.REPRESENTATIVE)) {
        return false;
      }

      // 생성한 프로젝트/협업 + 멤버로 참여한 프로젝트/협업
      const [createdProjects, createdCollabs, memberProjects, memberCollabs] =
        await Promise.all([
          supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('created_by', userId)
            .neq('status', 'deleted'),
          supabase
            .from('collaborations')
            .select('*', { count: 'exact', head: true })
            .eq('created_by', userId)
            .neq('status', 'deleted'),
          supabase
            .from('project_members')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'active'),
          supabase
            .from('collaboration_members')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'active'),
        ]);

      const total =
        (createdProjects.count || 0) +
        (createdCollabs.count || 0) +
        (memberProjects.count || 0) +
        (memberCollabs.count || 0);

      if (total >= 20) {
        return this.grantBadge(userId, BADGE_IDS.REPRESENTATIVE);
      }
      return false;
    } catch (error) {
      console.error('[BadgeAutoGrantService] checkRepresentativeBadge failed:', error);
      return false;
    }
  }

  /**
   * 모든 배지 조건 체크 (한 번에 여러 배지 체크)
   * 주의: 성능을 위해 필요한 경우에만 사용
   */
  static async checkAllBadges(userId: string): Promise<BadgeId[]> {
    const granted: BadgeId[] = [];

    const checks = [
      { fn: () => this.checkConnectorBadge(userId), id: BADGE_IDS.CONNECTOR },
      { fn: () => this.checkCommunicatorBadge(userId), id: BADGE_IDS.COMMUNICATOR },
      { fn: () => this.checkProjectMasterBadge(userId), id: BADGE_IDS.PROJECT_MASTER },
      { fn: () => this.checkCollabMasterBadge(userId), id: BADGE_IDS.COLLAB_MASTER },
      { fn: () => this.checkLinkMakerBadge(userId), id: BADGE_IDS.LINK_MAKER },
      { fn: () => this.checkExplorerBadge(userId), id: BADGE_IDS.EXPLORER },
      { fn: () => this.checkPersistentBadge(userId), id: BADGE_IDS.PERSISTENT },
      { fn: () => this.checkRepresentativeBadge(userId), id: BADGE_IDS.REPRESENTATIVE },
    ];

    for (const check of checks) {
      const result = await check.fn();
      if (result) {
        granted.push(check.id);
      }
    }

    return granted;
  }
}

// 싱글톤 export
export const badgeAutoGrantService = BadgeAutoGrantService;

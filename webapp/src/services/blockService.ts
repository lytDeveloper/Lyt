import { supabase } from '../lib/supabase';

export interface BlockedEntity {
  id: string; // profile_id or project_id or collaboration_id
  name: string; // Display name
  avatarUrl?: string; // Profile image URL
  type: 'user' | 'brand' | 'profile'; // Type for UI grouping
  blockedAt: string;
  reason?: string;
}

// Removed stray code

import { mapProjectsWithDisplay, type Project, getProjectTeamInfo } from './projectService';
import { mapCollaborationsWithDisplay, type Collaboration, getCollaborationTeamInfo } from './collaborationService';

export class BlockService {
  /**
   * Get blocked users (partners) - excludes brands
   * Source: user_partner_preferences (status='blocked')
   * Uses two-step query to ensure all blocked partners are returned even if profile data is incomplete
   */
  static async getBlockedUsers(userId: string): Promise<BlockedEntity[]> {
    try {
      // Step 1: Get all blocked partner preferences (without JOIN to avoid missing records)
      const { data: blockedPrefs, error: prefsError } = await supabase
        .from('user_partner_preferences')
        .select('partner_id, created_at, reason')
        .eq('profile_id', userId)
        .eq('status', 'blocked');

      if (prefsError) throw prefsError;
      if (!blockedPrefs || blockedPrefs.length === 0) return [];

      const partnerIds = blockedPrefs.map((p) => p.partner_id);

      // Step 2: Fetch profile data for all blocked partners
      // Only fetch sub-profiles with is_active = TRUE to avoid showing deactivated role info
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          nickname,
          avatar_url,
          profile_brands!left (brand_name, logo_image_url, is_active),
          profile_artists!left (artist_name, logo_image_url, is_active),
          profile_creatives!left (nickname, profile_image_url, is_active),
          profile_fans!left (profile_image_url, is_active)
        `)
        .in('id', partnerIds);

      if (profilesError) {
        console.error('프로필 조회 실패:', profilesError);
      }

      // Create a map for quick lookup
      const profileMap = new Map<string, any>();
      (profiles || []).forEach((p: any) => profileMap.set(p.id, p));

      // Step 3: Combine and filter (exclude brands)
      return blockedPrefs
        .filter((pref) => {
          const profile = profileMap.get(pref.partner_id);
          // If no profile found, include it (show as "알 수 없는 사용자")
          if (!profile) return true;
          // Exclude brands - they will be shown in getBlockedBrands
          const brands = profile.profile_brands;
          const hasBrand = Array.isArray(brands) ? brands.length > 0 : !!brands;
          return !hasBrand;
        })
        .map((pref) => {
          const profile = profileMap.get(pref.partner_id);

          // Determine display name and avatar URL based on ACTIVE profile type only
          const artists = profile?.profile_artists;
          const creatives = profile?.profile_creatives;
          const fans = profile?.profile_fans;

          // Only use sub-profiles with is_active = TRUE
          const artistList = Array.isArray(artists) ? artists : (artists ? [artists] : []);
          const creativeList = Array.isArray(creatives) ? creatives : (creatives ? [creatives] : []);
          const fanList = Array.isArray(fans) ? fans : (fans ? [fans] : []);

          const activeArtist = artistList.find((a: any) => a?.is_active === true);
          const activeCreative = creativeList.find((c: any) => c?.is_active === true);
          const activeFan = fanList.find((f: any) => f?.is_active === true);

          const baseNickname = profile?.nickname;
          const baseAvatar = profile?.avatar_url;

          let name = '';
          let avatarUrl = '';

          if (activeArtist) {
            name = activeArtist.artist_name;
            avatarUrl = activeArtist.logo_image_url;
          } else if (activeCreative) {
            name = activeCreative.nickname;
            avatarUrl = activeCreative.profile_image_url;
          } else if (activeFan) {
            name = baseNickname;
            avatarUrl = activeFan.profile_image_url;
          } else {
            name = baseNickname || '알 수 없는 사용자';
            avatarUrl = baseAvatar || '';
          }

          return {
            id: pref.partner_id,
            name: name || '알 수 없는 사용자',
            avatarUrl: avatarUrl || undefined,
            type: 'user',
            blockedAt: pref.created_at,
            reason: pref.reason,
          };
        });
    } catch (error) {
      console.error('차단된 사용자 조회 실패:', error);
      return [];
    }
  }

  // Note: Currently there isn't a specific 'user_brand_preferences' table in the schema provided.
  // Assuming brands are also users (profiles) and might be in user_partner_preferences or separate.
  // For now, let's assume brands are handled similarly via user_partner_preferences if they are partners,
  // OR we might need a new table or reuse user_partner_preferences with a filter.
  // Given the schema, brands are profiles. So user_partner_preferences might store them if logic allows.
  // IF NOT, we might need to check if there is a specific table.
  // Looking at schema: user_partner_preferences links to profiles. profile_brands links to profiles.
  // So we can fetch blocked brands from user_partner_preferences by checking if they exist in profile_brands.

  /**
   * Get blocked brands
   * Source: user_partner_preferences (status='blocked') + profiles with profile_brands
   * Uses two-step query to ensure all blocked brands are returned
   */
  static async getBlockedBrands(userId: string): Promise<BlockedEntity[]> {
    try {
      // Step 1: Get all blocked partner preferences
      const { data: blockedPrefs, error: prefsError } = await supabase
        .from('user_partner_preferences')
        .select('partner_id, created_at, reason')
        .eq('profile_id', userId)
        .eq('status', 'blocked');

      if (prefsError) throw prefsError;
      if (!blockedPrefs || blockedPrefs.length === 0) return [];

      const partnerIds = blockedPrefs.map((p) => p.partner_id);

      // Step 2: Fetch profile_brands data for all blocked partners
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          profile_brands!left (brand_name, logo_image_url, is_active)
        `)
        .in('id', partnerIds);

      if (profilesError) {
        console.error('브랜드 프로필 조회 실패:', profilesError);
      }

      // Create a map for quick lookup
      const profileMap = new Map<string, any>();
      (profiles || []).forEach((p: any) => profileMap.set(p.id, p));

      // Step 3: Filter only ACTIVE brands and combine with pref data
      return blockedPrefs
        .filter((pref) => {
          const profile = profileMap.get(pref.partner_id);
          if (!profile) return false;
          const brands = profile.profile_brands;
          const brandList = Array.isArray(brands) ? brands : (brands ? [brands] : []);
          // Check if there's at least one active brand
          return brandList.some((b: any) => b?.is_active === true);
        })
        .map((pref) => {
          const profile = profileMap.get(pref.partner_id);
          const brands = profile?.profile_brands;
          const brandList = Array.isArray(brands) ? brands : (brands ? [brands] : []);
          // Use the active brand
          const activeBrand = brandList.find((b: any) => b?.is_active === true);

          return {
            id: pref.partner_id,
            name: activeBrand?.brand_name || '알 수 없는 브랜드',
            avatarUrl: activeBrand?.logo_image_url || undefined,
            type: 'brand',
            blockedAt: pref.created_at,
            reason: pref.reason,
          };
        });
    } catch (error) {
      console.error('차단된 브랜드 조회 실패:', error);
      return [];
    }
  }

  /**
   * Get hidden/blocked profiles (General "Hidden Profile" category in UI)
   * This might overlap with blocked users, or be a separate "hidden" status.
   * The prompt mentions "Hidden Profiles" tab. In DB we have status 'hidden' and 'blocked'.
   * Let's fetch 'hidden' status from user_partner_preferences.
   */
  static async getHiddenProfiles(userId: string): Promise<BlockedEntity[]> {
    try {
      const { data, error } = await supabase
        .from('user_partner_preferences')
        .select(`
          partner_id,
          created_at,
          reason,
          profiles!user_partner_preferences_partner_id_fkey (
            nickname,
            profile_brands (brand_name, logo_image_url),
            profile_artists (artist_name, logo_image_url),
            profile_creatives (nickname, profile_image_url),
            profile_fans (profile_image_url)
          )
        `)
        .eq('profile_id', userId)
        .eq('status', 'hidden');

      if (error) throw error;

      return (data || []).map((item: any) => {
        // Handle both array and single object responses
        const brands = item.profiles?.profile_brands;
        const artists = item.profiles?.profile_artists;
        const creatives = item.profiles?.profile_creatives;
        const fans = item.profiles?.profile_fans;

        const brand = Array.isArray(brands) ? brands[0] : brands;
        const artist = Array.isArray(artists) ? artists[0] : artists;
        const creative = Array.isArray(creatives) ? creatives[0] : creatives;
        const fan = Array.isArray(fans) ? fans[0] : fans;
        const baseNickname = item.profiles?.nickname;

        let name = '';
        let avatarUrl = '';

        if (brand) {
          name = brand.brand_name;
          avatarUrl = brand.logo_image_url;
        } else if (artist) {
          name = artist.artist_name;
          avatarUrl = artist.logo_image_url;
        } else if (creative) {
          name = creative.nickname;
          avatarUrl = creative.profile_image_url;
        } else if (fan) {
          name = baseNickname; // profile_fans는 nickname이 없으므로 profiles.nickname 사용
          avatarUrl = fan.profile_image_url;
        } else {
          name = baseNickname || '알 수 없는 프로필';
        }

        return {
          id: item.partner_id,
          name: name || '알 수 없는 프로필',
          avatarUrl: avatarUrl || undefined,
          type: 'profile',
          blockedAt: item.created_at,
          reason: item.reason,
        };
      });
    } catch (error) {
      console.error('숨김 프로필 조회 실패:', error);
      return [];
    }
  }

  /**
   * Get hidden projects
   */
  static async getHiddenProjects(userId: string): Promise<Project[]> {
    try {
      const { data: prefData, error: prefError } = await supabase
        .from('user_project_preferences')
        .select('project_id')
        .eq('profile_id', userId)
        .eq('status', 'hidden');

      if (prefError) throw prefError;

      const ids = (prefData || []).map((item) => item.project_id);
      if (ids.length === 0) return [];

      const { data: projectsData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .in('id', ids)
        .order('created_at', { ascending: false });

      if (projectError) throw projectError;

      const mappedProjects = await mapProjectsWithDisplay(projectsData || []);

      // Populate team info
      await Promise.all(mappedProjects.map(async (project) => {
        project.team = await getProjectTeamInfo(project.id, project.createdBy || '');
      }));

      return mappedProjects;
    } catch (error) {
      console.error('숨김 프로젝트 조회 실패:', error);
      return [];
    }
  }

  /**
   * Get hidden collaborations
   */
  static async getHiddenCollaborations(userId: string): Promise<Collaboration[]> {
    try {
      const { data: prefData, error: prefError } = await supabase
        .from('user_collaboration_preferences')
        .select('collaboration_id')
        .eq('profile_id', userId)
        .eq('status', 'hidden');

      if (prefError) throw prefError;

      const ids = (prefData || []).map((item) => item.collaboration_id);
      if (ids.length === 0) return [];

      const { data: collaborationsData, error: collabError } = await supabase
        .from('collaborations')
        .select('*')
        .in('id', ids)
        .order('created_at', { ascending: false });

      if (collabError) throw collabError;

      const mappedCollaborations = await mapCollaborationsWithDisplay(collaborationsData || []);

      // Populate team/member info if needed (CollaborationCard usually handles members display well if mapped correctly,
      // but let's ensure consistency if it relies on 'team' object or richer member data)
      // Actually CollaborationCard uses collaboration.members mainly. mapCollaboration maps members if provided in row.
      // But here we are fetching from 'collaborations' table which doesn't have members joined unless we join.
      // Let's manually fetch team info like we did for projects to be safe.
      await Promise.all(mappedCollaborations.map(async (collab) => {
        const teamInfo = await getCollaborationTeamInfo(collab.id, collab.createdBy || '');
        // CollaborationCard might benefit from this if mapped to 'team' prop or if we map members back to collaboration.members
        // Reviewing CollaborationCard: it uses collaboration.members OR collaboration.team.
        // Let's populate collaboration.team 
        collab.team = teamInfo;

        // Also ensure members array is populated if empty, for 'getLeader' helpers
        if ((!collab.members || collab.members.length === 0) && teamInfo.members) {
          // Provide at least the leader as a member if missing
          // This requires mapping TeamMember to CollaborationMember. 
          // For now, setting .team is a good start. 
        }
      }));

      return mappedCollaborations;
    } catch (error) {
      console.error('숨김 협업 조회 실패:', error);
      return [];
    }
  }

  /**
   * Unblock/Unhide a partner (user/brand/profile)
   */
  static async unblockPartner(userId: string, partnerId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_partner_preferences')
        .delete()
        .eq('profile_id', userId)
        .eq('partner_id', partnerId);

      if (error) throw error;
    } catch (error) {
      console.error('차단 해제 실패:', error);
      throw error;
    }
  }

  // ============================================
  // Phase 1: 차단/숨기기 로직 확장 함수들
  // ============================================

  /**
   * 내가 차단한 사용자 ID 목록만 조회 (성능 최적화)
   * 메시지, 검색, 피드 필터링 등에서 사용
   */
  static async getBlockedUserIds(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('user_partner_preferences')
        .select('partner_id')
        .eq('profile_id', userId)
        .eq('status', 'blocked');

      if (error) throw error;
      return (data || []).map((item) => item.partner_id);
    } catch (error) {
      console.error('차단된 사용자 ID 조회 실패:', error);
      return [];
    }
  }

  /**
   * 내가 차단한 브랜드 ID 목록만 조회
   * 브랜드의 프로젝트/협업 필터링에 사용
   */
  static async getBlockedBrandIds(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('user_partner_preferences')
        .select('partner_id, profile_brands!inner(id)')
        .eq('profile_id', userId)
        .eq('status', 'blocked');

      if (error) throw error;
      return (data || []).map((item) => item.partner_id);
    } catch (error) {
      console.error('차단된 브랜드 ID 조회 실패:', error);
      return [];
    }
  }

  /**
   * 나를 차단한 사용자 ID 목록 조회 (역방향)
   * 메시지 양방향 차단 확인에 사용
   */
  static async getBlockedByUserIds(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('user_partner_preferences')
        .select('profile_id')
        .eq('partner_id', userId)
        .eq('status', 'blocked');

      if (error) throw error;
      return (data || []).map((item) => item.profile_id);
    } catch (error) {
      console.error('나를 차단한 사용자 ID 조회 실패:', error);
      return [];
    }
  }

  /**
   * 나를 숨긴 사용자 ID 목록 조회 (역방향)
   * 역방향 숨기기: 상대방 피드에서 내가 제외되어야 할 때 사용
   */
  static async getHiddenByUserIds(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('user_partner_preferences')
        .select('profile_id')
        .eq('partner_id', userId)
        .eq('status', 'hidden');

      if (error) throw error;
      return (data || []).map((item) => item.profile_id);
    } catch (error) {
      console.error('나를 숨긴 사용자 ID 조회 실패:', error);
      return [];
    }
  }

  /**
   * 양방향 차단 확인
   * A가 B를 차단했거나 B가 A를 차단한 경우 true
   * 메시지 송수신 차단에 사용
   */
  static async isBlockedBidirectional(userA: string, userB: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_partner_preferences')
        .select('profile_id')
        .eq('status', 'blocked')
        .or(`and(profile_id.eq.${userA},partner_id.eq.${userB}),and(profile_id.eq.${userB},partner_id.eq.${userA})`);

      if (error) throw error;
      return (data?.length ?? 0) > 0;
    } catch (error) {
      console.error('양방향 차단 확인 실패:', error);
      return false;
    }
  }

  /**
   * 특정 사용자가 나를 숨겼는지 확인
   * Talk Request 버튼 표시 여부에 사용
   * @param targetId - 확인할 대상 (이 사람이 나를 숨겼는지)
   * @param myId - 현재 사용자 (나)
   */
  static async isHiddenBy(targetId: string, myId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_partner_preferences')
        .select('profile_id')
        .eq('profile_id', targetId)
        .eq('partner_id', myId)
        .eq('status', 'hidden')
        .maybeSingle();

      if (error) throw error;
      return data !== null;
    } catch (error) {
      console.error('숨김 여부 확인 실패:', error);
      return false;
    }
  }

  /**
   * 특정 사용자가 나를 차단했는지 확인
   * @param targetId - 확인할 대상 (이 사람이 나를 차단했는지)
   * @param myId - 현재 사용자 (나)
   */
  static async isBlockedBy(targetId: string, myId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_partner_preferences')
        .select('profile_id')
        .eq('profile_id', targetId)
        .eq('partner_id', myId)
        .eq('status', 'blocked')
        .maybeSingle();

      if (error) throw error;
      return data !== null;
    } catch (error) {
      console.error('차단 여부 확인 실패:', error);
      return false;
    }
  }

  /**
   * 사용자 차단하기
   */
  static async blockUser(userId: string, targetId: string, reason?: string): Promise<void> {
    if (userId === targetId) {
      throw new Error('자기 자신을 차단할 수 없습니다');
    }

    try {
      const { error } = await supabase
        .from('user_partner_preferences')
        .upsert({
          profile_id: userId,
          partner_id: targetId,
          status: 'blocked',
          reason: reason || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'profile_id,partner_id',
        });

      if (error) throw error;
    } catch (error) {
      console.error('사용자 차단 실패:', error);
      throw error;
    }
  }

  /**
   * 프로필 숨기기
   * 역방향 동작: 내가 A를 숨기면 A의 검색/추천에서 내가 제외됨
   */
  static async hideProfile(userId: string, targetId: string, reason?: string): Promise<void> {
    if (userId === targetId) {
      throw new Error('자기 자신을 숨길 수 없습니다');
    }

    try {
      const { error } = await supabase
        .from('user_partner_preferences')
        .upsert({
          profile_id: userId,
          partner_id: targetId,
          status: 'hidden',
          reason: reason || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'profile_id,partner_id',
        });

      if (error) throw error;
    } catch (error) {
      console.error('프로필 숨기기 실패:', error);
      throw error;
    }
  }

  /**
   * Unhide project
   */
  static async unhideProject(userId: string, projectId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_project_preferences')
        .delete()
        .eq('profile_id', userId)
        .eq('project_id', projectId)
        .eq('status', 'hidden');

      if (error) throw error;
    } catch (error) {
      console.error('프로젝트 숨김 해제 실패:', error);
      throw error;
    }
  }

  /**
   * Unhide collaboration
   */
  static async unhideCollaboration(userId: string, collaborationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_collaboration_preferences')
        .delete()
        .eq('profile_id', userId)
        .eq('collaboration_id', collaborationId)
        .eq('status', 'hidden');

      if (error) throw error;
    } catch (error) {
      console.error('협업 숨김 해제 실패:', error);
      throw error;
    }
  }

  /**
   * 모든 차단 ID 조회 (차단 + 브랜드 차단 통합)
   * 피드/검색 필터링에서 한번에 사용
   */
  static async getAllBlockedIds(userId: string): Promise<{
    blockedUserIds: string[];
    blockedByUserIds: string[];
    hiddenByUserIds: string[];
  }> {
    try {
      const [blockedUserIds, blockedByUserIds, hiddenByUserIds] = await Promise.all([
        this.getBlockedUserIds(userId),
        this.getBlockedByUserIds(userId),
        this.getHiddenByUserIds(userId),
      ]);

      return { blockedUserIds, blockedByUserIds, hiddenByUserIds };
    } catch (error) {
      console.error('차단 ID 일괄 조회 실패:', error);
      return { blockedUserIds: [], blockedByUserIds: [], hiddenByUserIds: [] };
    }
  }
}

export const blockService = BlockService;


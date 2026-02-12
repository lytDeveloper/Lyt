/**
 * useArchiveData Hook
 * 
 * 아카이브 페이지용 데이터 페칭 Hook
 * - 배치 쿼리로 N+1 문제 해결
 * - 탭별 조건부 로딩 (enabled)
 * - ManageAll 패턴 적용
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { getProfileDisplayMapOptimized, toLegacyDisplayInfo } from '../services/profileDisplayService';
import { mapProject, mapCollaboration } from '../utils/mappers';
import { partnershipService } from '../services/partnershipService';
import type { Project } from '../services/projectService';
import type { Collaboration } from '../services/collaborationService';
import type { CollaborationMember } from '../types/exploreTypes';

// 아카이브 상태 (완료/취소/보류만) - 삭제된 항목은 제외
const ARCHIVE_PROJECT_STATUSES = ['completed', 'cancelled', 'on_hold'];
const ARCHIVE_COLLAB_STATUSES = ['completed', 'cancelled', 'on_hold'];

type ArchiveSubTab = 'project' | 'collaboration' | 'partnership';

interface TeamMember {
  id: string;
  name: string;
  profileImageUrl?: string;
  activityField?: string;
  isOnline?: boolean;
}

interface TeamInfo {
  leaderId: string;
  leaderName: string;
  leaderAvatar: string;
  leaderField: string;
  totalMembers: number;
  members: TeamMember[];
}

/**
 * 멤버 배열을 project_id 또는 collaboration_id로 그룹화
 */
function groupBy<T extends Record<string, any>>(
  items: T[],
  key: string
): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const groupKey = item[key];
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

/**
 * 멤버 데이터에서 TeamInfo 구성
 */
function buildTeamInfo(
  members: any[],
  displayMap: Map<string, any>,
  createdBy: string
): TeamInfo {
  const activeMembers = members.filter((m) => m.status === 'active');
  const leaderMember = activeMembers.find((m) => m.is_leader === true);
  const leaderId = leaderMember?.user_id || createdBy;

  const leaderDisplay = displayMap.get(leaderId);

  const memberList: TeamMember[] = activeMembers
    .filter((m) => m.user_id !== leaderId)
    .map((m) => {
      const display = displayMap.get(m.user_id);
      return {
        id: m.user_id,
        name: display?.name || '',
        profileImageUrl: display?.avatar,
        activityField: display?.activityField || m.position || '',
        isOnline: false,
      };
    });

  return {
    leaderId,
    leaderName: leaderDisplay?.name || '',
    leaderAvatar: leaderDisplay?.avatar || '',
    leaderField: leaderDisplay?.activityField || '',
    totalMembers: activeMembers.length || 1,
    members: memberList,
  };
}

/**
 * 협업 멤버 데이터에서 CollaborationMember 배열 구성
 */
function buildCollaborationMembers(
  members: any[],
  displayMap: Map<string, any>
): CollaborationMember[] {
  return members
    .filter((m) => m.status === 'active')
    .map((m) => {
      const display = displayMap.get(m.user_id);
      return {
        id: m.id,
        collaborationId: m.collaboration_id,
        userId: m.user_id,
        position: m.position || '',
        status: m.status,
        isLeader: m.is_leader || false,
        canInvite: m.can_invite || false,
        canEdit: m.can_edit || false,
        joinedDate: m.joined_date || m.created_at,
        name: display?.name || '사용자',
        activityField: display?.activityField || m.position || '',
        profileImageUrl: display?.avatar || '',
        isOnline: false,
      };
    });
}

/**
 * 아카이브 데이터 페칭 Hook
 */
export function useArchiveData(activeSubTab: ArchiveSubTab) {
  const { userId, type: userProfileType } = useProfileStore();

  // ==================== 프로젝트 (배치 쿼리) ====================
  const projectsQuery = useQuery<Project[]>({
    queryKey: ['archive', 'projects', userId],
    queryFn: async () => {
      if (!userId) return [];

      // 1. 내가 생성한 프로젝트 조회
      const { data: createdProjects, error: createdError } = await supabase
        .from('projects')
        .select('*')
        .eq('created_by', userId)
        .in('status', ARCHIVE_PROJECT_STATUSES)
        .order('created_at', { ascending: false });

      if (createdError) {
        console.error('[useArchiveData] Error fetching created projects:', createdError);
      }

      // 2. 내가 멤버인 프로젝트 ID 조회
      const { data: membershipData } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId)
        .eq('status', 'active');

      const memberProjectIds = (membershipData || []).map((m) => m.project_id);

      // 3. 멤버인 프로젝트 상세 조회 (아카이브 상태만)
      let memberProjects: any[] = [];
      if (memberProjectIds.length > 0) {
        const { data: memberProjectsData } = await supabase
          .from('projects')
          .select('*')
          .in('id', memberProjectIds)
          .in('status', ARCHIVE_PROJECT_STATUSES)
          .order('created_at', { ascending: false });

        memberProjects = memberProjectsData || [];
      }

      // 4. 중복 제거 후 병합
      const allProjectsMap = new Map<string, any>();
      (createdProjects || []).forEach((p) => allProjectsMap.set(p.id, p));
      memberProjects.forEach((p) => {
        if (!allProjectsMap.has(p.id)) {
          allProjectsMap.set(p.id, p);
        }
      });

      const allProjects = Array.from(allProjectsMap.values());
      if (allProjects.length === 0) return [];

      // 5. 프로젝트 멤버 배치 조회 (먼저 조회하여 모든 user ID 수집)
      const projectIds = allProjects.map((p) => p.id);
      const { data: allMembers } = await supabase
        .from('project_members')
        .select('*')
        .in('project_id', projectIds)
        .eq('status', 'active');

      // 6. 모든 user ID 한번에 배치 조회 (creator + members) - 단일 RPC 호출로 최적화
      const creatorIds = allProjects.map((p) => p.created_by).filter(Boolean);
      const memberUserIds = (allMembers || []).map((m) => m.user_id).filter(Boolean);
      const allUserIds = [...new Set([...creatorIds, ...memberUserIds])];
      const combinedDisplayMap = await getProfileDisplayMapOptimized(allUserIds);
      const displayInfoMap = combinedDisplayMap; // 호환성을 위해 별칭 유지

      // 8. 그룹화 후 매핑
      const membersByProject = groupBy(allMembers || [], 'project_id');

      return allProjects.map((row) => {
        const displayInfo = displayInfoMap.get(row.created_by);
        const display = displayInfo ? toLegacyDisplayInfo(displayInfo) : undefined;
        const project = mapProject(row, undefined, display);

        project.brandName = displayInfo?.name || display?.displayName || '브랜드';
        project.team = buildTeamInfo(
          membersByProject[row.id] || [],
          combinedDisplayMap,
          row.created_by
        );

        return project;
      });
    },
    enabled: activeSubTab === 'project' && !!userId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  // ==================== 협업 (배치 쿼리) ====================
  const collaborationsQuery = useQuery<Collaboration[]>({
    queryKey: ['archive', 'collaborations', userId],
    queryFn: async () => {
      if (!userId) return [];

      // 1. 내가 멤버인 협업 ID 조회
      const { data: membershipData, error: membershipError } = await supabase
        .from('collaboration_members')
        .select('collaboration_id')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (membershipError) {
        console.error('[useArchiveData] Error fetching collaboration memberships:', membershipError);
        return [];
      }

      if (!membershipData || membershipData.length === 0) return [];

      // 2. 협업 상세 조회 (아카이브 상태만)
      const collaborationIds = membershipData.map((m) => m.collaboration_id);
      const { data: collaborationsData, error: collaborationsError } = await supabase
        .from('collaborations')
        .select('*')
        .in('id', collaborationIds)
        .in('status', ARCHIVE_COLLAB_STATUSES)
        .order('created_at', { ascending: false });

      if (collaborationsError) {
        console.error('[useArchiveData] Error fetching collaborations:', collaborationsError);
        return [];
      }

      if (!collaborationsData || collaborationsData.length === 0) return [];

      // 3. 협업 멤버 배치 조회 (먼저 조회하여 모든 user ID 수집)
      const collabIds = collaborationsData.map((c) => c.id);
      const { data: allMembers } = await supabase
        .from('collaboration_members')
        .select('*')
        .in('collaboration_id', collabIds)
        .eq('status', 'active')
        .order('is_leader', { ascending: false });

      // 4. 모든 user ID 한번에 배치 조회 (creator + members) - 단일 RPC 호출로 최적화
      const creatorIds = collaborationsData.map((c) => c.created_by).filter(Boolean);
      const memberUserIds = (allMembers || []).map((m) => m.user_id).filter(Boolean);
      const allUserIds = [...new Set([...creatorIds, ...memberUserIds])];
      const combinedDisplayMap = await getProfileDisplayMapOptimized(allUserIds);
      const displayInfoMap = combinedDisplayMap; // 호환성을 위해 별칭 유지

      // 6. 그룹화 후 매핑
      const membersByCollab = groupBy(allMembers || [], 'collaboration_id');

      return collaborationsData.map((row) => {
        const displayInfo = displayInfoMap.get(row.created_by);
        const display = displayInfo ? toLegacyDisplayInfo(displayInfo) : undefined;
        const collaboration = mapCollaboration(row, undefined, display);

        // 멤버 및 팀 정보 추가
        const members = membersByCollab[row.id] || [];
        collaboration.members = buildCollaborationMembers(members, combinedDisplayMap);
        collaboration.team = buildTeamInfo(members, combinedDisplayMap, row.created_by);

        return collaboration;
      });
    },
    enabled: activeSubTab === 'collaboration' && !!userId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  // ==================== 파트너십 ====================
  const partnershipsQuery = useQuery({
    queryKey: ['archive', 'partnerships', userId, userProfileType],
    queryFn: async () => {
      if (!userId) return [];
      if (userProfileType === 'brand') {
        return partnershipService.getReceivedPartnershipInquiries(userId);
      } else {
        return partnershipService.getSentPartnershipInquiries(userId);
      }
    },
    enabled: activeSubTab === 'partnership' && !!userId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  // ==================== 로딩 상태 ====================
  const isLoading =
    (activeSubTab === 'project' && projectsQuery.isLoading) ||
    (activeSubTab === 'collaboration' && collaborationsQuery.isLoading) ||
    (activeSubTab === 'partnership' && partnershipsQuery.isLoading);

  return {
    projects: projectsQuery.data ?? [],
    collaborations: collaborationsQuery.data ?? [],
    partnerships: partnershipsQuery.data ?? [],
    isLoading,
    isLoadingProjects: projectsQuery.isLoading,
    isLoadingCollaborations: collaborationsQuery.isLoading,
    isLoadingPartnerships: partnershipsQuery.isLoading,
  };
}

export default useArchiveData;


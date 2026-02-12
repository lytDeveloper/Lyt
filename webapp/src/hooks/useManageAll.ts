/**
 * 통합 관리 페이지 Hook
 * ManageProjects + ManageCollaborations를 통합한 데이터 페칭 로직
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyProjects,
  getMyApplications,
  getReceivedApplications,
  updateProjectStatus,
  hideApplications,
  unhideApplications,
  toggleProjectHiddenInManage,
  type Project,
  type ProjectApplication,
} from '../services/projectService';
import {
  getMyCollaborations,
  getReceivedInvitations as getReceivedCollabInvitations,
  getMyCollaborationApplications,
  getReceivedCollaborationApplications,
  updateCollaborationStatus,
  hideInvitations as hideCollabInvitations,
  unhideInvitations as unhideCollabInvitations,
  hideCollaborationApplications,
  unhideCollaborationApplications,
  getCollaborationTeamInfoBatch,
  toggleCollaborationHiddenInManage,
  type Collaboration,
  type CollaborationInvitation,
  type CollaborationApplication,
} from '../services/collaborationService';
// 새 통합 초대 서비스
import {
  getSentInvitations as getUnifiedSentInvitations,
  getReceivedInvitations as getUnifiedReceivedInvitations,
  hideInvitations as hideUnifiedInvitations,
  unhideInvitations as unhideUnifiedInvitations,
} from '../services/invitationService';
import type { Invitation } from '../types/invitation.types';
// 대화 요청 서비스
import {
  getSentTalkRequests,
  getReceivedTalkRequests,
  hideTalkRequests,
  unhideTalkRequests,
  respondToTalkRequest,
  withdrawTalkRequest,
} from '../services/talkRequestService';
import type { TalkRequest } from '../types/talkRequest.types';
import { supabase } from '../lib/supabase';
import type { ProjectStatus } from '../types/exploreTypes';
import { getProfileDisplayMap } from '../services/profileDisplayService';
import { getProjectsByIds } from '../services/projectService';
import { getCollaborationsByIds } from '../services/collaborationService';

// 파트너십 서비스
import { partnershipService } from '../services/partnershipService';
import { useProfileStore } from '../stores/profileStore';

export type ManageTab = 'projects' | 'invitations' | 'likes';

interface UseManageAllOptions {
  likedProjectIds?: string[];
  likedCollaborationIds?: string[];
}

/**
 * 통합 관리 페이지 데이터 페칭 Hook
 */
export function useManageAll(activeTab: ManageTab | 'partnership', options: UseManageAllOptions = {}) {
  const { likedProjectIds = [], likedCollaborationIds = [] } = options;
  const queryClient = useQueryClient();
  const { userId } = useProfileStore();

  // ==================== 프로젝트·협업 탭 ====================

  // 내 프로젝트 (생성자 또는 팀원) + is_hidden_in_manage 포함
  const projectsQuery = useQuery<(Project & { isHiddenInManage?: boolean })[]>({
    queryKey: ['manage-all', 'projects'],
    queryFn: async () => {
      const baseProjects = await getMyProjects();
      if (baseProjects.length === 0) return [];

      // 현재 사용자의 각 프로젝트별 숨김 상태 조회
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return baseProjects;

      const projectIds = baseProjects.map(p => p.id);
      const { data: memberData } = await supabase
        .from('project_members')
        .select('project_id, is_hidden_in_manage')
        .eq('user_id', user.id)
        .in('project_id', projectIds);

      // 프로젝트별 숨김 상태 맵
      const hiddenMap = new Map<string, boolean>();
      (memberData || []).forEach(m => {
        hiddenMap.set(m.project_id, m.is_hidden_in_manage ?? false);
      });

      // 프로젝트에 숨김 상태 추가
      return baseProjects.map(p => ({
        ...p,
        isHiddenInManage: hiddenMap.get(p.id) ?? false,
      }));
    },
    enabled: activeTab === 'projects',
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  // 내 협업 (생성자 또는 멤버) + 멤버 정보 enrichment + is_hidden_in_manage 포함
  const collaborationsQuery = useQuery<(Collaboration & { isHiddenInManage?: boolean })[]>({
    queryKey: ['manage-all', 'collaborations'],
    queryFn: async () => {
      const basicCollabList = await getMyCollaborations();
      if (basicCollabList.length === 0) return [];

      const collaborationIds = basicCollabList.map((c) => c.id);

      // 현재 사용자 ID 가져오기
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      // 멤버 정보 일괄 조회
      const { data: membersData, error: membersError } = await supabase
        .from('collaboration_members')
        .select('*')
        .in('collaboration_id', collaborationIds)
        .eq('status', 'active')
        .order('is_leader', { ascending: false });

      if (membersError) {
        console.error('[useManageAll] Error fetching members:', membersError);
      }

      // 현재 사용자의 협업별 숨김 상태 맵 생성
      const hiddenByCollabMap = new Map<string, boolean>();
      if (currentUserId) {
        (membersData || []).forEach((member) => {
          if (member.user_id === currentUserId) {
            hiddenByCollabMap.set(member.collaboration_id, member.is_hidden_in_manage ?? false);
          }
        });
      }

      // 멤버를 협업 ID별로 그룹화
      const membersByCollab = new Map<string, typeof membersData>();
      (membersData || []).forEach((member) => {
        if (!membersByCollab.has(member.collaboration_id)) {
          membersByCollab.set(member.collaboration_id, []);
        }
        membersByCollab.get(member.collaboration_id)!.push(member);
      });

      // 유저 ID 수집
      const allUserIds = new Set<string>();
      (membersData || []).forEach((m) => allUserIds.add(m.user_id));

      // 배치로 모든 유저 타입의 표시 정보 조회 (브랜드/아티스트/크리에이티브/팬 지원, activityField 포함)
      const userIdsArray = Array.from(allUserIds);
      const displayInfoMap = await getProfileDisplayMap(userIdsArray);

      // partners 테이블에서 is_online 정보만 조회 (activityField는 displayInfoMap에서 가져옴)
      const partnersMap = new Map<string, { is_online?: boolean }>();
      if (userIdsArray.length > 0) {
        const { data: partnersData } = await supabase
          .from('partners')
          .select('id, is_online')
          .in('id', userIdsArray);
        (partnersData || []).forEach((p) => partnersMap.set(p.id, { is_online: p.is_online }));
      }

      // 팀 정보 배치 조회 (N+1 쿼리 방지)
      const teamInfoMap = await getCollaborationTeamInfoBatch(
        basicCollabList.map(c => ({ id: c.id, createdBy: c.createdBy || '' }))
      );

      // 협업에 멤버 정보 enrichment + team 정보 추가 + isHiddenInManage 추가
      return basicCollabList.map((collab) => {
        const members = membersByCollab.get(collab.id) || [];
        const enrichedMembers = members.map((m) => {
          const displayInfo = displayInfoMap.get(m.user_id);
          const partnerInfo = partnersMap.get(m.user_id);

          return {
            id: m.id,
            collaborationId: m.collaboration_id,
            userId: m.user_id,
            position: m.position,
            status: m.status,
            isLeader: m.is_leader,
            canInvite: m.can_invite || false,
            canEdit: m.can_edit || false,
            joinedDate: m.joined_date || m.created_at,
            name: displayInfo?.name || '사용자',
            activityField: displayInfo?.activityField || m.position || '',
            profileImageUrl: displayInfo?.avatar || '',
            isOnline: partnerInfo?.is_online || false,
          };
        });

        // 배치로 조회한 팀 정보 사용
        const team = teamInfoMap.get(collab.id) || {
          leaderId: collab.createdBy || '',
          leaderName: '',
          leaderAvatar: '',
          leaderField: '',
          totalMembers: 1,
          members: [],
        };

        return {
          ...collab,
          members: enrichedMembers,
          team,
          isHiddenInManage: hiddenByCollabMap.get(collab.id) ?? false,
        };
      });
    },
    enabled: activeTab === 'projects',
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  // ==================== 초대·지원 탭 ====================

  // 보낸 지원 - 프로젝트
  const sentProjectAppsQuery = useQuery<ProjectApplication[]>({
    queryKey: ['manage-all', 'sent-project-applications'],
    queryFn: async () => {
      return await getMyApplications(true);
    },
    enabled: activeTab === 'invitations',
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  // 보낸 지원 - 협업
  const sentCollabAppsQuery = useQuery<CollaborationApplication[]>({
    queryKey: ['manage-all', 'sent-collab-applications'],
    queryFn: async () => {
      return await getMyCollaborationApplications(true);
    },
    enabled: activeTab === 'invitations',
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  // 받은 지원 - 프로젝트
  const receivedProjectAppsQuery = useQuery<ProjectApplication[]>({
    queryKey: ['manage-all', 'received-project-applications'],
    queryFn: async () => {
      return await getReceivedApplications(true);
    },
    enabled: activeTab === 'invitations',
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  // 받은 지원 - 협업
  const receivedCollabAppsQuery = useQuery<CollaborationApplication[]>({
    queryKey: ['manage-all', 'received-collab-applications'],
    queryFn: async () => {
      return await getReceivedCollaborationApplications(true);
    },
    enabled: activeTab === 'invitations',
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  // 받은 초대 (협업) - 레거시
  const invitationsQuery = useQuery<CollaborationInvitation[]>({
    queryKey: ['manage-all', 'invitations'],
    queryFn: async () => {
      return await getReceivedCollabInvitations(true);
    },
    enabled: activeTab === 'invitations',
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  // ==================== 통합 초대 시스템 (새 invitations 테이블) ====================

  // 보낸 초대 (통합: 프로젝트 + 협업)
  const unifiedSentInvitationsQuery = useQuery<Invitation[]>({
    queryKey: ['manage-all', 'unified-sent-invitations'],
    queryFn: async () => {
      return await getUnifiedSentInvitations(undefined, true); // 타입 필터 없이 전체, 숨긴 항목 포함
    },
    enabled: activeTab === 'invitations',
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  // 받은 초대 (통합: 프로젝트 + 협업)
  const unifiedReceivedInvitationsQuery = useQuery<Invitation[]>({
    queryKey: ['manage-all', 'unified-received-invitations'],
    queryFn: async () => {
      return await getUnifiedReceivedInvitations(undefined, true); // 타입 필터 없이 전체, 숨긴 항목 포함
    },
    enabled: activeTab === 'invitations',
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  // ==================== 대화 요청 ====================

  // 보낸 대화 요청
  const sentTalkRequestsQuery = useQuery<TalkRequest[]>({
    queryKey: ['manage-all', 'sent-talk-requests'],
    queryFn: async () => {
      return await getSentTalkRequests(true); // 숨긴 항목 포함
    },
    enabled: activeTab === 'invitations',
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  // 받은 대화 요청
  const receivedTalkRequestsQuery = useQuery<TalkRequest[]>({
    queryKey: ['manage-all', 'received-talk-requests'],
    queryFn: async () => {
      return await getReceivedTalkRequests(true); // 숨긴 항목 포함
    },
    enabled: activeTab === 'invitations',
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  // ==================== 찜 탭 ====================

  // 찜한 프로젝트
  const likedProjectsQuery = useQuery<Project[]>({
    queryKey: ['manage-all', 'liked-projects', likedProjectIds],
    queryFn: async () => {
      if (likedProjectIds.length === 0) return [];
      return await getProjectsByIds(likedProjectIds);
    },
    enabled: activeTab === 'likes' && likedProjectIds.length > 0,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  // 찜한 협업
  const likedCollaborationsQuery = useQuery<Collaboration[]>({
    queryKey: ['manage-all', 'liked-collaborations', likedCollaborationIds],
    queryFn: async () => {
      if (likedCollaborationIds.length === 0) return [];
      return await getCollaborationsByIds(likedCollaborationIds);
    },
    enabled: activeTab === 'likes' && likedCollaborationIds.length > 0,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  // ==================== 파트너십 (신규) ====================

  // 보낸 파트너십 문의 (파트너용)
  const sentPartnershipInquiriesQuery = useQuery({
    queryKey: ['manage-all', 'sent-partnership-inquiries'],
    queryFn: async () => {
      if (!userId) return [];
      return await partnershipService.getSentPartnershipInquiries(userId);
    },
    // projects 탭에서 필터로 접근하지만, activeTab은 projects일 것임 (ManageAll 로직상).
    // 하지만 hook 호출부에서 activeTab이 언제나 'projects'일 수 있으므로, 굳이 막지 않고 fetch하거나
    // ManageAll에서 activeTab이 'projects'일 때 partnership 필터가 활성화된 경우에만 호출하도록 할 수도 있음.
    // 여기서는 activeTab이 'projects'일 때 일단 허용 (또는 별도 activeTab state 전달)
    // 현재 activeTab state는 string이므로 유연하게.
    enabled: !!userId,
    staleTime: 60_000,
  });

  // 받은 파트너십 문의 (브랜드용)
  const receivedPartnershipInquiriesQuery = useQuery({
    queryKey: ['manage-all', 'received-partnership-inquiries'],
    queryFn: async () => {
      if (!userId) return [];
      return await partnershipService.getReceivedPartnershipInquiries(userId);
    },
    enabled: !!userId,
    staleTime: 60_000,
  });


  // ==================== Mutations ====================

  // 프로젝트 상태 변경
  const updateProjectStatusMutation = useMutation({
    mutationFn: async ({ projectId, status }: { projectId: string; status: ProjectStatus }) => {
      await updateProjectStatus(projectId, status);
    },
    onMutate: async ({ projectId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['manage-all', 'projects'] });
      const previous = queryClient.getQueryData<Project[]>(['manage-all', 'projects']);

      if (previous) {
        // Optimistically update status
        queryClient.setQueryData<Project[]>(
          ['manage-all', 'projects'],
          previous.map((project) =>
            project.id === projectId ? { ...project, status } : project
          ),
        );
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(['manage-all', 'projects'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'projects'] });
      // ArchivePage 캐시 무효화 (완료/취소/보류 상태 변경 시 양쪽 동기화)
      queryClient.invalidateQueries({ queryKey: ['archive', 'projects'] });
      queryClient.invalidateQueries({ queryKey: ['profile', 'archiveCount'] });
    },
  });

  // 협업 상태 변경
  const updateCollaborationStatusMutation = useMutation({
    mutationFn: async ({ collaborationId, status }: { collaborationId: string; status: ProjectStatus }) => {
      await updateCollaborationStatus(collaborationId, status);
    },
    onMutate: async ({ collaborationId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['manage-all', 'collaborations'] });
      const previous = queryClient.getQueryData<Collaboration[]>(['manage-all', 'collaborations']);

      if (previous) {
        queryClient.setQueryData<Collaboration[]>(
          ['manage-all', 'collaborations'],
          previous.map((collab) =>
            collab.id === collaborationId ? { ...collab, status } : collab
          ),
        );
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['manage-all', 'collaborations'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'collaborations'] });
      // ArchivePage 캐시 무효화 (완료/취소/보류 상태 변경 시 양쪽 동기화)
      queryClient.invalidateQueries({ queryKey: ['archive', 'collaborations'] });
      queryClient.invalidateQueries({ queryKey: ['profile', 'archiveCount'] });
    },
  });

  // 초대 숨기기/해제 (레거시 - 협업만)
  const hideInvitationsMutation = useMutation({
    mutationFn: ({ ids, role }: { ids: string[]; role: 'inviter' | 'invitee' }) => hideCollabInvitations(ids, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'invitations'] });
    },
  });

  const unhideInvitationsMutation = useMutation({
    mutationFn: ({ ids, role }: { ids: string[]; role: 'inviter' | 'invitee' }) => unhideCollabInvitations(ids, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'invitations'] });
    },
  });

  // 통합 초대 숨기기/해제 (새 시스템)
  const hideUnifiedInvitationsMutation = useMutation({
    mutationFn: ({ ids, role }: { ids: string[]; role: 'sender' | 'receiver' }) => hideUnifiedInvitations(ids, role),
    onMutate: async ({ ids, role }) => {
      await queryClient.cancelQueries({ queryKey: ['manage-all', 'unified-sent-invitations'] });
      await queryClient.cancelQueries({ queryKey: ['manage-all', 'unified-received-invitations'] });

      const prevSent = queryClient.getQueryData<Invitation[]>(['manage-all', 'unified-sent-invitations']);
      const prevReceived = queryClient.getQueryData<Invitation[]>(['manage-all', 'unified-received-invitations']);

      const updateItems = (items?: Invitation[]) =>
        items?.map(item =>
          ids.includes(item.id)
            ? { ...item, [role === 'sender' ? 'isHiddenBySender' : 'isHiddenByReceiver']: true }
            : item
        );

      if (prevSent) {
        queryClient.setQueryData(['manage-all', 'unified-sent-invitations'], updateItems(prevSent));
      }
      if (prevReceived) {
        queryClient.setQueryData(['manage-all', 'unified-received-invitations'], updateItems(prevReceived));
      }

      return { prevSent, prevReceived };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevSent) queryClient.setQueryData(['manage-all', 'unified-sent-invitations'], context.prevSent);
      if (context?.prevReceived) queryClient.setQueryData(['manage-all', 'unified-received-invitations'], context.prevReceived);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'unified-sent-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'unified-received-invitations'] });
    },
  });

  const unhideUnifiedInvitationsMutation = useMutation({
    mutationFn: ({ ids, role }: { ids: string[]; role: 'sender' | 'receiver' }) => unhideUnifiedInvitations(ids, role),
    onMutate: async ({ ids, role }) => {
      await queryClient.cancelQueries({ queryKey: ['manage-all', 'unified-sent-invitations'] });
      await queryClient.cancelQueries({ queryKey: ['manage-all', 'unified-received-invitations'] });

      const prevSent = queryClient.getQueryData<Invitation[]>(['manage-all', 'unified-sent-invitations']);
      const prevReceived = queryClient.getQueryData<Invitation[]>(['manage-all', 'unified-received-invitations']);

      const updateItems = (items?: Invitation[]) =>
        items?.map(item =>
          ids.includes(item.id)
            ? { ...item, [role === 'sender' ? 'isHiddenBySender' : 'isHiddenByReceiver']: false }
            : item
        );

      if (prevSent) {
        queryClient.setQueryData(['manage-all', 'unified-sent-invitations'], updateItems(prevSent));
      }
      if (prevReceived) {
        queryClient.setQueryData(['manage-all', 'unified-received-invitations'], updateItems(prevReceived));
      }

      return { prevSent, prevReceived };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevSent) queryClient.setQueryData(['manage-all', 'unified-sent-invitations'], context.prevSent);
      if (context?.prevReceived) queryClient.setQueryData(['manage-all', 'unified-received-invitations'], context.prevReceived);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'unified-sent-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'unified-received-invitations'] });
    },
  });

  // 프로젝트 지원 숨기기/해제
  const hideProjectAppsMutation = useMutation({
    mutationFn: ({ ids, role }: { ids: string[]; role: 'applicant' | 'reviewer' }) => hideApplications(ids, role),
    onMutate: async ({ ids, role }) => {
      await queryClient.cancelQueries({ queryKey: ['manage-all', 'sent-project-applications'] });
      await queryClient.cancelQueries({ queryKey: ['manage-all', 'received-project-applications'] });

      const prevSent = queryClient.getQueryData<ProjectApplication[]>(['manage-all', 'sent-project-applications']);
      const prevReceived = queryClient.getQueryData<ProjectApplication[]>(['manage-all', 'received-project-applications']);

      const updateItems = (items?: ProjectApplication[]) =>
        items?.map(item =>
          ids.includes(item.id)
            ? { ...item, [role === 'applicant' ? 'isHiddenByApplicant' : 'isHiddenByReviewer']: true }
            : item
        );

      if (prevSent) {
        queryClient.setQueryData(['manage-all', 'sent-project-applications'], updateItems(prevSent));
      }
      if (prevReceived) {
        queryClient.setQueryData(['manage-all', 'received-project-applications'], updateItems(prevReceived));
      }

      return { prevSent, prevReceived };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevSent) queryClient.setQueryData(['manage-all', 'sent-project-applications'], context.prevSent);
      if (context?.prevReceived) queryClient.setQueryData(['manage-all', 'received-project-applications'], context.prevReceived);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'sent-project-applications'] });
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'received-project-applications'] });
    },
  });

  const unhideProjectAppsMutation = useMutation({
    mutationFn: ({ ids, role }: { ids: string[]; role: 'applicant' | 'reviewer' }) => unhideApplications(ids, role),
    onMutate: async ({ ids, role }) => {
      await queryClient.cancelQueries({ queryKey: ['manage-all', 'sent-project-applications'] });
      await queryClient.cancelQueries({ queryKey: ['manage-all', 'received-project-applications'] });

      const prevSent = queryClient.getQueryData<ProjectApplication[]>(['manage-all', 'sent-project-applications']);
      const prevReceived = queryClient.getQueryData<ProjectApplication[]>(['manage-all', 'received-project-applications']);

      const updateItems = (items?: ProjectApplication[]) =>
        items?.map(item =>
          ids.includes(item.id)
            ? { ...item, [role === 'applicant' ? 'isHiddenByApplicant' : 'isHiddenByReviewer']: false }
            : item
        );

      if (prevSent) {
        queryClient.setQueryData(['manage-all', 'sent-project-applications'], updateItems(prevSent));
      }
      if (prevReceived) {
        queryClient.setQueryData(['manage-all', 'received-project-applications'], updateItems(prevReceived));
      }

      return { prevSent, prevReceived };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevSent) queryClient.setQueryData(['manage-all', 'sent-project-applications'], context.prevSent);
      if (context?.prevReceived) queryClient.setQueryData(['manage-all', 'received-project-applications'], context.prevReceived);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'sent-project-applications'] });
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'received-project-applications'] });
    },
  });

  // 협업 지원 숨기기/해제
  const hideCollabAppsMutation = useMutation({
    mutationFn: ({ ids, role }: { ids: string[]; role: 'applicant' | 'reviewer' }) =>
      hideCollaborationApplications(ids, role),
    onMutate: async ({ ids, role }) => {
      await queryClient.cancelQueries({ queryKey: ['manage-all', 'sent-collab-applications'] });
      await queryClient.cancelQueries({ queryKey: ['manage-all', 'received-collab-applications'] });

      const prevSent = queryClient.getQueryData<CollaborationApplication[]>(['manage-all', 'sent-collab-applications']);
      const prevReceived = queryClient.getQueryData<CollaborationApplication[]>(['manage-all', 'received-collab-applications']);

      const updateItems = (items?: CollaborationApplication[]) =>
        items?.map(item =>
          ids.includes(item.id)
            ? { ...item, [role === 'applicant' ? 'isHiddenByApplicant' : 'isHiddenByReviewer']: true }
            : item
        );

      if (prevSent) {
        queryClient.setQueryData(['manage-all', 'sent-collab-applications'], updateItems(prevSent));
      }
      if (prevReceived) {
        queryClient.setQueryData(['manage-all', 'received-collab-applications'], updateItems(prevReceived));
      }

      return { prevSent, prevReceived };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevSent) queryClient.setQueryData(['manage-all', 'sent-collab-applications'], context.prevSent);
      if (context?.prevReceived) queryClient.setQueryData(['manage-all', 'received-collab-applications'], context.prevReceived);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'sent-collab-applications'] });
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'received-collab-applications'] });
    },
  });

  const unhideCollabAppsMutation = useMutation({
    mutationFn: ({ ids, role }: { ids: string[]; role: 'applicant' | 'reviewer' }) =>
      unhideCollaborationApplications(ids, role),
    onMutate: async ({ ids, role }) => {
      await queryClient.cancelQueries({ queryKey: ['manage-all', 'sent-collab-applications'] });
      await queryClient.cancelQueries({ queryKey: ['manage-all', 'received-collab-applications'] });

      const prevSent = queryClient.getQueryData<CollaborationApplication[]>(['manage-all', 'sent-collab-applications']);
      const prevReceived = queryClient.getQueryData<CollaborationApplication[]>(['manage-all', 'received-collab-applications']);

      const updateItems = (items?: CollaborationApplication[]) =>
        items?.map(item =>
          ids.includes(item.id)
            ? { ...item, [role === 'applicant' ? 'isHiddenByApplicant' : 'isHiddenByReviewer']: false }
            : item
        );

      if (prevSent) {
        queryClient.setQueryData(['manage-all', 'sent-collab-applications'], updateItems(prevSent));
      }
      if (prevReceived) {
        queryClient.setQueryData(['manage-all', 'received-collab-applications'], updateItems(prevReceived));
      }

      return { prevSent, prevReceived };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevSent) queryClient.setQueryData(['manage-all', 'sent-collab-applications'], context.prevSent);
      if (context?.prevReceived) queryClient.setQueryData(['manage-all', 'received-collab-applications'], context.prevReceived);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'sent-collab-applications'] });
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'received-collab-applications'] });
    },
  });

  // 대화 요청 숨기기/해제
  const hideTalkRequestsMutation = useMutation({
    mutationFn: ({ ids, role }: { ids: string[]; role: 'sender' | 'receiver' }) =>
      hideTalkRequests(ids, role),
    onMutate: async ({ ids, role }) => {
      await queryClient.cancelQueries({ queryKey: ['manage-all', 'sent-talk-requests'] });
      await queryClient.cancelQueries({ queryKey: ['manage-all', 'received-talk-requests'] });

      const prevSent = queryClient.getQueryData<TalkRequest[]>(['manage-all', 'sent-talk-requests']);
      const prevReceived = queryClient.getQueryData<TalkRequest[]>(['manage-all', 'received-talk-requests']);

      const updateItems = (items?: TalkRequest[]) =>
        items?.map(item =>
          ids.includes(item.id)
            ? { ...item, [role === 'sender' ? 'isHiddenBySender' : 'isHiddenByReceiver']: true }
            : item
        );

      if (prevSent) {
        queryClient.setQueryData(['manage-all', 'sent-talk-requests'], updateItems(prevSent));
      }
      if (prevReceived) {
        queryClient.setQueryData(['manage-all', 'received-talk-requests'], updateItems(prevReceived));
      }

      return { prevSent, prevReceived };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevSent) queryClient.setQueryData(['manage-all', 'sent-talk-requests'], context.prevSent);
      if (context?.prevReceived) queryClient.setQueryData(['manage-all', 'received-talk-requests'], context.prevReceived);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'sent-talk-requests'] });
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'received-talk-requests'] });
    },
  });

  const unhideTalkRequestsMutation = useMutation({
    mutationFn: ({ ids, role }: { ids: string[]; role: 'sender' | 'receiver' }) =>
      unhideTalkRequests(ids, role),
    onMutate: async ({ ids, role }) => {
      await queryClient.cancelQueries({ queryKey: ['manage-all', 'sent-talk-requests'] });
      await queryClient.cancelQueries({ queryKey: ['manage-all', 'received-talk-requests'] });

      const prevSent = queryClient.getQueryData<TalkRequest[]>(['manage-all', 'sent-talk-requests']);
      const prevReceived = queryClient.getQueryData<TalkRequest[]>(['manage-all', 'received-talk-requests']);

      const updateItems = (items?: TalkRequest[]) =>
        items?.map(item =>
          ids.includes(item.id)
            ? { ...item, [role === 'sender' ? 'isHiddenBySender' : 'isHiddenByReceiver']: false }
            : item
        );

      if (prevSent) {
        queryClient.setQueryData(['manage-all', 'sent-talk-requests'], updateItems(prevSent));
      }
      if (prevReceived) {
        queryClient.setQueryData(['manage-all', 'received-talk-requests'], updateItems(prevReceived));
      }

      return { prevSent, prevReceived };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevSent) queryClient.setQueryData(['manage-all', 'sent-talk-requests'], context.prevSent);
      if (context?.prevReceived) queryClient.setQueryData(['manage-all', 'received-talk-requests'], context.prevReceived);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'sent-talk-requests'] });
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'received-talk-requests'] });
    },
  });

  // 대화 요청 응답 (수락/거절)
  const respondToTalkRequestMutation = useMutation({
    mutationFn: async ({
      requestId,
      status,
      reason,
    }: {
      requestId: string;
      status: 'accepted' | 'rejected';
      reason?: string;
    }) => {
      return await respondToTalkRequest(requestId, status, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'received-talk-requests'] });
    },
  });

  // 대화 요청 철회
  const withdrawTalkRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      await withdrawTalkRequest(requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'sent-talk-requests'] });
    },
  });

  // 파트너십 상태 변경
  const updatePartnershipStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await partnershipService.updatePartnershipStatus(id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'sent-partnership-inquiries'] });
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'received-partnership-inquiries'] });
    },
  });

  // 파트너십 수락/거절/보류 (새 API - 채팅방 ID 반환)
  const respondToPartnershipInquiryMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      responseMessage,
    }: {
      id: string;
      status: 'accepted' | 'rejected' | 'on_hold';
      responseMessage?: string;
    }) => {
      return await partnershipService.respondToPartnershipInquiry(id, status, responseMessage);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'sent-partnership-inquiries'] });
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'received-partnership-inquiries'] });
    },
  });

  // 프로젝트 숨김/해제 (ManageAll 전용, 개인별)
  const toggleProjectHiddenMutation = useMutation({
    mutationFn: ({ projectId, isHidden }: { projectId: string; isHidden: boolean }) =>
      toggleProjectHiddenInManage(projectId, isHidden),
    onMutate: async ({ projectId, isHidden }) => {
      await queryClient.cancelQueries({ queryKey: ['manage-all', 'projects'] });
      const prev = queryClient.getQueryData<(Project & { isHiddenInManage?: boolean })[]>(['manage-all', 'projects']);
      if (prev) {
        queryClient.setQueryData(
          ['manage-all', 'projects'],
          prev.map(p => p.id === projectId ? { ...p, isHiddenInManage: isHidden } : p)
        );
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['manage-all', 'projects'], context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'projects'] });
    },
  });

  // 협업 숨김/해제 (ManageAll 전용, 개인별)
  const toggleCollaborationHiddenMutation = useMutation({
    mutationFn: ({ collaborationId, isHidden }: { collaborationId: string; isHidden: boolean }) =>
      toggleCollaborationHiddenInManage(collaborationId, isHidden),
    onMutate: async ({ collaborationId, isHidden }) => {
      await queryClient.cancelQueries({ queryKey: ['manage-all', 'collaborations'] });
      const prev = queryClient.getQueryData<(Collaboration & { isHiddenInManage?: boolean })[]>(['manage-all', 'collaborations']);
      if (prev) {
        queryClient.setQueryData(
          ['manage-all', 'collaborations'],
          prev.map(c => c.id === collaborationId ? { ...c, isHiddenInManage: isHidden } : c)
        );
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['manage-all', 'collaborations'], context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'collaborations'] });
    },
  });
  // ==================== 로딩 상태 계산 ====================

  const isLoadingProjects = activeTab === 'projects' && (projectsQuery.isLoading || collaborationsQuery.isLoading);

  const isLoadingInvitations =
    activeTab === 'invitations' &&
    (sentProjectAppsQuery.isLoading ||
      sentCollabAppsQuery.isLoading ||
      receivedProjectAppsQuery.isLoading ||
      receivedCollabAppsQuery.isLoading ||
      invitationsQuery.isLoading ||
      unifiedSentInvitationsQuery.isLoading ||
      unifiedReceivedInvitationsQuery.isLoading ||
      sentTalkRequestsQuery.isLoading ||
      receivedTalkRequestsQuery.isLoading);

  const isLoadingLikes = activeTab === 'likes' && (likedProjectsQuery.isLoading || likedCollaborationsQuery.isLoading);

  const isFetching =
    projectsQuery.isFetching ||
    collaborationsQuery.isFetching ||
    sentProjectAppsQuery.isFetching ||
    sentCollabAppsQuery.isFetching ||
    receivedProjectAppsQuery.isFetching ||
    receivedCollabAppsQuery.isFetching ||
    invitationsQuery.isFetching ||
    unifiedSentInvitationsQuery.isFetching ||
    unifiedReceivedInvitationsQuery.isFetching ||
    sentTalkRequestsQuery.isFetching ||
    receivedTalkRequestsQuery.isFetching ||
    likedProjectsQuery.isFetching ||
    likedCollaborationsQuery.isFetching ||
    sentPartnershipInquiriesQuery.isFetching ||
    receivedPartnershipInquiriesQuery.isFetching;

  return {
    // 프로젝트·협업 탭 데이터
    projects: projectsQuery.data ?? [],
    collaborations: collaborationsQuery.data ?? [],

    // 지원 탭 데이터
    sentProjectApplications: sentProjectAppsQuery.data ?? [],
    sentCollabApplications: sentCollabAppsQuery.data ?? [],
    receivedProjectApplications: receivedProjectAppsQuery.data ?? [],
    receivedCollabApplications: receivedCollabAppsQuery.data ?? [],
    invitations: invitationsQuery.data ?? [], // 레거시 협업 초대

    // 통합 초대 데이터 (새 시스템)
    unifiedSentInvitations: unifiedSentInvitationsQuery.data ?? [],
    unifiedReceivedInvitations: unifiedReceivedInvitationsQuery.data ?? [],

    // 대화 요청 데이터
    sentTalkRequests: sentTalkRequestsQuery.data ?? [],
    receivedTalkRequests: receivedTalkRequestsQuery.data ?? [],

    // 파트너십 데이터
    sentPartnershipInquiries: sentPartnershipInquiriesQuery.data ?? [],
    receivedPartnershipInquiries: receivedPartnershipInquiriesQuery.data ?? [],

    // 찜 탭 데이터
    likedProjects: likedProjectsQuery.data ?? [],
    likedCollaborations: likedCollaborationsQuery.data ?? [],

    // 로딩 상태
    isLoading: isLoadingProjects || isLoadingInvitations || isLoadingLikes,
    isFetching,

    // Mutations
    updateProjectStatus: updateProjectStatusMutation.mutate,
    updateCollaborationStatus: updateCollaborationStatusMutation.mutate,
    hideInvitations: hideInvitationsMutation.mutate,
    unhideInvitations: unhideInvitationsMutation.mutate,
    hideUnifiedInvitations: hideUnifiedInvitationsMutation.mutate,
    unhideUnifiedInvitations: unhideUnifiedInvitationsMutation.mutate,
    hideProjectApps: hideProjectAppsMutation.mutate,
    unhideProjectApps: unhideProjectAppsMutation.mutate,
    hideCollabApps: hideCollabAppsMutation.mutate,
    unhideCollabApps: unhideCollabAppsMutation.mutate,
    hideTalkRequests: hideTalkRequestsMutation.mutate,
    unhideTalkRequests: unhideTalkRequestsMutation.mutate,
    respondToTalkRequest: respondToTalkRequestMutation.mutateAsync,
    withdrawTalkRequest: withdrawTalkRequestMutation.mutateAsync,
    updatePartnershipStatus: updatePartnershipStatusMutation.mutate,
    respondToPartnershipInquiry: respondToPartnershipInquiryMutation.mutateAsync,
    toggleProjectHidden: toggleProjectHiddenMutation.mutate,
    toggleCollaborationHidden: toggleCollaborationHiddenMutation.mutate,

    // Refetch
    refetchAll: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-all'] });
    },
  };
}

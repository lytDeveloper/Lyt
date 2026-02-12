import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Typography, Skeleton, useTheme } from '@mui/material';
import { LightningLoader } from '../../components/common';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Header, { HEADER_HEIGHT } from '../../components/common/Header';
import BottomNavigationBar, { BOTTOM_NAV_HEIGHT } from '../../components/navigation/BottomNavigationBar';
import TabBarFill from '../../components/common/TabBarFill';
import type { TabItem } from '../../components/common/TabBar';
import { useManageAll, type ManageTab } from '../../hooks/useManageAll';
import { useProfileStore } from '../../stores/profileStore';
import { useBrandApprovalStatus } from '../../hooks/useBrandApprovalStatus';
import PendingApprovalNotice from '../../components/common/PendingApprovalNotice';
import { useExploreStore } from '../../stores/exploreStore';

// 탭 컴포넌트
import ProjectsCollabsTab from './tabs/ProjectsCollabsTab';
import InvitationsTab from './tabs/InvitationsTab';
import LikesTab from './tabs/LikesTab';

// 모달 컴포넌트
import type { PartnershipData } from '../../components/manage/PartnershipCard';
import ActionSuccessModal from '../../components/notification/ActionSuccessModal';
import HideConfirmDialog from '../../components/manage/HideConfirmDialog';
import StatusChangeConfirmDialog from '../../components/manage/StatusChangeConfirmDialog';
import ApplicationDetailModal from '../../components/manage/ApplicationDetailModal';
import RejectReasonModal from '../../components/manage/RejectReasonModal';
import FileUploadModal from '../../components/common/FileUploadModal';
import InvitationDetailModal from '../../components/common/InvitationDetailModal';
import TalkRequestDetailModal from '../../components/manage/TalkRequestDetailModal';
import PartnershipDetailModal from '../../components/manage/PartnershipDetailModal';
import PartnershipResponseModal from '../../components/manage/PartnershipResponseModal';
import type { TalkRequest } from '../../types/talkRequest.types';
import type { Invitation } from '../../types/invitation.types';

// 서비스
import { messageService } from '../../services/messageService';
import { fileUploadService } from '../../services/fileUploadService';
import { getProfileDisplay } from '../../services/profileDisplayService';
import { supabase } from '../../lib/supabase';
import {
  acceptApplication,
  rejectApplicationWithReason,
  cancelApplication,
  hasProjectRelatedMagazines,
  deleteProject,
  markApplicationAsViewed,
  type Project,
  type ProjectApplication,
} from '../../services/projectService';
import type { ProjectStatus } from '../../types/exploreTypes';
import {
  cancelCollaborationApplication,
  respondToCollaborationApplication,
  deleteCollaboration,
  markCollaborationApplicationAsViewed,
  type Collaboration,
  type CollaborationApplication,
} from '../../services/collaborationService';
import {
  respondToInvitation,
  withdrawInvitation,
  askQuestionOnInvitation,
  answerQuestionOnInvitation,
  markInvitationAsViewed,
} from '../../services/invitationService';
import { markTalkRequestAsViewed } from '../../services/talkRequestService';
import { toast } from 'react-toastify';

const MANAGE_TABS: TabItem<ManageTab>[] = [
  { key: 'projects', label: '프로젝트·협업' },
  { key: 'invitations', label: '초대·지원' },
  { key: 'likes', label: '찜' },
];

export default function ManageAll() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userId, type: userProfileType } = useProfileStore();
  const { approvalStatus, isRestricted } = useBrandApprovalStatus();
  const queryClient = useQueryClient();

  // 탭 상태
  const [activeTab, setActiveTab] = useState<ManageTab>('projects');
  const [projectsFilter, setProjectsFilter] = useState<'project' | 'collaboration' | 'partnership'>('project');
  const [invitationFilter, setInvitationFilter] = useState<'received' | 'sent'>('received');
  const [likesFilter, setLikesFilter] = useState<'project' | 'collaboration'>('project');

  // 찜한 항목 ID
  const { likedProjectIds, likedCollaborationIds } = useExploreStore();

  // 공통 정렬 함수
  const toDateValue = (item: any) => {
    const value =
      item?.updatedAt || item?.updated_at || item?.createdAt || item?.created_at ||
      item?.sentAt || item?.sent_at || item?.sentDate ||
      item?.appliedAt || item?.applied_at || item?.appliedDate ||
      item?.created || item?.createdDate || item?.created_date;
    if (!value) return 0;
    const ts = new Date(value as string).getTime();
    return Number.isFinite(ts) ? ts : 0;
  };
  const sortByDateDesc = <T,>(items: T[]) => [...items].sort((a, b) => toDateValue(b) - toDateValue(a));

  // 숨긴 항목 토글 상태
  const [showHiddenSentApps, setShowHiddenSentApps] = useState(false);
  const [showHiddenReceivedApps, setShowHiddenReceivedApps] = useState(false);
  const [showHiddenSentInvitations, setShowHiddenSentInvitations] = useState(false);
  const [showHiddenReceivedInvitations, setShowHiddenReceivedInvitations] = useState(false);
  const [showHiddenSentTalkRequests, setShowHiddenSentTalkRequests] = useState(false);
  const [showHiddenReceivedTalkRequests, setShowHiddenReceivedTalkRequests] = useState(false);
  const [showHiddenPartnership, setShowHiddenPartnership] = useState(false);
  const [showHiddenProjects, setShowHiddenProjects] = useState(false);
  const [showHiddenCollaborations, setShowHiddenCollaborations] = useState(false);

  // 더보기 상태
  const [showAllReceivedTalkRequests, setShowAllReceivedTalkRequests] = useState(false);
  const [showAllReceivedApps, setShowAllReceivedApps] = useState(false);
  const [showAllReceivedInvitations, setShowAllReceivedInvitations] = useState(false);
  const [showAllSentTalkRequests, setShowAllSentTalkRequests] = useState(false);
  const [showAllSentApps, setShowAllSentApps] = useState(false);
  const [showAllSentInvitations, setShowAllSentInvitations] = useState(false);

  // 숨기기 확인 다이얼로그
  const [hideConfirmOpen, setHideConfirmOpen] = useState(false);
  const [hideConfirmConfig, setHideConfirmConfig] = useState<{
    type: string;
    action: 'hide' | 'unhide';
    count: number;
    onConfirm: () => void;
  } | null>(null);

  // 모달 상태
  const [selectedApplication, setSelectedApplication] = useState<ProjectApplication | CollaborationApplication | null>(null);
  const [applicationModalOpen, setApplicationModalOpen] = useState(false);
  const [applicationModalType, setApplicationModalType] = useState<'project' | 'collaboration'>('project');
  const [applicationModalMode, setApplicationModalMode] = useState<'sent' | 'received'>('sent');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectModalType, setRejectModalType] = useState<'application' | 'invitation'>('application');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [invitationModalOpen, setInvitationModalOpen] = useState(false);
  const [invitationModalMode, setInvitationModalMode] = useState<'sent' | 'received'>('sent');
  const [selectedTalkRequest, setSelectedTalkRequest] = useState<TalkRequest | null>(null);
  const [talkRequestModalOpen, setTalkRequestModalOpen] = useState(false);
  const [talkRequestModalMode, setTalkRequestModalMode] = useState<'sent' | 'received'>('sent');
  const [selectedPartnership, setSelectedPartnership] = useState<PartnershipData | null>(null);
  const [partnershipModalOpen, setPartnershipModalOpen] = useState(false);
  const [partnershipResponseModalOpen, setPartnershipResponseModalOpen] = useState(false);
  const [partnershipResponseAction, setPartnershipResponseAction] = useState<'accepted' | 'rejected' | 'on_hold'>('accepted');
  const [partnershipResponseTarget, setPartnershipResponseTarget] = useState<PartnershipData | null>(null);
  const [actionSuccessModalOpen, setActionSuccessModalOpen] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');
  const [fileUploadModalOpen, setFileUploadModalOpen] = useState(false);
  const [selectedItemForFile, setSelectedItemForFile] = useState<Project | Collaboration | null>(null);
  const [selectedItemTypeForFile, setSelectedItemTypeForFile] = useState<'project' | 'collaboration'>('project');
  const [isUploading, setIsUploading] = useState(false);
  const [statusChangeDialog, setStatusChangeDialog] = useState<{
    open: boolean;
    item: Project | Collaboration | null;
    itemType: 'project' | 'collaboration';
    newStatus: ProjectStatus | null;
  }>({ open: false, item: null, itemType: 'project', newStatus: null });
  const [exitingItemIds, setExitingItemIds] = useState<Set<string>>(new Set());
  const [locallyViewedIds, setLocallyViewedIds] = useState<Set<string>>(new Set());

  // 파트너십 숨김 ID 상태 (로컬 스토리지 연동)
  const [hiddenPartnershipIds, setHiddenPartnershipIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('user_manage_hidden_partnerships');
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
    } catch { return new Set(); }
  });

  // 데이터 페칭
  const {
    projects, collaborations,
    sentProjectApplications: allSentProjectApps,
    sentCollabApplications: allSentCollabApps,
    receivedProjectApplications: allReceivedProjectApps,
    receivedCollabApplications: allReceivedCollabApps,
    unifiedSentInvitations: allSentInvitations,
    unifiedReceivedInvitations: allReceivedInvitations,
    sentTalkRequests: allSentTalkRequests,
    receivedTalkRequests: allReceivedTalkRequests,
    sentPartnershipInquiries, receivedPartnershipInquiries,
    hideTalkRequests: hideTalkRequestsMutation,
    unhideTalkRequests: unhideTalkRequestsMutation,
    respondToTalkRequest: respondToTalkRequestMutation,
    withdrawTalkRequest: withdrawTalkRequestMutation,
    respondToPartnershipInquiry,
    likedProjects, likedCollaborations: likedCollabs,
    isLoading, isFetching,
    updateProjectStatus, updateCollaborationStatus,
    hideProjectApps, unhideProjectApps,
    hideCollabApps, unhideCollabApps,
    hideUnifiedInvitations, unhideUnifiedInvitations,
    toggleProjectHidden, toggleCollaborationHidden,
  } = useManageAll(activeTab, { likedProjectIds, likedCollaborationIds });

  const ARCHIVE_STATUSES = ['deleted', 'completed', 'cancelled', 'on_hold'];

  // 파생 데이터
  const visibleProjects = useMemo(() => {
    const filtered = projects.filter((p) => !ARCHIVE_STATUSES.includes(p.status));
    const hiddenFiltered = filtered.filter((p) => {
      const isHidden = (p as Project & { isHiddenInManage?: boolean }).isHiddenInManage ?? false;
      return showHiddenProjects ? isHidden : !isHidden;
    });
    return sortByDateDesc(hiddenFiltered);
  }, [projects, showHiddenProjects]);

  const visibleCollaborations = useMemo(() => {
    const filtered = collaborations.filter((c) => !ARCHIVE_STATUSES.includes(c.status));
    const hiddenFiltered = filtered.filter((c) => {
      const isHidden = (c as Collaboration & { isHiddenInManage?: boolean }).isHiddenInManage ?? false;
      return showHiddenCollaborations ? isHidden : !isHidden;
    });
    return sortByDateDesc(hiddenFiltered);
  }, [collaborations, showHiddenCollaborations]);

  const sentApplications = useMemo(() => {
    const merged = sortByDateDesc([
      ...allSentProjectApps.filter((a) => a.status !== 'withdrawn' && (showHiddenSentApps ? a.isHiddenByApplicant : !a.isHiddenByApplicant)),
      ...allSentCollabApps.filter((a) => a.status !== 'withdrawn' && (showHiddenSentApps ? a.isHiddenByApplicant : !a.isHiddenByApplicant)),
    ]);
    return { items: merged, total: merged.length };
  }, [allSentProjectApps, allSentCollabApps, showHiddenSentApps]);

  const receivedApplications = useMemo(() => {
    const merged = sortByDateDesc([
      ...allReceivedProjectApps.filter((a) => a.status !== 'withdrawn' && (showHiddenReceivedApps ? a.isHiddenByReviewer : !a.isHiddenByReviewer)),
      ...allReceivedCollabApps.filter((a) => a.status !== 'withdrawn' && (showHiddenReceivedApps ? a.isHiddenByReviewer : !a.isHiddenByReviewer)),
    ]);
    return { items: merged, total: merged.length };
  }, [allReceivedProjectApps, allReceivedCollabApps, showHiddenReceivedApps]);

  const sentInvitations = useMemo(
    () => sortByDateDesc(allSentInvitations.filter((i) => i.status !== 'withdrawn' && (showHiddenSentInvitations ? i.isHiddenBySender : !i.isHiddenBySender))),
    [allSentInvitations, showHiddenSentInvitations]
  );

  const receivedInvitations = useMemo(
    () => sortByDateDesc(allReceivedInvitations.filter((i) => i.status !== 'withdrawn' && (showHiddenReceivedInvitations ? i.isHiddenByReceiver : !i.isHiddenByReceiver))),
    [allReceivedInvitations, showHiddenReceivedInvitations]
  );

  const sentTalkRequests = useMemo(
    () => sortByDateDesc((allSentTalkRequests || []).filter((r) => r.status !== 'withdrawn' && (showHiddenSentTalkRequests ? r.isHiddenBySender : !r.isHiddenBySender))),
    [allSentTalkRequests, showHiddenSentTalkRequests]
  );

  const receivedTalkRequests = useMemo(
    () => sortByDateDesc((allReceivedTalkRequests || []).filter((r) => r.status !== 'withdrawn' && (showHiddenReceivedTalkRequests ? r.isHiddenByReceiver : !r.isHiddenByReceiver))),
    [allReceivedTalkRequests, showHiddenReceivedTalkRequests]
  );

  const visiblePartnerships = useMemo(() => {
    const isBrand = userProfileType === 'brand';
    const allPartnerships = isBrand ? receivedPartnershipInquiries : sentPartnershipInquiries;
    const filtered = allPartnerships.filter((p: PartnershipData) => {
      const isHidden = hiddenPartnershipIds.has(p.id);
      return showHiddenPartnership ? isHidden : !isHidden;
    });
    return sortByDateDesc(filtered);
  }, [userProfileType, receivedPartnershipInquiries, sentPartnershipInquiries, hiddenPartnershipIds, showHiddenPartnership]);

  const togglePartnershipHidden = useCallback((partnershipId: string) => {
    setHiddenPartnershipIds((prev) => {
      const next = new Set(prev);
      if (next.has(partnershipId)) next.delete(partnershipId);
      else next.add(partnershipId);
      localStorage.setItem('user_manage_hidden_partnerships', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const markItemAsViewedLocally = useCallback((id: string) => {
    setLocallyViewedIds((prev) => { const next = new Set(prev); next.add(id); return next; });
  }, []);

  // URL 쿼리 효과들
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'projects' || tabParam === 'invitations' || tabParam === 'likes') setActiveTab(tabParam);
  }, [searchParams]);

  useEffect(() => {
    const modeParam = searchParams.get('mode');
    if (modeParam === 'sent' || modeParam === 'received') setInvitationFilter(modeParam);
  }, [searchParams]);

  useEffect(() => {
    const subTabParam = searchParams.get('subTab');
    if (subTabParam === 'project' || subTabParam === 'collaboration' || subTabParam === 'partnership') setProjectsFilter(subTabParam);
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === 'projects') {
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'projects'] });
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'collaborations'] });
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'sent-partnership-inquiries'] });
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'received-partnership-inquiries'] });
    } else if (activeTab === 'invitations') {
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'unified-sent-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'unified-received-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'sent-talk-requests'] });
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'received-talk-requests'] });
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'sent-project-applications'] });
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'sent-collab-applications'] });
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'received-project-applications'] });
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'received-collab-applications'] });
    } else if (activeTab === 'likes') {
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'liked-projects'] });
      queryClient.invalidateQueries({ queryKey: ['manage-all', 'liked-collaborations'] });
    }
  }, [queryClient]);

  useEffect(() => {
    const invitationId = searchParams.get('invitationId');
    const mode = searchParams.get('mode') as 'sent' | 'received' | null;
    if (isLoading || !invitationId || !mode) return;
    const invitationList = mode === 'sent' ? sentInvitations : receivedInvitations;
    if (invitationList.length > 0) {
      const invitation = invitationList.find((i) => i.id === invitationId);
      if (invitation) {
        setSelectedInvitation(invitation);
        setInvitationModalMode(mode);
        setInvitationModalOpen(true);
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('invitationId');
        newSearchParams.delete('mode');
        navigate(`/manage?${newSearchParams.toString()}`, { replace: true });
      }
    }
  }, [searchParams, sentInvitations, receivedInvitations, navigate, isLoading]);

  useEffect(() => {
    const applicationId = searchParams.get('applicationId');
    const mode = searchParams.get('mode') as 'sent' | 'received' | null;
    if (isLoading || !applicationId || !mode) return;
    const applicationList = mode === 'sent' ? sentApplications.items : receivedApplications.items;
    if (applicationList.length > 0) {
      const application = applicationList.find((a) => a.id === applicationId);
      if (application) {
        const isProjectApp = 'projectId' in application;
        setSelectedApplication(application);
        setApplicationModalType(isProjectApp ? 'project' : 'collaboration');
        setApplicationModalMode(mode);
        setApplicationModalOpen(true);
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('applicationId');
        newSearchParams.delete('mode');
        navigate(`/manage?${newSearchParams.toString()}`, { replace: true });
      }
    }
  }, [searchParams, sentApplications.items, receivedApplications.items, navigate, isLoading]);

  useEffect(() => {
    const talkRequestId = searchParams.get('talkRequestId');
    const mode = searchParams.get('mode') as 'sent' | 'received' | null;
    if (isLoading || !talkRequestId || !mode) return;
    const talkRequestList = mode === 'sent' ? sentTalkRequests : receivedTalkRequests;
    if (talkRequestList.length > 0) {
      const talkRequest = talkRequestList.find((r) => r.id === talkRequestId);
      if (talkRequest) {
        setSelectedTalkRequest(talkRequest);
        setTalkRequestModalMode(mode);
        setTalkRequestModalOpen(true);
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('talkRequestId');
        newSearchParams.delete('mode');
        navigate(`/manage?${newSearchParams.toString()}`, { replace: true });
      }
    }
  }, [searchParams, sentTalkRequests, receivedTalkRequests, navigate, isLoading]);

  // 핸들러들
  const handleProjectClick = useCallback((project: Project) => {
    if (project.status === 'draft') navigate(`/explore/project/create/step1?draftId=${project.id}`);
    else navigate(`/explore/project/${project.id}`);
  }, [navigate]);

  const handleCollaborationClick = useCallback((collab: Collaboration) => {
    if (collab.status === 'draft') navigate(`/explore/collaboration/create?draftId=${collab.id}`);
    else navigate(`/explore/collaboration/${collab.id}`);
  }, [navigate]);

  const isProjectCreator = useCallback((project?: Project | null) => {
    if (!project) return false;
    if (project.createdBy) return project.createdBy === userId;
    if (project.team?.leaderId) return project.team.leaderId === userId;
    return false;
  }, [userId]);

  const isCollaborationCreator = useCallback((collab?: Collaboration | null) => {
    if (!collab) return false;
    if (collab.createdBy) return collab.createdBy === userId;
    if (collab.team?.leaderId) return collab.team.leaderId === userId;
    return false;
  }, [userId]);

  const canEditProject = useCallback((project?: Project | null) => {
    if (!project || !userId) return false;
    return project.createdBy === userId || project.team?.leaderId === userId;
  }, [userId]);

  const canEditCollaboration = useCallback((collab?: Collaboration | null) => {
    if (!collab || !userId) return false;
    return collab.createdBy === userId || collab.team?.leaderId === userId;
  }, [userId]);

  const handleProjectTeamChat = useCallback(async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    try {
      let roomId = await messageService.getRoomByProjectId(project.id);
      if (!roomId) roomId = await messageService.createRoom('project', `${project.title} 팀 채팅`, [], { projectId: project.id });
      if (roomId) navigate(`/messages/${roomId}`);
      else toast.error('채팅방을 열 수 없어요.');
    } catch { toast.error('채팅방을 열 수 없어요.'); }
  }, [navigate]);

  const handleCollaborationTeamChat = useCallback(async (e: React.MouseEvent, collab: Collaboration) => {
    e.stopPropagation();
    try {
      let roomId = await messageService.getRoomByCollaborationId(collab.id);
      if (!roomId) roomId = await messageService.createRoom('team', `${collab.title} 팀 채팅`, [], { collaborationId: collab.id });
      if (roomId) navigate(`/messages/${roomId}`);
      else toast.error('채팅방을 열 수 없어요.');
    } catch { toast.error('채팅방을 열 수 없어요'); }
  }, [navigate]);

  const handleFileShare = useCallback((e: React.MouseEvent, item: Project | Collaboration, type: 'project' | 'collaboration') => {
    e.stopPropagation();
    setSelectedItemForFile(item);
    setSelectedItemTypeForFile(type);
    setFileUploadModalOpen(true);
  }, []);

  const handleFileUploadSuccess = useCallback(async (files: File[], description: string, sharedWith: 'all' | string[]) => {
    setIsUploading(true);
    try {
      if (!selectedItemForFile) { toast.error('항목 정보를 찾을 수 없어요.'); return; }
      const entityId = selectedItemForFile.id;
      const entityType = selectedItemTypeForFile;
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { toast.error('로그인이 필요해요.'); return; }
      const displayInfo = await getProfileDisplay(user.id);
      const uploadedBy = displayInfo?.name || '사용자';
      const normalizedDescription = description.trim();
      const uploadPromises = files.map((file) =>
        entityType === 'project'
          ? fileUploadService.uploadProjectFile(file, entityId, uploadedBy, normalizedDescription || undefined, sharedWith)
          : fileUploadService.uploadCollaborationFile(file, entityId, uploadedBy, normalizedDescription || undefined, sharedWith)
      );
      const uploadedFiles = await Promise.all(uploadPromises);
      const tableName = entityType === 'project' ? 'projects' : 'collaborations';
      const currentFiles = selectedItemForFile.files || [];
      const updatedFiles = [...currentFiles, ...uploadedFiles];
      const { error: updateError } = await supabase.from(tableName).update({ files: updatedFiles }).eq('id', entityId);
      if (updateError) { toast.error('파일 목록 업데이트에 실패했어요.'); return; }
      queryClient.invalidateQueries({ queryKey: ['manage-all', entityType === 'project' ? 'projects' : 'collaborations'] });
      toast.success('파일이 공유되었어요');
      setFileUploadModalOpen(false);
      setSelectedItemForFile(null);
    } catch { toast.error('파일 공유에 실패했어요.'); }
    finally { setIsUploading(false); }
  }, [selectedItemForFile, selectedItemTypeForFile, queryClient]);

  // Mutations
  const deleteProjectMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['manage-all', 'projects'] }); toast.success('프로젝트 삭제 완료'); },
    onError: (error) => { toast.error(error instanceof Error ? error.message : '프로젝트 삭제에 실패했어요.'); },
  });

  const deleteCollaborationMutation = useMutation({
    mutationFn: deleteCollaboration,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['manage-all', 'collaborations'] }); toast.success('협업 삭제 완료'); },
    onError: (error) => { toast.error(error instanceof Error ? error.message : '협업 삭제에 실패했어요.'); },
  });

  const handleDeleteProject = useCallback(async (project: Project) => {
    try {
      const hasRelatedMagazines = await hasProjectRelatedMagazines(project.id);
      const message = hasRelatedMagazines
        ? '이 프로젝트를 삭제하면 연관된 매거진의 관련 프로젝트 연결이 해제됩니다. 정말로 삭제하시겠습니까?'
        : '정말로 삭제하시겠습니까? 삭제 후 복구할 수 없어요.';
      if (!window.confirm(message)) return;
      deleteProjectMutation.mutate(project.id);
    } catch { toast.error('삭제 준비 중 오류가 발생했어요.'); }
  }, [deleteProjectMutation]);

  const handleDeleteCollaboration = useCallback((collab: Collaboration) => {
    if (!window.confirm('이 협업을 삭제하시겠습니까? 삭제 후 복구할 수 없어요.')) return;
    deleteCollaborationMutation.mutate(collab.id);
  }, [deleteCollaborationMutation]);

  const handleStatusChangeRequest = useCallback((item: Project | Collaboration, itemType: 'project' | 'collaboration', newStatus: ProjectStatus) => {
    if (['completed', 'cancelled', 'on_hold'].includes(newStatus)) {
      setStatusChangeDialog({ open: true, item, itemType, newStatus });
    } else {
      if (itemType === 'project') updateProjectStatus({ projectId: item.id, status: newStatus });
      else updateCollaborationStatus({ collaborationId: item.id, status: newStatus });
    }
  }, [updateProjectStatus, updateCollaborationStatus]);

  const handleStatusChangeConfirm = useCallback(() => {
    if (!statusChangeDialog.item || !statusChangeDialog.newStatus) return;
    const { item, itemType, newStatus } = statusChangeDialog;
    setExitingItemIds((prev) => new Set(prev).add(item.id));
    setStatusChangeDialog({ open: false, item: null, itemType: 'project', newStatus: null });
    setTimeout(() => {
      if (itemType === 'project') updateProjectStatus({ projectId: item.id, status: newStatus });
      else updateCollaborationStatus({ collaborationId: item.id, status: newStatus });
    }, 300);
  }, [statusChangeDialog, updateProjectStatus, updateCollaborationStatus]);

  // 지원 Mutations
  const acceptProjectAppMutation = useMutation({
    mutationFn: acceptApplication,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['manage-all', 'received-project-applications'] }); toast.success('지원을 수락했어요.'); setApplicationModalOpen(false); },
    onError: () => toast.error('처리에 실패했어요.'),
  });

  const rejectProjectAppMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => rejectApplicationWithReason(id, reason),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['manage-all', 'received-project-applications'] }); toast.success('지원을 거절했어요.'); setApplicationModalOpen(false); setRejectingId(null); },
    onError: () => toast.error('처리에 실패했어요.'),
  });

  const cancelProjectAppMutation = useMutation({
    mutationFn: cancelApplication,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['manage-all', 'sent-project-applications'] }); toast.success('지원을 취소했어요'); setApplicationModalOpen(false); },
    onError: () => toast.error('취소에 실패했어요.'),
  });

  const cancelCollabAppMutation = useMutation({
    mutationFn: cancelCollaborationApplication,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['manage-all', 'sent-collab-applications'] }); toast.success('지원을 취소했어요'); setApplicationModalOpen(false); },
    onError: () => toast.error('취소에 실패했어요.'),
  });

  const acceptCollabAppMutation = useMutation({
    mutationFn: (id: string) => respondToCollaborationApplication(id, 'accepted'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['manage-all', 'received-collab-applications'] }); toast.success('지원을 수락했어요.'); setApplicationModalOpen(false); },
    onError: () => toast.error('처리에 실패했어요.'),
  });

  const rejectCollabAppMutation = useMutation({
    mutationFn: (id: string) => respondToCollaborationApplication(id, 'rejected'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['manage-all', 'received-collab-applications'] }); toast.success('지원을 거절했어요.'); setApplicationModalOpen(false); setRejectingId(null); },
    onError: () => toast.error('처리에 실패했어요.'),
  });

  // 초대 Mutations
  const acceptInvitationMutation = useMutation({
    mutationFn: (id: string) => respondToInvitation(id, 'accepted'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['manage-all', 'unified-sent-invitations'] }); queryClient.invalidateQueries({ queryKey: ['manage-all', 'unified-received-invitations'] }); toast.success('초대를 수락했어요.'); setInvitationModalOpen(false); },
    onError: () => toast.error('처리에 실패했어요.'),
  });

  const rejectInvitationMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => respondToInvitation(id, 'rejected', reason),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['manage-all', 'unified-sent-invitations'] }); queryClient.invalidateQueries({ queryKey: ['manage-all', 'unified-received-invitations'] }); toast.success('초대를 거절했어요.'); setInvitationModalOpen(false); setRejectingId(null); },
    onError: () => toast.error('처리에 실패했어요.'),
  });

  const withdrawInvitationMutation = useMutation({
    mutationFn: withdrawInvitation,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['manage-all', 'unified-sent-invitations'] }); queryClient.invalidateQueries({ queryKey: ['manage-all', 'unified-received-invitations'] }); toast.success('초대 철회 완료.'); setInvitationModalOpen(false); },
    onError: () => toast.error('처리에 실패했어요.'),
  });

  const askQuestionMutation = useMutation({
    mutationFn: ({ id, question }: { id: string; question: string }) => askQuestionOnInvitation(id, question),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['manage-all', 'unified-sent-invitations'] }); queryClient.invalidateQueries({ queryKey: ['manage-all', 'unified-received-invitations'] }); toast.success('질문 등록 완료.'); },
    onError: () => toast.error('질문 등록에 실패했어요.'),
  });

  const answerQuestionMutation = useMutation({
    mutationFn: ({ id, answer, questionAskedAt }: { id: string; answer: string; questionAskedAt?: string }) => answerQuestionOnInvitation(id, answer, questionAskedAt),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['manage-all', 'unified-sent-invitations'] }); queryClient.invalidateQueries({ queryKey: ['manage-all', 'unified-received-invitations'] }); toast.success('답변 등록 완료.'); },
    onError: () => toast.error('답변 등록에 실패했어요.'),
  });

  const handleRejectConfirm = useCallback(async (reason?: string) => {
    if (!rejectingId) return;
    if (rejectModalType === 'application') {
      if (applicationModalType === 'project') rejectProjectAppMutation.mutate({ id: rejectingId, reason });
      else rejectCollabAppMutation.mutate(rejectingId);
    } else if (rejectModalType === 'invitation') {
      rejectInvitationMutation.mutate({ id: rejectingId, reason });
    }
    setRejectModalOpen(false);
  }, [rejectingId, rejectModalType, applicationModalType, rejectProjectAppMutation, rejectCollabAppMutation, rejectInvitationMutation]);

  const openHideConfirm = useCallback((type: string, action: 'hide' | 'unhide', count: number, onConfirm: () => void) => {
    setHideConfirmConfig({ type, action, count, onConfirm });
    setHideConfirmOpen(true);
  }, []);

  const openHideConfirmForInvitation = useCallback((invitation: Invitation, mode: 'sent' | 'received') => {
    const isHidden = mode === 'sent' ? invitation.isHiddenBySender : invitation.isHiddenByReceiver;
    const role: 'sender' | 'receiver' = mode === 'sent' ? 'sender' : 'receiver';
    const action: 'hide' | 'unhide' = isHidden ? 'unhide' : 'hide';
    openHideConfirm('초대', action, 1, () => {
      if (action === 'hide') hideUnifiedInvitations({ ids: [invitation.id], role });
      else unhideUnifiedInvitations({ ids: [invitation.id], role });
    });
  }, [openHideConfirm, hideUnifiedInvitations, unhideUnifiedInvitations]);

  const openHideConfirmForApplication = useCallback((application: ProjectApplication | CollaborationApplication, mode: 'sent' | 'received') => {
    const isProjectApp = 'projectId' in application;
    const kind: 'project' | 'collaboration' = isProjectApp ? 'project' : 'collaboration';
    const isHidden = mode === 'sent' ? application.isHiddenByApplicant : application.isHiddenByReviewer;
    const role: 'applicant' | 'reviewer' = mode === 'sent' ? 'applicant' : 'reviewer';
    const action: 'hide' | 'unhide' = isHidden ? 'unhide' : 'hide';
    openHideConfirm('지원', action, 1, () => {
      if (kind === 'project') {
        if (action === 'hide') hideProjectApps({ ids: [application.id], role });
        else unhideProjectApps({ ids: [application.id], role });
      } else {
        if (action === 'hide') hideCollabApps({ ids: [application.id], role });
        else unhideCollabApps({ ids: [application.id], role });
      }
    });
  }, [openHideConfirm, hideProjectApps, unhideProjectApps, hideCollabApps, unhideCollabApps]);

  const openHideConfirmForTalkRequest = useCallback((talkRequest: TalkRequest, mode: 'sent' | 'received') => {
    const isHidden = mode === 'sent' ? talkRequest.isHiddenBySender : talkRequest.isHiddenByReceiver;
    const role: 'sender' | 'receiver' = mode === 'sent' ? 'sender' : 'receiver';
    const action: 'hide' | 'unhide' = isHidden ? 'unhide' : 'hide';
    openHideConfirm('대화 요청', action, 1, () => {
      if (action === 'hide') hideTalkRequestsMutation({ ids: [talkRequest.id], role });
      else unhideTalkRequestsMutation({ ids: [talkRequest.id], role });
    });
  }, [openHideConfirm, hideTalkRequestsMutation, unhideTalkRequestsMutation]);

  const handleAcceptTalkRequest = useCallback(async (requestId: string) => {
    try {
      const chatRoomId = await respondToTalkRequestMutation({ requestId, status: 'accepted' });
      toast.success('대화 요청을 수락했어요.');
      if (chatRoomId) navigate(`/messages/${chatRoomId}`);
      return chatRoomId;
    } catch { toast.error('처리에 실패했어요.'); throw new Error(); }
  }, [respondToTalkRequestMutation, navigate]);

  const handleRejectTalkRequest = useCallback(async (requestId: string, reason?: string) => {
    try {
      await respondToTalkRequestMutation({ requestId, status: 'rejected', reason });
      toast.success('대화 요청을 거절했어요.');
    } catch { toast.error('처리에 실패했어요.'); throw new Error(); }
  }, [respondToTalkRequestMutation]);

  const handleWithdrawTalkRequest = useCallback(async (requestId: string) => {
    try {
      await withdrawTalkRequestMutation(requestId);
      toast.success('대화 요청을 철회했어요.');
    } catch { toast.error('처리에 실패했어요.'); throw new Error(); }
  }, [withdrawTalkRequestMutation]);

  const handleConfirmHide = useCallback(() => {
    hideConfirmConfig?.onConfirm();
    setHideConfirmOpen(false);
    setHideConfirmConfig(null);
  }, [hideConfirmConfig]);

  // 브랜드 승인 대기 화면
  if (isRestricted) {
    return (
      <>
        <Header />
        <PendingApprovalNotice status={approvalStatus === 'rejected' ? 'rejected' : 'pending'} />
        <BottomNavigationBar />
      </>
    );
  }

  return (
    <Box sx={{ height: '100vh', backgroundColor: '#fff', position: 'relative', overflow: 'hidden', maxWidth: '768px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#fff', zIndex: 1000 }}>
        <Header />
      </Box>

      {/* Main Content */}
      <Box sx={{ position: 'absolute', top: `${HEADER_HEIGHT}px`, left: 0, right: 0, bottom: `${BOTTOM_NAV_HEIGHT}px`, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', '&::-webkit-scrollbar': { display: 'none' } }}>
        <Box sx={{ px: 2, py: 3 }}>
          <Typography sx={{ fontFamily: 'Pretendard, sans-serif', fontSize: 24, fontWeight: 700, color: theme.palette.text.primary, mb: 1 }}>관리</Typography>
          <Typography sx={{ fontFamily: 'Pretendard, sans-serif', fontSize: 14, color: theme.palette.text.secondary, mb: 3 }}>내 프로젝트와 협업을 관리하세요</Typography>
          <TabBarFill tabs={MANAGE_TABS} activeTab={activeTab} onTabChange={setActiveTab} />

          <Box sx={{ position: 'relative' }}>
            {isLoading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[1, 2, 3].map((i) => (<Skeleton key={i} variant="rectangular" width="100%" height={120} sx={{ borderRadius: '12px' }} />))}
              </Box>
            ) : (
              <>
                {isFetching && !isLoading && (
                  <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.9)', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', zIndex: 10 }}>
                    <LightningLoader size={14} />
                  </Box>
                )}

                {activeTab === 'projects' && (
                  <ProjectsCollabsTab
                    projectsFilter={projectsFilter}
                    onFilterChange={setProjectsFilter}
                    projects={projects}
                    visibleProjects={visibleProjects}
                    showHiddenProjects={showHiddenProjects}
                    onShowHiddenProjectsChange={setShowHiddenProjects}
                    exitingItemIds={exitingItemIds}
                    isProjectCreator={isProjectCreator}
                    canEditProject={canEditProject}
                    onProjectClick={handleProjectClick}
                    onProjectTeamChat={handleProjectTeamChat}
                    onProjectFileShare={(e, p) => handleFileShare(e, p, 'project')}
                    onProjectStatusChange={(p, s) => handleStatusChangeRequest(p, 'project', s)}
                    onProjectDelete={handleDeleteProject}
                    onProjectToggleHidden={(e, p) => { e.stopPropagation(); const currentHidden = (p as Project & { isHiddenInManage?: boolean }).isHiddenInManage ?? false; toggleProjectHidden({ projectId: p.id, isHidden: !currentHidden }); }}
                    collaborations={collaborations}
                    visibleCollaborations={visibleCollaborations}
                    showHiddenCollaborations={showHiddenCollaborations}
                    onShowHiddenCollaborationsChange={setShowHiddenCollaborations}
                    isCollaborationCreator={isCollaborationCreator}
                    canEditCollaboration={canEditCollaboration}
                    onCollaborationClick={handleCollaborationClick}
                    onCollaborationTeamChat={handleCollaborationTeamChat}
                    onCollaborationFileShare={(e, c) => handleFileShare(e, c, 'collaboration')}
                    onCollaborationStatusChange={(c, s) => handleStatusChangeRequest(c, 'collaboration', s)}
                    onCollaborationDelete={handleDeleteCollaboration}
                    onCollaborationToggleHidden={(e, c) => { e.stopPropagation(); const currentHidden = (c as Collaboration & { isHiddenInManage?: boolean }).isHiddenInManage ?? false; toggleCollaborationHidden({ collaborationId: c.id, isHidden: !currentHidden }); }}
                    visiblePartnerships={visiblePartnerships}
                    showHiddenPartnership={showHiddenPartnership}
                    onShowHiddenPartnershipChange={setShowHiddenPartnership}
                    hiddenPartnershipIds={hiddenPartnershipIds}
                    onPartnershipToggleHidden={togglePartnershipHidden}
                    userProfileType={userProfileType}
                    onPartnershipStatusChange={(id, status) => {
                      const target = visiblePartnerships.find((p: any) => p.id === id);
                      if (target) { setPartnershipResponseTarget(target); setPartnershipResponseAction(status as 'accepted' | 'rejected' | 'on_hold'); setPartnershipResponseModalOpen(true); }
                    }}
                    onPartnershipViewDetail={(p) => { setSelectedPartnership(p); setPartnershipModalOpen(true); }}
                    partnershipsCount={(userProfileType === 'brand' ? receivedPartnershipInquiries : sentPartnershipInquiries).length}
                  />
                )}

                {activeTab === 'invitations' && (
                  <InvitationsTab
                    invitationFilter={invitationFilter}
                    onFilterChange={setInvitationFilter}
                    receivedTalkRequests={receivedTalkRequests}
                    sentTalkRequests={sentTalkRequests}
                    showHiddenReceivedTalkRequests={showHiddenReceivedTalkRequests}
                    showHiddenSentTalkRequests={showHiddenSentTalkRequests}
                    onShowHiddenReceivedTalkRequestsChange={setShowHiddenReceivedTalkRequests}
                    onShowHiddenSentTalkRequestsChange={setShowHiddenSentTalkRequests}
                    showAllReceivedTalkRequests={showAllReceivedTalkRequests}
                    showAllSentTalkRequests={showAllSentTalkRequests}
                    onShowAllReceivedTalkRequestsChange={setShowAllReceivedTalkRequests}
                    onShowAllSentTalkRequestsChange={setShowAllSentTalkRequests}
                    onTalkRequestSelect={(req, mode) => { setSelectedTalkRequest(req); setTalkRequestModalMode(mode); setTalkRequestModalOpen(true); }}
                    onTalkRequestToggleHidden={openHideConfirmForTalkRequest}
                    receivedApplications={receivedApplications}
                    sentApplications={sentApplications}
                    showHiddenReceivedApps={showHiddenReceivedApps}
                    showHiddenSentApps={showHiddenSentApps}
                    onShowHiddenReceivedAppsChange={setShowHiddenReceivedApps}
                    onShowHiddenSentAppsChange={setShowHiddenSentApps}
                    showAllReceivedApps={showAllReceivedApps}
                    showAllSentApps={showAllSentApps}
                    onShowAllReceivedAppsChange={setShowAllReceivedApps}
                    onShowAllSentAppsChange={setShowAllSentApps}
                    onApplicationViewDetail={(app, mode) => {
                      const isProjectApp = 'projectId' in app;
                      setSelectedApplication(app);
                      setApplicationModalType(isProjectApp ? 'project' : 'collaboration');
                      setApplicationModalMode(mode);
                      setApplicationModalOpen(true);
                    }}
                    onApplicationToggleHidden={openHideConfirmForApplication}
                    onApplicationReject={(app) => { setRejectingId(app.id); setApplicationModalType('projectId' in app ? 'project' : 'collaboration'); setRejectModalType('application'); setRejectModalOpen(true); }}
                    onApplicationCancel={(app) => { const isProjectApp = 'projectId' in app; if (isProjectApp) cancelProjectAppMutation.mutate(app.id); else cancelCollabAppMutation.mutate(app.id); }}
                    receivedInvitations={receivedInvitations}
                    sentInvitations={sentInvitations}
                    showHiddenReceivedInvitations={showHiddenReceivedInvitations}
                    showHiddenSentInvitations={showHiddenSentInvitations}
                    onShowHiddenReceivedInvitationsChange={setShowHiddenReceivedInvitations}
                    onShowHiddenSentInvitationsChange={setShowHiddenSentInvitations}
                    showAllReceivedInvitations={showAllReceivedInvitations}
                    showAllSentInvitations={showAllSentInvitations}
                    onShowAllReceivedInvitationsChange={setShowAllReceivedInvitations}
                    onShowAllSentInvitationsChange={setShowAllSentInvitations}
                    onInvitationSelect={(inv, mode) => { setSelectedInvitation(inv); setInvitationModalMode(mode); setInvitationModalOpen(true); }}
                    onInvitationToggleHidden={openHideConfirmForInvitation}
                    locallyViewedIds={locallyViewedIds}
                    onMarkAsViewedLocally={markItemAsViewedLocally}
                    onMarkTalkRequestAsViewed={markTalkRequestAsViewed}
                    onMarkApplicationAsViewed={(id, isProject) => { if (isProject) markApplicationAsViewed(id); else markCollaborationApplicationAsViewed(id); }}
                    onMarkInvitationAsViewed={markInvitationAsViewed}
                  />
                )}

                {activeTab === 'likes' && (
                  <LikesTab
                    likesFilter={likesFilter}
                    onFilterChange={setLikesFilter}
                    likedProjects={likedProjects}
                    likedCollaborations={likedCollabs}
                    onProjectClick={(id) => navigate(`/explore/project/${id}`)}
                    onCollaborationClick={(id) => navigate(`/explore/collaboration/${id}`)}
                    currentUserId={userId || undefined}
                  />
                )}
              </>
            )}
          </Box>
        </Box>
      </Box>

      <BottomNavigationBar />

      {/* 모달들 */}
      <ApplicationDetailModal
        open={applicationModalOpen}
        onClose={() => setApplicationModalOpen(false)}
        application={selectedApplication}
        type={applicationModalType}
        mode={applicationModalMode}
        onAccept={(id) => { if (applicationModalType === 'project') acceptProjectAppMutation.mutate(id); else acceptCollabAppMutation.mutate(id); }}
        onReject={(id) => { setRejectingId(id); setRejectModalType('application'); setRejectModalOpen(true); }}
        onWithdraw={(id: string) => { if (applicationModalType === 'project') cancelProjectAppMutation.mutate(id); else cancelCollabAppMutation.mutate(id); }}
      />

      <RejectReasonModal open={rejectModalOpen} onClose={() => { setRejectModalOpen(false); setRejectingId(null); }} onConfirm={handleRejectConfirm} type={rejectModalType} />

      <InvitationDetailModal
        open={invitationModalOpen}
        onClose={() => { setInvitationModalOpen(false); setSelectedInvitation(null); }}
        invitation={selectedInvitation}
        mode={invitationModalMode}
        onWithdraw={(id) => withdrawInvitationMutation.mutate(id)}
        onAccept={(id) => acceptInvitationMutation.mutate(id)}
        onReject={(id: string) => { setRejectingId(id); setRejectModalType('invitation'); setRejectModalOpen(true); }}
        onAskQuestion={(id, question) => askQuestionMutation.mutate({ id, question })}
        onAnswerQuestion={(id, answer, questionAskedAt) => answerQuestionMutation.mutate({ id, answer, questionAskedAt })}
      />

      <TalkRequestDetailModal
        open={talkRequestModalOpen}
        onClose={() => { setTalkRequestModalOpen(false); setSelectedTalkRequest(null); }}
        talkRequest={selectedTalkRequest}
        mode={talkRequestModalMode}
        onWithdraw={handleWithdrawTalkRequest}
        onAccept={handleAcceptTalkRequest}
        onReject={handleRejectTalkRequest}
      />

      <PartnershipDetailModal
        open={partnershipModalOpen}
        onClose={() => { setPartnershipModalOpen(false); setSelectedPartnership(null); }}
        data={selectedPartnership}
        mode={userProfileType === 'brand' ? 'received' : 'sent'}
        onAccept={async (_id) => { setPartnershipModalOpen(false); if (selectedPartnership) { setPartnershipResponseTarget(selectedPartnership); setPartnershipResponseAction('accepted'); setPartnershipResponseModalOpen(true); } return undefined; }}
        onReject={async (_id) => { setPartnershipModalOpen(false); if (selectedPartnership) { setPartnershipResponseTarget(selectedPartnership); setPartnershipResponseAction('rejected'); setPartnershipResponseModalOpen(true); } }}
        onNavigateToChat={(chatRoomId) => navigate(`/messages/${chatRoomId}`)}
      />

      {partnershipResponseTarget && (
        <PartnershipResponseModal
          open={partnershipResponseModalOpen}
          onClose={() => { setPartnershipResponseModalOpen(false); setPartnershipResponseTarget(null); }}
          action={partnershipResponseAction}
          companyName={partnershipResponseTarget.company_name}
          projectType={partnershipResponseTarget.project_type}
          onConfirm={async (message) => {
            if (!partnershipResponseTarget) return;
            await respondToPartnershipInquiry({ id: partnershipResponseTarget.id, status: partnershipResponseAction, responseMessage: message || undefined });
            setPartnershipResponseModalOpen(false);
            setPartnershipResponseTarget(null);
            const actionLabels = { accepted: '파트너십 문의를 수락했습니다', rejected: '파트너십 문의를 거절했습니다', on_hold: '파트너십 문의를 보류했습니다' };
            setActionSuccessMessage(actionLabels[partnershipResponseAction]);
            setActionSuccessModalOpen(true);
          }}
        />
      )}

      <ActionSuccessModal open={actionSuccessModalOpen} onClose={() => setActionSuccessModalOpen(false)} message={actionSuccessMessage} type="success" />

      {selectedItemForFile && (
        <FileUploadModal
          open={fileUploadModalOpen}
          onClose={() => { setFileUploadModalOpen(false); setSelectedItemForFile(null); }}
          entity={selectedItemForFile}
          entityType={selectedItemTypeForFile}
          isUploading={isUploading}
          onUploadSuccess={handleFileUploadSuccess}
        />
      )}

      <HideConfirmDialog open={hideConfirmOpen} onClose={() => { setHideConfirmOpen(false); setHideConfirmConfig(null); }} onConfirm={handleConfirmHide} action={hideConfirmConfig?.action || 'hide'} itemType={hideConfirmConfig?.type || ''} count={hideConfirmConfig?.count || 0} />

      <StatusChangeConfirmDialog open={statusChangeDialog.open} onClose={() => setStatusChangeDialog({ open: false, item: null, itemType: 'project', newStatus: null })} onConfirm={handleStatusChangeConfirm} currentStatus={(statusChangeDialog.item?.status as ProjectStatus) || 'draft'} newStatus={statusChangeDialog.newStatus || 'draft'} itemTitle={statusChangeDialog.item?.title || ''} itemType={statusChangeDialog.itemType} />
    </Box>
  );
}

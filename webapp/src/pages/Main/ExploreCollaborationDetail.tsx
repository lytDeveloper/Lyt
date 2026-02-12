import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Avatar, Chip, Fab, useTheme, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { LightningLoader } from '../../components/common';
import Star from '@mui/icons-material/Star';
import DriveFolderUploadIcon from '@mui/icons-material/DriveFolderUpload';
import BottomNavigationBar, { BOTTOM_NAV_HEIGHT } from '../../components/navigation/BottomNavigationBar';
import TabBarFill, { type TabItem } from '../../components/common/TabBarFill';
import {
  getCollaborationById,
  type Collaboration,
  type WorkflowStep,
  updateCollaborationWorkflowSteps,
} from '../../services/exploreService';
import { getReceivedInvitations, respondToInvitation, type CollaborationInvitation, leaveCollaboration, removeMemberFromCollaboration, getOtherCollaborationMembers, cancelCollaborationApplication } from '../../services/collaborationService';
import { addRecentlyViewed, addRecentlyViewedToServer } from '../../services/recentViewsService';
import { toast } from 'react-toastify';
import CollaborationEditModal from '../../components/explore/CollaborationEditModal';
import TeamMemberCard from '../../components/explore/TeamMemberCard';
import FileCard from '../../components/explore/FileCard';
import FileUploadModal from '../../components/common/FileUploadModal';
import FileUploadSuccessModal from '../../components/common/FileUploadSuccessModal';
import WorkflowCard from '../../components/explore/WorkflowCard';
import WorkflowDetailModal from '../../components/explore/WorkflowDetailModal';
import WorkflowCompleteModal from '../../components/explore/WorkflowCompleteModal';
import AddWorkflowStepCard from '../../components/explore/AddWorkflowStepCard';
import AddWorkflowStepModal from '../../components/explore/AddWorkflowStepModal';
import { ApplicationModal, ActionResultModal, CreateChatModal } from '../../components/common';
import RejectReasonModal from '../../components/manage/RejectReasonModal';
import { applicationService } from '../../services/applicationService';
import type { ApplicationStatus, ApplicationForm } from '../../types/application';
import { fileUploadService } from '../../services/fileUploadService';
import { supabase } from '../../lib/supabase';
import { useProfileStore } from '../../stores/profileStore';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { getCategoryLabel, STATUS_LABELS } from '../../constants/projectConstants';
import { formatDateToYMD } from '../../utils/dateHelper';
import Header, { HEADER_HEIGHT } from '../../components/common/Header';
import { useIsUserOnline } from '../../hooks/usePresence';

type CollaborationDetailTab = 'overview' | 'members' | 'activity' | 'files';
import { getLeader, getNonLeaderMembers } from '../../utils/teamHelpers';

const DETAIL_TABS: TabItem<CollaborationDetailTab>[] = [
  { key: 'overview', label: '개요' },
  { key: 'members', label: '멤버' },
  { key: 'activity', label: '활동' },
  { key: 'files', label: '파일' },
];

// TeamMemberCard with Presence wrapper
interface TeamMemberCardWithPresenceProps {
  member?: { id: string; name?: string; profileImageUrl?: string; activityField?: string } | null;
  isLeader: boolean;
  leaderName?: string;
  leaderAvatar?: string;
  leaderField?: string;
  userId: string;
  leaderId?: string;
  teamMemberIds?: string[];
  entityType?: 'project' | 'collaboration';
  entityId?: string;
  onLeave?: () => void;
  onRemove?: (targetUserId: string, targetName: string) => void;
}

function TeamMemberCardWithPresence({
  member,
  isLeader,
  leaderName,
  leaderAvatar,
  leaderField,
  userId,
  leaderId,
  teamMemberIds,
  entityType,
  entityId,
  onLeave,
  onRemove,
}: TeamMemberCardWithPresenceProps) {
  const isOnline = useIsUserOnline(userId);

  // Debug logging to check userId and online status
  useEffect(() => {
    if (userId) {
      const displayName = isLeader ? leaderName : member?.name;
      console.log(`[TeamMemberCardWithPresence] ${isLeader ? 'Leader' : 'Member'} - userId: ${userId}, isOnline: ${isOnline}, name: ${displayName}`);
    }
  }, [userId, isOnline, isLeader, leaderName, member?.name]);

  return (
    <TeamMemberCard
      member={member}
      isLeader={isLeader}
      leaderName={leaderName}
      leaderAvatar={leaderAvatar}
      leaderField={leaderField}
      onlineStatus={isOnline}
      leaderId={leaderId}
      teamMemberIds={teamMemberIds}
      entityType={entityType}
      entityId={entityId}
      onLeave={onLeave}
      onRemove={onRemove}
    />
  );
}

export default function ExploreCollaborationDetail() {
  const theme = useTheme();
  const profileType = useProfileStore((state) => state.type);
  const fanProfile = useProfileStore((state) => state.fanProfile);
  const nonFanProfile = useProfileStore((state) => state.nonFanProfile);
  const { id } = useParams<{ id: string }>(); //콜라보레이션 ID
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [collaboration, setCollaboration] = useState<Collaboration | null>(null);
  const [activeTab, setActiveTab] = useState<CollaborationDetailTab>('overview');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadSuccessModalOpen, setUploadSuccessModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Application State
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [resultType, setResultType] = useState<'success' | 'error'>('success');
  const [resultMessage, setResultMessage] = useState('');

  // Workflow State
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [addStepModalOpen, setAddStepModalOpen] = useState(false);

  // Invitation State
  const [receivedInvitation, setReceivedInvitation] = useState<CollaborationInvitation | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  // Chat Modal State
  const [createChatModalOpen, setCreateChatModalOpen] = useState(false);
  const isFanProfile = profileType === 'fan';

  // File Card Expand State
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);

  // 멤버 관리 상태 (리더 권한 이전)
  const [showHandoverSelect, setShowHandoverSelect] = useState(false);
  const [handoverTarget, setHandoverTarget] = useState<string>('');
  const [otherMembers, setOtherMembers] = useState<Array<{ userId: string; name: string }>>([]);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const loadCollaboration = async () => {
      try {
        setLoading(true);
        const data = await getCollaborationById(id);
        setCollaboration(data || null);
        setWorkflowSteps(data?.workflowSteps ?? []);
        if (data) {
          // Check if user is creator
          const { data: { user } } = await supabase.auth.getUser();

          // 최근 본 협업에 기록
          const viewItem = {
            id: data.id,
            type: 'collaboration' as const,
            title: data.title,
            image: data.coverImageUrl,
            subtitle: data.display?.displayName || undefined,
          };
          addRecentlyViewed(viewItem);
          if (user) {
            addRecentlyViewedToServer(user.id, viewItem).catch((err) => {
              console.error('[ExploreCollaborationDetail] Failed to save recently viewed to server:', err);
            });
          }

          if (user && data.createdBy) {
            setCurrentUserId(user.id);
            const userIsCreator = data.createdBy === user.id;
            setIsCreator(userIsCreator);

            // Check if user is a member (already participating)
            const { data: memberData } = await supabase
              .from('collaboration_members')
              .select('can_edit, status')
              .eq('collaboration_id', id)
              .eq('user_id', user.id)
              .eq('status', 'active')
              .maybeSingle();

            // If user is an active member, set application status to 'accepted'
            if (memberData) {
              setApplicationStatus('accepted');
              setCanEdit(userIsCreator || (memberData.can_edit === true));
            } else {
              // Check application status only if not a member
              const { status, applicationId: appId } = await applicationService.checkApplicationStatus('collaboration', id);
              setApplicationStatus(status);
              setApplicationId(appId);
              setCanEdit(userIsCreator);
            }

            // Check if user has received an invitation for this collaboration
            if (!userIsCreator && !memberData) {
              try {
                const invitations = await getReceivedInvitations();
                const invitation = invitations.find(inv => inv.collaborationId === id && (inv.status === 'pending'));
                if (invitation) {
                  setReceivedInvitation(invitation);
                }
              } catch (error) {
                console.error('[ExploreCollaborationDetail] Failed to check invitations:', error);
              }
            }
          }
        }
      } catch (error) {
        console.error('[ExploreCollaborationDetail] Failed to load collaboration:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCollaboration();
  }, [id]);

  if (loading) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
        }}
      >
        <LightningLoader />
      </Box>
    );
  }

  if (!collaboration) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
        }}
      >
        <Typography
          sx={{
            fontFamily: 'Pretendard, sans-serif',
            fontSize: 15,
            color: theme.palette.text.secondary,
          }}
        >
          협업을 찾을 수 없습니다
        </Typography>
      </Box>
    );
  }

  const availableSlots = Math.max(collaboration.capacity - collaboration.currentTeamSize, 0);
  const requirements = Array.isArray(collaboration.requirements) ? collaboration.requirements : [];
  const benefits = Array.isArray(collaboration.benefits) ? collaboration.benefits : [];
  const members = Array.isArray(collaboration.members) ? collaboration.members : [];
  const isMember = isCreator || applicationStatus === 'accepted';

  // 파일 필터링: sharedWith 기반으로 현재 사용자가 볼 수 있는 파일만 표시
  const filteredFiles = (collaboration.files || []).filter((file) => {
    // 생성자/리더는 모든 파일 볼 수 있음
    if (isCreator) return true;
    // 비회원은 파일 목록 볼 수 없음
    if (!isMember || !currentUserId) return false;
    // sharedWith가 없거나 'all'이면 모든 팀원이 볼 수 있음
    if (!file.sharedWith || file.sharedWith === 'all') return true;
    // 파일 업로더는 항상 자신의 파일을 볼 수 있음
    if (file.uploadedById === currentUserId) return true;
    // sharedWith 배열에 현재 사용자가 포함되어 있는지 확인
    if (Array.isArray(file.sharedWith)) {
      return file.sharedWith.includes(currentUserId);
    }
    return false;
  });

  const handleStepClick = (step: WorkflowStep) => {
    setSelectedStep(step);
    setDetailModalOpen(true);
  };

  const handleCompleteStep = async () => {
    if (!selectedStep || !id || !collaboration) return;

    try {
      // 고유 step 식별 함수
      const isSameStep = (step: WorkflowStep) => {
        if (selectedStep.id && step.id) {
          return step.id === selectedStep.id;
        }
        // id가 없으면 name + personInCharge + deadline 조합으로 비교
        return (
          step.name === selectedStep.name &&
          step.personInCharge === selectedStep.personInCharge &&
          step.deadline === selectedStep.deadline
        );
      };

      const updatedSteps = workflowSteps.map((step) =>
        isSameStep(step)
          ? {
            ...step,
            isCompleted: !step.isCompleted,
            completedAt: step.isCompleted ? null : new Date().toLocaleString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }).replace(/\. /g, '.').replace(/\./g, '.').slice(0, -1),
          }
          : step
      );

      await updateCollaborationWorkflowSteps(id, updatedSteps);
      setWorkflowSteps(updatedSteps);
      setCollaboration({ ...collaboration, workflowSteps: updatedSteps });
      setDetailModalOpen(false);
      setCompleteModalOpen(true);
    } catch (error) {
      console.error('[ExploreCollaborationDetail] Failed to update workflow step:', error);
      alert('작업 상태 업데이트에 실패했어요.');
    }
  };

  const handleCompleteModalClose = () => {
    setCompleteModalOpen(false);
    setSelectedStep(null);
  };

  // 멤버 나가기 핸들러
  const handleLeave = async () => {
    if (!id) return;

    // 리더인 경우 권한 이전이 필요
    if (isCreator) {
      // 다른 멤버 목록 가져오기
      const members = await getOtherCollaborationMembers(id);
      if (members.length > 0) {
        setOtherMembers(members);
        setShowHandoverSelect(true);
        return;
      }
      // 다른 멤버가 없으면 바로 나가기
    }

    try {
      setIsLeaving(true);
      await leaveCollaboration(id);
      toast.success('협업에서 나갔어요.');
      navigate('/explore');
    } catch (error) {
      console.error('[ExploreCollaborationDetail] Leave failed:', error);
      toast.error(error instanceof Error ? error.message : '나가기에 실패했어요.');
    } finally {
      setIsLeaving(false);
    }
  };

  // 리더 권한 이전 후 나가기
  const handleLeaveWithHandover = async () => {
    if (!id || !handoverTarget) {
      toast.error('권한을 이전할 멤버를 선택해주세요.');
      return;
    }

    try {
      setIsLeaving(true);
      await leaveCollaboration(id, handoverTarget);
      toast.success('리더 권한을 이전하고 협업에서 나갔어요.');
      navigate('/explore');
    } catch (error) {
      console.error('[ExploreCollaborationDetail] Leave with handover failed:', error);
      toast.error(error instanceof Error ? error.message : '나가기에 실패했어요.');
    } finally {
      setIsLeaving(false);
      setShowHandoverSelect(false);
      setHandoverTarget('');
    }
  };

  // 멤버 추방 핸들러
  const handleRemoveMember = async (targetUserId: string, targetName: string) => {
    if (!id) return;

    try {
      await removeMemberFromCollaboration(id, targetUserId);
      toast.success(`${targetName}님을 내보냈어요.`);
      // 협업 데이터 다시 로드
      const data = await getCollaborationById(id);
      setCollaboration(data || null);
    } catch (error) {
      console.error('[ExploreCollaborationDetail] Remove member failed:', error);
      toast.error(error instanceof Error ? error.message : '내보내기에 실패했어요.');
    }
  };

  const handleAddStep = async (newStep: WorkflowStep) => {
    if (!collaboration || !id) return;

    try {
      const updatedSteps = [...workflowSteps, newStep];
      await updateCollaborationWorkflowSteps(id, updatedSteps);
      setWorkflowSteps(updatedSteps);
      setCollaboration({ ...collaboration, workflowSteps: updatedSteps });
      setAddStepModalOpen(false);
    } catch (error) {
      console.error('[ExploreCollaborationDetail] Failed to add workflow step:', error);
      alert('작업 추가에 실패했어요.');
    }
  };

  const handleFileDelete = async (fileId: string) => {
    if (!collaboration || !id) return;

    try {
      const fileToDelete = collaboration.files?.find((f) => f.id === fileId);
      if (!fileToDelete) {
        alert('파일을 찾을 수 없어요.');
        return;
      }

      // Storage에서 파일 삭제 (URL에서 경로 추출)
      const url = fileToDelete.url;
      const match = url.match(/collaboration-files\/(.+)/);
      if (match) {
        const filePath = match[1];
        const { error: storageError } = await supabase.storage
          .from('collaboration-files')
          .remove([filePath]);

        if (storageError) {
          console.error('[FileDelete] Storage delete error:', storageError);
          // Storage 삭제 실패해도 DB에서는 제거 (파일이 이미 없을 수 있음)
        }
      }

      // DB에서 파일 목록 업데이트
      const updatedFiles = (collaboration.files || []).filter((f) => f.id !== fileId);
      const { error: updateError } = await supabase
        .from('collaborations')
        .update({ files: updatedFiles })
        .eq('id', id);

      if (updateError) {
        console.error('[FileDelete] Database update error:', updateError);
        throw new Error('파일 삭제에 실패했어요.');
      }

      // 로컬 상태 업데이트
      setCollaboration({ ...collaboration, files: updatedFiles });
      console.log('[FileDelete] Success:', { fileId, fileName: fileToDelete.name });
    } catch (error) {
      console.error('[FileDelete] Failed:', error);
      alert(error instanceof Error ? error.message : '파일 삭제에 실패했어요.');
    }
  };

  const handleFileUploadSuccess = async (
    files: File[],
    description: string,
    sharedWith: 'all' | string[]
  ) => {
    try {
      setIsUploading(true);

      if (!collaboration || !id) {
        throw new Error('협업 정보를 찾을 수 없어요.');
      }

      // Get current user info
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('로그인이 필요해요.');
      }

      // Prefer active profile from global store to avoid extra DB calls
      const uploadedBy =
        (nonFanProfile?.type === 'brand' && nonFanProfile.record.brand_name) ||
        (nonFanProfile?.type === 'artist' && nonFanProfile.record.artist_name) ||
        (nonFanProfile?.type === 'creative' && nonFanProfile.record.nickname) ||
        fanProfile?.nickname ||
        collaboration.display?.displayName ||
        '사용자';

      const normalizedDescription = description.trim();

      // Upload files to Supabase Storage (sharedWith 포함)
      const uploadPromises = files.map((file) =>
        fileUploadService.uploadCollaborationFile(
          file,
          id,
          uploadedBy,
          normalizedDescription || undefined,
          sharedWith
        )
      );

      const uploadedFiles = await Promise.all(uploadPromises);

      // Update collaboration files in database
      const updatedFiles = [...(collaboration.files ?? []), ...uploadedFiles];

      console.log('[FileUpload] Updating database with files:', {
        collaborationId: id,
        currentFilesCount: collaboration.files.length,
        newFilesCount: uploadedFiles.length,
        newFiles: uploadedFiles,
      });

      const { data: updateData, error: updateError } = await supabase
        .from('collaborations')
        .update({ files: updatedFiles })
        .eq('id', id)
        .select();

      if (updateError) {
        console.error('[FileUpload] Database update error:', updateError);
        throw new Error(`협업 파일 목록 업데이트에 실패했어요: ${updateError.message}`);
      }

      console.log('[FileUpload] Database update result:', updateData);

      // Reload collaboration data from database to ensure sync
      const refreshedData = await getCollaborationById(id);
      if (refreshedData) {
        setCollaboration(refreshedData);
        setWorkflowSteps(refreshedData.workflowSteps ?? []);
        console.log('[FileUpload] Data refreshed from database:', {
          filesCount: refreshedData.files.length,
          files: refreshedData.files,
        });
      } else {
        console.warn('[FileUpload] Failed to refresh data from database');
      }

      console.log('[FileUpload] Success:', {
        files: uploadedFiles.map(f => f.name),
        description,
        sharedWith,
      });

      // Show success modal
      setUploadSuccessModalOpen(true);
    } catch (error) {
      console.error('[FileUpload] Failed:', error);
      alert(error instanceof Error ? error.message : '파일 업로드에 실패했어요.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleApplySubmit = async (form: ApplicationForm) => {
    if (!id) return;
    if (isFanProfile) {
      setResultType('error');
      setResultMessage('팬 프로필은 협업 참여 신청을 할 수 없어요.');
      setResultModalOpen(true);
      return;
    }

    const result = await applicationService.submitApplication('collaboration', id, form);
    if (result.success) {
      setApplicationStatus('pending');
      setResultType('success');
      setResultMessage(' 협업 지원 완료, 라잇 ON!\n생성자가 확인 후 알림을 드릴 예정입니다.');
      setResultModalOpen(true);
    } else {
      setResultType('error');
      setResultMessage(result.error === 'Already applied'
        ? '이미 지원한 협업입니다.'
        : '지원 중 오류가 발생했어요. 다시 시도해주세요.');
      setResultModalOpen(true);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!receivedInvitation) return;

    try {
      await respondToInvitation(receivedInvitation.id, 'accepted');
      setResultType('success');
      setResultMessage('라잇이 켜졌어요!\n협업에 참여하게 되었어요.');
      setResultModalOpen(true);
      setReceivedInvitation(null);
      setApplicationStatus('accepted');
    } catch (error) {
      console.error('[ExploreCollaborationDetail] Failed to accept invitation:', error);
      setResultType('error');
      setResultMessage(error instanceof Error ? error.message : '초대 수락에 실패했어요.');
      setResultModalOpen(true);
    }
  };

  const handleRejectInvitation = async (reason?: string) => {
    if (!receivedInvitation) return;
    void reason; // Reason is not used by respondToInvitation but provided by RejectReasonModal

    try {
      await respondToInvitation(receivedInvitation.id, 'rejected');
      setResultType('success');
      setResultMessage('라잇이 꺼졌어요');
      setResultModalOpen(true);
      setRejectModalOpen(false);
      setReceivedInvitation(null);
    } catch (error) {
      console.error('[ExploreCollaborationDetail] Failed to reject invitation:', error);
      setResultType('error');
      setResultMessage(error instanceof Error ? error.message : '초대 거절에 실패했어요.');
      setResultModalOpen(true);
    }
  };

  const handleWithdrawApplication = async () => {
    if (!applicationId) return;

    try {
      await cancelCollaborationApplication(applicationId);
      setApplicationStatus('withdrawn');
      setApplicationId(null);
      toast.success('지원을 철회했어요.');
    } catch (error) {
      console.error('[ExploreCollaborationDetail] Failed to withdraw application:', error);
      toast.error(error instanceof Error ? error.message : '지원 철회에 실패했어요.');
    }
  };

  return (
    <Box
      sx={{
        height: '100vh',
        maxWidth: '768px',
        margin: '0 auto',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#fff',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
        }}
      >
        <Header
          showBackButton
          onBackClick={() => navigate('/explore')}
        />
      </Box>

      {/* Scrollable Content */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: `${BOTTOM_NAV_HEIGHT}px`,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        }}
      >
        {/* Content */}
        <Box sx={{ px: 3, paddingTop: `calc(${HEADER_HEIGHT}px + 24px)`, paddingBottom: 3 }}>

          {/* Basic Info */}
          <Box sx={{
            boxShadow: '0px 3px 5px rgba(0,0,0,0.04)',
            p: 2,
            borderRadius: '12px',
          }}>
            {/* Cover Image with margin and border-radius */}
            <Box sx={{ mb: 2 }}>
              <Box
                sx={{
                  width: '100%',
                  height: 200,
                  backgroundImage: `url(${collaboration.coverImageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: '12px',
                }}
              />
            </Box>

            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 24,
                fontWeight: 700,
                color: theme.palette.text.primary,
                lineHeight: 1.3,
                mb: 1,
              }}
            >
              {collaboration.title}
            </Typography>

            {/* Status Badge */}
            <Box sx={{ mb: 1.5 }}>
              <Chip
                label={STATUS_LABELS[collaboration.status]}
                sx={{
                  backgroundColor: theme.palette.bgColor.blue,
                  fontFamily: 'Pretendard, sans-serif',
                  fontWeight: 400,
                  fontSize: 12,
                  color: theme.palette.primary.main,
                  height: 24,
                }}
              />
              <Chip
                label={getCategoryLabel(collaboration.category)}
                sx={{
                  fontSize: 12,
                  fontFamily: 'Pretendard, sans-serif',
                  fontWeight: 500,
                  marginLeft: 1,
                  backgroundColor: theme.palette.grey[100],
                  color: theme.palette.subText.default,
                  height: 24,
                }}
              />
            </Box>

            {/* Members count and Created date */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PeopleAltOutlinedIcon sx={{ fontSize: 16, display: 'flex', alignItems: 'center', color: theme.palette.icon.default }} />
                <Typography
                  component="span"
                  sx={{
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 13,
                    color: theme.palette.text.secondary,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {collaboration.currentTeamSize}/{collaboration.capacity}명
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CalendarMonthOutlinedIcon sx={{ fontSize: 16, display: 'flex', alignItems: 'center', color: theme.palette.icon.default }} />
                <Typography
                  component="span"
                  sx={{
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 13,
                    color: theme.palette.text.secondary,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {formatDateToYMD(collaboration.createdAt)}
                </Typography>
              </Box>
            </Box>

            {/* Leader Section - Only shown if team data is available */}
            {(() => {
              const leader = getLeader(collaboration.members);
              const leaderName =
                collaboration.display?.displayName?.trim() ||
                leader?.name?.trim() ||
                '리더';
              const leaderAvatar = leader?.profileImageUrl || collaboration.display?.displayAvatar || '';
              const leaderField =
                collaboration.display?.displayField?.trim() ||
                leader?.activityField?.trim() ||
                collaboration.display?.displayCategory?.trim() ||
                '';
              if (!leaderName && !leaderField && !leaderAvatar) return null;
              return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar
                    src={leaderAvatar}
                    alt={leaderName}
                    sx={{ width: 48, height: 48 }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      sx={{
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: 15,
                        fontWeight: 600,
                        color: theme.palette.text.primary,
                        mb: 0.3,
                      }}
                    >
                      {leaderName}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: 13,
                        color: theme.palette.text.secondary,
                      }}
                    >
                      {leaderField}
                    </Typography>
                  </Box>
                </Box>
              );
            })()}

            {/* Tags */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {collaboration.tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  sx={{
                    fontSize: 12,
                    fontFamily: 'Pretendard, sans-serif',
                    fontWeight: 400,
                    backgroundColor: theme.palette.grey[100],
                    color: theme.palette.subText.default,
                    height: 24,
                  }}
                />
              ))}
            </Box>

            {/* Edit Button - Only for creator */}
            {isCreator && (
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Button
                  onClick={() => setEditModalOpen(true)}
                  sx={{
                    height: 37,
                    borderRadius: '100px',
                    backgroundColor: theme.palette.primary.main,
                    color: '#fff',
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 14,
                    fontWeight: 500,
                    textTransform: 'none',
                    width: '60%',
                    '&:hover': {
                      backgroundColor: theme.palette.primary.dark,
                    },
                  }}
                >
                  수정하기
                </Button>
              </Box>
            )}

            {/* CTA Button - Moved up with 60% width */}
            {!isCreator && (
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
                {receivedInvitation ? (
                  // Invitation received - Show accept/reject buttons
                  <>
                    {receivedInvitation.status === 'pending' && (
                      <Button
                        onClick={() => setRejectModalOpen(true)}
                        sx={{
                          height: 37,
                          borderRadius: '100px',
                          backgroundColor: '#fff',
                          color: theme.palette.text.secondary,
                          border: `1px solid ${theme.palette.divider}`,
                          fontFamily: 'Pretendard, sans-serif',
                          fontSize: 14,
                          fontWeight: 400,
                          textTransform: 'none',
                          width: '30%',
                        }}
                      >
                        거절하기
                      </Button>
                    )}
                    <Button
                      onClick={handleAcceptInvitation}
                      disabled={receivedInvitation.status !== 'pending'}
                      sx={{
                        height: 37,
                        borderRadius: '100px',
                        backgroundColor: receivedInvitation.status === 'pending'
                          ? theme.palette.primary.main
                          : theme.palette.text.secondary,
                        color: '#fff',
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: 14,
                        fontWeight: 400,
                        textTransform: 'none',
                        width: receivedInvitation.status === 'pending' ? '30%' : '40%',
                      }}
                    >
                      {receivedInvitation.status === 'accepted'
                        ? '수락 완료'
                        : receivedInvitation.status === 'rejected'
                          ? '거절됨'
                          : '수락하기'}
                    </Button>
                  </>
                ) : (
                  // No invitation - Show apply button
                  <Box sx={{ display: 'flex', gap: 1, width: '100%', justifyContent: 'center' }}>
                    {applicationStatus === 'pending' ? (
                      <>
                        <Button
                          disabled
                          sx={{
                            height: 37,
                            borderRadius: '100px',
                            backgroundColor: theme.palette.text.secondary,
                            color: '#fff',
                            fontFamily: 'Pretendard, sans-serif',
                            fontSize: 14,
                            fontWeight: 400,
                            textTransform: 'none',
                            width: '35%',
                            mt: 0.5,
                          }}
                        >
                          검토 중
                        </Button>
                        <Button
                          onClick={handleWithdrawApplication}
                          sx={{
                            height: 37,
                            borderRadius: '100px',
                            backgroundColor: '#fff',
                            color: theme.palette.text.primary,
                            border: `1px solid ${theme.palette.divider}`,
                            fontFamily: 'Pretendard, sans-serif',
                            fontSize: 14,
                            fontWeight: 400,
                            textTransform: 'none',
                            width: '35%',
                            mt: 0.5,
                          }}
                        >
                          철회
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => {
                          if (isFanProfile) {
                            alert('팬 프로필은 협업 참여 신청을 할 수 없어요.');
                            return;
                          }
                          if (applicationStatus) {
                            if (applicationStatus === 'withdrawn') {
                              // 철회한 경우 다시 지원 가능
                              setApplyModalOpen(true);
                              return;
                            }
                            if (applicationStatus === 'accepted') alert('이미 참여 중인 협업이에요.');
                            else if (applicationStatus === 'rejected') alert('지원이 거절된 협업이에요.');
                            else alert('이미 지원한 상태에요.');
                            return;
                          }
                          setApplyModalOpen(true);
                        }}
                        disabled={(applicationStatus && applicationStatus !== 'withdrawn') || isFanProfile}
                        sx={{
                          height: 37,
                          borderRadius: '100px',
                          backgroundColor:
                            (applicationStatus && applicationStatus !== 'withdrawn') || isFanProfile
                              ? theme.palette.text.secondary
                              : theme.palette.primary.main,
                          color: '#fff',
                          fontFamily: 'Pretendard, sans-serif',
                          fontSize: 14,
                          fontWeight: 400,
                          textTransform: 'none',
                          width: '70%',
                          mt: 0.5,
                        }}
                      >
                        {isFanProfile
                          ? '참여 불가'
                          : applicationStatus
                            ? applicationStatus === 'accepted'
                              ? '참여 중'
                              : applicationStatus === 'rejected'
                                ? '거절됨'
                                : applicationStatus === 'withdrawn'
                                  ? '다시 지원하기'
                                  : '지원 완료'
                            : '참여하기'}
                      </Button>
                    )}
                  </Box>
                )}
              </Box>
            )}
          </Box>

          <Box sx={{ pt: 3, mb: 3 }}>
            {/* Tab Bar */}
            <TabBarFill tabs={DETAIL_TABS} activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Tab Content */}
            <Box sx={{
              mt: 3
            }}>
              {activeTab === 'overview' && (
                <>
                  {/* 협업 소개 */}
                  <Box sx={{
                    mb: 3,
                    p: 3,
                    boxShadow: '0px 3px 5px rgba(0,0,0,0.04)',
                    borderRadius: '12px',
                  }}>
                    <Typography
                      sx={{
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: 14,
                        fontWeight: 500,
                        color: theme.palette.text.primary,
                        mb: 1.5,
                      }}
                    >
                      협업 소개
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: 15,
                        color: theme.palette.text.primary,
                        lineHeight: 1.6,
                      }}
                    >
                      {collaboration.description}
                    </Typography>
                  </Box>

                  {/* 협업 목표 */}
                  {collaboration.goal && (
                    <Box sx={{
                      mb: 3,
                      p: 3,
                      boxShadow: '0px 3px 5px rgba(0,0,0,0.04)',
                      borderRadius: '12px',
                    }}>
                      <Typography
                        sx={{
                          fontFamily: 'Pretendard, sans-serif',
                          fontSize: 14,
                          fontWeight: 500,
                          color: theme.palette.text.primary,
                          mb: 1.5,
                        }}
                      >
                        협업 목표
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: 'Pretendard, sans-serif',
                          fontSize: 15,
                          color: theme.palette.text.primary,
                          lineHeight: 1.6,
                        }}
                      >
                        {collaboration.goal}
                      </Typography>
                    </Box>
                  )}

                  {/* 참여 요건 */}
                  <Box sx={{
                    mb: 3,
                    p: 3,
                    boxShadow: '0px 3px 5px rgba(0,0,0,0.04)',
                    borderRadius: '12px',
                  }}>
                    <Typography
                      sx={{
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: 14,
                        fontWeight: 500,
                        color: theme.palette.text.primary,
                        mb: 1.5,
                      }}
                    >
                      참여 요건
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {requirements.map((req, index) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                          <CheckOutlinedIcon sx={{ fontSize: 18, color: theme.palette.primary.main, mt: 0.2 }} />
                          <Typography
                            sx={{
                              fontFamily: 'Pretendard, sans-serif',
                              fontSize: 14,
                              color: theme.palette.text.primary,
                              lineHeight: 1.6,
                            }}
                          >
                            {req}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>

                  {/* 협업 혜택 */}
                  <Box sx={{
                    mb: 3,
                    p: 3,
                    boxShadow: '0px 3px 5px rgba(0,0,0,0.04)',
                    borderRadius: '12px',
                  }}>
                    <Typography
                      sx={{
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: 14,
                        fontWeight: 500,
                        color: theme.palette.text.primary,
                        mb: 1.5,
                      }}
                    >
                      협업 혜택
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {benefits.map((benefit, index) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                          <Star sx={{ fontSize: 18, color: '#FFA500', mt: 0.2 }} />
                          <Typography
                            sx={{
                              fontFamily: 'Pretendard, sans-serif',
                              fontSize: 14,
                              color: theme.palette.text.primary,
                              lineHeight: 1.6,
                            }}
                          >
                            {benefit}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </>
              )}

              {activeTab === 'members' && (
                <Box>
                  {/* Create Chat Button - Only for authorized users */}
                  {canEdit && members.length > 0 && (
                    <Box sx={{
                      mb: 2,

                    }}>
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => setCreateChatModalOpen(true)}
                        sx={{
                          borderRadius: '12px',
                          border: 'none',
                          color: theme.palette.text.primary,
                          backgroundColor: 'rgba(255, 255, 255, 0.3)',
                          boxShadow: '0px 3px 5px rgba(0,0,0,0.04)',
                          backdropFilter: 'blur(10px)',
                          py: 1.5,
                        }}
                      >
                        <AddRoundedIcon sx={{ fontSize: 18, color: theme.palette.icon.default, mr: 1 }} />
                        채팅방 만들기
                      </Button>
                    </Box>
                  )}

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 2,
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: 15,
                        fontWeight: 600,
                        color: theme.palette.text.primary,
                      }}
                    >
                      현재 멤버
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: 14,
                        color: theme.palette.text.secondary,
                      }}
                    >
                      {collaboration.currentTeamSize} / {collaboration.capacity}명
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {/* 리더 권한 이전 UI */}
                    {showHandoverSelect && (
                      <Box sx={{ backgroundColor: '#fff', borderRadius: 2, p: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                          리더 권한 이전
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2, color: theme.palette.text.secondary }}>
                          나가기 전에 리더 권한을 이전할 멤버를 선택해주세요.
                        </Typography>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                          <InputLabel>리더 권한을 넘겨받을 멤버</InputLabel>
                          <Select
                            value={handoverTarget}
                            label="리더 권한을 넘겨받을 멤버"
                            onChange={(e: SelectChangeEvent) => setHandoverTarget(e.target.value)}
                          >
                            {otherMembers.map(m => (
                              <MenuItem key={m.userId} value={m.userId}>
                                {m.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="outlined"
                            onClick={() => {
                              setShowHandoverSelect(false);
                              setHandoverTarget('');
                            }}
                            sx={{ flex: 1 }}
                            disabled={isLeaving}
                          >
                            취소
                          </Button>
                          <Button
                            variant="contained"
                            color="error"
                            onClick={handleLeaveWithHandover}
                            disabled={!handoverTarget || isLeaving}
                            sx={{ flex: 1 }}
                          >
                            {isLeaving ? '처리 중...' : '권한 이전 후 나가기'}
                          </Button>
                        </Box>
                      </Box>
                    )}

                    {(() => {
                      const leader = getLeader(members);
                      const leaderName =
                        collaboration.display?.displayName?.trim() ||
                        leader?.name?.trim() ||
                        '리더';
                      const leaderAvatar = leader?.profileImageUrl || collaboration.display?.displayAvatar || '';
                      const leaderField =
                        collaboration.display?.displayField?.trim() ||
                        leader?.activityField?.trim() ||
                        collaboration.display?.displayCategory?.trim() ||
                        '';
                      const teamMemberIds = members.map((m) => m.userId || m.id).filter(Boolean);
                      const leaderId = leader?.userId || leader?.id || collaboration.createdBy || '';
                      
                      // Debug log
                      console.log('[ExploreCollaborationDetail] Leader info:', {
                        leader,
                        leaderId,
                        leaderUserId: leader?.userId,
                        leaderId_fallback: leader?.id,
                        createdBy: collaboration.createdBy,
                      });
                      
                      if (!leaderName && !leaderField && !leaderAvatar) return null;
                      return (
                        <TeamMemberCardWithPresence
                          member={null}
                          isLeader
                          leaderName={leaderName}
                          leaderAvatar={leaderAvatar}
                          leaderField={leaderField}
                          userId={leaderId}
                          leaderId={leaderId}
                          teamMemberIds={teamMemberIds}
                          entityType="collaboration"
                          entityId={collaboration.id}
                          onLeave={handleLeave}
                          onRemove={handleRemoveMember}
                        />
                      );
                    })()}

                    {getNonLeaderMembers(members).map((member, index) => {
                      const teamMemberIds = members.map((m) => m.userId || m.id).filter(Boolean);
                      const leaderId = getLeader(members)?.userId || getLeader(members)?.id || '';
                      const memberId = member.userId || member.id;
                      
                      // Debug log
                      console.log('[ExploreCollaborationDetail] Member info:', {
                        index,
                        member,
                        memberId,
                        memberUserId: member.userId,
                        memberId_fallback: member.id,
                      });
                      
                      return (
                        <TeamMemberCardWithPresence
                          key={member?.userId ?? index}
                          member={{
                            name: member.name,
                            activityField: member.activityField,
                            profileImageUrl: member.profileImageUrl,
                            id: memberId,
                          }}
                          isLeader={false}
                          userId={memberId}
                          leaderId={leaderId}
                          teamMemberIds={teamMemberIds}
                          entityType="collaboration"
                          entityId={collaboration.id}
                          onLeave={handleLeave}
                          onRemove={handleRemoveMember}
                        />
                      );
                    })}

                    {availableSlots > 0 && (
                      <Box
                        sx={{
                          backgroundColor: theme.palette.bgColor.blue,
                          borderRadius: '12px',
                          p: 2,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 0.5,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AddRoundedIcon sx={{ fontSize: 16, color: theme.palette.primary.main }} />
                          <Typography
                            sx={{
                              fontFamily: 'Pretendard, sans-serif',
                              fontSize: 14,
                              fontWeight: 600,
                              color: theme.palette.primary.main,
                            }}
                          >
                            {availableSlots}자리 남음
                          </Typography>
                        </Box>
                        <Typography
                          sx={{
                            fontFamily: 'Pretendard, sans-serif',
                            fontSize: 13,
                            color: theme.palette.primary.main,
                          }}
                        >
                          새로운 멤버를 기다리고 있습니다!
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              )}

              {activeTab === 'activity' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                  {workflowSteps.length === 0 ? (
                    <Box
                      sx={{
                        p: 3,
                        boxShadow: '0px 3px 5px rgba(0,0,0,0.04)',
                        borderRadius: '12px',
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: 'Pretendard, sans-serif',
                          fontSize: 15,
                          fontWeight: 600,
                          color: theme.palette.text.primary,
                          mb: 1,
                        }}
                      >
                        워크플로우
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: 'Pretendard, sans-serif',
                          fontSize: 14,
                          color: theme.palette.text.secondary,
                          textAlign: 'center',
                          py: 2,
                        }}
                      >
                        아직 등록된 워크플로우가 없습니다
                      </Typography>
                    </Box>
                  ) : (
                    workflowSteps.map((step, index) => (
                      <WorkflowCard
                        key={index}
                        step={step}
                        onClick={() => handleStepClick(step)}
                        isMember={isMember}
                      />
                    ))
                  )}

                  {canEdit && (
                    <AddWorkflowStepCard onClick={() => setAddStepModalOpen(true)} />
                  )}
                </Box>
              )}

              {activeTab === 'files' && (
                <Box sx={{ position: 'relative', pb: 8 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {filteredFiles.map((file) => (
                      <FileCard
                        key={file.id}
                        file={file}
                        expandedFileId={expandedFileId}
                        onExpand={setExpandedFileId}
                        canDownload={isMember}
                        disableReason="협업 참여 멤버만 파일을 다운로드할 수 있어요."
                        canDelete={canEdit}
                        onDelete={handleFileDelete}
                      />
                    ))}
                  </Box>

                  {/* Upload FAB - Only visible to leader or members with can_edit */}
                  {canEdit && (
                    <Fab
                      color="primary"
                      aria-label="upload"
                      onClick={() => setUploadModalOpen(true)}
                      sx={{
                        position: 'fixed',
                        right: 24,
                        bottom: BOTTOM_NAV_HEIGHT + 16,
                        backgroundColor: theme.palette.primary.main,
                      }}
                    >
                      <DriveFolderUploadIcon />
                    </Fab>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      <BottomNavigationBar />

      <WorkflowDetailModal
        open={detailModalOpen}
        step={selectedStep}
        onClose={() => setDetailModalOpen(false)}
        onClick={handleCompleteStep}
      />

      <WorkflowCompleteModal open={completeModalOpen} onClose={handleCompleteModalClose} />

      <AddWorkflowStepModal
        open={addStepModalOpen}
        onClose={() => setAddStepModalOpen(false)}
        onSubmit={handleAddStep}
        teamMembers={
          members
            .map((m) => ({ id: m.userId || m.id || '', name: m.name || '' }))
            .filter((m) => m.id)
        }
      />

      {/* File Upload Modals */}
      {collaboration && (
        <>
          <FileUploadModal
            open={uploadModalOpen}
            onClose={() => setUploadModalOpen(false)}
            entity={collaboration}
            entityType="collaboration"
            isUploading={isUploading}
            onUploadSuccess={handleFileUploadSuccess}
          />
          <FileUploadSuccessModal
            open={uploadSuccessModalOpen}
            onClose={() => setUploadSuccessModalOpen(false)}
          />
        </>
      )}

      {/* Application Modals */}
      {!isFanProfile && collaboration && (
        <ApplicationModal
          open={applyModalOpen}
          onClose={() => setApplyModalOpen(false)}
          onSubmit={handleApplySubmit}
          title="협업 참여하기"
          activityTitle={collaboration.title}
        />
      )}

      <ActionResultModal
        open={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        title={resultType === 'success' ? '지원 완료' : '지원 실패'}
        description={resultMessage}
        variant={resultType === 'success' ? 'success' : 'warning'}
      />

      {/* Reject Invitation Modal */}
      <RejectReasonModal
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        onConfirm={handleRejectInvitation}
        type="invitation"
      />

      {/* Create Chat Modal */}
      {collaboration && members.length > 0 && (
        <CreateChatModal
          open={createChatModalOpen}
          onClose={() => setCreateChatModalOpen(false)}
          members={members.map((m) => ({
            id: m.userId || '',
            name: collaboration.display?.displayName?.trim() || m.name?.trim() || '멤버',
            profileImageUrl: m.profileImageUrl || collaboration.display?.displayAvatar || '',
            activityField: (() => {
              return (
                collaboration.display?.displayField?.trim() ||
                m.activityField?.trim() ||
                collaboration.display?.displayCategory?.trim() ||
                ''
              );
            })(),
            isLeader: m.isLeader,
          }))}
          entityType="collaboration"
          entityId={collaboration.id}
          entityTitle={collaboration.title}
        />
      )}

      {/* Edit Collaboration Modal */}
      {collaboration && (
        <CollaborationEditModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          collaboration={collaboration}
          onSuccess={async () => {
            // Reload collaboration data
            if (id) {
              try {
                const updatedCollaboration = await getCollaborationById(id);
                setCollaboration(updatedCollaboration || null);
                if (updatedCollaboration) {
                  setWorkflowSteps(updatedCollaboration.workflowSteps ?? []);
                }
              } catch (error) {
                console.error('[ExploreCollaborationDetail] Failed to reload collaboration:', error);
              }
            }
          }}
        />
      )}
    </Box>
  );
}

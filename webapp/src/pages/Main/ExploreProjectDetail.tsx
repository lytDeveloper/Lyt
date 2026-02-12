import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, IconButton, Typography, Chip, Fab, Button, useTheme, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { LightningLoader } from '../../components/common';
import DriveFolderUploadIcon from '@mui/icons-material/DriveFolderUpload';
import ExpandCircleDownOutlinedIcon from '@mui/icons-material/ExpandCircleDownOutlined';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { getProjectById, type Project, type WorkflowStep, updateProjectWorkflowSteps } from '../../services/exploreService';
import { fileUploadService } from '../../services/fileUploadService';
import { getDisplayInfoByUserId } from '../../services/profileDisplayService';
import { applicationService } from '../../services/applicationService';
import { getReceivedInvitations, respondToInvitation } from '../../services/invitationService';
import { addRecentlyViewed, addRecentlyViewedToServer } from '../../services/recentViewsService';
import { leaveProject, removeMemberFromProject, getOtherProjectMembers, cancelApplication, projectService } from '../../services/projectService';
import { toast } from 'react-toastify';
import { isWithinBusinessDays, getRemainingBusinessDays } from '../../utils/businessDayUtils';
import verifiedBadge from '../../assets/images/verified-badge.png';
import type { Invitation } from '../../types/invitation.types';
import { ApplicationModal, ActionResultModal, CreateChatModal } from '../../components/common';
import RejectReasonModal from '../../components/manage/RejectReasonModal';
import ProjectEditModal from '../../components/explore/ProjectEditModal';
import type { ApplicationStatus, ApplicationForm } from '../../types/application';
import { supabase } from '../../lib/supabase';
import { STATUS_LABELS, getCategoryLabel } from '../../constants/projectConstants';
import BottomNavigationBar, { BOTTOM_NAV_HEIGHT } from '../../components/navigation/BottomNavigationBar';
import TabBarFill from '../../components/common/TabBarFill';
import ProgressBar from '../../components/explore/ProgressBar';
import WorkflowCard from '../../components/explore/WorkflowCard';
import WorkflowDetailModal from '../../components/explore/WorkflowDetailModal';
import WorkflowCompleteModal from '../../components/explore/WorkflowCompleteModal';
import AddWorkflowStepCard from '../../components/explore/AddWorkflowStepCard';
import AddWorkflowStepModal from '../../components/explore/AddWorkflowStepModal';
import FileCard from '../../components/explore/FileCard';
import TeamMemberCard from '../../components/explore/TeamMemberCard';
import FileUploadModal from '../../components/common/FileUploadModal';
import FileUploadSuccessModal from '../../components/common/FileUploadSuccessModal';
import { useIsUserOnline } from '../../hooks/usePresence';
import { useProfileStore } from '../../stores/profileStore';

import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import MoneyOutlinedIcon from '@mui/icons-material/MoneyOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { formatDate, formatDateShort } from '../../utils/formatters';

type TabKey = 'overview' | 'tasks' | 'files' | 'team';



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


export default function ExploreProjectDetail() {
  const theme = useTheme();
  const profileType = useProfileStore((state) => state.type);
  const { id } = useParams<{ id: string }>();//프로젝트 ID
  const navigate = useNavigate();
  const location = useLocation();
  const fromPayment = (location.state as { fromPayment?: boolean })?.fromPayment;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadSuccessModalOpen, setUploadSuccessModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [addStepModalOpen, setAddStepModalOpen] = useState(false);

  // User Permission State
  const [canEdit, setCanEdit] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Application State
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [resultType, setResultType] = useState<'success' | 'error'>('success');
  const [resultMessage, setResultMessage] = useState('');

  // 받은 초대 상태
  const [receivedInvitation, setReceivedInvitation] = useState<Invitation | null>(null);
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

    const loadProject = async () => {
      try {
        setLoading(true);
        const projectData = await getProjectById(id);
        console.log('[ExploreProjectDetail] Loaded project data:', {
          id: projectData?.id,
          title: projectData?.title,
          coverImage: projectData?.coverImage,
          coverImageLength: projectData?.coverImage?.length,
        });
        setProject(projectData || null);
        if (projectData) {
          setWorkflowSteps(projectData.workflowSteps);

          // Check permissions
          const { data: { user } } = await supabase.auth.getUser();

          // 최근 본 프로젝트에 기록
          const viewItem = {
            id: projectData.id,
            type: 'project' as const,
            title: projectData.title,
            image: projectData.coverImage,
            subtitle: projectData.brandName || projectData.display?.displayName || undefined,
          };
          addRecentlyViewed(viewItem);
          if (user) {
            addRecentlyViewedToServer(user.id, viewItem).catch((err) => {
              console.error('[ExploreProjectDetail] Failed to save recently viewed to server:', err);
            });
          }

          if (user) {
            setCurrentUserId(user.id);
            // Check if user is creator/leader
            const isLeader = projectData.createdBy === user.id;
            setIsCreator(isLeader);

            // Check if user is a member (already participating)
            const { data: memberData } = await supabase
              .from('project_members')
              .select('can_edit, status')
              .eq('project_id', id)
              .eq('user_id', user.id)
              .eq('status', 'active')
              .maybeSingle();

            // If user is an active member, set application status to 'accepted'
            if (memberData) {
              setApplicationStatus('accepted');
              setCanEdit(isLeader || (memberData.can_edit === true));
            } else {
              // Check application status only if not a member
              const { status, applicationId: appId } = await applicationService.checkApplicationStatus('project', id);
              setApplicationStatus(status);
              setApplicationId(appId);

              // Check edit permission for non-members (should be false)
              setCanEdit(isLeader);
            }

            // 받은 초대 확인
            if (!isLeader) {
              try {
                const invitations = await getReceivedInvitations('project');
                const invitation = invitations.find(i => i.targetId === id && (i.status === 'pending' || i.status === 'viewed'));
                if (invitation) {
                  setReceivedInvitation(invitation);
                }
              } catch (error) {
                console.error('[ExploreProjectDetail] Failed to check invitations:', error);
              }
            }
          }
        }
      } catch (error) {
        console.error('[ExploreProjectDetail] Failed to load project:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProject();
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

  if (!project) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          gap: 2,
        }}
      >
        <Typography
          sx={{
            fontFamily: 'Pretendard, sans-serif',
            fontSize: 16,
            color: theme.palette.text.secondary,
          }}
        >
          프로젝트를 찾을 수 없어요.
        </Typography>
        <IconButton onClick={() => navigate('/explore')} size="large">
          <ArrowBackIosNewRoundedIcon />
        </IconButton>
      </Box>
    );
  }

  // Calculate progress percentage
  const completedSteps = workflowSteps.filter((step) => step.isCompleted).length;
  const totalSteps = workflowSteps.length;
  const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  const isMember = isCreator || applicationStatus === 'accepted';

  // 파일 필터링: sharedWith 기반으로 현재 사용자가 볼 수 있는 파일만 표시
  const filteredFiles = (project.files || []).filter((file) => {
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

  const handleAddStep = async (newStep: WorkflowStep) => {
    if (!project || !id) return;

    try {
      const updatedSteps = [...workflowSteps, newStep];

      // Update DB
      await updateProjectWorkflowSteps(id, updatedSteps);

      // Update Local State
      setWorkflowSteps(updatedSteps);
      setProject({ ...project, workflowSteps: updatedSteps });
      setAddStepModalOpen(false);
    } catch (error) {
      console.error('Failed to add workflow step:', error);
      alert('작업 추가에 실패했어요.');
    }
  };

  const handleCompleteStep = async () => {
    if (selectedStep && id && project) {
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

        // Update the step as completed/in progress
        const updatedSteps = workflowSteps.map((step) =>
          isSameStep(step)
            ? {
              ...step,
              isCompleted: !step.isCompleted,
              completedAt: step.isCompleted ? null : new Date().toISOString(),
            }
            : step
        );

        // Update DB
        await updateProjectWorkflowSteps(id, updatedSteps);

        // Update Local State
        setWorkflowSteps(updatedSteps as WorkflowStep[]);
        setProject({ ...project, workflowSteps: updatedSteps }); // Also update project state to reflect changes immediately
        setDetailModalOpen(false);
        setCompleteModalOpen(true);
      } catch (error) {
        console.error('Failed to update workflow step:', error);
        alert('작업 상태 업데이트에 실패했어요.');
      }
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
      const members = await getOtherProjectMembers(id);
      if (members.length > 0) {
        setOtherMembers(members);
        setShowHandoverSelect(true);
        return;
      }
      // 다른 멤버가 없으면 바로 나가기
    }

    try {
      setIsLeaving(true);
      await leaveProject(id);
      toast.success('프로젝트에서 나갔어요.');
      navigate('/explore');
    } catch (error) {
      console.error('[ExploreProjectDetail] Leave failed:', error);
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
      await leaveProject(id, handoverTarget);
      toast.success('리더 권한을 이전하고 프로젝트에서 나갔어요.');
      navigate('/explore');
    } catch (error) {
      console.error('[ExploreProjectDetail] Leave with handover failed:', error);
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
      await removeMemberFromProject(id, targetUserId);
      toast.success(`${targetName}님을 내보냈어요.`);
      // 프로젝트 데이터 다시 로드
      const projectData = await getProjectById(id);
      setProject(projectData || null);
    } catch (error) {
      console.error('[ExploreProjectDetail] Remove member failed:', error);
      toast.error(error instanceof Error ? error.message : '내보내기에 실패했어요.');
    }
  };

  const handleFileDelete = async (fileId: string) => {
    if (!project || !id) return;

    try {
      const fileToDelete = project.files?.find((f) => f.id === fileId);
      if (!fileToDelete) {
        alert('파일을 찾을 수 없어요.');
        return;
      }

      // Storage에서 파일 삭제 (URL에서 경로 추출)
      const url = fileToDelete.url;
      const match = url.match(/project-files\/(.+)/);
      if (match) {
        const filePath = match[1];
        const { error: storageError } = await supabase.storage
          .from('project-files')
          .remove([filePath]);

        if (storageError) {
          console.error('[FileDelete] Storage delete error:', storageError);
          // Storage 삭제 실패해도 DB에서는 제거 (파일이 이미 없을 수 있음)
        }
      }

      // DB에서 파일 목록 업데이트
      const updatedFiles = (project.files || []).filter((f) => f.id !== fileId);
      const { error: updateError } = await supabase
        .from('projects')
        .update({ files: updatedFiles })
        .eq('id', id);

      if (updateError) {
        console.error('[FileDelete] Database update error:', updateError);
        throw new Error('파일 삭제에 실패했어요.');
      }

      // 로컬 상태 업데이트
      setProject({ ...project, files: updatedFiles });
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

      if (!project || !id) {
        throw new Error('프로젝트 정보를 찾을 수 없어요.');
      }

      // Get current user info
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('로그인이 필요해요.');
      }

      // Get display info for current user (brand_name, artist_name 등 활성 프로필 이름)
      const displayInfo = await getDisplayInfoByUserId(user.id);
      const uploadedBy = displayInfo.displayName || '사용자';

      const normalizedDescription = description.trim();

      // Upload files to Supabase Storage (sharedWith 포함)
      const uploadPromises = files.map((file) =>
        fileUploadService.uploadProjectFile(
          file,
          id,
          uploadedBy,
          normalizedDescription || undefined,
          sharedWith
        )
      );

      const uploadedFiles = await Promise.all(uploadPromises);

      // Update project files in database
      const updatedFiles = [...(project.files ?? []), ...uploadedFiles];
      const { error: updateError } = await supabase
        .from('projects')
        .update({ files: updatedFiles })
        .eq('id', id);

      if (updateError) {
        console.error('[FileUpload] Database update error:', updateError);
        throw new Error('프로젝트 파일 목록 업데이트에 실패했어요.');
      }

      // Update local state
      setProject({ ...project, files: updatedFiles });

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
      setResultMessage('팬 프로필은 프로젝트 참여 신청을 할 수 없어요.');
      setResultModalOpen(true);
      return;
    }

    const result = await applicationService.submitApplication('project', id, form);
    if (result.success) {
      setApplicationStatus('pending');
      setResultType('success');
      setResultMessage('프로젝트 지원이 완료되었어요.\n생성자가 확인 후 알림을 드릴 예정이에요.');
      setResultModalOpen(true);
    } else {
      setResultType('error');
      setResultMessage(result.error === 'Already applied'
        ? '이미 지원한 프로젝트에요.'
        : '지원 중 오류가 발생했어요. 다시 시도해주세요.');
      setResultModalOpen(true);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!receivedInvitation) return;

    try {
      await respondToInvitation(receivedInvitation.id, 'accepted');
      setResultType('success');
      setResultMessage('초대를 수락했어요.\n프로젝트에 참여하게 되었어요.');
      setResultModalOpen(true);
      setReceivedInvitation(null);
      setApplicationStatus('accepted');
    } catch (error) {
      console.error('[ExploreProjectDetail] Failed to accept invitation:', error);
      setResultType('error');
      setResultMessage(error instanceof Error ? error.message : '초대 수락에 실패했어요.');
      setResultModalOpen(true);
    }
  };

  const handleRejectInvitation = async (reason?: string) => {
    if (!receivedInvitation) return;

    try {
      await respondToInvitation(receivedInvitation.id, 'rejected', reason);
      setResultType('success');
      setResultMessage('초대를 거절했어요.');
      setResultModalOpen(true);
      setRejectModalOpen(false);
      setReceivedInvitation(null);
    } catch (error) {
      console.error('[ExploreProjectDetail] Failed to reject invitation:', error);
      setResultType('error');
      setResultMessage(error instanceof Error ? error.message : '초대 거절에 실패했어요.');
      setResultModalOpen(true);
    }
  };

  const handleWithdrawApplication = async () => {
    if (!applicationId) return;

    try {
      await cancelApplication(applicationId);
      setApplicationStatus('withdrawn');
      setApplicationId(null);
      toast.success('지원을 철회했어요.');
    } catch (error) {
      console.error('[ExploreProjectDetail] Failed to withdraw application:', error);
      toast.error(error instanceof Error ? error.message : '지원 철회에 실패했어요.');
    }
  };

  // Recent activities (completed steps)
  const recentActivities = workflowSteps.filter((step) => step.isCompleted);
  // Next milestones (incomplete steps)
  const nextMilestones = workflowSteps.filter((step) => !step.isCompleted);

  return (
    <Box
      sx={{
        height: '100vh',
        backgroundColor: '#fff',
        position: 'relative',
        overflow: 'hidden',
        maxWidth: '768px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header - Back Button */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: 'transparent',
          paddingTop: 0,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            height: '56px',
            px: 2,
          }}
        >
          <IconButton
            onClick={() => fromPayment ? navigate('/explore', { replace: true }) : navigate(-1)}
            sx={{
              color: '#fff',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '100px',
              border: '0.1px solid rgba(255, 255, 255,0.3)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              width: 36,
              height: 36,
            }}
          >
            <ArrowBackIosNewRoundedIcon sx={{ fontSize: 24, mr: 0.4 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Content */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: `${BOTTOM_NAV_HEIGHT}px`,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        }}
      >
        {/* Cover Image with Overlay */}
        <Box
          sx={{
            width: '100%',
            height: 192,
            backgroundImage: project.coverImage && project.coverImage.trim()
              ? `url(${project.coverImage.trim()})`
              : 'none',
            backgroundColor: project.coverImage && project.coverImage.trim()
              ? 'transparent'
              : '#E5E7EB',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            position: 'relative',
          }}
        >

          {/* Semi-transparent Overlay Box */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              pointerEvents: 'none', // 오버레이가 클릭 막지 않게
            }}
          >
            <Box sx={{ px: 2, pb: 2 }}>
              {/* Title */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography
                  sx={{
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#fff',
                    lineHeight: 1.3,
                  }}
                >
                  {project.title}
                </Typography>
                {project.settlementStatus === 'paid' && (
                  <Box
                    component="img"
                    src={verifiedBadge}
                    alt="LYT VERIFIED"
                    sx={{
                      width: 20,
                      height: 20,
                      objectFit: 'contain',
                    }}
                  />
                )}
              </Box>

              {/* Brand Name • Category */}
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 13,
                  color: '#fff',
                  opacity: 0.8,
                  fontWeight: 100,
                }}
              >
                {(project.display?.displayName || project.brandName)} • {getCategoryLabel(project.category) || project.display?.displayField}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Status, Budget, Deadline Row */}
        <Box
          sx={{
            px: 3,
            paddingTop: 2,
            paddingBottom: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 2,

          }}
        >
          {/* Status Chip */}
          <Chip
            label={STATUS_LABELS[project.status]}
            size="small"
            sx={{
              height: 26,
              fontSize: 12,
              fontFamily: 'Pretendard, sans-serif',
              fontWeight: 500,
              backgroundColor: project.status === 'in_progress' ? theme.palette.bgColor.blue : theme.palette.bgColor.green,
              color: project.status === 'in_progress' ? theme.palette.status.blue : theme.palette.status.green,
            }}
          />

          {/* Budget */}
          {project.budget && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <MoneyOutlinedIcon sx={{ fontSize: 14, color: theme.palette.icon.default }} />
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 12,
                  color: theme.palette.subText.default,
                }}
              >
                {project.budget}
              </Typography>
            </Box>
          )}

          {/* Deadline */}
          {project.deadline && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CalendarMonthOutlinedIcon sx={{ fontSize: 14, color: theme.palette.icon.default }} />
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 12,
                  color: theme.palette.subText.default,
                }}
              >
                {formatDate(project.deadline)}
              </Typography>
            </Box>
          )}

          {/* Team Size */}
          {project.team?.totalMembers !== undefined && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PeopleAltOutlinedIcon sx={{ fontSize: 14, color: theme.palette.icon.default }} />
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 12,
                  color: theme.palette.subText.default,
                }}
              >
                {project.team.totalMembers}명
              </Typography>
            </Box>
          )}
        </Box>

        {/* Progress Section */}
        <Box sx={{ px: 3, paddingTop: 2, paddingBottom: 0 }}>
          <ProgressBar percentage={progressPercentage} label="진행률" />
        </Box>

        {/* Description */}
        <Box sx={{ px: 3, paddingTop: 2, paddingBottom: 0 }}>
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            {project.description}
          </Typography>
        </Box>

        {/* Creator Actions: Edit & Settlement */}
        {isCreator && (
          <Box sx={{ px: 3, mt: 3, mb: 1 }}>
            <Box sx={{ display: 'flex', gap: 1.5, mb: 1 }}>
              {/* 수정하기 버튼 */}
              <Button
                onClick={() => setEditModalOpen(true)}
                sx={{
                  flex: 1, // 왼편 작게? 비율 조정 필요하면 width 수정. 일단 flex로 나눔
                  height: 40,
                  borderRadius: '30px',
                  backgroundColor: '#fff',
                  border: `1px solid ${theme.palette.divider}`,
                  color: theme.palette.text.primary,
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 15,
                  fontWeight: 500,
                  maxWidth: '120px', // 왼편에 작게
                }}
              >
                수정하기
              </Button>

              {/* 정산하기/결제 취소 버튼 */}
              {(() => {
                const { settlementStatus, settlementPaidAt } = project;
                const canCancel = settlementStatus === 'paid' && isWithinBusinessDays(settlementPaidAt, 7);
                const remainingDays = settlementStatus === 'paid' ? getRemainingBusinessDays(settlementPaidAt, 7) : 0;

                // Show "정산하기" if not paid or cancelled
                if (!settlementStatus || settlementStatus === 'cancelled') {
                  return (
                    <Button
                      onClick={() => navigate(`/project/payment/${id}`)}
                      disabled={project.status === 'open'}
                      sx={{
                        flex: 1,
                        height: 40,
                        borderRadius: '30px',
                        backgroundColor: project.status === 'in_progress'
                          ? theme.palette.primary.main
                          : theme.palette.action.disabledBackground,
                        color: project.status === 'in_progress'
                          ? '#fff'
                          : theme.palette.text.disabled,
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: 15,
                        fontWeight: 600,
                        boxShadow: project.status === 'in_progress' ? '0 4px 10px rgba(59, 130, 246, 0.2)' : 'none',
                        '&:hover': {
                          backgroundColor: project.status === 'in_progress'
                            ? theme.palette.primary.dark
                            : theme.palette.action.disabledBackground,
                        },
                      }}
                    >
                      정산하기
                    </Button>
                  );
                }

                // Show "결제 취소" if paid
                if (settlementStatus === 'paid') {
                  return (
                    <Button
                      onClick={async () => {
                        if (!canCancel) {
                          toast.error('7영업일이 경과하여 취소할 수 없습니다. 고객센터로 문의해주세요.');
                          return;
                        }

                        if (window.confirm(`정산 결제를 취소하시겠습니까?\n\n남은 취소 가능 기간: ${remainingDays}영업일`)) {
                          try {
                            await projectService.cancelProjectSettlement(id!);
                            toast.success('정산 결제가 취소되었습니다.');
                            // Reload project data
                            window.location.reload();
                          } catch (error) {
                            console.error('[ExploreProjectDetail] Cancel settlement failed:', error);
                            toast.error(error instanceof Error ? error.message : '취소에 실패했습니다.');
                          }
                        }
                      }}
                      disabled={!canCancel}
                      sx={{
                        flex: 1,
                        height: 40,
                        borderRadius: '30px',
                        backgroundColor: canCancel
                          ? theme.palette.error.main
                          : theme.palette.action.disabledBackground,
                        color: canCancel
                          ? '#fff'
                          : theme.palette.text.disabled,
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: 15,
                        fontWeight: 600,
                        boxShadow: canCancel ? '0 4px 10px rgba(239, 68, 68, 0.2)' : 'none',
                        '&:hover': {
                          backgroundColor: canCancel
                            ? theme.palette.error.dark
                            : theme.palette.action.disabledBackground,
                        },
                      }}
                    >
                      결제 취소 {canCancel && `(${remainingDays}일)`}
                    </Button>
                  );
                }

                return null;
              })()}
            </Box>

            {/* Disclaimer */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, px: 1, }}>
              <InfoOutlinedIcon sx={{ fontSize: 9, color: '#d32f2f', mt: 0.3 }} />
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 10,
                  color: '#d32f2f',
                  lineHeight: 1.2,
                  wordBreak: 'keep-all',
                }}
              >
                영업일 기준 7일 이내에만 결제 취소가 가능하며, 이후에는 관리자 문의를 통해 진행해 주세요.
              </Typography>
            </Box>
          </Box>
        )}

        {/* CTA Button - Moved up with 60% width */}
        {!isCreator && (
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
            {receivedInvitation ? (
              // 받은 초대 - 수락/거절 버튼 표시
              <>
                {(receivedInvitation.status === 'pending' || receivedInvitation.status === 'viewed') && (
                  <Button
                    onClick={() => setRejectModalOpen(true)}
                    sx={{
                      height: 37,
                      borderRadius: '100px',
                      backgroundColor: '#fff',
                      color: theme.palette.text.secondary,
                      border: '1px solid theme.palette.divider',
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
                  disabled={receivedInvitation.status !== 'pending' && receivedInvitation.status !== 'viewed'}
                  sx={{
                    height: 37,
                    borderRadius: '100px',
                    backgroundColor: (receivedInvitation.status === 'pending' || receivedInvitation.status === 'viewed')
                      ? theme.palette.primary.main
                      : theme.palette.text.secondary,
                    color: '#fff',
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 14,
                    fontWeight: 400,
                    textTransform: 'none',
                    width: receivedInvitation.status === 'pending' || receivedInvitation.status === 'viewed' ? '30%' : '40%',
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
              // 초대 없음 - 지원 버튼 표시
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
                        width: '30%',
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
                        width: '30%',
                      }}
                    >
                      철회
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => {
                      if (isFanProfile) {
                        alert('팬 프로필은 프로젝트 참여 신청을 할 수 없어요.');
                        return;
                      }
                      if (applicationStatus) {
                        if (applicationStatus === 'withdrawn') {
                          // 철회한 경우 다시 지원 가능
                          setApplyModalOpen(true);
                          return;
                        }
                        if (applicationStatus === 'accepted') alert('이미 참여 중인 프로젝트에요.');
                        else if (applicationStatus === 'rejected') alert('지원이 거절된 프로젝트에요.');
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
                      width: '60%',
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


        {/* TabBar */}
        <Box sx={{ height: 72, px: 3, paddingTop: 2, paddingBottom: 0, borderBottom: `1px solid ${theme.palette.grey[100]}` }}>
          <TabBarFill
            tabs={[
              { key: 'overview', label: '개요' },
              { key: 'tasks', label: '작업' },
              { key: 'files', label: '파일' },
              { key: 'team', label: '팀' },
            ]}
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab as TabKey)}
          />
        </Box>

        {/* Tab Content */}
        <Box sx={{ px: 3, pb: 4 }}>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <Box sx={{ paddingTop: 3, paddingBottom: 0 }}>
              {/* 목표 */}
              {project.goal && (
                <Box sx={{
                  mb: 3,
                  px: 3,
                  py: 2,
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
                    목표
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 15,
                      color: theme.palette.text.primary,
                      lineHeight: 1.6,
                    }}
                  >
                    {project.goal}
                  </Typography>
                </Box>
              )}

              {/* 참여 요건 */}
              {project.requirements && project.requirements.length > 0 && (
                <Box sx={{
                  mb: 3,
                  px: 3,
                  py: 2,
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
                    {project.requirements.map((req, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <Typography sx={{ fontSize: 18, color: theme.palette.text.disabled, lineHeight: '20px' }}>•</Typography>
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
              )}

              {/* 최근 활동 */}
              <Box sx={{
                mb: 3,
                px: 3,
                py: 2,
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
                  최근 활동
                </Typography>

                {/* First Activity: Project Start */}
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    mb: 2,
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <PlayCircleOutlineIcon sx={{ fontSize: 16, color: theme.palette.icon.default }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      sx={{
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: 14,
                        fontWeight: 400,
                        color: theme.palette.text.primary,
                      }}
                    >
                      프로젝트 시작
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: 12,
                        color: theme.palette.text.secondary,
                      }}
                    >
                      {project.team?.leaderName} • {formatDateShort(project.createdAt)}
                    </Typography>
                  </Box>
                </Box>

                {/* Completed Steps */}
                {recentActivities.map((step, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      gap: 1.5,
                      mb: 2,
                    }}
                  >
                    <Box
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <ExpandCircleDownOutlinedIcon sx={{ fontSize: 16, color: theme.palette.icon.default }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        sx={{
                          fontFamily: 'Pretendard, sans-serif',
                          fontSize: 14,
                          fontWeight: 400,
                          color: theme.palette.text.primary,
                        }}
                      >
                        {step.name} 완료
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: 'Pretendard, sans-serif',
                          fontSize: 12,
                          color: theme.palette.text.secondary,
                        }}
                      >
                        {step.personInCharge} {step.completedAt && `• ${formatDateShort(step.completedAt)}`}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>

              {/* 다음 목표 */}
              {nextMilestones.length > 0 && (
                <Box>
                  <Typography
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 14,
                      fontWeight: 500,
                      color: theme.palette.text.primary,
                      px: 3,
                      py: 2,
                    }}
                  >
                    다음 목표
                  </Typography>

                  {nextMilestones.map((step, index) => (
                    <Box
                      key={index}
                      sx={{
                        backgroundColor: theme.palette.grey[50],
                        borderRadius: '12px',
                        py: 2,
                        px: 3,
                        mb: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          sx={{
                            fontFamily: 'Pretendard, sans-serif',
                            fontSize: 14,
                            fontWeight: 500,
                            color: theme.palette.text.primary,
                            mb: 0.5,
                          }}
                        >
                          {step.name}
                        </Typography>
                        <Typography
                          sx={{
                            fontFamily: 'Pretendard, sans-serif',
                            fontSize: 13,
                            color: theme.palette.text.secondary,
                          }}
                        >
                          {step.personInCharge} • {formatDateShort(step.deadline)}
                        </Typography>
                      </Box>
                      <FiberManualRecordIcon
                        sx={{
                          fontSize: 12,
                          color: theme.palette.status.star,
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 3, paddingBottom: 0 }}>
              {workflowSteps.map((step, index) => (
                <WorkflowCard
                  key={index}
                  step={step}
                  onClick={() => handleStepClick(step)}
                  isMember={isCreator || applicationStatus === 'accepted'}
                />
              ))}

              {/* Add Workflow Step Card (Only visible to authorized users) */}
              {canEdit && (
                <AddWorkflowStepCard onClick={() => setAddStepModalOpen(true)} />
              )}
            </Box>
          )}

          {/* Files Tab */}
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
                    disableReason="프로젝트 참여 멤버만 파일을 다운로드할 수 있어요."
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

          {/* Team Tab */}
          {activeTab === 'team' && (
            <Box>
              {/* Create Chat Button - Only for authorized users */}
              {canEdit && project.team && (
                <Box sx={{ mb: 2, pt: 2 }}>
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
                    <AddRoundedIcon sx={{ fontSize: 18, color: theme.palette.icon.default, mr: 1 }} />채팅방 만들기
                  </Button>
                </Box>
              )}

              {/* 리더 권한 이전 UI */}
              {showHandoverSelect && (
                <Box sx={{ mt: 2, backgroundColor: '#fff', borderRadius: 2, p: 2 }}>
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

              {/* Leader */}
              {project.team && (
                <TeamMemberCardWithPresence
                  member={null}
                  isLeader={true}
                  leaderName={project.team.leaderName}
                  leaderAvatar={project.team.leaderAvatar}
                  leaderField={project.team.leaderField}
                  userId={project.team.leaderId}
                  leaderId={project.team.leaderId}
                  teamMemberIds={[project.team?.leaderId, ...(project.team?.members || []).map((m) => m.id)].filter((id): id is string => !!id)}
                  entityType="project"
                  entityId={project.id}
                  onLeave={handleLeave}
                  onRemove={handleRemoveMember}
                />
              )}

              {/* Members */}
              {project.team?.members.map((member, index) => (
                <TeamMemberCardWithPresence
                  key={index}
                  member={member}
                  isLeader={false}
                  userId={member.id}
                  leaderId={project.team?.leaderId}
                  teamMemberIds={[project.team?.leaderId, ...(project.team?.members || []).map((m) => m.id)].filter((id): id is string => !!id)}
                  entityType="project"
                  entityId={project.id}
                  onLeave={handleLeave}
                  onRemove={handleRemoveMember}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>

      <BottomNavigationBar />

      {/* Modals */}
      <WorkflowDetailModal
        open={detailModalOpen}
        step={selectedStep}
        onClose={() => setDetailModalOpen(false)}
        onClick={handleCompleteStep}
      />

      <WorkflowCompleteModal open={completeModalOpen} onClose={handleCompleteModalClose} />

      {/* Add Workflow Step Modal */}
      <AddWorkflowStepModal
        open={addStepModalOpen}
        onClose={() => setAddStepModalOpen(false)}
        onSubmit={handleAddStep}
        teamMembers={
          project?.team
            ? [
              { id: project.team.leaderId, name: project.team.leaderName || '리더' },
              ...(project.team.members || [])
                .filter(m => m.id)
                .map(m => ({ id: m.id, name: m.name || '팀원' }))
            ].filter(m => m.name)
            : []
        }
      />

      {/* File Upload Modals */}
      {project && (
        <>
          <FileUploadModal
            open={uploadModalOpen}
            onClose={() => setUploadModalOpen(false)}
            entity={project}
            entityType="project"
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
      {!isFanProfile && project && (
        <ApplicationModal
          open={applyModalOpen}
          onClose={() => setApplyModalOpen(false)}
          onSubmit={handleApplySubmit}
          title="프로젝트 참여하기"
          activityTitle={project.title}
        />
      )}

      <ActionResultModal
        open={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        title={resultType === 'success' ? '지원 완료' : '지원 실패'}
        description={resultMessage}
        variant={resultType === 'success' ? 'success' : 'warning'}
      />

      {/* 초대 거절 모달 */}
      <RejectReasonModal
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        onConfirm={handleRejectInvitation}
        type="invitation"
      />

      {/* Create Chat Modal */}
      {project && project.team && (
        <CreateChatModal
          open={createChatModalOpen}
          onClose={() => setCreateChatModalOpen(false)}
          members={[
            {
              id: project.team.leaderId,
              name: project.team.leaderName,
              profileImageUrl: project.team.leaderAvatar,
              activityField: project.team.leaderField,
              isLeader: true,
            },
            ...project.team.members.map((m) => ({
              id: m.id,
              name: m.name || '',
              profileImageUrl: m.profileImageUrl,
              activityField: m.activityField,
              isLeader: false,
            })),
          ]}
          entityType="project"
          entityId={project.id}
          entityTitle={project.title}
        />
      )}

      {/* Edit Project Modal */}
      {project && (
        <ProjectEditModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          project={project}
          onSuccess={async () => {
            // Reload project data
            if (id) {
              try {
                const updatedProject = await getProjectById(id);
                setProject(updatedProject || null);
                if (updatedProject) {
                  setWorkflowSteps(updatedProject.workflowSteps);
                }
              } catch (error) {
                console.error('[ExploreProjectDetail] Failed to reload project:', error);
              }
            }
          }}
        />
      )}
    </Box>
  );
}

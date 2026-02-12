import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Box, Typography, Button, useTheme } from '@mui/material';
import { LightningLoader } from '../../components/common';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Header from '../../components/common/Header';
import BottomNavigationBar from '../../components/navigation/BottomNavigationBar';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import TabBarFill from '../../components/common/TabBarFill';
import TabBarBottomline from '../../components/common/TabBarBottomline';
import type { TabItem } from '../../components/common/TabBar';
import ItemCard from '../../components/manage/ItemCard';
import AnimatedItemCard from '../../components/manage/AnimatedItemCard';
import ReviewModal from '../../components/manage/ReviewModal';
import StatusChangeConfirmDialog from '../../components/manage/StatusChangeConfirmDialog';
import FileUploadModal from '../../components/common/FileUploadModal';

// 서비스
import { type Project } from '../../services/projectService';
import { type Collaboration } from '../../services/collaborationService';
import type { ProjectStatus } from '../../types/exploreTypes';
import { messageService } from '../../services/messageService';
import { fileUploadService } from '../../services/fileUploadService';
import { getProfileDisplay } from '../../services/profileDisplayService';
import { reviewService, type ExistingReview } from '../../services/reviewService';
import { supabase } from '../../lib/supabase';
import { useProfileStore } from '../../stores/profileStore';
import { toast } from 'react-toastify';

// 아이콘
import ProjectImgIcon from '../../assets/icon/management/project.png';
import CollaborationImgIcon from '../../assets/icon/management/collaboration.png';
// 배치 쿼리 최적화된 훅
import { useArchiveData } from '../../hooks/useArchiveData';

// 타입 정의
type StatusTab = '완료' | '취소' | '보류';
type SubTab = 'project' | 'collaboration';

// 탭 설정
const STATUS_TABS: TabItem<StatusTab>[] = [
  { key: '완료', label: '완료' },
  { key: '취소', label: '취소' },
  { key: '보류', label: '보류' },
];

const SUB_TABS: TabItem<SubTab>[] = [
  { key: 'project', label: '프로젝트' },
  { key: 'collaboration', label: '협업' },
];

// Status 매핑
const PROJECT_COLLAB_STATUS_MAP: Record<StatusTab, string[]> = {
  '완료': ['completed'],
  '취소': ['cancelled'],
  '보류': ['on_hold'],
};


export default function ArchivePage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userId } = useProfileStore();

  // 탭 상태
  const [activeStatusTab, setActiveStatusTab] = useState<StatusTab>('완료');
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('project');

  // Edit Mode 상태
  const [isEditMode, setIsEditMode] = useState(false);

  // 상태 변경 확인 다이얼로그
  const [statusChangeDialog, setStatusChangeDialog] = useState<{
    open: boolean;
    item: Project | Collaboration | null;
    itemType: 'project' | 'collaboration';
    newStatus: ProjectStatus | null;
  }>({ open: false, item: null, itemType: 'project', newStatus: null });

  // 퇴장 애니메이션 중인 아이템 ID 추적
  const [exitingItemIds, setExitingItemIds] = useState<Set<string>>(new Set());

  // 리뷰 모달 상태
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedItemForReview, setSelectedItemForReview] = useState<Project | Collaboration | null>(null);
  const [selectedItemTypeForReview, setSelectedItemTypeForReview] = useState<'project' | 'collaboration'>('project');
  const [existingReviewsForModal, setExistingReviewsForModal] = useState<ExistingReview[]>([]);

  // 리뷰 완료 여부 맵 (item.id -> boolean)
  const [hasReviewMap, setHasReviewMap] = useState<Record<string, boolean>>({});

  // 파일 업로드 모달 상태
  const [fileUploadModalOpen, setFileUploadModalOpen] = useState(false);
  const [selectedItemForFile, setSelectedItemForFile] = useState<Project | Collaboration | null>(null);
  const [selectedItemTypeForFile, setSelectedItemTypeForFile] = useState<'project' | 'collaboration'>('project');
  const [isUploading, setIsUploading] = useState(false);

  // 배치 쿼리 최적화된 훅 사용 (N+1 문제 해결, 탭별 조건부 로딩)
  const {
    projects,
    collaborations,
    isLoading: loading,
  } = useArchiveData(activeSubTab);

  // 필터링된 데이터
  const filteredProjects = useMemo(() => {
    const statuses = PROJECT_COLLAB_STATUS_MAP[activeStatusTab];
    return projects.filter((p) => statuses.includes(p.status));
  }, [projects, activeStatusTab]);

  const filteredCollaborations = useMemo(() => {
    const statuses = PROJECT_COLLAB_STATUS_MAP[activeStatusTab];
    return collaborations.filter((c) => statuses.includes(c.status));
  }, [collaborations, activeStatusTab]);

  // 완료된 프로젝트/협업의 리뷰 상태 확인 (초기 로드 시)
  // 이미 확인한 아이템 ID를 추적하여 중복 요청 방지
  const checkedItemsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkReviewStatuses = async () => {
      if (activeStatusTab !== '완료') return;
      if (!userId) return;

      const itemsToCheck: Array<{ id: string; type: 'project' | 'collaboration' }> = [];

      // 아직 확인하지 않은 프로젝트만 수집
      for (const project of filteredProjects) {
        if (!checkedItemsRef.current.has(project.id)) {
          itemsToCheck.push({ id: project.id, type: 'project' });
          checkedItemsRef.current.add(project.id);
        }
      }

      // 아직 확인하지 않은 협업만 수집
      for (const collab of filteredCollaborations) {
        if (!checkedItemsRef.current.has(collab.id)) {
          itemsToCheck.push({ id: collab.id, type: 'collaboration' });
          checkedItemsRef.current.add(collab.id);
        }
      }

      // 확인할 아이템이 없으면 종료
      if (itemsToCheck.length === 0) return;

      // 배치 쿼리로 리뷰 상태 확인 (2개 쿼리로 모두 처리)
      const batchResult = await reviewService.checkReviewStatusBatch(itemsToCheck, userId);

      if (Object.keys(batchResult).length > 0) {
        setHasReviewMap(prev => ({ ...prev, ...batchResult }));
      }
    };

    checkReviewStatuses();
  }, [activeStatusTab, filteredProjects, filteredCollaborations, userId]);

  // 생성자 체크
  const isProjectCreator = useCallback(
    (project?: Project | null) => {
      if (!project) return false;
      if (project.createdBy) return project.createdBy === userId;
      if (project.team?.leaderId) return project.team.leaderId === userId;
      return false;
    },
    [userId]
  );

  const isCollaborationCreator = useCallback(
    (collab?: Collaboration | null) => {
      if (!collab) return false;
      if (collab.createdBy) return collab.createdBy === userId;
      if (collab.team?.leaderId) return collab.team.leaderId === userId;
      return false;
    },
    [userId]
  );

  // 편집 권한 체크
  const canEditProject = useCallback(
    (project?: Project | null) => {
      if (!project || !userId) return false;
      return project.createdBy === userId || project.team?.leaderId === userId;
    },
    [userId]
  );

  const canEditCollaboration = useCallback(
    (collab?: Collaboration | null) => {
      if (!collab || !userId) return false;
      return collab.createdBy === userId || collab.team?.leaderId === userId;
    },
    [userId]
  );

  // 팀 채팅 핸들러
  const handleProjectTeamChat = useCallback(
    async (e: React.MouseEvent, project: Project) => {
      e.stopPropagation();
      try {
        let roomId = await messageService.getRoomByProjectId(project.id);
        if (!roomId) {
          roomId = await messageService.createRoom('project', `${project.title} 팀 채팅`, [], { projectId: project.id });
        }
        if (roomId) {
          navigate(`/messages/${roomId}`);
        } else {
          toast.error('채팅방을 열 수 없어요.');
        }
      } catch (error) {
        console.error('Error opening team chat:', error);
        toast.error('채팅방을 열 수 없어요.');
      }
    },
    [navigate]
  );

  const handleCollaborationTeamChat = useCallback(
    async (e: React.MouseEvent, collab: Collaboration) => {
      e.stopPropagation();
      try {
        let roomId = await messageService.getRoomByCollaborationId(collab.id);
        if (!roomId) {
          roomId = await messageService.createRoom('team', `${collab.title} 팀 채팅`, [], {
            collaborationId: collab.id,
          });
        }
        if (roomId) {
          navigate(`/messages/${roomId}`);
        } else {
          toast.error('채팅방을 열 수 없어요.');
        }
      } catch (error) {
        console.error('Error opening team chat:', error);
        toast.error('채팅방을 열 수 없어요.');
      }
    },
    [navigate]
  );

  // 파일 공유 핸들러
  const handleFileShare = useCallback((e: React.MouseEvent, item: Project | Collaboration, type: 'project' | 'collaboration') => {
    e.stopPropagation();
    setSelectedItemForFile(item);
    setSelectedItemTypeForFile(type);
    setFileUploadModalOpen(true);
  }, []);

  const handleFileUploadSuccess = useCallback(
    async (files: File[], description: string, sharedWith: 'all' | string[]) => {
      setIsUploading(true);
      try {
        if (!selectedItemForFile) {
          toast.error('항목 정보를 찾을 수 없어요.');
          return;
        }

        const entityId = selectedItemForFile.id;
        const entityType = selectedItemTypeForFile;

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          toast.error('로그인이 필요해요.');
          return;
        }

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

        const { error: updateError } = await supabase
          .from(tableName)
          .update({ files: updatedFiles })
          .eq('id', entityId);

        if (updateError) {
          console.error('[FileUpload] Database update error:', updateError);
          toast.error('파일 목록 업데이트에 실패했어요.');
          return;
        }

        // 캐시 무효화하여 UI 새로고침
        queryClient.invalidateQueries({ queryKey: ['archive', entityType === 'project' ? 'projects' : 'collaborations'] });

        toast.success('파일이 공유되었어요.');
        setFileUploadModalOpen(false);
        setSelectedItemForFile(null);
      } catch (error) {
        console.error('Error uploading files:', error);
        toast.error('파일 공유에 실패했어요.');
      } finally {
        setIsUploading(false);
      }
    },
    [selectedItemForFile, selectedItemTypeForFile, queryClient]
  );

  // 리뷰 작성 핸들러
  const handleReviewClick = useCallback(async (item: Project | Collaboration, type: 'project' | 'collaboration') => {
    setSelectedItemForReview(item);
    setSelectedItemTypeForReview(type);

    // 기존 리뷰 데이터 가져오기
    const existingReviews = await reviewService.getExistingReviews(item.id, type);
    setExistingReviewsForModal(existingReviews);

    setReviewModalOpen(true);
  }, []);

  const handleReviewSubmit = useCallback(() => {
    toast.success('리뷰가 저장되었어요.');
    setReviewModalOpen(false);

    // 리뷰 완료 상태 업데이트
    if (selectedItemForReview) {
      setHasReviewMap(prev => ({
        ...prev,
        [selectedItemForReview.id]: true,
      }));
    }

    setSelectedItemForReview(null);
    setExistingReviewsForModal([]);
  }, [selectedItemForReview]);

  // 상태 변경 요청 핸들러 (모든 상태 변경에 confirm 표시)
  const handleStatusChangeRequest = useCallback(
    (item: Project | Collaboration, itemType: 'project' | 'collaboration', newStatus: ProjectStatus) => {
      setStatusChangeDialog({
        open: true,
        item,
        itemType,
        newStatus,
      });
    },
    []
  );

  // 상태 변경 확인 핸들러 (애니메이션 + mutation)
  const handleStatusChangeConfirm = useCallback(async () => {
    if (!statusChangeDialog.item || !statusChangeDialog.newStatus) return;

    const { item, itemType, newStatus } = statusChangeDialog;

    // 1. 애니메이션 시작
    setExitingItemIds((prev) => new Set(prev).add(item.id));

    // 2. 다이얼로그 닫기
    setStatusChangeDialog({ open: false, item: null, itemType: 'project', newStatus: null });

    // 3. 애니메이션 완료 후 상태 업데이트 (300ms 후)
    setTimeout(async () => {
      const tableName = itemType === 'project' ? 'projects' : 'collaborations';
      const { error } = await supabase
        .from(tableName)
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', item.id);

      if (error) {
        console.error('[ArchivePage] Status update error:', error);
        toast.error('상태 변경에 실패했어요.');
        // 에러 시에만 애니메이션 롤백 (다시 보이게)
        setExitingItemIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      } else {
        toast.success(newStatus === 'deleted' ? '삭제되었어요.' : '상태가 변경되었어요.');
        // 캐시 무효화 (archive + manage-all + archiveCount)
        queryClient.invalidateQueries({ queryKey: ['archive', itemType === 'project' ? 'projects' : 'collaborations'] });
        queryClient.invalidateQueries({ queryKey: ['manage-all', itemType === 'project' ? 'projects' : 'collaborations'] });
        queryClient.invalidateQueries({ queryKey: ['profile', 'archiveCount'] });
        // 성공 시 exitingItemIds에서 제거하지 않음 - 캐시 갱신 후 자연스럽게 필터링됨
      }
    }, 300);
  }, [statusChangeDialog, queryClient]);

  // 아이템 클릭 핸들러
  const handleProjectClick = useCallback(
    (project: Project) => {
      navigate(`/explore/project/${project.id}`);
    },
    [navigate]
  );

  const handleCollaborationClick = useCallback(
    (collab: Collaboration) => {
      navigate(`/explore/collaboration/${collab.id}`);
    },
    [navigate]
  );

  // 콘텐츠 렌더링
  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <LightningLoader />
        </Box>
      );
    }

    const isCancelledTab = activeStatusTab === '취소';
    const isCompletedTab = activeStatusTab === '완료';

    if (activeSubTab === 'project') {
      if (filteredProjects.length === 0) {
        return (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <Box component="img" src={ProjectImgIcon} alt="Empty State" sx={{ width: 70, height: 70, mb: 2 }} />
            <Typography sx={{ fontWeight: 600, mb: 1 }}>
              {activeStatusTab === '완료' && '완료된 프로젝트가 없어요.'}
              {activeStatusTab === '취소' && '취소된 프로젝트가 없어요.'}
              {activeStatusTab === '보류' && '보류 중인 프로젝트가 없어요.'}
            </Typography>
            <Typography
              sx={{
                fontSize: 14,
                color: theme.palette.text.secondary,
                lineHeight: 1,
              }}
            >
              {activeStatusTab === '완료' && '완료된 프로젝트가 생기면 여기에 표시됩니다.'}
              {activeStatusTab === '취소' && '취소한 프로젝트는 여기에서 확인할 수 있어요.'}
              {activeStatusTab === '보류' && '보류된 프로젝트가 생기면 여기에 표시됩니다.'}
            </Typography>
          </Box>
        );
      }
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredProjects.map((project) => (
            <AnimatedItemCard
              key={project.id}
              isVisible={!exitingItemIds.has(project.id)}
            >
              <ItemCard
                item={project}
                type="project"
                isCreator={isProjectCreator(project)}
                canEdit={canEditProject(project)}
                onItemClick={() => handleProjectClick(project)}
                onTeamChatClick={(e) => handleProjectTeamChat(e, project)}
                onFileShareClick={(e) => handleFileShare(e, project, 'project')}
                showStrikethrough={isCancelledTab}
                showReviewBadge={isCompletedTab}
                hasReview={hasReviewMap[project.id] || false}
                onReviewClick={() => handleReviewClick(project, 'project')}
                showStatusChip={isEditMode && isProjectCreator(project)}
                excludeDeletedStatus={false}
                onStatusChange={(status) => handleStatusChangeRequest(project, 'project', status)}
              />
            </AnimatedItemCard>
          ))}
        </Box>
      );
    }

    if (activeSubTab === 'collaboration') {
      if (filteredCollaborations.length === 0) {
        return (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <Box component="img" src={CollaborationImgIcon} alt="Empty State" sx={{ width: 70, height: 70, mb: 2 }} />
            <Typography sx={{ fontWeight: 600, mb: 1 }}>
              {activeStatusTab === '완료' && '완료된 협업이 없어요.'}
              {activeStatusTab === '취소' && '취소된 협업이 없어요.'}
              {activeStatusTab === '보류' && '보류 중인 협업이 없어요.'}
            </Typography>
            <Typography
              sx={{
                fontSize: 14,
                color: theme.palette.text.secondary,
                lineHeight: 1,
              }}
            >
              {activeStatusTab === '완료' && '완료된 협업이 생기면 여기에 표시됩니다.'}
              {activeStatusTab === '취소' && '취소한 협업은 여기에서 확인할 수 있어요.'}
              {activeStatusTab === '보류' && '보류된 협업이 생기면 여기에 표시됩니다.'}
            </Typography>
          </Box>
        );
      }
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredCollaborations.map((collab) => (
            <AnimatedItemCard
              key={collab.id}
              isVisible={!exitingItemIds.has(collab.id)}
            >
              <ItemCard
                item={collab}
                type="collaboration"
                isCreator={isCollaborationCreator(collab)}
                canEdit={canEditCollaboration(collab)}
                onItemClick={() => handleCollaborationClick(collab)}
                onTeamChatClick={(e) => handleCollaborationTeamChat(e, collab)}
                onFileShareClick={(e) => handleFileShare(e, collab, 'collaboration')}
                showStrikethrough={isCancelledTab}
                showReviewBadge={isCompletedTab}
                hasReview={hasReviewMap[collab.id] || false}
                onReviewClick={() => handleReviewClick(collab, 'collaboration')}
                showStatusChip={isEditMode && isCollaborationCreator(collab)}
                excludeDeletedStatus={false}
                onStatusChange={(status) => handleStatusChangeRequest(collab, 'collaboration', status)}
              />
            </AnimatedItemCard>
          ))}
        </Box>
      );
    }

    return null;
  };

  return (
    <Box sx={{ pb: 8, bgcolor: 'white', minHeight: '100vh' }}>
      <Header showBackButton onBackClick={() => navigate(-1)} />

      {/* 헤더 영역 */}
      <Box sx={{ px: 2, pt: 2, pb: 3 }}>
        <Typography
          sx={{
            fontSize: 24,
            fontWeight: 700,
            color: theme.palette.text.primary,
            mb: 1,
          }}
        >
          아카이브 관리
        </Typography>
        <Typography
          sx={{
            fontSize: 14,
            color: theme.palette.text.secondary,
          }}
        >
          지나온 프로젝트와 협업의 기록을 확인하세요.
        </Typography>
      </Box>

      {/* 메인 탭 (완료/취소/보류) */}
      <Box sx={{ px: 2 }}>
        <TabBarFill
          tabs={STATUS_TABS}
          activeTab={activeStatusTab}
          onTabChange={setActiveStatusTab}
        />
      </Box>

      {/* 서브 탭 (프로젝트/협업/파트너십 문의) + 관리 버튼 */}
      <Box sx={{ px: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ flex: 1 }}>
          <TabBarBottomline
            tabs={SUB_TABS}
            activeTab={activeSubTab}
            onTabChange={setActiveSubTab}
          />
        </Box>

        <Button
          startIcon={<EditNoteOutlinedIcon sx={{ fontSize: 16, marginRight: -1.1, }} />}
          onClick={() => setIsEditMode(!isEditMode)}
          sx={{
            fontSize: 12,
            color: isEditMode ? theme.palette.primary.main : theme.palette.text.secondary,
            fontWeight: isEditMode ? 600 : 400,
            minWidth: 'auto',
            px: 1,
            flexShrink: 0,
          }}
        >
          관리
        </Button>

      </Box>

      {/* 콘텐츠 */}
      <Box sx={{ px: 2, py: 2 }}>
        {renderContent()}
      </Box>

      <BottomNavigationBar />

      {/* 리뷰 모달 */}
      <ReviewModal
        open={reviewModalOpen}
        onClose={() => {
          setReviewModalOpen(false);
          setSelectedItemForReview(null);
          setExistingReviewsForModal([]);
        }}
        item={selectedItemForReview}
        type={selectedItemTypeForReview}
        existingReviews={existingReviewsForModal}
        onSubmit={handleReviewSubmit}
      />

      {/* 파일 업로드 모달 */}
      {selectedItemForFile && (
        <FileUploadModal
          open={fileUploadModalOpen}
          onClose={() => {
            setFileUploadModalOpen(false);
            setSelectedItemForFile(null);
          }}
          entity={selectedItemForFile}
          entityType={selectedItemTypeForFile}
          isUploading={isUploading}
          onUploadSuccess={handleFileUploadSuccess}
        />
      )}

      {/* 상태 변경 확인 다이얼로그 */}
      <StatusChangeConfirmDialog
        open={statusChangeDialog.open}
        onClose={() => setStatusChangeDialog({ open: false, item: null, itemType: 'project', newStatus: null })}
        onConfirm={handleStatusChangeConfirm}
        currentStatus={(statusChangeDialog.item?.status as ProjectStatus) || 'completed'}
        newStatus={statusChangeDialog.newStatus || 'completed'}
        itemTitle={statusChangeDialog.item?.title || ''}
        itemType={statusChangeDialog.itemType}
      />
    </Box>
  );
}

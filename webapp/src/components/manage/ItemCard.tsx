import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Chip,
  useTheme,
  IconButton,
  Tooltip,
} from '@mui/material';
import ArrowDropDownRoundedIcon from '@mui/icons-material/ArrowDropDownRounded';
import CalendarToday from '@mui/icons-material/CalendarToday';
import Person from '@mui/icons-material/Person';
import AccessTime from '@mui/icons-material/AccessTime';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useState, useCallback, useRef } from 'react';
import { formatRelativeTime } from '../../utils/dateHelper';
import { getStatusLabel } from '../../constants/projectConstants';
import StatusDropdownMenu from './StatusDropdownMenu';
import type { ProjectStatus } from '../../types/exploreTypes';
import type { Project } from '../../services/projectService';
import type { Collaboration } from '../../services/collaborationService';
import LazyImage from '../common/LazyImage';

interface ItemCardProps {
  item: Project | Collaboration;
  type: 'project' | 'collaboration';
  isCreator: boolean;
  canEdit?: boolean; // 파일 공유 등 편집 권한 여부
  onItemClick: () => void;
  onTeamChatClick: (e: React.MouseEvent) => void;
  onFileShareClick?: (e: React.MouseEvent) => void; // optional로 변경
  onStatusChange?: (newStatus: ProjectStatus) => void;
  onDelete?: () => void;
  // 아카이브 페이지용 props
  showStrikethrough?: boolean; // title 취소선 표시 여부 (삭제 탭)
  showReviewBadge?: boolean;   // 리뷰작성 배지 표시 여부 (완료 탭)
  hasReview?: boolean;         // 이미 리뷰 작성 완료 여부 (true면 '리뷰수정' 표시)
  onReviewClick?: () => void;  // 리뷰작성/수정 클릭 핸들러
  // 상태 관리 관련 props
  showStatusChip?: boolean;       // status chip 표시 여부 (default: true)
  excludeDeletedStatus?: boolean; // deleted 상태 제외 여부 (default: true)
  // ManageAll 숨김 관련 props
  isHiddenInManage?: boolean;     // 현재 숨김 상태
  onToggleHidden?: (e: React.MouseEvent) => void;  // 숨김 토글 핸들러
}

/**
 * 프로젝트/협업 통합 카드 컴포넌트
 */
export default function ItemCard({
  item,
  type,
  isCreator,
  canEdit = false,
  onItemClick,
  onTeamChatClick,
  onFileShareClick,
  onStatusChange,
  onDelete,
  showStrikethrough = false,
  showReviewBadge = false,
  hasReview = false,
  onReviewClick,
  showStatusChip = true,
  excludeDeletedStatus = true,
  isHiddenInManage,
  onToggleHidden,
}: ItemCardProps) {
  const theme = useTheme();
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const statusChipBoxRef = useRef<HTMLDivElement>(null);

  // 삭제 버튼: excludeDeletedStatus가 false일 때 (ArchivePage edit mode)는 deleted 상태로 대체하므로 숨김
  const canShowDelete = excludeDeletedStatus && isCreator && onDelete && (item.status === 'completed' || item.status === 'cancelled');
  // 파일 공유 버튼은 생성자 또는 can_edit 권한자에게만 표시
  const canShowFileShare = (isCreator || canEdit) && onFileShareClick;

  // 진행률 계산
  const getProgress = useCallback(() => {
    if (!item.workflowSteps || item.workflowSteps.length === 0) return 0;
    const completedSteps = item.workflowSteps.filter((step) => step.isCompleted).length;
    return Math.round((completedSteps / item.workflowSteps.length) * 100);
  }, [item.workflowSteps]);

  // 상태 메뉴 핸들러 - ref를 사용하여 anchor 안정화
  const handleStatusClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    if (!isCreator) return;
    // ref가 준비되어 있으면 즉시 설정
    if (statusChipBoxRef.current) {
      setAnchorEl(statusChipBoxRef.current);
      setStatusMenuOpen(true);
    } else {
      // ref가 아직 준비되지 않았으면 다음 프레임에서 설정
      requestAnimationFrame(() => {
        if (statusChipBoxRef.current) {
          setAnchorEl(statusChipBoxRef.current);
          setStatusMenuOpen(true);
        }
      });
    }
  };

  const handleStatusMenuClose = () => {
    setStatusMenuOpen(false);
    setAnchorEl(null);
  };

  const handleStatusChange = (newStatus: ProjectStatus) => {
    setStatusMenuOpen(false);
    onStatusChange?.(newStatus);
  };

  // 타입별 데이터 추출
  const isProject = type === 'project';
  const coverImage = isProject
    ? (item as Project).coverImage
    : (item as Collaboration).coverImageUrl;
  const title = item.title;
  // ExploreProjectDetail.tsx 참고: team.leaderName을 우선 사용 (is_active 필터링된 값)
  const subtitle = isProject
    ? (item as Project).team?.leaderName || (item as Project).display?.displayName
    : (item as Collaboration).team?.leaderName || (item as Collaboration).display?.displayName;
  const deadline = isProject ? (item as Project).deadline : null;
  const teamSize = isProject
    ? (item as Project).team?.totalMembers || 1
    : (item as Collaboration).currentTeamSize || 1;
  const members = isProject
    ? (item as Project).team?.members || []
    : (item as Collaboration).team?.members || [];
  // ExploreProjectDetail.tsx 참고: team 정보를 직접 사용 (getVfanDisplayInfo로 is_active 필터링된 값)
  const leaderInfo = isProject
    ? {
      name: (item as Project).team?.leaderName || (item as Project).display?.displayName,
      avatar: (item as Project).team?.leaderAvatar,
      field: (item as Project).team?.leaderField,
    }
    : {
      name: (item as Collaboration).team?.leaderName || (item as Collaboration).display?.displayName,
      avatar: (item as Collaboration).team?.leaderAvatar,
      field: (item as Collaboration).team?.leaderField,
    };

  return (
    <>
      <Card
        onClick={onItemClick}
        sx={{
          borderRadius: '12px',
          boxShadow: '0px 2px 5px 0px rgba(50, 50, 105, 0.15), 0px 1px 1px 0px rgba(0, 0, 0, 0.05)',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          // '&:hover': {
          //   transform: 'translateY(-2px)',
          //   boxShadow: '0px 8px 25px rgba(0, 0, 0, 0.1)',
          // },
        }}
      >
        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
          <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
            {/* 커버 이미지 (LazyImage로 최적화: 썸네일 + 지연 로딩) */}
            <LazyImage
              src={coverImage}
              alt={title}
              type="background"
              targetWidth={160}    // 80px * 2 (retina)
              targetHeight={160}
              thumbnailQuality={75}
              fallbackColor={theme.palette.grey[100]}
              sx={{
                width: 80,
                height: 80,
                borderRadius: '16px',
                flexShrink: 0,
              }}
            />

            {/* 콘텐츠 */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              {/* 헤더 */}
              <Box sx={{ mb: 2, }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5, gap: 1 }}>
                  <Typography
                    sx={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: theme.palette.text.primary,
                      lineHeight: 1.4,
                      textDecoration: showStrikethrough ? 'line-through' : 'none',
                      wordBreak: 'break-all',
                    }}
                  >
                    {title}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>

                    {showReviewBadge && (
                      <Chip
                        label={hasReview ? "리뷰수정" : "리뷰작성"}
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReviewClick?.();
                        }}
                        sx={{
                          backgroundColor: theme.palette.subText.default,
                          color: theme.palette.primary.contrastText,
                          fontWeight: 600,
                          fontSize: 11,
                          height: 24,
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: theme.palette.subText.default,
                          },
                        }}
                      />
                    )}
                    {canShowDelete && (
                      <Button
                        variant="text"
                        color="error"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete();
                        }}
                        sx={{ minWidth: 'auto', px: 0.5, fontSize: 12 }}
                      >
                        삭제
                      </Button>
                    )}
                    {showStatusChip && (
                      <Box ref={statusChipBoxRef} sx={{ display: 'inline-flex' }}>
                        <Chip
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                              {getStatusLabel(item.status)}
                              {isCreator && (
                                <ArrowDropDownRoundedIcon sx={{ fontSize: 14, ml: -0.25 }} />
                              )}
                            </Box>
                          }
                          size="small"
                          onClick={isCreator ? handleStatusClick : undefined}
                          sx={{
                            height: 24,
                            fontSize: 11,
                            fontWeight: 600,
                            backgroundColor:
                              item.status === 'open'
                                ? theme.palette.bgColor?.green || '#F0FFF5'
                                : item.status === 'completed'
                                  ? '#EFF6FF' // 연한 파란색 배경으로 변경 (다른 상태들과 일관성 유지)
                                  : item.status === 'draft'
                                    ? '#FFEDED'
                                    : item.status === 'in_progress'
                                      ? theme.palette.bgColor?.blue || '#ECFDF5'
                                      : item.status === 'cancelled'
                                        ? '#FEF2F2'
                                        : item.status === 'on_hold'
                                          ? '#FEF3C7'
                                          : '#F3F4F6',
                            color:
                              item.status === 'open'
                                ? theme.palette.status?.green || '#16A34A'
                                : item.status === 'completed'
                                  ? '#2563EB' // 진한 파란색 텍스트 (연한 파란색 배경과 대비)
                                  : item.status === 'draft'
                                    ? '#DC2626'
                                    : item.status === 'in_progress'
                                      ? theme.palette.status?.blue || '#2563EB'
                                      : item.status === 'cancelled'
                                        ? '#EF4444'
                                        : item.status === 'on_hold'
                                          ? '#D97706'
                                          : '#4B5563',
                          }}
                        />
                      </Box>
                    )}
                    {/* 숨김/표시 토글 버튼 */}
                    {onToggleHidden && (
                      <Tooltip title={isHiddenInManage ? "항목 표시하기" : "항목 숨기기"} arrow>
                        <IconButton
                          size="small"
                          onClick={onToggleHidden}
                          sx={{
                            p: 0.5,
                            color: isHiddenInManage ? theme.palette.text.disabled : theme.palette.text.secondary,
                            '&:hover': {
                              backgroundColor: theme.palette.action.hover,
                            },
                          }}
                        >
                          {isHiddenInManage ? (
                            <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />
                          ) : (
                            < VisibilityOffOutlinedIcon sx={{ fontSize: 18 }} />
                          )}
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
                <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary, mb: 1.5 }}>
                  {subtitle}
                </Typography>

                {/* 메타데이터 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', rowGap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CalendarToday sx={{ fontSize: 11, color: theme.palette.text.secondary }} />
                    <Typography sx={{ fontSize: 11, color: theme.palette.text.secondary }}>
                      {deadline
                        ? new Date(deadline).toLocaleDateString()
                        : new Date(item.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Person sx={{ fontSize: 11, color: theme.palette.text.secondary }} />
                    <Typography sx={{ fontSize: 11, color: theme.palette.text.secondary }}>
                      {teamSize}명
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <AccessTime sx={{ fontSize: 11, color: theme.palette.text.secondary }} />
                    <Typography sx={{ fontSize: 11, color: theme.palette.text.secondary }}>
                      {formatRelativeTime(item.createdAt)}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* 진행률 */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>진행률</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#2563EB' }}>
                    {getProgress()}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={getProgress()}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: '#EFF6FF',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: '#2563EB',
                      borderRadius: 4,
                    },
                  }}
                />
              </Box>
            </Box>
          </Box>

          {/* 팀 멤버 섹션 */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 400, color: theme.palette.text.primary, mb: 1.5 }}>
              팀
            </Typography>
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                overflowX: 'auto',
                pb: 1,
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none',
              }}
            >
              {/* 리더 (프로젝트의 경우 브랜드) */}
              {leaderInfo && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                  <LazyImage
                    src={leaderInfo.avatar}
                    alt={leaderInfo.name || '리더'}
                    type="background"
                    targetWidth={64}
                    targetHeight={64}
                    thumbnailQuality={75}
                    fallbackColor={theme.palette.grey[200]}
                    sx={{ width: 32, height: 32, borderRadius: '50%' }}
                  />
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: theme.palette.text.primary }}>
                      {leaderInfo.name}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: theme.palette.text.secondary }}>
                      {leaderInfo.field}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* 팀 멤버 */}
              {members.length > 0 ? (
                members.map((member) => (
                  <Box key={member.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                    <Box sx={{ position: 'relative' }}>
                      <LazyImage
                        src={member.profileImageUrl}
                        alt={member.name}
                        type="background"
                        targetWidth={64}
                        targetHeight={64}
                        thumbnailQuality={75}
                        fallbackColor={theme.palette.grey[200]}
                        sx={{ width: 32, height: 32, borderRadius: '50%' }}
                      />
                      {member.isOnline && (
                        <Box
                          sx={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: 8,
                            height: 8,
                            bgcolor: '#10B981',
                            borderRadius: '50%',
                            border: '1.5px solid white',
                          }}
                        />
                      )}
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: theme.palette.text.primary }}>
                        {member.name}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: theme.palette.text.secondary }}>
                        {member.activityField}
                      </Typography>
                    </Box>
                  </Box>
                ))
              ) : !leaderInfo ? (
                <Typography sx={{ fontSize: 13, color: theme.palette.text.secondary }}>
                  아직 팀원이 없어요.
                </Typography>
              ) : null}
            </Box>
          </Box>

          {/* 버튼 */}
          <Box sx={{ display: 'flex', gap: 1.5, width: '100%' }}>
            <Button
              variant="contained"
              fullWidth
              onClick={onTeamChatClick}
              sx={{
                bgcolor: '#2563EB',
                borderRadius: '20px',
                height: 34,
                fontSize: 14,
                fontWeight: 400,
                boxShadow: 'none',
                flex: canShowFileShare ? 2 : 1,
              }}
            >
              팀 채팅
            </Button>
            {canShowFileShare && (
              <Button
                variant="outlined"
                fullWidth
                onClick={onFileShareClick}
                sx={{
                  borderColor: theme.palette.divider,
                  borderRadius: '20px',
                  height: 34,
                  fontSize: 14,
                  fontWeight: 400,
                  color: theme.palette.text.secondary,
                  flex: 1,
                }}
              >
                파일 공유
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* 상태 변경 메뉴 - ref를 anchor로 사용하여 안정적인 위치 참조 */}
      <StatusDropdownMenu
        anchorEl={anchorEl}
        open={statusMenuOpen && !!anchorEl}
        onClose={handleStatusMenuClose}
        currentStatus={item.status as ProjectStatus}
        onSelect={handleStatusChange}
        excludeStatuses={excludeDeletedStatus ? ['deleted'] : []}
      />
    </>
  );
}

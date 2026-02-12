import { useState, memo, useCallback } from 'react';
import { Box, Typography, Button, Avatar, Chip, IconButton, useTheme } from '@mui/material';
import Favorite from '@mui/icons-material/Favorite';
import FavoriteBorder from '@mui/icons-material/FavoriteBorder';
import { STATUS_LABELS, getCategoryLabel } from '../../constants/projectConstants';
import WorkflowSteps from './WorkflowSteps';
import ProjectCardMenu, { type MenuActionItem } from './ProjectCardMenu';
import LazyImage from '../common/LazyImage';
import type { Project } from '../../services/exploreService';
import ActionResultModal from '../common/ActionResultModal';
import { ReportModal, type ReportTargetType } from '../common';
import type { ActionType } from '../common/ReasonModal';
import { useExploreStore } from '../../stores/exploreStore';
import { getThumbnailUrl } from '../../utils/signedUrl';

import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import MoneyOutlinedIcon from '@mui/icons-material/MoneyOutlined';
import verifiedBadge from '../../assets/images/verified-badge.png';


interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onActionSuccess?: (projectId: string, action: ActionType) => void;
  currentUserId?: string;  // Props로 전달받아 개별 auth 요청 제거
  menuItems?: MenuActionItem[];
  simpleView?: boolean;
  isLoggedIn?: boolean;
  onRequireLogin?: () => void;
  typeTag?: string;
  bottomAction?: React.ReactNode;
}

// 날짜 형식을 "YYYY-MM-DD"에서 "YYYY년 M월 D일"로 변환하는 함수
function formatDeadlineToKorean(deadline: string | undefined): string {
  if (!deadline) return '';

  // "YYYY-MM-DD" 형식인 경우
  const match = deadline.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const year = match[1];
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    return `${year}년 ${month}월 ${day}일`;
  }

  // 이미 변환된 형식이거나 다른 형식인 경우 그대로 반환
  return deadline;
}

const ProjectCard = memo(({ project, onClick, onActionSuccess, currentUserId, menuItems, simpleView, isLoggedIn = false, onRequireLogin, typeTag, bottomAction }: ProjectCardProps) => {
  const theme = useTheme();
  const { isProjectLiked, toggleLikeProject } = useExploreStore();
  const isLiked = isLoggedIn ? isProjectLiked(project.id) : false;
  const [isVisible, setIsVisible] = useState(true);
  const [resultAction, setResultAction] = useState<ActionType | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const handleLikeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }
    toggleLikeProject(project.id);
  }, [isLoggedIn, onRequireLogin, project.id, toggleLikeProject]);

  // 내가 만든 프로젝트인지 확인 (createdBy 또는 team.leaderId로 확인)
  const isMyProject = currentUserId && (
    project.createdBy === currentUserId ||
    project.team?.leaderId === currentUserId
  );

  const handleActionSuccess = useCallback((action: ActionType) => {
    setIsVisible(false);
    setResultAction(action);
    onActionSuccess?.(project.id, action);
  }, [project.id, onActionSuccess]);

  const handleResultClose = useCallback(() => {
    setResultAction(null);
  }, []);

  return (
    <>
      {isVisible && (
        <Box
          onClick={onClick}
          sx={{
            backgroundColor: theme.palette.background.paper,
            overflow: 'hidden',
            borderRadius: '12px',
            boxShadow: '0px 2px 5px 0px rgba(50, 50, 105, 0.15), 0px 1px 1px 0px rgba(0, 0, 0, 0.05)',
            p: 2,
            cursor: 'pointer',
          }}
        >
          {/* Header: Image + Info */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            {/* Cover Image - Left */}
            <Box sx={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
              <LazyImage
                src={project.coverImage}
                type="background"
                fallbackColor="#E9E9ED"
                alt={project.title}
                targetWidth={160}
                targetHeight={160}
                objectFit="cover"
                sx={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '8px',
                }}
              />
              {project.settlementStatus === 'paid' && (
                <Box
                  component="img"
                  src={verifiedBadge}
                  alt="LYT VERIFIED"
                  sx={{
                    position: 'absolute',
                    top: -5,
                    left: -3,
                    width: 20,
                    height: 20,
                    objectFit: 'contain',
                  }}
                />
              )}
            </Box>


            {/* Info - Right */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {/* Row 1: Title, Status, Menu */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Typography
                  sx={{
                    flex: 1,
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                    lineHeight: 1.3,
                    wordBreak: 'break-word',
                    whiteSpace: 'normal',
                  }}
                >
                  {project.title}
                </Typography>

                {/* Type Tag */}
                {typeTag && (
                  <Chip
                    label={typeTag}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: 11,
                      fontFamily: 'Pretendard, sans-serif',
                      fontWeight: 600,
                      backgroundColor: theme.palette.grey[100],
                      color: theme.palette.text.secondary,
                      flexShrink: 0,
                    }}
                  />
                )}

                <Chip
                  label={STATUS_LABELS[project.status]}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: 11,
                    fontFamily: 'Pretendard, sans-serif',
                    fontWeight: 600,
                    // color: project.status === 'in_progress' ? theme.palette.status.blue : theme.palette.status.green,

                    // backgroundColor: project.status === 'in_progress' ? theme.palette.bgColor.blue : theme.palette.bgColor.green,
                    flexShrink: 0,
                    backgroundColor:
                      project.status === 'open'
                        ? theme.palette.bgColor?.green || '#F0FFF5'
                        : project.status === 'completed'
                          ? theme.palette.icon?.default || '#2563EB'
                          : project.status === 'draft'
                            ? '#FFEDED'
                            : project.status === 'in_progress'
                              ? theme.palette.bgColor?.blue || '#ECFDF5'
                              : '#F3F4F6',
                    color:
                      project.status === 'open'
                        ? theme.palette.status?.green || '#16A34A'
                        : project.status === 'completed'
                          ? theme.palette.background?.default || '#fff'
                          : project.status === 'draft'
                            ? '#DC2626'
                            : project.status === 'in_progress'
                              ? theme.palette.status?.blue || '#2563EB'
                              : '#4B5563',
                  }}
                />
                {isLoggedIn && !isMyProject && (
                  <ProjectCardMenu
                    projectId={project.id}
                    projectBrandName={project.team?.leaderName || project.display?.displayName || project.brandName}
                    onActionSuccess={handleActionSuccess}
                    leaderId={project.team?.leaderId || project.createdBy}
                    currentUserId={currentUserId}
                    onReport={() => setShowReportModal(true)}
                    menuItems={menuItems}
                  />
                )}
              </Box>

              {/* Row 2: Leader Name (team.leaderName 우선 사용 - is_active 필터링된 값), Category */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  sx={{
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 14,
                    fontWeight: 300,
                    color: theme.palette.subText.default,
                  }}
                >
                  {project.team?.leaderName || project.display?.displayName || project.brandName}
                </Typography>
                {/* {project.display?.displayField && (
                  <Chip
                    label={project.display.displayField}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: 10,
                      fontFamily: 'Pretendard, sans-serif',
                      fontWeight: 300,
                      backgroundColor: theme.palette.background.paper,
                      color: theme.palette.subText.default,
                      border: `1px solid ${theme.palette.subText.default}`,
                    }}
                  />
                )} */}
                <Chip
                  label={getCategoryLabel(project.category)}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: 10,
                    fontFamily: 'Pretendard, sans-serif',
                    fontWeight: 300,
                    backgroundColor: theme.palette.grey[50],
                    color: theme.palette.subText.default,
                  }}
                />
              </Box>

              {/* Row 3: Budget, Deadline, Capacity */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mt: 0.5 }}>
                {project.budget && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <MoneyOutlinedIcon sx={{ fontSize: 12, color: theme.palette.icon.default }} />
                    <Typography
                      sx={{
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: 12,
                        color: theme.palette.text.secondary,
                      }}
                    >
                      {project.budget}
                    </Typography>
                  </Box>)}
                {project.deadline && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CalendarMonthOutlinedIcon sx={{ fontSize: 12, color: theme.palette.icon.default }} />
                    <Typography
                      sx={{
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: 12,
                        color: theme.palette.text.secondary,
                      }}
                    >
                      {formatDeadlineToKorean(project.deadline)}
                    </Typography>
                  </Box>
                )}
                {project.capacity && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PeopleAltOutlinedIcon sx={{ fontSize: 12, color: theme.palette.icon.default }} />
                    <Typography
                      sx={{
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: 12,
                        color: theme.palette.text.secondary,
                      }}
                    >
                      {project.capacity}명
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>

          {/* Workflow Steps */}
          {!simpleView && (
            <Box
              sx={{
                pb: 1.5,
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 12,

                  color: theme.palette.text.primary,
                  mb: 1,
                }}
              >
                작업 현황
                {!isMyProject && (
                  <Box component="span" sx={{ float: 'right', ml: 1 }}>
                    <IconButton
                      onClick={handleLikeClick}
                      sx={{
                        p: 0.5,
                        flexShrink: 0,
                      }}
                    >
                      {isLiked ? (
                        <Favorite sx={{ fontSize: 20, color: theme.palette.status.red }} />
                      ) : (
                        <FavoriteBorder sx={{ fontSize: 20, color: theme.palette.text.secondary }} />
                      )}
                    </IconButton>
                  </Box>
                )}
              </Typography>

              <WorkflowSteps steps={project.workflowSteps} />

            </Box>
          )}

          {/* Team */}
          <Box
            sx={{
              pt: 1,
            }}
          >
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 12,
                fontWeight: 500,
                color: theme.palette.subText.secondary,
                mb: 1,
              }}
            >
              팀
            </Typography>
            {project.team && project.team.leaderName && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar
                  src={
                    project.team.leaderAvatar
                      ? getThumbnailUrl(project.team.leaderAvatar, 72, 72, 75) ?? project.team.leaderAvatar
                      : undefined
                  }
                  alt={project.team.leaderName}
                  sx={{ width: 36, height: 36 }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 12,
                      fontWeight: 400,
                      color: theme.palette.subText.secondary,
                    }}
                  >
                    {project.team.leaderName}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 12,
                      color: theme.palette.text.secondary,
                    }}
                  >
                    {project.team.leaderField}
                  </Typography>
                </Box>
                {project.team.totalMembers > 1 && (
                  <Typography
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 12,
                      color: theme.palette.text.secondary,
                    }}
                  >
                    외 {project.team.totalMembers - 1}명
                  </Typography>
                )}
              </Box>
            )}
          </Box>

          {/* Action Button */}
          {!simpleView && (
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
                sx={{
                  height: '34px',
                  width: '58%',
                  borderRadius: '24px',
                  backgroundColor: theme.palette.primary.main,
                  color: '#fff',
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 14,
                  fontWeight: 400,
                  textTransform: 'none',
                  minWidth: 230,
                }}
              >
                프로젝트 보기
              </Button>
            </Box>
          )}

          {bottomAction && (
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mt: 2 }}>
              {bottomAction}
            </Box>
          )}

        </Box>
      )}

      <ActionResultModal
        open={resultAction !== null}
        onClose={handleResultClose}
        title={
          !resultAction
            ? ''
            : resultAction === 'hide'
              ? `${project.title || project.display?.displayName + "님의" || project.brandName + "님의"} 프로젝트를 숨겼어요`
              : `${project.team?.leaderName || project.display?.displayName || project.brandName}님이 차단되었어요.`
        }
        description={
          !resultAction
            ? ''
            : resultAction === 'hide'
              ? '해당 프로젝트는 탐색 피드에서 더 이상 노출되지 않아요.'
              : '차단된 사용자는 설정 > 차단계정관리에서 확인할 수 있어요. '
        }
      />

      <ReportModal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType={'project' as ReportTargetType}
        targetId={project.id}
        targetName={project.title}
      />
    </>
  );
});

ProjectCard.displayName = 'ProjectCard';

export default ProjectCard;

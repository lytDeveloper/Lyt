import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Typography, Skeleton, Card, CardContent, CardMedia, Chip, LinearProgress, Fab, useTheme } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import Header, { HEADER_HEIGHT } from '../../components/common/Header';
import BottomNavigationBar, { BOTTOM_NAV_HEIGHT } from '../../components/navigation/BottomNavigationBar';
import { getProjectById, type Project } from '../../services/projectService';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';
import { getTotalMembers } from '../../utils/teamHelpers';
import PendingApprovalNotice from '../../components/common/PendingApprovalNotice';
import { useBrandApprovalStatus } from '../../hooks/useBrandApprovalStatus';

export default function ManageProjectDetail() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { approvalStatus, isRestricted } = useBrandApprovalStatus();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const isOwner = project?.createdBy === currentUserId;

  useEffect(() => {
    const loadProject = async () => {
      if (isRestricted) {
        setIsLoading(false);
        return;
      }
      if (!id) {
        toast.error('잘못된 접근입니다');
        navigate('/manage');
        return;
      }

      try {
        setIsLoading(true);
        const data = await getProjectById(id);
        if (!data) {
          toast.error('프로젝트를 찾을 수 없습니다');
          navigate('/manage');
          return;
        }
        setProject(data);
      } catch (error) {
        console.error('[ManageProjectDetail] Failed to load project:', error);
        toast.error('프로젝트를 불러오는데 실패했습니다');
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [id, navigate, isRestricted]);

  const getProgress = (project: Project) => {
    if (!project.workflowSteps || project.workflowSteps.length === 0) return 0;
    const completedSteps = project.workflowSteps.filter((step) => step.isCompleted).length;
    return Math.round((completedSteps / project.workflowSteps.length) * 100);
  };

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
      {/* Header - Fixed */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: '#fff',
          borderBottom: `1px solid ${theme.palette.grey[100]}`,
          zIndex: 1000,
        }}
      >
        <Header />
      </Box>

      {/* Main Scrollable Content */}
      <Box
        sx={{
          position: 'absolute',
          top: `${HEADER_HEIGHT}px`,
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
        <Box sx={{ px: 2, py: 3 }}>
          {/* Page Title */}
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 24,
              fontWeight: 700,
              color: theme.palette.text.primary,
              mb: 1,
            }}
          >
            내 프로젝트 관리
          </Typography>
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 14,
              color: theme.palette.text.secondary,
              mb: 3,
            }}
          >
            내가 만들거나 참여 중인 프로젝트 목록입니다
          </Typography>

          {isLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rectangular" width="100%" height={120} sx={{ borderRadius: '12px' }} />
              ))}
            </Box>
          ) : !project ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 8,
                backgroundColor: theme.palette.grey[50],
                borderRadius: '16px',
              }}
            >
              <Typography sx={{ fontSize: 48, mb: 2 }}>📂</Typography>
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 16,
                  fontWeight: 600,
                  color: theme.palette.text.primary,
                  mb: 1,
                }}
              >
                참여 중인 프로젝트가 없습니다
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 14,
                  color: theme.palette.text.secondary,
                }}
              >
                새로운 프로젝트를 시작하거나 참여해보세요
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Card
                sx={{
                  display: 'flex',
                  borderRadius: '16px',
                  boxShadow: 'none',
                  border: `1px solid ${theme.palette.divider}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <CardMedia
                  component="img"
                  sx={{ width: 100, objectFit: 'cover' }}
                  image={project.coverImage}
                  alt={project.title}
                  loading="lazy"
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <CardContent sx={{ flex: '1 0 auto', p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography
                        component="div"
                        sx={{
                          fontFamily: 'Pretendard, sans-serif',
                          fontSize: 16,
                          fontWeight: 700,
                          color: theme.palette.text.primary,
                          lineHeight: 1.3,
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {project.title}
                      </Typography>
                      <Chip
                        label={project.status === 'open' ? '모집중' : project.status === 'completed' ? '완료' : '진행중'}
                        size="small"
                        sx={{
                          height: 24,
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: project.status === 'open' ? '#EFF6FF' : project.status === 'completed' ? theme.palette.grey[100] : '#ECFDF5',
                          color: project.status === 'open' ? '#2563EB' : project.status === 'completed' ? '#4B5563' : '#059669',
                        }}
                      />
                    </Box>
                    <Typography
                      variant="subtitle1"
                      color="text.secondary"
                      component="div"
                      sx={{
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: 13,
                        color: theme.palette.text.secondary,
                        mb: 1.5,
                      }}
                    >
                      {project.brandName}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={getProgress(project)}
                        sx={{
                          flex: 1,
                          height: 6,
                          borderRadius: 3,
                          bgcolor: theme.palette.divider,
                          '& .MuiLinearProgress-bar': {
                            bgcolor: '#2563EB',
                            borderRadius: 3,
                          }
                        }}
                      />
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#2563EB' }}>
                        {getProgress(project)}%
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ fontSize: 12 }}>👥</Typography>
                        <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>
                          {getTotalMembers(project.members)}명
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ fontSize: 12 }}>📅</Typography>
                        <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>
                          {project.deadline}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Box>
              </Card>
            </Box>
          )}
        </Box>
      </Box>

      <BottomNavigationBar />

      {/* Edit Button for Owner */}
      {isOwner && (
        <Fab
          color="primary"
          aria-label="edit"
          sx={{
            position: 'absolute',
            bottom: `${BOTTOM_NAV_HEIGHT + 16}px`,
            right: 16,
            bgcolor: theme.palette.primary.main,
            zIndex: 1000
          }}
          onClick={() => {
            toast.info('프로젝트 수정 기능은 준비 중입니다');
          }}
        >
          <EditIcon />
        </Fab>
      )}
    </Box>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Avatar, Skeleton, LinearProgress, useTheme } from '@mui/material';
import Header, { HEADER_HEIGHT } from '../../components/common/Header';
import BottomNavigationBar, { BOTTOM_NAV_HEIGHT } from '../../components/navigation/BottomNavigationBar';
import FileUploadModal from '../../components/common/FileUploadModal';
import { getCollaborationById, type Collaboration } from '../../services/collaborationService';
import { toast } from 'react-toastify';
import { getLeader, getNonLeaderMembers } from '../../utils/teamHelpers';

export default function ManageCollaborationDetail() {
  const theme = useTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [collaboration, setCollaboration] = useState<Collaboration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFileUploadModalOpen, setFileUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Load collaboration data
  useEffect(() => {
    if (!id) {
      toast.error('협업 ID가 없습니다');
      navigate('/explore');
      return;
    }

    const loadCollaboration = async () => {
      try {
        setIsLoading(true);
        const data = await getCollaborationById(id);
        if (!data) {
          toast.error('협업을 찾을 수 없습니다');
          navigate('/explore');
          return;
        }
        setCollaboration(data);
      } catch (error) {
        console.error('[ManageCollaboration] Failed to load collaboration:', error);
        toast.error('협업을 불러오는데 실패했습니다');
        navigate('/explore');
      } finally {
        setIsLoading(false);
      }
    };

    loadCollaboration();
  }, [id, navigate]);

  const handleFileUpload = async (files: File[], description: string, sharedWith: 'all' | string[]) => {
    try {
      setIsUploading(true);
      // TODO: 파일 업로드 로직 구현
      console.log('File upload:', { files, description, sharedWith });
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 임시 딜레이
      toast.success('파일이 공유되었습니다');
    } catch (error) {
      console.error('[ManageProject] Failed to upload file:', error);
      toast.error('파일 공유에 실패했습니다');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTeamChatClick = () => {
    alert('팀 채팅 기능은 준비 중입니다.');
  };

  // Calculate days since creation
  const daysAgo = useMemo(() => {
    if (!collaboration?.createdAt) return '0일 전';
    const created = new Date(collaboration.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '1일 전';
    if (diffDays < 7) return `${diffDays}일 전`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
    return `${Math.floor(diffDays / 30)}개월 전`;
  }, [collaboration?.createdAt]);

  // Calculate progress percentage (Collaboration doesn't have workflowSteps, so return 0)
  const progressPercentage = useMemo(() => {
    // Collaboration type doesn't have workflowSteps, so we can't calculate progress
    // Return 0 or implement alternative progress calculation if needed
    return 0;
  }, []);

  if (isLoading || !collaboration) {
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
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: '#fff',
            borderBottom: '1px solid theme.palette.grey[100]',
            zIndex: 1000,
          }}
        >
          <Header />
        </Box>

        <Box
          sx={{
            position: 'absolute',
            top: `${HEADER_HEIGHT}px`,
            left: 0,
            right: 0,
            bottom: `${BOTTOM_NAV_HEIGHT}px`,
            overflowY: 'auto',
            px: 2,
            py: 3,
          }}
        >
          <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" width="100%" height={120} sx={{ borderRadius: '12px', mb: 3 }} />
          <Skeleton variant="text" width="30%" height={24} sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rectangular" width="100%" height={60} sx={{ borderRadius: '12px' }} />
            ))}
          </Box>
        </Box>

        <BottomNavigationBar />
      </Box>
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
          borderBottom: '1px solid theme.palette.grey[100]',
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
            협업 관리
          </Typography>
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 14,
              color: theme.palette.text.secondary,
              mb: 3,
            }}
          >
            팀과 함께 협업를 성공적으로 완료하세요
          </Typography>

          <Box sx={{ mt: 3 }}>
            {/* Project Info Card */}
            <Box
              sx={{
                backgroundColor: theme.palette.grey[50],
                borderRadius: '16px',
                p: 2.5,
                mb: 3,
              }}
            >
              {/* Row 1 & 2: Cover Image + Title + Brand */}
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Box
                  sx={{
                    width: 100,
                    height: 100,
                    borderRadius: '12px',
                    backgroundImage: `url(${collaboration.coverImageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Title */}
                  <Typography
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 17,
                      fontWeight: 700,
                      color: theme.palette.text.primary,
                      mb: 0.5,
                      lineHeight: 1.3,
                    }}
                  >
                    {collaboration.title}
                  </Typography>


                  {/* Row 3: Team Size, Days Ago */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography sx={{ fontSize: 14 }}>👥</Typography>
                      <Typography
                        sx={{
                          fontFamily: 'Pretendard, sans-serif',
                          fontSize: 13,
                          color: theme.palette.text.secondary,
                        }}
                      >
                        {collaboration.currentTeamSize}명
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography sx={{ fontSize: 14 }}>🕒</Typography>
                      <Typography
                        sx={{
                          fontFamily: 'Pretendard, sans-serif',
                          fontSize: 13,
                          color: theme.palette.text.secondary,
                        }}
                      >
                        {daysAgo}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* Row 4: Progress Bar */}
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 13,
                      color: theme.palette.text.secondary,
                    }}
                  >
                    진행률
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 15,
                      fontWeight: 600,
                      color: '#2563EB',
                    }}
                  >
                    {progressPercentage}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={progressPercentage}
                  sx={{
                    height: 8,
                    borderRadius: '4px',
                    backgroundColor: theme.palette.divider,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: '#2563EB',
                      borderRadius: '4px',
                    },
                  }}
                />
              </Box>
            </Box>

            {/* Team Members Carousel */}
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 16,
                fontWeight: 600,
                color: theme.palette.text.primary,
                mb: 2,
              }}
            >
              팀
            </Typography>
            <Box
              sx={{
                display: 'flex',
                gap: 1.5,
                overflowX: 'auto',
                pb: 2,
                mb: 3,
                '&::-webkit-scrollbar': {
                  height: 6,
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: theme.palette.grey[100],
                  borderRadius: '3px',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: theme.palette.divider,
                  borderRadius: '3px',
                },
              }}
            >
              {/* Leader */}
              {(() => {
                const leader = getLeader(collaboration.members);
                return leader && (
                  <Box
                    sx={{
                      minWidth: 200,
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: '12px',
                      border: `1px solid ${theme.palette.divider}`,
                      backgroundColor: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    <Box sx={{ position: 'relative', flexShrink: 0 }}>
                      <Avatar src={leader.profileImageUrl} sx={{ width: 48, height: 48 }} />
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: '#10B981',
                          border: '2px solid #fff',
                        }}
                      />
                    </Box>
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontFamily: 'Pretendard, sans-serif',
                          fontSize: 13,
                          fontWeight: 600,
                          color: theme.palette.text.primary,
                          mb: 0.25,
                          lineHeight: 1.2,
                        }}
                      >
                        {leader.name}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: 'Pretendard, sans-serif',
                          fontSize: 11,
                          color: theme.palette.text.secondary,
                          lineHeight: 1.2,
                        }}
                      >
                        {leader.activityField}
                      </Typography>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          px: 1,
                          py: 0.25,
                          borderRadius: '8px',
                          backgroundColor: '#EFF6FF',
                          mt: 0.5,
                          width: 'fit-content',
                        }}
                      >
                        <Typography
                          sx={{
                            fontFamily: 'Pretendard, sans-serif',
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#2563EB',
                          }}
                        >
                          리더
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                );
              })()}

              {/* Team Members */}
              {getNonLeaderMembers(collaboration.members).map((member, index: number) => (
                <Box
                  key={index}
                  sx={{
                    minWidth: 200,
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1.5,
                    borderRadius: '12px',
                    border: '1px solid theme.palette.divider',
                    backgroundColor: '#fff',
                    flexShrink: 0,
                  }}
                >
                  <Box sx={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar src={member.profileImageUrl} sx={{ width: 48, height: 48 }} />
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: member.isOnline ? '#10B981' : theme.palette.text.secondary,
                        border: '2px solid #fff',
                      }}
                    />
                  </Box>
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: 13,
                        fontWeight: 600,
                        color: theme.palette.text.primary,
                        mb: 0.25,
                        lineHeight: 1.2,
                      }}
                    >
                      {member.name}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: 'Pretendard, sans-serif',
                        fontSize: 11,
                        color: theme.palette.text.secondary,
                        lineHeight: 1.2,
                      }}
                    >
                      {member.activityField}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Team Actions - Same Row */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              {/* Team Chat Button - Large */}
              <Button
                onClick={handleTeamChatClick}
                variant="contained"
                sx={{
                  flex: 1,
                  height: 56,
                  borderRadius: '28px',
                  backgroundColor: '#2563EB',
                  color: '#fff',
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 16,
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: 'none',
                }}
              >
                팀 채팅
              </Button>

              {/* File Share Button - Small */}
              <Button
                onClick={() => setFileUploadModalOpen(true)}
                variant="outlined"
                sx={{
                  minWidth: 120,
                  height: 56,
                  borderRadius: '28px',
                  borderColor: theme.palette.divider,
                  color: theme.palette.text.primary,
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 15,
                  fontWeight: 600,
                  textTransform: 'none',
                }}
              >
                파일 공유
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      <BottomNavigationBar />

      {/* File Upload Modal */}
      <FileUploadModal
        open={isFileUploadModalOpen}
        onClose={() => setFileUploadModalOpen(false)}
        entity={collaboration}
        entityType="collaboration"
        isUploading={isUploading}
        onUploadSuccess={handleFileUpload}
      />
    </Box>
  );
}

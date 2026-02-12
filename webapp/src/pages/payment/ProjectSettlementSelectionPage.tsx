import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  Avatar,
  LinearProgress,
  CircularProgress,
  Card,
  CardContent,
  useTheme,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import { Header } from '../../components/common';
import { projectService, type Project } from '../../services/projectService';
import { useAuth } from '../../providers/AuthContext';
import { getCategoryLabel } from '../../constants/projectConstants';
import LazyImage from '../../components/common/LazyImage';

const DISTRIBUTION_STATUS_MAP = {
  pending: { label: '정산 대기', bgcolor: '#ECFDF5', color: '#059669' },
  submitted: { label: '정산 검토', bgcolor: '#EFF6FF', color: '#2563EB' },
  completed: { label: '정산 완료', bgcolor: '#F3F4F6', color: '#6B7280' },
} as const;

function formatSettlementDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function formatRelativeTime(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return formatSettlementDate(dateStr);
}

export default function ProjectSettlementSelectionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const list = await projectService.getCompletedProjectsForSettlement(user.id);
        setProjects(list);
      } catch (err) {
        console.error('[ProjectSettlementSelectionPage] load failed:', err);
        setError(err instanceof Error ? err.message : '프로젝트 목록을 불러오지 못했어요.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user?.id]);

  const handleProjectClick = (projectId: string) => {
    navigate(`/profile/revenue/settlement/${projectId}`);
  };

  return (
    <Box sx={{ pb: 6, bgcolor: '#F9FAFB', minHeight: '100vh' }}>
      <Box sx={{ bgcolor: 'white' }}>
        <Header
          showBackButton
          title="프로젝트 정산"
          onBackClick={() => navigate(-1)}
        />
      </Box>

      <Box sx={{ px: 2, pt: 2 }}>
        {/* Info banner */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2,
            borderRadius: '16px',
            bgcolor: '#F3F4F6',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
          }}
        >
          <InfoOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20, mt: 0.25 }} />
          <Typography variant="body2" color="text.secondary">
            완료된 프로젝트의 파트너별 기여도에 따라 수익을 배분하세요.
          </Typography>
        </Paper>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Typography color="error" sx={{ py: 2 }}>
            {error}
          </Typography>
        )}

        {!loading && !error && projects.length === 0 && (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            완료된 프로젝트가 없어요.
          </Typography>
        )}

        {!loading && !error && projects.length > 0 && (
          <Stack spacing={2}>
            {projects.map((project) => {
              const statusKey = project.distributionRequestStatus || 'pending';
              const statusStyle = DISTRIBUTION_STATUS_MAP[statusKey] || DISTRIBUTION_STATUS_MAP.pending;
              const totalMembers = project.team?.totalMembers ?? 0;
              const dateLabel = formatSettlementDate(project.createdAt);

              return (
                <Card
                  key={project.id}
                  onClick={() => handleProjectClick(project.id)}
                  sx={{
                    borderRadius: '12px',
                    boxShadow: '0px 2px 5px 0px rgba(50, 50, 105, 0.15), 0px 1px 1px 0px rgba(0, 0, 0, 0.05)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                    <Box sx={{ display: 'flex', gap: 3 }}>
                      {/* 커버 이미지 (LazyImage로 최적화: 썸네일 + 지연 로딩) */}
                      <LazyImage
                        src={project.coverImage}
                        alt={project.title}
                        type="background"
                        targetWidth={160}
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

                      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        {/* 헤더 */}
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5, gap: 1 }}>
                            <Typography
                              sx={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: theme.palette.text.primary,
                                lineHeight: 1.4,
                                wordBreak: 'break-all',
                              }}
                            >
                              {project.title}
                            </Typography>
                            <Chip
                              label={statusStyle.label}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '11px',
                                fontWeight: 700,
                                bgcolor: statusStyle.bgcolor,
                                color: statusStyle.color,
                                flexShrink: 0,
                              }}
                            />
                          </Box>

                          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                            <Typography
                              sx={{
                                fontSize: 12,
                                color: theme.palette.text.secondary,
                              }}
                            >
                              {project.team?.leaderName || project.display?.displayName || project.brandName}
                            </Typography>
                            <Chip
                              label={getCategoryLabel(project.category)}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '10px',
                                bgcolor: theme.palette.grey[200],
                                color: theme.palette.text.secondary,
                              }}
                            />
                          </Stack>
                        </Box>

                        {/* 정보 */}
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={1.5}
                          sx={{
                            flexWrap: 'wrap',
                            rowGap: 0.5,
                            mb: 2,
                          }}
                        >
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <CalendarMonthOutlinedIcon sx={{ fontSize: 12, color: theme.palette.text.disabled }} />
                            <Typography variant="caption" color="text.secondary">
                              {dateLabel}
                            </Typography>
                          </Stack>
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <PeopleAltOutlinedIcon sx={{ fontSize: 12, color: theme.palette.text.disabled }} />
                            <Typography variant="caption" color="text.secondary">
                              {totalMembers}명
                            </Typography>
                          </Stack>
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <ScheduleOutlinedIcon sx={{ fontSize: 12, color: theme.palette.text.disabled }} />
                            <Typography variant="caption" color="text.secondary">
                              {formatRelativeTime(project.createdAt)}
                            </Typography>
                          </Stack>
                        </Stack>

                        {/* 진행률 */}
                        <Box sx={{ mb: 2 }}>
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                            <Typography
                              sx={{
                                fontSize: 11,
                                color: theme.palette.text.secondary,
                                fontWeight: 600,
                              }}
                            >
                              진행률
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: 11,
                                color: theme.palette.primary.main,
                                fontWeight: 700,
                              }}
                            >
                              100%
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={100}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: theme.palette.grey[200],
                              '& .MuiLinearProgress-bar': {
                                bgcolor: theme.palette.primary.main,
                                borderRadius: 3,
                              },
                            }}
                          />
                        </Box>

                        {/* 팀 멤버 */}
                        {project.team?.members && project.team.members.length > 0 && (
                          <Box>
                            <Typography
                              sx={{
                                fontSize: 11,
                                color: theme.palette.text.secondary,
                                fontWeight: 600,
                                mb: 0.5,
                              }}
                            >
                              팀 멤버
                            </Typography>
                            <Stack direction="row" spacing={-0.75}>
                              {project.team.members.slice(0, 5).map((m) => (
                                <Avatar
                                  key={m.id}
                                  src={m.profileImageUrl}
                                  sx={{
                                    width: 28,
                                    height: 28,
                                    border: '2px solid white',
                                    fontSize: 11,
                                    bgcolor: theme.palette.grey[400],
                                  }}
                                >
                                  {m.name?.charAt(0) || '?'}
                                </Avatar>
                              ))}
                            </Stack>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

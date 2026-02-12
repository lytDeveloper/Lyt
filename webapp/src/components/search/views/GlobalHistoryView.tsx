import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  useTheme,
  Button,
} from '@mui/material';
import { LightningLoader } from '../../common';
import CloseIcon from '@mui/icons-material/Close';
import { searchService } from '../../../services/searchService';
import {
  getRecentlyViewed,
  getRecentlyViewedFromServer,
  getRecentlyViewedProjectsWithDetails,
  getRecentlyViewedCollaborationsWithDetails,
  type RecentViewItem,
  type RecentViewProjectItem,
  type RecentViewCollaborationItem,
} from '../../../services/recentViewsService';
import { useAuth } from '../../../providers/AuthContext';
import type { SearchHistory } from '../../../types/search.types';
import RecentIconImg from '../../../assets/icon/search/recent.png';
import PartnerIconImg from '../../../assets/icon/search/partner.png';
import ProjectIconImg from '../../../assets/icon/search/project.png';
import CollaborationIconImg from '../../../assets/icon/search/collaboration.png';
import ArrowDropDownRoundedIcon from '@mui/icons-material/ArrowDropDownRounded';
import ArrowDropUpRoundedIcon from '@mui/icons-material/ArrowDropUpRounded';

// 날짜를 YYYY.MM.DD 형식으로 포맷
const formatDeadline = (deadline: string | null | undefined): string => {
  if (!deadline) return '';
  const date = new Date(deadline);
  if (isNaN(date.getTime())) return deadline;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
};

const INITIAL_DISPLAY_COUNT = 2;
const LOAD_MORE_COUNT = 5;

interface GlobalHistoryViewProps {
  onSearchClick: (query: string) => void;
  onPartnerClick?: (partnerId: string) => void; // Optional - if provided, shows modal instead of navigating
}

export default function GlobalHistoryView({ onSearchClick, onPartnerClick }: GlobalHistoryViewProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recentSearches, setRecentSearches] = useState<SearchHistory[]>([]);
  const [recentPartners, setRecentPartners] = useState<RecentViewItem[]>([]);
  const [recentProjects, setRecentProjects] = useState<RecentViewProjectItem[]>([]);
  const [recentCollaborations, setRecentCollaborations] = useState<RecentViewCollaborationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 프로젝트/협업 표시 개수 상태
  const [projectDisplayCount, setProjectDisplayCount] = useState(INITIAL_DISPLAY_COUNT);
  const [collaborationDisplayCount, setCollaborationDisplayCount] = useState(INITIAL_DISPLAY_COUNT);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (user) {
        // 로그인 사용자: 최근 검색어 + 서버에서 최근 본 콘텐츠 조회 (상세 정보 포함)
        const [recent, serverPartners, serverProjects, serverCollaborations] = await Promise.all([
          searchService.getRecentSearches(user.id, 5),
          getRecentlyViewedFromServer(user.id, 'partner', 30),
          getRecentlyViewedProjectsWithDetails(user.id, 30),
          getRecentlyViewedCollaborationsWithDetails(user.id, 30),
        ]);
        setRecentSearches(recent);
        setRecentPartners(serverPartners);
        setRecentProjects(serverProjects);
        setRecentCollaborations(serverCollaborations);
      } else {
        // 비로그인 사용자: LocalStorage에서 최근 본 콘텐츠만 조회
        setRecentPartners(getRecentlyViewed('partner', 30));
        // LocalStorage는 상세 정보 없음 - 기본 타입으로 변환
        const localProjects = getRecentlyViewed('project', 30).map((p) => ({
          ...p,
          type: 'project' as const,
          budgetRange: null,
          deadline: null,
          category: null,
        }));
        const localCollabs = getRecentlyViewed('collaboration', 30).map((c) => ({
          ...c,
          type: 'collaboration' as const,
          category: null,
          categoryLabel: null,
          duration: null,
        }));
        setRecentProjects(localProjects);
        setRecentCollaborations(localCollabs);
      }
    } catch (error) {
      console.error('Error loading history data:', error);
      // Fallback: LocalStorage 사용
      setRecentPartners(getRecentlyViewed('partner', 30));
      const localProjects = getRecentlyViewed('project', 30).map((p) => ({
        ...p,
        type: 'project' as const,
        budgetRange: null,
        deadline: null,
        category: null,
      }));
      const localCollabs = getRecentlyViewed('collaboration', 30).map((c) => ({
        ...c,
        type: 'collaboration' as const,
        category: null,
        categoryLabel: null,
        duration: null,
      }));
      setRecentProjects(localProjects);
      setRecentCollaborations(localCollabs);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteSearch = async (query: string) => {
    if (!user) return;
    try {
      await searchService.deleteSearchHistory(user.id, query);
      setRecentSearches((prev) => prev.filter((s) => s.query !== query));
    } catch (error) {
      console.error('Error deleting search:', error);
    }
  };

  const handleClearAllSearches = async () => {
    if (!user) return;
    try {
      await searchService.clearSearchHistory(user.id);
      setRecentSearches([]);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks}주 전`;
    }

    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}월${day}일`;
  };


  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <LightningLoader size={32} />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4, pt: 2 }}>
      {/* 최근 검색어 */}
      {recentSearches.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                component="img"
                src={RecentIconImg}
                alt="recent-searches"
                sx={{ width: 23, height: 23 }}
              />
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 500,
                  fontSize: 14,
                  color: theme.palette.text.primary,
                }}
              >
                최근 검색
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={handleClearAllSearches}
              sx={{ p: 0.5 }}
            >
              <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 500, color: theme.palette.text.secondary }}>
                전체 삭제
              </Typography>
            </IconButton>
          </Box>
          <List sx={{ p: 0 }}>
            {recentSearches.map((search) => (
              <ListItemButton
                key={search.id}
                onClick={() => onSearchClick(search.query)}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <ListItemText
                    primary={search.query}
                    primaryTypographyProps={{
                      fontSize: 14,
                      fontWeight: 400,
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: 10,
                      color: theme.palette.text.secondary,
                      mr: 1,
                    }}
                  >
                    {formatDate(search.created_at)}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSearch(search.query);
                  }}
                  sx={{ p: 0.5, ml: 1 }}
                >
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </ListItemButton>
            ))}
          </List>
        </Box>
      )}

      {/* 최근 본 파트너 */}
      {recentPartners.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Box
              component="img"
              src={PartnerIconImg}
              alt="recent-partners"
              sx={{ width: 24, height: 24 }}
            />
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 500,
                fontSize: 14,
                color: theme.palette.text.primary,
              }}
            >
              최근 본 파트너
            </Typography>
          </Box>
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
            {recentPartners.map((partner) => {
              // subtitle에서 타입 추출 (예: "아티스트 • 음악" -> "아티스트")
              const typeLabel = partner.subtitle?.split(' • ')[0] || '파트너';
              return (
                <Box
                  key={partner.id}
                  onClick={() => {
                    if (onPartnerClick) {
                      onPartnerClick(partner.id);
                    } else {
                      navigate(`/profile/${partner.id}`);
                    }
                  }}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.5,
                    minWidth: 80,
                    cursor: 'pointer',
                  }}
                >
                  <Avatar
                    src={partner.image || undefined}
                    sx={{
                      width: 60,
                      height: 60,
                      bgcolor: theme.palette.grey[200],
                    }}
                  >
                    {partner.title.charAt(0)}
                  </Avatar>
                  <Typography
                    sx={{
                      fontSize: 11,
                      color: theme.palette.text.secondary,
                      textAlign: 'center',
                      lineHeight: 1.3,
                    }}
                  >
                    {typeLabel}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: theme.palette.text.primary,
                      textAlign: 'center',
                      lineHeight: 1.3,
                      maxWidth: 80,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {partner.title}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {/* 최근 본 프로젝트 */}
      {recentProjects.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Box
              component="img"
              src={ProjectIconImg}
              alt="recent-projects"
              sx={{ width: 27, height: 27 }}
            />
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 500,
                fontSize: 14,
                color: theme.palette.text.primary,
              }}
            >
              최근 본 프로젝트
            </Typography>
          </Box>
          <List sx={{ p: 0 }}>
            {recentProjects.slice(0, projectDisplayCount).map((project) => (
              <ListItemButton
                key={project.id}
                onClick={() => navigate(`/explore/project/${project.id}`)}
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  p: 1.5,
                  border: `1px solid ${theme.palette.divider}`,
                  backgroundColor: theme.palette.background.paper,
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    src={project.image || undefined}
                    variant="rounded"
                    sx={{
                      width: 60,
                      height: 60,
                      bgcolor: theme.palette.grey[200],
                    }}
                  >
                    {project.title.charAt(0)}
                  </Avatar>
                </ListItemAvatar>
                <Box sx={{ flex: 1, ml: 1 }}>
                  <Typography
                    sx={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: theme.palette.text.primary,
                      mb: 0.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {project.title}
                  </Typography>
                  {project.budgetRange && (
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: theme.palette.text.secondary,
                        mb: 0.25,
                      }}
                    >
                      {project.budgetRange}
                    </Typography>
                  )}
                  {project.deadline && (
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: theme.palette.text.secondary,
                      }}
                    >
                      마감: {formatDeadline(project.deadline)}
                    </Typography>
                  )}
                  {!project.budgetRange && !project.deadline && (
                    <Typography
                      sx={{
                        fontSize: 11,
                        color: theme.palette.text.secondary,
                      }}
                    >
                      프로젝트
                    </Typography>
                  )}
                </Box>
              </ListItemButton>
            ))}
          </List>
          {recentProjects.length > INITIAL_DISPLAY_COUNT && (
            <Button
              fullWidth
              onClick={() => {
                const isExpanded = projectDisplayCount >= recentProjects.length;
                if (isExpanded) {
                  setProjectDisplayCount(INITIAL_DISPLAY_COUNT);
                } else {
                  setProjectDisplayCount((prev) => Math.min(prev + LOAD_MORE_COUNT, recentProjects.length));
                }
              }}
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                mt: 2,
                py: 1.5,
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: theme.palette.background.paper,
                },
                color: theme.palette.text.secondary,
              }}
            >
              {projectDisplayCount >= recentProjects.length
                ? '접기'
                : `더 보기`}
              {projectDisplayCount >= recentProjects.length ? (
                <ArrowDropUpRoundedIcon sx={{ fontSize: 20, color: theme.palette.icon.default, verticalAlign: 'middle' }} />
              ) : (
                <ArrowDropDownRoundedIcon sx={{ fontSize: 20, color: theme.palette.icon.default, verticalAlign: 'middle' }} />
              )}
            </Button>
          )}
        </Box>
      )}

      {/* 최근 본 협업 */}
      {recentCollaborations.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Box
              component="img"
              src={CollaborationIconImg}
              alt="recent-partners"
              sx={{ width: 21, height: 21 }}
            />
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 500,
                fontSize: 14,
                color: theme.palette.text.primary,
              }}
            >
              최근 본 협업
            </Typography>
          </Box>
          <List sx={{ p: 0 }}>
            {recentCollaborations.slice(0, collaborationDisplayCount).map((collab) => (
              <ListItemButton
                key={collab.id}
                onClick={() => navigate(`/explore/collaboration/${collab.id}`)}
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  p: 1.5,
                  border: `1px solid ${theme.palette.divider}`,
                  backgroundColor: theme.palette.background.paper,
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    src={collab.image || undefined}
                    variant="rounded"
                    sx={{
                      width: 60,
                      height: 60,
                      bgcolor: theme.palette.grey[200],
                    }}
                  >
                    {collab.title.charAt(0)}
                  </Avatar>
                </ListItemAvatar>
                <Box sx={{ flex: 1, ml: 1 }}>
                  <Typography
                    sx={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: theme.palette.text.primary,
                      mb: 0.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {collab.title}
                  </Typography>
                  {collab.categoryLabel && (
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: theme.palette.text.secondary,
                        mb: 0.25,
                      }}
                    >
                      {collab.categoryLabel}
                    </Typography>
                  )}
                  {collab.duration && (
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: theme.palette.text.secondary,
                      }}
                    >
                      기간: {collab.duration}
                    </Typography>
                  )}
                  {!collab.categoryLabel && !collab.duration && (
                    <Typography
                      sx={{
                        fontSize: 11,
                        color: theme.palette.text.secondary,
                      }}
                    >
                      협업 기회
                    </Typography>
                  )}
                </Box>
              </ListItemButton>
            ))}
          </List>
          {recentCollaborations.length > INITIAL_DISPLAY_COUNT && (
            <Button
              fullWidth
              onClick={() => {
                const isExpanded = collaborationDisplayCount >= recentCollaborations.length;
                if (isExpanded) {
                  setCollaborationDisplayCount(INITIAL_DISPLAY_COUNT);
                } else {
                  setCollaborationDisplayCount((prev) => Math.min(prev + LOAD_MORE_COUNT, recentCollaborations.length));
                }
              }}
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                mt: 2,
                py: 1.5,
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: theme.palette.background.paper,
                },
                color: theme.palette.text.secondary,
              }}
            >
              {collaborationDisplayCount >= recentCollaborations.length
                ? '접기'
                : `더 보기`}
              {collaborationDisplayCount >= recentCollaborations.length ? (
                <ArrowDropUpRoundedIcon sx={{ fontSize: 20, color: theme.palette.icon.default, verticalAlign: 'middle' }} />
              ) : (
                <ArrowDropDownRoundedIcon sx={{ fontSize: 20, color: theme.palette.icon.default, verticalAlign: 'middle' }} />
              )}
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
}


import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, useTheme } from '@mui/material';
import { LightningLoader } from '../../common';
import { motion, AnimatePresence } from 'framer-motion';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import RemoveIcon from '@mui/icons-material/Remove';
import MoneyOutlinedIcon from '@mui/icons-material/MoneyOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import { searchService } from '../../../services/searchService';
import type { TrendingSearch } from '../../../types/search.types';
import { CATEGORY_LABELS } from '../../../constants/projectConstants';
import type { ProjectCategory } from '../../../types/exploreTypes';
import PopularityIconImg from '../../../assets/icon/search/popularity.png';
import ProjectIconImg from '../../../assets/icon/search/project.png';
import CollaborationIconImg from '../../../assets/icon/search/collaboration.png';
import ArrowDropDownRoundedIcon from '@mui/icons-material/ArrowDropDownRounded';
import ArrowDropUpRoundedIcon from '@mui/icons-material/ArrowDropUpRounded';

// 인기 검색어 표시 개수
const TRENDING_SEARCH_COUNT = 10; // 10위까지 표시

interface HomeDiscoveryViewProps {
  onSearchClick: (query: string) => void;
}

interface TrendingProject {
  id: string;
  title: string;
  cover_image_url?: string | null;
  budget_range?: string | null;
  deadline?: string | null;
  tags?: string[] | null;
  category?: string | null;
  brand_name?: string;
}

interface TrendingCollaboration {
  id: string;
  title: string;
  cover_image_url?: string | null;
  region?: string | null;
  duration?: string | null;
  team_size?: number | null;
  current_team_size?: number | null;
  tags?: string[] | null;
  category?: string | null;
  company_name?: string;
}

// 표시 관련 상수
const INITIAL_DISPLAY_COUNT = 3; // 처음에 보여줄 개수
const TOTAL_FETCH_COUNT = 8; // 총 가져올 개수

export default function HomeDiscoveryView({ onSearchClick }: HomeDiscoveryViewProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [trendingSearches, setTrendingSearches] = useState<TrendingSearch[]>([]);
  const [trendingProjects, setTrendingProjects] = useState<TrendingProject[]>([]);
  const [trendingCollaborations, setTrendingCollaborations] = useState<TrendingCollaboration[]>([]);
  const [loading, setLoading] = useState(true);

  // 더 보기 상태
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [showAllCollabs, setShowAllCollabs] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [searches, trending] = await Promise.all([
          searchService.getTrendingSearches(10),
          searchService.getTrendingContents(TOTAL_FETCH_COUNT),
        ]);
        setTrendingSearches(searches);
        setTrendingProjects(trending.projects);
        setTrendingCollaborations(trending.collaborations);
      } catch (error) {
        console.error('Error loading discovery data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  const formatBudget = (budgetRange: string | null | undefined) => {
    if (!budgetRange) return '';
    return budgetRange;
  };

  // Category를 한글로 변환하는 함수 (projectConstants의 CATEGORY_LABELS 사용)
  const getCategoryLabel = (category: string | null | undefined): string | null => {
    if (!category) return null;

    // CATEGORY_LABELS를 사용하여 변환
    if (category in CATEGORY_LABELS) {
      return CATEGORY_LABELS[category as ProjectCategory];
    }

    // 매핑에 없는 경우 원본 반환
    return category;
  };

  const getTrendIcon = (search: TrendingSearch) => {
    // 실제 rank_change 값 기반으로 표시 (스크린샷 참고: 상승=빨강, 하락=파랑)
    if (search.rank_change > 0) {
      return <KeyboardArrowUpIcon sx={{ fontSize: 18, color: '#EF4444' }} />;
    } else if (search.rank_change < 0) {
      return <KeyboardArrowDownIcon sx={{ fontSize: 18, color: '#3B82F6' }} />;
    }
    return <RemoveIcon sx={{ fontSize: 14, color: theme.palette.text.secondary }} />;
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
      {/* 실시간 인기 검색어 */}
      {trendingSearches.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Box
              component="img"
              src={PopularityIconImg}
              alt="trending"
              sx={{ width: 24, height: 24 }}
            />
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                fontSize: 16,
                color: theme.palette.text.primary,
              }}
            >
              실시간 인기 검색어
            </Typography>
          </Box>

          {/* 인기 검색어 리스트 (10위까지 2열 그리드) */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 1.5,
            }}
          >
            {trendingSearches.slice(0, TRENDING_SEARCH_COUNT).map((search, index) => {
              const isNew = search.is_new || search.rank_change >= 998;
              const hasRankChange = search.rank_change !== 0;

              return (
                <AnimatePresence mode="wait" key={`slot-${index}`}>
                  <motion.div
                    key={`${search.id}-${index}`}
                    initial={hasRankChange ? { y: search.rank_change > 0 ? 20 : -20, opacity: 0 } : false}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: search.rank_change > 0 ? -20 : 20, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <Box
                      onClick={() => onSearchClick(search.query)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: theme.palette.grey[50],
                        cursor: 'pointer',
                      }}
                    >
                      {/* 순위 숫자 (파란색) */}
                      <Typography
                        sx={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: theme.palette.primary.main,
                          minWidth: 20,
                        }}
                      >
                        {index + 1}
                      </Typography>
                      {/* NEW 표시 또는 화살표 */}
                      {isNew ? (
                        <Typography
                          sx={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: theme.palette.status.Success,
                            minWidth: 32,
                          }}
                        >
                          NEW
                        </Typography>
                      ) : (
                        <Box sx={{ minWidth: 32, display: 'flex', alignItems: 'center' }}>
                          {getTrendIcon(search)}
                        </Box>
                      )}
                      {/* 검색어 */}
                      <Typography
                        sx={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: theme.palette.text.primary,
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {search.query}
                      </Typography>
                    </Box>
                  </motion.div>
                </AnimatePresence>
              );
            })}
          </Box>
        </Box>
      )}

      {/* 현재 많이 찾는 프로젝트 */}
      {trendingProjects.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Box
              component="img"
              src={ProjectIconImg}
              alt="popular-projects"
              sx={{ width: 32, height: 32 }}
            />
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                fontSize: 16,
                color: theme.palette.text.primary,
              }}
            >
              현재 많이 찾는 프로젝트
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(showAllProjects ? trendingProjects : trendingProjects.slice(0, INITIAL_DISPLAY_COUNT)).map((project) => (
              <Box
                key={project.id}
                onClick={() => navigate(`/explore/project/${project.id}`)}
                sx={{
                  display: 'flex',
                  gap: 2,
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 2,
                    backgroundColor: '#f5f5f5',
                    backgroundImage: project.cover_image_url ? `url(${project.cover_image_url})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {/* 타이틀 */}
                  <Typography
                    sx={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: theme.palette.text.primary,
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {project.title}
                  </Typography>
                  {/* 생성자 이름 */}
                  <Typography
                    sx={{
                      fontSize: 13,
                      color: theme.palette.text.secondary,
                      fontWeight: 500,
                    }}
                  >
                    {project.brand_name || '브랜드'}
                  </Typography>
                  {/* 예산 & 마감일 (아이콘과 함께) */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                    {project.budget_range && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <MoneyOutlinedIcon sx={{ fontSize: 14, color: theme.palette.text.secondary }} />
                        <Typography
                          sx={{
                            fontSize: 12,
                            color: theme.palette.text.secondary,
                          }}
                        >
                          {formatBudget(project.budget_range)}
                        </Typography>
                      </Box>
                    )}
                    {project.deadline && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarTodayOutlinedIcon sx={{ fontSize: 14, color: theme.palette.text.secondary }} />
                        <Typography
                          sx={{
                            fontSize: 12,
                            color: theme.palette.text.secondary,
                          }}
                        >
                          {formatDate(project.deadline)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  {/* 태그 (카테고리 + tags) */}
                  {(project.category || (project.tags && project.tags.length > 0)) && (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                      {/* 카테고리 태그 (한글) */}
                      {project.category && getCategoryLabel(project.category) && (
                        <Box
                          sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            backgroundColor: '#EFF6FF',
                            fontSize: 11,
                            color: '#3B82F6',
                            fontWeight: 600,
                          }}
                        >
                          {getCategoryLabel(project.category)}
                        </Box>
                      )}
                      {/* 일반 태그들 */}
                      {project.tags && project.tags.slice(0, 2).map((tag, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: 3,
                            backgroundColor: theme.palette.grey[100],
                            fontSize: 11,
                            color: theme.palette.subText.default,
                            fontWeight: 500,
                          }}
                        >
                          {tag}
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
          {/* 더 보기 버튼 */}
          {trendingProjects.length > INITIAL_DISPLAY_COUNT && (
            <Box
              onClick={() => setShowAllProjects(!showAllProjects)}
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
              }}
            >
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: theme.palette.text.secondary,
                }}
              >
                {showAllProjects ? '접기' : `더 보기`}
                {showAllProjects ? (
                  <ArrowDropUpRoundedIcon sx={{ fontSize: 20, color: theme.palette.icon.default, verticalAlign: 'middle' }} />
                ) : (
                  <ArrowDropDownRoundedIcon sx={{ fontSize: 20, color: theme.palette.icon.default, verticalAlign: 'middle' }} />
                )}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* 현재 많이 찾는 협업 */}
      {trendingCollaborations.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Box
              component="img"
              src={CollaborationIconImg}
              alt="popular-collabs"
              sx={{ width: 26, height: 26 }}
            />
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                fontSize: 16,
                color: theme.palette.text.primary,
              }}
            >
              현재 많이 찾는 협업
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(showAllCollabs ? trendingCollaborations : trendingCollaborations.slice(0, INITIAL_DISPLAY_COUNT)).map((collab) => (
              <Box
                key={collab.id}
                onClick={() => navigate(`/explore/collaboration/${collab.id}`)}
                sx={{
                  display: 'flex',
                  gap: 2,
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 2,
                    backgroundColor: '#f5f5f5',
                    backgroundImage: collab.cover_image_url ? `url(${collab.cover_image_url})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: theme.palette.text.secondary,
                    fontSize: 12,
                  }}
                >
                  {!collab.cover_image_url && 'Image'}
                </Box>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {/* 타이틀 */}
                  <Typography
                    sx={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: theme.palette.text.primary,
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {collab.title}
                  </Typography>
                  {/* 생성자 이름 */}
                  <Typography
                    sx={{
                      fontSize: 13,
                      color: theme.palette.text.secondary,
                      fontWeight: 500,
                    }}
                  >
                    {collab.company_name || '협업 주최자'}
                  </Typography>
                  {/* 팀 인원 & 기간 (아이콘과 함께) */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                    {(collab.current_team_size !== undefined || collab.team_size) && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <GroupsOutlinedIcon sx={{ fontSize: 14, color: theme.palette.text.secondary }} />
                        <Typography
                          sx={{
                            fontSize: 12,
                            color: theme.palette.text.secondary,
                          }}
                        >
                          {collab.current_team_size ?? 0}/{collab.team_size ?? '?'}명
                        </Typography>
                      </Box>
                    )}
                    {collab.duration && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTimeOutlinedIcon sx={{ fontSize: 14, color: theme.palette.text.secondary }} />
                        <Typography
                          sx={{
                            fontSize: 12,
                            color: theme.palette.text.secondary,
                          }}
                        >
                          {collab.duration}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  {/* 태그 (카테고리 + tags) */}
                  {(collab.category || (collab.tags && collab.tags.length > 0)) && (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                      {/* 카테고리 태그 (한글) */}
                      {collab.category && getCategoryLabel(collab.category) && (
                        <Box
                          sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            backgroundColor: '#ECFDF5',
                            fontSize: 11,
                            color: '#10B981',
                            fontWeight: 600,
                          }}
                        >
                          {getCategoryLabel(collab.category)}
                        </Box>
                      )}
                      {/* 일반 태그들 */}
                      {collab.tags && collab.tags.slice(0, 2).map((tag, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: 3,
                            backgroundColor: theme.palette.grey[100],
                            fontSize: 11,
                            color: theme.palette.subText.default,
                            fontWeight: 500,
                          }}
                        >
                          {tag}
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
          {/* 더 보기 버튼 */}
          {trendingCollaborations.length > INITIAL_DISPLAY_COUNT && (
            <Box
              onClick={() => setShowAllCollabs(!showAllCollabs)}
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
              }}
            >
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: theme.palette.text.secondary,
                }}
              >
                {showAllCollabs ? '접기' : `더 보기`}
                {showAllCollabs ? (
                  <ArrowDropUpRoundedIcon sx={{ fontSize: 20, color: theme.palette.icon.default, verticalAlign: 'middle' }} />
                ) : (
                  <ArrowDropDownRoundedIcon sx={{ fontSize: 20, color: theme.palette.icon.default, verticalAlign: 'middle' }} />
                )}
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}


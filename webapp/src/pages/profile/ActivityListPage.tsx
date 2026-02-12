/**
 * 최근 활동 전체 목록 페이지
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  Skeleton,
  useTheme,
} from '@mui/material';
import { ArrowBack, Search, NotificationsOutlined } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthContext';
import { useGroupedActivities } from '../../hooks/useUserActivities';
import ActivityItem from '../../components/profile/ActivityItem';
import type {
  DateRangeFilter,
  ActivityCategory,
  ActivityType,
} from '../../types/activity.types';

// 아이콘 이미지
import RecentActivityIconImg from '../../assets/icon/emptyState/recentActivity.png';

// 기간 필터 옵션
const DATE_RANGE_OPTIONS: { value: DateRangeFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'today', label: '오늘' },
  { value: 'week', label: '이번 주' },
  { value: 'month', label: '이번 달' },
];

// 활동유형 필터 옵션
const CATEGORY_OPTIONS: { value: ActivityCategory | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'project', label: '프로젝트/협업' },
  { value: 'community', label: '커뮤니티' },
  { value: 'feedback', label: '피드백/평판' },
  { value: 'achievement', label: '성취/시스템' },
];

export default function ActivityListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  // 필터 상태
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<ActivityCategory | 'all'>('all');

  // 페이지 초기 진입시 스크롤을 최상단으로 설정
  useEffect(() => {
    // 즉시 실행
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // 렌더링 후 추가 실행 (RAF 사용)
    const rafId = requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
      window.scrollTo(0, 0);
    });

    // 콘텐츠 로드 후 최종 실행
    const timer = setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
      window.scrollTo(0, 0);
    }, 100);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
    };
  }, []); // 마운트 시에만 실행

  // 활동 데이터 조회
  const { getDateLabel, isLoading, activities } = useGroupedActivities(
    userId,
    {
      limit: 100, // 충분한 데이터 로드
    }
  );

  // 카테고리 필터링
  const filteredActivities = useMemo(() => {
    if (categoryFilter === 'all') return activities;

    // 동적 import 대신 직접 매핑
    const categoryMap: Record<ActivityType, ActivityCategory> = {
      project_completed: 'project',
      collaboration_completed: 'project',
      workflow_deadline_approaching: 'project',
      workflow_step_completed: 'project',
      workflow_step_updated: 'project',
      member_added: 'project',
      file_shared: 'project',
      comment_received: 'community',
      reply_received: 'community',
      cheer_received: 'community',
      invitation_pending_reminder: 'community',
      invitation_sent: 'community',
      invitation_accepted: 'community',
      invitation_rejected: 'community',
      application_submitted: 'community',
      application_accepted: 'community',
      application_rejected: 'community',
      talk_request_accepted: 'community',
      partnership_inquiry_accepted: 'community',
      review_received: 'feedback',
      new_follower: 'feedback',
      user_followed: 'feedback',
      profile_views_spike: 'feedback',
      portfolio_updated: 'feedback',
      career_updated: 'feedback',
      badge_earned: 'achievement',
    };

    return activities.filter(
      (activity) => categoryMap[activity.activityType] === categoryFilter
    );
  }, [activities, categoryFilter]);

  // 날짜 필터링
  const dateFilteredActivities = useMemo(() => {
    if (dateRange === 'all') return filteredActivities;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let startDate: Date;
    switch (dateRange) {
      case 'today':
        startDate = today;
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(today);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        return filteredActivities;
    }

    return filteredActivities.filter(
      (activity) => new Date(activity.createdAt) >= startDate
    );
  }, [filteredActivities, dateRange]);

  // 날짜별 그룹핑 (로컬 타임존 기준)
  const groupedFilteredActivities = useMemo(() => {
    const grouped: Record<string, typeof dateFilteredActivities> = {};

    dateFilteredActivities.forEach((activity) => {
      const date = new Date(activity.createdAt);
      // 로컬 타임존 기준 YYYY-MM-DD (toISOString은 UTC 기준이므로 사용하지 않음)
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(activity);
    });

    return grouped;
  }, [dateFilteredActivities]);

  // 날짜 키 정렬 (최신 순)
  const sortedDateKeys = useMemo(() => {
    return Object.keys(groupedFilteredActivities).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );
  }, [groupedFilteredActivities]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleActivityClick = (activity: (typeof activities)[0]) => {
    // 리뷰 활동은 받은 리뷰 페이지로 이동
    if (activity.relatedEntityType === 'review') {
      navigate('/profile/reviews/received');
      return;
    }

    if (activity.relatedEntityId) {
      switch (activity.relatedEntityType) {
        case 'project':
          navigate(`/explore/project/${activity.relatedEntityId}`);
          break;
        case 'collaboration':
          navigate(`/explore/collaboration/${activity.relatedEntityId}`);
          break;
        case 'user':
          navigate(`/profile/${activity.relatedEntityId}`);
          break;
      }
    }
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        pb: 10, // 하단 네비게이션 공간
        overflow: 'auto',
      }}
    >
      {/* 헤더 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          position: 'sticky',
          top: 0,
          backgroundColor: theme.palette.background.paper,
          zIndex: 10,
          paddingTop: 0,
        }}
      >
        <IconButton onClick={handleBack} sx={{ ml: -1 }}>
          <ArrowBack sx={{ color: '#111827' }} />
        </IconButton>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton>
            <Search sx={{ color: theme.palette.icon.default }} />
          </IconButton>
          <IconButton>
            <NotificationsOutlined sx={{ color: theme.palette.icon.default }} />
          </IconButton>
        </Box>
      </Box>

      {/* 제목 */}
      <Box sx={{ px: 2, pt: 1, pb: 2 }}>
        <Typography
          sx={{
            fontSize: 24,
            fontWeight: 700,
            color: theme.palette.text.primary,
            mb: 0.5,
          }}
        >
          최근 활동
        </Typography>
        <Typography
          sx={{
            fontSize: 14,
            fontWeight: 500,
            color: theme.palette.text.secondary,
          }}
        >
          지나온 나의 활동들을 확인하세요.
        </Typography>
      </Box>

      {/* 필터 */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1.5,
          px: 2,
          pb: 2,
        }}
      >
        {/* 기간 필터 */}
        <FormControl size="small">
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRangeFilter)}
            sx={{
              minWidth: 100,
              borderRadius: '12px',
              backgroundColor: theme.palette.grey[100],
              '& .MuiOutlinedInput-notchedOutline': {
                border: 'none',
              },
              '& .MuiSelect-select': {
                py: 1,
                px: 2,
                fontSize: 14,
              },
            }}
          >
            {DATE_RANGE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 활동유형 필터 */}
        <FormControl size="small">
          <Select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as ActivityCategory | 'all')
            }
            sx={{
              minWidth: 120,
              borderRadius: '12px',
              backgroundColor: theme.palette.grey[100],
              '& .MuiOutlinedInput-notchedOutline': {
                border: 'none',
              },
              '& .MuiSelect-select': {
                py: 1,
                px: 2,
                fontSize: 14,
              },
            }}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* 활동 목록 */}
      <Box sx={{ px: 2 }}>
        {isLoading ? (
          // 로딩 스켈레톤
          <Box>
            {[1, 2, 3, 4, 5].map((i) => (
              <Box key={i} sx={{ mb: 2 }}>
                <Skeleton variant="text" width={60} height={24} sx={{ mb: 1 }} />
                {[1, 2].map((j) => (
                  <Box
                    key={j}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.5,
                      py: 1.5,
                    }}
                  >
                    <Skeleton variant="circular" width={32} height={32} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="80%" height={20} />
                      <Skeleton variant="text" width="30%" height={16} />
                    </Box>
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        ) : dateFilteredActivities.length === 0 ? (
          // 활동 없음
          <Box
            sx={{
              py: 8, textAlign: 'center', color: theme.palette.text.secondary
            }}
          >
            <Box
              component="img"
              src={RecentActivityIconImg}
              alt="표시할 항목이 없어요"
              sx={{ width: 70, height: 70, mr: 0.5 }}
            />
            <Typography
              sx={{
                fontWeight: 600, mb: 1, color: theme.palette.text.primary
              }}
            >
              {categoryFilter !== 'all' || dateRange !== 'all'
                ? '해당 조건의 활동이 없어요.'
                : '최근 활동이 없어요.'}
            </Typography>
            <Typography sx={{ fontSize: 14, color: theme.palette.text.secondary }}>
              다양한 활동을 시작해보세요!
            </Typography>
          </Box>
        ) : (
          // 날짜별 그룹핑된 활동 목록
          sortedDateKeys.map((dateKey) => (
            <Box key={dateKey} sx={{ mb: 3 }}>
              {/* 날짜 라벨 */}
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: theme.palette.subText.default,
                  mb: 1,
                  pb: 1,
                  borderBottom: `1px solid ${theme.palette.subText.default}`,
                }}
              >
                {getDateLabel(dateKey)}
              </Typography>

              {/* 해당 날짜의 활동 목록 */}
              <Box>
                {groupedFilteredActivities[dateKey].map((activity, index) => (
                  <ActivityItem
                    key={activity.id}
                    activity={activity}
                    isLast={index === groupedFilteredActivities[dateKey].length - 1}
                    showDivider={true}
                    onClick={() => handleActivityClick(activity)}
                  />
                ))}
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}

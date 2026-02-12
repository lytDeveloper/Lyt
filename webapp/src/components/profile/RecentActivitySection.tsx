/**
 * MyProfile 페이지용 최근 활동 섹션 컴포넌트
 */

import { Box, Typography, Paper, Skeleton, useTheme } from '@mui/material';
import { ChevronRight } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useRecentActivities } from '../../hooks/useUserActivities';
import ActivityItem from './ActivityItem';

interface RecentActivitySectionProps {
  userId: string;
}

export default function RecentActivitySection({ userId }: RecentActivitySectionProps) {
  const navigate = useNavigate();
  const { data: activities = [], isLoading } = useRecentActivities(userId, 3);

  const handleHeaderClick = () => {
    navigate('/profile/activities');
  };

  const handleActivityClick = (activity: typeof activities[0]) => {
    // 활동 유형에 따라 해당 페이지로 이동
    if (activity.relatedEntityType === 'review') {
      // 리뷰 활동은 받은 리뷰 페이지로 이동
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
        default:
          // 기본적으로 활동 목록 페이지로 이동
          navigate('/profile/activities');
      }
    }
  };
  const theme = useTheme();
  return (
    <Box>
      {/* 헤더 */}
      <Box
        onClick={handleHeaderClick}
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          cursor: 'pointer',
          '&:hover': {
            opacity: 0.8,
          },
        }}
      >
        <Typography
          sx={{
            fontSize: 16,
            fontWeight: 600,
            color: '#111827',
          }}
        >
          최근 활동
        </Typography>
        <ChevronRight
          sx={{
            color: theme.palette.icon.default,
            fontSize: 20,
          }}
        />
      </Box>

      {/* 활동 목록 */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: '16px',
          boxShadow: '0px 3px 5px rgba(0,0,0,0.04)',
          backgroundColor: '#FFFFFF',
        }}
      >
        {isLoading ? (
          // 로딩 스켈레톤
          <Box>
            {[1, 2, 3].map((i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  py: 1.5,
                  borderBottom: i < 3 ? '1px solid #F3F4F6' : 'none',
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
        ) : activities.length === 0 ? (
          // 활동 없음
          <Box
            sx={{
              py: 4,
              textAlign: 'center',
            }}
          >
            <Typography
              sx={{
                fontSize: 14,
                color: '#9CA3AF',
              }}
            >
              최근 활동이 없어요.
            </Typography>
          </Box>
        ) : (
          // 활동 목록
          <Box>
            {activities.map((activity, index) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                isLast={index === activities.length - 1}
                onClick={() => handleActivityClick(activity)}
              />
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
}

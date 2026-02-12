/**
 * 개별 활동 항목 컴포넌트
 */

import { Box, Typography } from '@mui/material';
import {
  ExpandCircleDownOutlined,
  HandshakeOutlined,
  PendingActionsOutlined,
  InventoryOutlined,
  Update,
  AttachFile,
  MarkUnreadChatAltOutlined,
  ForumOutlined,
  FavoriteBorder,
  NotificationsActiveOutlined,
  MarkChatUnreadOutlined,
  BusinessOutlined,
  StarBorder,
  TrendingUp,
  EmojiEvents,
  Notifications, AddReactionOutlined
} from '@mui/icons-material';
import type { UserActivity, ActivityType } from '../../types/activity.types';
import { getActivityColor } from '../../constants/activityIcons';
import { getRelativeTime } from '../../utils/timeFormatter';
import { getBadgeAsset } from '../../constants/badgeAssets';

// 활동 유형별 아이콘 컴포넌트 매핑
const IconComponents: Record<ActivityType, React.ElementType> = {
  project_completed: ExpandCircleDownOutlined,
  collaboration_completed: HandshakeOutlined,
  workflow_deadline_approaching: PendingActionsOutlined,
  workflow_step_completed: InventoryOutlined,
  workflow_step_updated: Update,
  member_added: AddReactionOutlined,
  file_shared: AttachFile,
  comment_received: MarkUnreadChatAltOutlined,
  reply_received: ForumOutlined,
  cheer_received: FavoriteBorder,
  invitation_pending_reminder: NotificationsActiveOutlined,
  invitation_sent: NotificationsActiveOutlined,
  invitation_accepted: ExpandCircleDownOutlined,
  invitation_rejected: NotificationsActiveOutlined,
  application_submitted: NotificationsActiveOutlined,
  application_accepted: ExpandCircleDownOutlined,
  application_rejected: NotificationsActiveOutlined,
  talk_request_accepted: MarkChatUnreadOutlined,
  partnership_inquiry_accepted: BusinessOutlined,
  review_received: StarBorder,
  new_follower: AddReactionOutlined,
  user_followed: AddReactionOutlined,
  profile_views_spike: TrendingUp,
  portfolio_updated: Update,
  career_updated: Update,
  badge_earned: EmojiEvents,
};

interface ActivityItemProps {
  activity: UserActivity;
  isLast?: boolean;
  showDivider?: boolean;
  onClick?: () => void;
}

export default function ActivityItem({
  activity,
  isLast = false,
  showDivider = true,
  onClick,
}: ActivityItemProps) {
  const IconComponent = IconComponents[activity.activityType] || Notifications;
  const iconColor = getActivityColor(activity.activityType);

  // 제목에서 강조할 텍스트 추출 (예: "K-Beauty 글로벌 마케팅 캠페인" → 볼드 처리)
  const renderTitle = () => {
    const title = activity.title;

    // 메타데이터에서 강조할 키워드 추출
    const keywords: string[] = [];
    if (activity.metadata?.badgeName) keywords.push(activity.metadata.badgeName as string);
    if (activity.metadata?.projectTitle) keywords.push(activity.metadata.projectTitle as string);
    if (activity.metadata?.collaborationTitle)
      keywords.push(activity.metadata.collaborationTitle as string);
    if (activity.metadata?.followerName) keywords.push(activity.metadata.followerName as string);
    if (activity.metadata?.reviewerName) keywords.push(activity.metadata.reviewerName as string);
    if (activity.metadata?.fileName) keywords.push(activity.metadata.fileName as string);

    // 키워드가 없으면 일반 텍스트 반환
    if (keywords.length === 0) {
      return (
        <Typography
          component="span"
          sx={{
            fontSize: 14,
            fontWeight: 400,
            color: '#111827',
            lineHeight: 1.5,
          }}
        >
          {title}
        </Typography>
      );
    }

    // 키워드를 볼드로 강조
    let result = title;
    const parts: Array<{ text: string; bold: boolean }> = [];
    let lastIndex = 0;

    keywords.forEach((keyword) => {
      const index = result.indexOf(keyword);
      if (index !== -1) {
        if (index > lastIndex) {
          parts.push({ text: result.slice(lastIndex, index), bold: false });
        }
        parts.push({ text: keyword, bold: true });
        lastIndex = index + keyword.length;
      }
    });

    if (lastIndex < result.length) {
      parts.push({ text: result.slice(lastIndex), bold: false });
    }

    // 파싱이 안 됐으면 그냥 텍스트 반환
    if (parts.length === 0) {
      return (
        <Typography
          component="span"
          sx={{
            fontSize: 14,
            fontWeight: 400,
            color: '#111827',
            lineHeight: 1.5,
          }}
        >
          {title}
        </Typography>
      );
    }

    return (
      <Typography
        component="span"
        sx={{
          fontSize: 14,
          fontWeight: 400,
          color: '#111827',
          lineHeight: 1.5,
        }}
      >
        {parts.map((part, idx) =>
          part.bold ? (
            <Typography
              key={idx}
              component="span"
              sx={{ fontWeight: 600, color: '#111827' }}
            >
              {part.text}
            </Typography>
          ) : (
            part.text
          )
        )}
      </Typography>
    );
  };

  const isBadgeActivity = activity.activityType === 'badge_earned';
  const badgeAsset = isBadgeActivity ? getBadgeAsset(activity.relatedEntityId) : null;

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        py: 1.5,
        cursor: onClick ? 'pointer' : 'default',
        borderBottom: !isLast && showDivider ? '1px solid #F3F4F6' : 'none',
        '&:hover': onClick
          ? {
            backgroundColor: '#F9FAFB',
          }
          : {},
      }}
    >
      {/* 아이콘 또는 배지 이미지 */}
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: badgeAsset ? 'transparent' : `${iconColor}15`,
          flexShrink: 0,
          mt: 0.25,
          overflow: 'hidden', // 배지 이미지가 튀어나가지 않게
        }}
      >
        {badgeAsset ? (
          <Box
            component="img"
            src={badgeAsset}
            alt="badge"
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        ) : (
          <IconComponent
            sx={{
              fontSize: 18,
              color: iconColor,
            }}
          />
        )}
      </Box>

      {/* 내용 */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* 제목 */}
        <Box sx={{ mb: 0.5 }}>{renderTitle()}</Box>

        {/* 경과 시간 */}
        <Typography
          sx={{
            fontSize: 12,
            color: '#9CA3AF',
            fontWeight: 400,
          }}
        >
          {getRelativeTime(activity.createdAt)}
        </Typography>
      </Box>
    </Box>
  );
}

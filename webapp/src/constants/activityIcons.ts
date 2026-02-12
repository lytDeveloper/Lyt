/**
 * 활동 유형별 아이콘 및 스타일 매핑
 */

import type { ActivityType, ActivityCategory } from '../types/activity.types';


// 활동 유형별 아이콘 (MUI Icons 이름)
export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  // 프로젝트/협업 관련
  project_completed: 'CheckCircleOutline',
  collaboration_completed: 'Handshake',
  workflow_deadline_approaching: 'Schedule',
  workflow_step_completed: 'TaskAlt',
  workflow_step_updated: 'Update',
  member_added: 'PersonAdd',
  file_shared: 'AttachFile',

  // 커뮤니티
  comment_received: 'ChatBubbleOutline',
  reply_received: 'Reply',
  cheer_received: 'FavoriteBorder',
  invitation_pending_reminder: 'NotificationsActive',
  talk_request_accepted: 'Chat',
  partnership_inquiry_accepted: 'BusinessCenter',
  invitation_sent: 'Send',
  invitation_accepted: 'HowToReg',
  invitation_rejected: 'Cancel',
  application_submitted: 'Description',
  application_accepted: 'Verified',
  application_rejected: 'ReportProblem',

  // 피드백/평판
  review_received: 'StarBorder',
  new_follower: 'PersonAddAlt1',
  profile_views_spike: 'TrendingUp',
  user_followed: 'Person',
  portfolio_updated: 'PhotoLibrary',
  career_updated: 'WorkOutline',

  // 성취/시스템
  badge_earned: 'EmojiEvents',
};

// 활동 카테고리별 아이콘
export const CATEGORY_ICONS: Record<ActivityCategory, string> = {
  project: 'Work',
  community: 'Forum',
  feedback: 'Reviews',
  achievement: 'EmojiEvents',
};

// 활동 유형별 색상 (MUI 팔레트 참조)
export const ACTIVITY_COLORS: Record<ActivityType, string> = {
  // 프로젝트/협업 관련 - 블루 계열
  project_completed: '#374151', // primary.main
  collaboration_completed: '#374151',
  workflow_deadline_approaching: '#374151', // warning
  workflow_step_completed: '#374151', // success
  workflow_step_updated: '#374151',
  member_added: '#374151',
  file_shared: '#374151',

  // 커뮤니티 - 퍼플/핑크 계열
  comment_received: '#374151',
  reply_received: '#374151',
  cheer_received: '#374151',
  invitation_pending_reminder: '#374151',
  talk_request_accepted: '#374151',
  partnership_inquiry_accepted: '#374151',
  invitation_sent: '#374151',
  invitation_accepted: '#374151',
  invitation_rejected: '#374151',
  application_submitted: '#374151',
  application_accepted: '#374151',
  application_rejected: '#374151',

  // 피드백/평판 - 옐로우/오렌지 계열
  review_received: '#374151',
  new_follower: '#374151',
  profile_views_spike: '#374151',
  user_followed: '#374151',
  portfolio_updated: '#374151',
  career_updated: '#374151',

  // 성취/시스템 - 골드
  badge_earned: '#374151',
};

// 활동 유형별 한글 라벨
export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  // 프로젝트/협업 관련
  project_completed: '프로젝트 완료',
  collaboration_completed: '협업 완료',
  workflow_deadline_approaching: '마감 임박',
  workflow_step_completed: '단계 완료',
  workflow_step_updated: '단계 업데이트',
  member_added: '멤버 추가',
  file_shared: '파일 공유',

  // 커뮤니티
  comment_received: '새 댓글',
  reply_received: '대댓글',
  cheer_received: '응원',
  invitation_pending_reminder: '초대 대기',
  talk_request_accepted: '대화 요청 수락',
  partnership_inquiry_accepted: '파트너십 수락',
  invitation_sent: '초대 발송',
  invitation_accepted: '초대 수락',
  invitation_rejected: '초대 거절',
  application_submitted: '지원서 제출',
  application_accepted: '지원 수락',
  application_rejected: '지원 거절',

  // 피드백/평판
  review_received: '새 리뷰',
  new_follower: '새 팔로워',
  profile_views_spike: '조회수 급증',
  user_followed: '팔로우',
  portfolio_updated: '포트폴리오 업데이트',
  career_updated: '경력 업데이트',

  // 성취/시스템
  badge_earned: '배지 획득',
};

// 활동 카테고리별 한글 라벨
export const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  project: '프로젝트/협업',
  community: '커뮤니티',
  feedback: '피드백/평판',
  achievement: '성취/시스템',
};

// 활동 유형별 알림 우선순위 (높을수록 중요)
export const ACTIVITY_PRIORITY: Record<ActivityType, number> = {
  // 높은 우선순위
  workflow_deadline_approaching: 10,
  invitation_pending_reminder: 9,
  badge_earned: 8,
  invitation_accepted: 8,
  application_accepted: 8,

  // 중간 우선순위
  project_completed: 7,
  collaboration_completed: 7,
  review_received: 6,
  talk_request_accepted: 6,
  partnership_inquiry_accepted: 6,
  new_follower: 5,
  profile_views_spike: 5,
  invitation_rejected: 6,
  application_rejected: 6,

  // 낮은 우선순위
  workflow_step_completed: 4,
  workflow_step_updated: 3,
  member_added: 3,
  file_shared: 2,
  comment_received: 2,
  reply_received: 2,
  cheer_received: 1,
  invitation_sent: 3,
  application_submitted: 4,
  user_followed: 3,
  portfolio_updated: 2,
  career_updated: 2,
};

/**
 * 활동 유형의 우선순위를 기준으로 정렬하는 비교 함수
 */
export function compareActivityPriority(a: ActivityType, b: ActivityType): number {
  return ACTIVITY_PRIORITY[b] - ACTIVITY_PRIORITY[a];
}

/**
 * 활동 유형에 따른 아이콘 컴포넌트 이름 반환
 */
export function getActivityIconName(activityType: ActivityType): string {
  return ACTIVITY_ICONS[activityType] || 'Notifications';
}

/**
 * 활동 유형에 따른 색상 반환
 */
export function getActivityColor(activityType: ActivityType): string {
  return ACTIVITY_COLORS[activityType] || '#374151';
}

/**
 * 활동 유형에 따른 라벨 반환
 */
export function getActivityLabel(activityType: ActivityType): string {
  return ACTIVITY_LABELS[activityType] || '알림';
}

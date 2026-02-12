/**
 * 사용자 활동 기록 타입 정의
 */

// 활동 유형 enum
export type ActivityType =
  // 프로젝트/협업 관련
  | 'project_completed'              // 프로젝트 완료
  | 'collaboration_completed'        // 협업 완료
  | 'workflow_deadline_approaching'  // 마감 임박 (24시간 이내)
  | 'workflow_step_completed'        // 워크플로우 스텝 완료
  | 'workflow_step_updated'          // 워크플로우 스텝 업데이트
  | 'member_added'                   // 새 멤버 추가
  | 'file_shared'                    // 파일 공유

  // 커뮤니티
  | 'comment_received'               // 내 프로젝트/협업에 새 댓글
  | 'reply_received'                 // 대댓글 받음
  | 'cheer_received'                 // 응원(좋아요) 받음
  | 'invitation_pending_reminder'    // 이틀 이상 응답 대기 중인 초대
  | 'invitation_sent'                // 초대 발송됨
  | 'invitation_accepted'            // 초대 수락됨
  | 'invitation_rejected'            // 초대 거절됨
  | 'application_submitted'          // 지원서 제출됨
  | 'application_accepted'           // 지원 수락됨
  | 'application_rejected'           // 지원 거절됨
  | 'talk_request_accepted'          // 대화 요청 수락됨
  | 'partnership_inquiry_accepted'   // 파트너십 문의 수락됨

  // 피드백/평판
  | 'review_received'                // 리뷰 받음
  | 'new_follower'                   // 팔로워 증가
  | 'user_followed'                  // 사용자를 팔로우함
  | 'profile_views_spike'            // 프로필 조회수 급증
  | 'portfolio_updated'              // 포트폴리오 업데이트
  | 'career_updated'                 // 경력 업데이트

  // 성취/시스템
  | 'badge_earned';                  // 배지 획득

// 활동 카테고리 (필터용)
export type ActivityCategory =
  | 'project'      // 프로젝트/협업
  | 'community'    // 커뮤니티
  | 'feedback'     // 피드백/평판
  | 'achievement'; // 성취/시스템

// 활동 유형 → 카테고리 매핑
export const ACTIVITY_CATEGORY_MAP: Record<ActivityType, ActivityCategory> = {
  // 프로젝트/협업
  project_completed: 'project',
  collaboration_completed: 'project',
  workflow_deadline_approaching: 'project',
  workflow_step_completed: 'project',
  workflow_step_updated: 'project',
  member_added: 'project',
  file_shared: 'project',

  // 커뮤니티
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

  // 피드백/평판
  review_received: 'feedback',
  new_follower: 'feedback',
  user_followed: 'feedback',
  profile_views_spike: 'feedback',
  portfolio_updated: 'feedback',
  career_updated: 'feedback',

  // 성취/시스템
  badge_earned: 'achievement',
};

// 활동 카테고리 라벨
export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
  project: '프로젝트/협업',
  community: '커뮤니티',
  feedback: '피드백/평판',
  achievement: '성취/시스템',
};

// 관련 엔티티 타입
export type RelatedEntityType =
  | 'project'
  | 'collaboration'
  | 'review'
  | 'user'
  | 'badge'
  | 'comment'
  | 'talk_request'
  | 'file';

// 사용자 활동 인터페이스
export interface UserActivity {
  id: string;
  userId: string;
  activityType: ActivityType;
  relatedEntityType?: RelatedEntityType | string;
  relatedEntityId?: string;
  title: string;
  description?: string;
  metadata?: ActivityMetadata;
  createdAt: string;
  isRead: boolean;
}

// 활동 메타데이터 (유형별 추가 정보)
export interface ActivityMetadata {
  // 프로젝트/협업 관련
  projectTitle?: string;
  collaborationTitle?: string;
  workflowStepName?: string;
  fileName?: string;
  memberName?: string;
  deadline?: string;

  // 커뮤니티 관련
  commentContent?: string;
  commenterName?: string;

  // 배지 관련
  badgeName?: string;
  badgeIcon?: string;

  // 리뷰 관련
  reviewerName?: string;
  rating?: number;

  // 팔로우 관련
  followerName?: string;
  followerAvatar?: string;

  // 조회수 관련
  todayViews?: number;
  avgDaily?: number;

  // 기타
  [key: string]: unknown;
}

// 활동 필터 옵션
export interface ActivityFilters {
  type?: ActivityType[];
  category?: ActivityCategory[];
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// 기간 필터 옵션
export type DateRangeFilter = 'all' | 'today' | 'week' | 'month';

export const DATE_RANGE_LABELS: Record<DateRangeFilter, string> = {
  all: '전체',
  today: '오늘',
  week: '이번 주',
  month: '이번 달',
};

// 활동 생성 입력
export interface CreateActivityInput {
  userId: string;
  activityType: ActivityType;
  title: string;
  description?: string;
  relatedEntityType?: RelatedEntityType | string;
  relatedEntityId?: string;
  metadata?: ActivityMetadata;
}

// 로그인 스트릭 정보
export interface LoginStreak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string;
  streakStartDate?: string;
}

// 프로필 조회 통계
export interface ProfileViewStats {
  totalViews: number;
  todayViews: number;
  weeklyAverage: number;
  isSpike: boolean;
}

import type {
  ProjectCategory,
  ProjectStatus,
  WorkflowStep,
  ProjectFile,
  ProjectMember,
  DisplayInfo,
} from '../types/exploreTypes';

export interface PaginationOptions {
  from?: number;
  limit?: number;
}

export interface ProjectListOptions extends PaginationOptions {
  category?: ProjectCategory | '전체';
  statuses?: ProjectStatus[];
}

export interface TeamMember {
  id: string;
  name: string;
  profileImageUrl?: string;
  activityField?: string;
  isOnline?: boolean;
}

export interface TeamInfo {
  leaderId: string;
  leaderName: string;
  leaderAvatar: string;
  leaderField: string;
  totalMembers: number;
  members: TeamMember[];
}

export interface Project {
  id: string;
  title: string;
  description: string;
  category: ProjectCategory;
  status: ProjectStatus;
  coverImage: string;
  brandName: string;
  budget?: string;
  deadline?: string;
  tags: string[];
  createdAt: string;
  capacity?: number;
  skills?: string[];
  goal?: string;
  requirements?: string[];
  workflowSteps: WorkflowStep[];
  team?: TeamInfo;
  members?: ProjectMember[];
  files: ProjectFile[];
  createdBy?: string;
  display: DisplayInfo;
  settlementStatus?: 'pending' | 'paid' | 'cancelled' | 'refund_requested' | 'refunded' | null;
  confirmedBudget?: number | null;
  settlementFeeRate?: number | null;
  settlementPaidAt?: string | null;
  settlementOrderId?: string | null;
  /** Settlement workflow: pending (정산 대기), submitted (정산 검토), completed (정산 완료) */
  distributionRequestStatus?: 'pending' | 'submitted' | 'completed' | null;
}

export interface ProjectApplication {
  id: string;
  projectId: string;
  applicantId: string;
  status: 'pending' | 'reviewed' | 'shortlisted' | 'accepted' | 'rejected' | 'withdrawn';
  coverLetter?: string;
  appliedDate: string;
  budgetRange?: string;
  duration?: string;
  portfolioLinks?: Array<string | { url: string; description?: string | null }>;
  resumeUrl?: string;
  skills?: string[];
  experienceYears?: number;
  availability?: string;
  reviewerNote?: string;
  rejectionReason?: string;
  isShortlisted?: boolean;
  isHiddenByApplicant?: boolean;
  isHiddenByReviewer?: boolean;
  viewedAt?: string;
  applicationCountForProject?: number;
  project?: {
    title: string;
    brandName?: string;
    status: string;
    coverImage?: string;
    category?: ProjectCategory;
    profileType?: 'brand' | 'artist' | 'creative' | 'fan';
  };
  applicant?: {
    name: string;
    avatarUrl?: string;
    activityField?: string;
    profileType?: 'brand' | 'artist' | 'creative' | 'fan';
  };
}

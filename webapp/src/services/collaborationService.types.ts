import type {
  ProjectCategory,
  ProjectStatus,
  ProjectFile,
  WorkflowStep,
  CollaborationMember,
  DisplayInfo,
} from '../types/exploreTypes';

export interface PaginationOptions {
  from?: number;
  limit?: number;
}

export interface CollaborationListOptions extends PaginationOptions {
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

export interface CreateCollaborationInput {
  title: string;
  description: string;
  goal?: string;
  category: ProjectCategory;
  skills: string[];
  requirements: string[];
  benefits: string[];
  capacity: number;
  duration: string;
  workType: string;
  tags: string[];
  coverFile: File;
  region?: string | null;
}

export interface Collaboration {
  id: string;
  title: string;
  briefDescription?: string;
  category: ProjectCategory;
  status: ProjectStatus;
  coverImageUrl: string;
  skills: string[];
  capacity: number;
  duration: string;
  teamSize: number;
  currentTeamSize: number;
  tags: string[];
  createdAt: string;
  createdBy?: string;
  description: string;
  goal?: string;
  workType: string;
  requirements: string[];
  benefits: string[];
  workflowSteps: WorkflowStep[];
  files: ProjectFile[];
  team?: TeamInfo;
  members?: CollaborationMember[];
  display: DisplayInfo;
}

export interface CollaborationInvitation {
  id: string;
  collaborationId: string;
  inviterId: string;
  inviteeId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  message?: string;
  sentDate: string;
  isHiddenByInviter?: boolean;
  isHiddenByInvitee?: boolean;
  collaboration?: {
    title: string;
    coverImageUrl?: string;
    category?: ProjectCategory;
  };
  inviter?: {
    name: string;
    avatarUrl?: string;
    profileType?: 'brand' | 'artist' | 'creative' | 'fan';
  };
}

export interface CollaborationApplication {
  id: string;
  collaborationId: string;
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
  isHiddenByApplicant?: boolean;
  isHiddenByReviewer?: boolean;
  viewedAt?: string;
  applicationCountForCollab?: number;
  collaboration?: {
    title: string;
    status: string;
    createdBy: string;
    coverImageUrl?: string;
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

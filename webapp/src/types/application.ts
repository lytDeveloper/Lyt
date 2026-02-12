export type ApplicationStatus = 'pending' | 'reviewed' | 'shortlisted' | 'accepted' | 'rejected' | 'withdrawn';

export interface PortfolioLink {
  url: string;
  description?: string;
}

export interface ApplicationForm {
  coverLetter: string;
  portfolioLinks: PortfolioLink[];
  resumeUrl?: string;
  availableTime?: string; // For project applications mostly, or as 'availability'
  contactInfo?: string;   // Optional contact info override
}

export interface ApplicationDetail {
  id: string;
  activityId: string; // project_id or collaboration_id
  activityType: 'project' | 'collaboration';
  activityTitle: string;
  applicantId: string;
  applicant: {
    id: string;
    name: string;
    profileImageUrl?: string;
    job?: string; // activityField
  };
  status: ApplicationStatus;
  coverLetter: string;
  portfolioLinks: PortfolioLink[];
  resumeUrl?: string;
  createdAt: string;
  
  // Additional fields based on schema
  budgetRange?: string;
  duration?: string;
  skills?: string[];
  experienceYears?: number;
  availability?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Database Schema <-> TypeScript Interface Mappers
 * Converts between snake_case (DB) and camelCase (TypeScript)
 */

import type { Project } from '../services/projectService';
import type { Collaboration } from '../services/collaborationService';
import type { Partner } from '../services/partnerService';
import type { CollaborationMember, WorkflowStep, ProjectFile, DisplayInfo } from '../types/exploreTypes';

/**
 * Generic snake_case to camelCase converter for object keys
 */
export const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

/**
 * Generic camelCase to snake_case converter for object keys
 */
export const toSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

/**
 * Convert object keys from snake_case to camelCase
 */
export const keysToCamelCase = <T = any>(obj: any): T => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(keysToCamelCase) as any;
  if (typeof obj !== 'object') return obj;

  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = toCamelCase(key);
      result[camelKey] = keysToCamelCase(obj[key]);
    }
  }
  return result;
};

const sanitizeStringArray = (value: any): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item : String(item ?? '')).trim())
      .filter((item) => item.length > 0);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => (typeof item === 'string' ? item : String(item ?? '')).trim())
            .filter((item) => item.length > 0);
        }
      } catch {
        // fall through to delimiter split
      }
    }

    return trimmed
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return [];
};

const sanitizeJsonArray = <T = any>(value: any): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? (value as T[]) : [];
};

/**
 * Convert deadline to YYYY-MM-DD format (date only, no time)
 */
const formatDeadline = (deadline: any): string | undefined => {
  if (!deadline) return undefined;

  // If already a string in YYYY-MM-DD format
  if (typeof deadline === 'string') {
    // Check if it's already in YYYY-MM-DD format (no time part)
    if (/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
      return deadline;
    }
    // If it's an ISO string with time, extract date part
    if (deadline.includes('T')) {
      return deadline.split('T')[0];
    }
    // Try to parse and format
    try {
      const date = new Date(deadline);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch {
      // If parsing fails, return as is (might already be formatted)
      return deadline.split(' ')[0]; // Extract date part if space-separated
    }
  }

  // If it's a Date object
  if (deadline instanceof Date) {
    if (isNaN(deadline.getTime())) return undefined;
    return deadline.toISOString().split('T')[0];
  }

  return undefined;
};

/**
 * Convert object keys from camelCase to snake_case
 */
export const keysToSnakeCase = <T = any>(obj: any): T => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(keysToSnakeCase) as any;
  if (typeof obj !== 'object') return obj;

  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = toSnakeCase(key);
      result[snakeKey] = keysToSnakeCase(obj[key]);
    }
  }
  return result;
};

const buildDisplay = (input?: Partial<DisplayInfo>): DisplayInfo => {
  return {
    displayName: input?.displayName || '',
    displayAvatar: input?.displayAvatar || '',
    displayField: input?.displayField || '',
    displayCategory: input?.displayCategory || '',
    displaySource: input?.displaySource || 'fallback',
  };
};

/**
 * Map database row to Project interface
 * Note: members 정보는 별도로 project_members 테이블에서 조회해야 함
 */
export const mapProject = (row: any, members?: any[], display?: DisplayInfo): Project => {
  // Normalize cover image URL: treat empty string as undefined
  const coverImageUrl = row.cover_image_url || row.cover_image;
  const normalizedCoverImage = coverImageUrl && coverImageUrl.trim() ? coverImageUrl.trim() : '';
  // Cache-bust Supabase storage URLs to avoid stale 304 without body
  const coverImage =
    normalizedCoverImage && normalizedCoverImage.includes('supabase.co/storage')
      ? `${normalizedCoverImage}${normalizedCoverImage.includes('?') ? '&' : '?'}t=${encodeURIComponent(
        row.updated_at || row.created_at || Date.now()
      )}`
      : normalizedCoverImage;

  const resolvedDisplay = buildDisplay(
    display ?? {
      displayName: row.brand_name || '',
      displayAvatar: row.logo_image_url || row.profile_image_url || '',
      displayField: row.activity_field || row.category || '',
      displayCategory: '',
    }
  );

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    coverImage,
    brandName: resolvedDisplay.displayName || row.brand_name || '',
    budget: row.budget_range || row.budget || undefined,
    deadline: formatDeadline(row.deadline),
    tags: row.tags || [],
    createdAt: row.created_at ? (typeof row.created_at === 'string' ? row.created_at : row.created_at.toISOString()) : new Date().toISOString(),
    capacity: row.team_size || row.capacity || undefined,
    skills: row.skills || [],
    goal: row.goal || undefined,
    requirements: sanitizeStringArray(row.requirements),
    workflowSteps: row.workflow_steps || [],
    members,
    files: row.files || [],
    createdBy: row.created_by,
    display: resolvedDisplay,
    // Settlement fields
    settlementStatus: row.settlement_status || null,
    confirmedBudget: row.confirmed_budget || null,
    settlementFeeRate: row.settlement_fee_rate || null,
    settlementPaidAt: row.settlement_paid_at || null,
    settlementOrderId: row.settlement_order_id || null,
    distributionRequestStatus: row.distribution_request_status || 'pending',
  };
};

/**
 * Map database row to Collaboration interface
 * @param row - Database row data
 * @param members - Optional members array (only for detail views)
 */
export const mapCollaboration = (
  row: any,
  members?: CollaborationMember[],
  display?: DisplayInfo
): Collaboration => {
  const resolvedDisplay = buildDisplay(
    display ?? {
      displayName: row.brand_name || row.leader_name || '',
      displayAvatar: row.logo_image_url || row.profile_image_url || '',
      displayField: row.activity_field || row.category || '',
      displayCategory: '',
    }
  );

  return {
    id: row.id,
    title: row.title,
    briefDescription: row.brief_description,
    category: row.category,
    status: row.status,
    coverImageUrl: row.cover_image_url || row.cover_image || '',
    skills: sanitizeStringArray(row.skills),
    capacity: row.team_size || row.capacity || 0,
    duration: row.duration || '',
    teamSize: row.team_size || 0,
    currentTeamSize: row.current_team_size || 0,
    tags: sanitizeStringArray(row.tags),
    createdAt: row.created_at,
    createdBy: row.created_by,
    description: row.description || '',
    goal: row.goal || undefined,
    workType: row.work_type || row.workType || '',
    requirements: sanitizeStringArray(row.requirements),
    benefits: sanitizeStringArray(row.benefits),
    workflowSteps: sanitizeJsonArray<WorkflowStep>(row.workflow_steps),
    files: sanitizeJsonArray<ProjectFile>(row.files),
    // Optional fields (only populated in detail views)
    members,
    display: resolvedDisplay,
  };
};

/**
 * Map database row to Partner interface
 */
export const mapPartner = (row: any): Partner => {
  const resolvedDisplay = buildDisplay({
    displayName: row.name || '',
    displayAvatar: row.profile_image_url,
    displayField: row.activity_field || '',
    displayCategory: row.role || '',
    displaySource: 'partner',
  });

  return {
    id: row.id,
    name: row.name,
    activityField: row.activity_field,
    role: row.role,
    specializedRoles: row.specialized_roles || [],
    tags: row.tags || [],
    bio: row.bio || '',
    profileImageUrl: row.profile_image_url,
    coverImageUrl: row.cover_image_url || '', // VIEW doesn't have this, but interface requires it
    portfolioImages: row.portfolio_images || [],
    rating: row.rating || 0,
    reviewCount: row.review_count || 0,
    completedProjects: row.completed_projects || 0,
    region: row.region || '',
    matchingRate: row.matching_rate || 0,
    responseRate: row.response_rate || 0,
    responseTime: row.response_time || '24시간 이내',
    career: row.career || '',
    isOnline: row.is_online || false,
    isVerified: row.is_verified || false,
    careerHistory: row.career_history || [],
    category: row.activity_field,
    display: resolvedDisplay,
    established_at: row.established_at || undefined,
  };
};

/**
 * Map Project to database format (for INSERT/UPDATE)
 */
export const projectToDb = (project: Partial<Project>): any => {
  const dbData: any = {};

  if (project.title !== undefined) dbData.title = project.title;
  if (project.description !== undefined) dbData.description = project.description;
  if (project.category !== undefined) dbData.category = project.category;
  if (project.status !== undefined) dbData.status = project.status;
  if (project.coverImage !== undefined) dbData.cover_image_url = project.coverImage;
  if (project.budget !== undefined) dbData.budget_range = project.budget;
  if (project.deadline !== undefined) dbData.deadline = formatDeadline(project.deadline) || project.deadline;
  if (project.tags !== undefined) dbData.tags = project.tags;
  if (project.capacity !== undefined) dbData.team_size = project.capacity;
  if (project.skills !== undefined) dbData.skills = project.skills;
  if (project.workflowSteps !== undefined) dbData.workflow_steps = project.workflowSteps;
  if (project.files !== undefined) dbData.files = project.files;
  // Note: team 정보는 project_members 테이블에 별도로 저장됨
  // brand_name은 profile_brands 테이블에서 가져오므로 저장하지 않음

  return dbData;
};

/**
 * Map Collaboration to database format (for INSERT/UPDATE)
 * Note: team and members are stored in collaboration_members table separately
 */
export const collaborationToDb = (collaboration: Partial<Collaboration>): any => {
  const dbData: any = {};

  if (collaboration.title !== undefined) dbData.title = collaboration.title;
  if (collaboration.briefDescription !== undefined) dbData.brief_description = collaboration.briefDescription;
  if (collaboration.category !== undefined) dbData.category = collaboration.category;
  if (collaboration.status !== undefined) dbData.status = collaboration.status;
  if (collaboration.coverImageUrl !== undefined) dbData.cover_image_url = collaboration.coverImageUrl;
  if (collaboration.skills !== undefined) dbData.skills = collaboration.skills;
  if (collaboration.capacity !== undefined) dbData.team_size = collaboration.capacity;
  if (collaboration.teamSize !== undefined) dbData.team_size = collaboration.teamSize;
  if (collaboration.currentTeamSize !== undefined) dbData.current_team_size = collaboration.currentTeamSize;
  if (collaboration.tags !== undefined) dbData.tags = collaboration.tags;
  if (collaboration.description !== undefined) dbData.description = collaboration.description;
  if (collaboration.requirements !== undefined) dbData.requirements = collaboration.requirements;
  if (collaboration.benefits !== undefined) dbData.benefits = collaboration.benefits;
  if (collaboration.workflowSteps !== undefined) dbData.workflow_steps = collaboration.workflowSteps;
  if (collaboration.files !== undefined) dbData.files = collaboration.files;
  // Note: team and members are stored in collaboration_members table separately

  return dbData;
};

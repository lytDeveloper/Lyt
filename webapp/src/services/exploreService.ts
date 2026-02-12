/**
 * Explore Service
 * Central hub that re-exports all explore-related services
 * This maintains backward compatibility while keeping services modular
 */

import { supabase } from '../lib/supabase';
import type { Project } from './projectService';
import type { Collaboration } from './collaborationService';
import type { Partner } from './partnerService';
import type { ProjectCategory, ProjectStatus } from '../types/exploreTypes';
import { mapProject, mapCollaboration, mapPartner } from '../utils/mappers';
import { getProfileDisplayMap, toLegacyDisplayInfo } from './profileDisplayService';

// Re-export types
export type {
  ProjectCategory,
  ProjectStatus,
  WorkflowStep,
  ProjectFile,
  CareerHistoryItem,
  CollaborationMember,
  ProjectMember,
  DisplayInfo,
} from '../types/exploreTypes';

// CollaborationType is in onboarding.types.ts
export type { CollaborationType } from '../types/onboarding.types';

// Re-export Partner service
export type { Partner } from './partnerService';
export {
  getAllPartners,
  getPartnerById,
  getPartnersByCategory,
  getPartnersByActivityField,
  searchPartners,
  searchPartnersWithFilters,
  filterPartners,
  partnerService,
} from './partnerService';

// Re-export Project service
export type { Project } from './projectService';
export {
  getAllProjects,
  getProjectById,
  getProjectsByCategory,
  getProjectsByStatus,
  searchProjects,
  searchProjectsWithFilters,
  filterProjects,
  projectService,
  createProject,
  updateProjectWorkflowSteps,
  updateProjectStatus,
} from './projectService';

// Re-export Collaboration service
export type { Collaboration } from './collaborationService';
export {
  getAllCollaborations,
  getCollaborationById,
  getCollaborationsByCategory,
  getCollaborationsByStatus,
  searchCollaborations,
  searchCollaborationsWithFilters,
  filterCollaborations,
  collaborationService,
  updateCollaborationStatus,
  updateCollaborationWorkflowSteps,
} from './collaborationService';

// Unified explore service object (for backward compatibility)
import {
  getAllProjects,
  getProjectById,
  getProjectsByCategory,
  getProjectsByStatus,
  searchProjects,
  searchProjectsWithFilters,
  filterProjects,
  createProject,
  updateProjectWorkflowSteps,
  updateProjectStatus,
} from './projectService';

import {
  getAllCollaborations,
  getCollaborationById,
  getCollaborationsByCategory,
  getCollaborationsByStatus,
  searchCollaborations,
  searchCollaborationsWithFilters,
  filterCollaborations,
  updateCollaborationStatus,
  updateCollaborationWorkflowSteps,
} from './collaborationService';

import {
  getAllPartners,
  getPartnerById,
  getPartnersByCategory,
  getPartnersByActivityField,
  searchPartners,
  searchPartnersWithFilters,
  filterPartners,
} from './partnerService';

export const exploreService = {
  // Projects
  getAllProjects,
  getProjectById,
  getProjectsByCategory,
  getProjectsByStatus,
  searchProjects,
  searchProjectsWithFilters,
  filterProjects,
  createProject,
  updateProjectWorkflowSteps,
  updateProjectStatus,
  // Collaborations
  getAllCollaborations,
  getCollaborationById,
  getCollaborationsByCategory,
  getCollaborationsByStatus,
  searchCollaborations,
  searchCollaborationsWithFilters,
  filterCollaborations,
  updateCollaborationStatus,
  updateCollaborationWorkflowSteps,
  // Partners
  getAllPartners,
  getPartnerById,
  getPartnersByCategory,
  getPartnersByActivityField,
  searchPartners,
  searchPartnersWithFilters,
  filterPartners,
};

// ============================================================================
// Batch API for Explore Page Optimization
// ============================================================================

/**
 * Batch result from explore feed endpoint
 * Contains limited fields for initial list view
 */
export interface ExploreBatchResult {
  projects: Project[];
  collaborations: Collaboration[];
  partners: Partner[];
  // Type-specific cursors for independent pagination
  projectsCursor: string | null;
  collaborationsCursor: string | null;
  partnersCursor: string | null;
  // Legacy: unified cursor (for backward compatibility)
  nextCursor: string | null;
}

/**
 * Type-specific cursors for pagination
 * Each type has its own cursor to enable proper pagination regardless of which tab is active
 */
export interface ExploreCursors {
  projectsCursor?: string | null;
  collaborationsCursor?: string | null;
  partnersCursor?: string | null;
}

export type ExploreFeedTab = 'projects' | 'collaborations' | 'partners';
export type ExploreFetchMode = 'full' | 'active-only';

export interface FetchExploreBatchOptions {
  category: ProjectCategory | '전체';
  statuses: ProjectStatus[];
  searchQuery?: string;
  cursor?: string;  // Legacy: unified cursor
  cursors?: ExploreCursors;  // Type-specific cursors
  limit?: number;
  activeTab?: ExploreFeedTab;
  fetchMode?: ExploreFetchMode;
}

const EXCLUDED_STATUSES: ProjectStatus[] = ['cancelled', 'on_hold', 'deleted'];

const filterOutInactiveStatuses = (result: ExploreBatchResult): ExploreBatchResult => {
  const isExcluded = (status?: ProjectStatus | string | null) =>
    !!status && EXCLUDED_STATUSES.includes(status as ProjectStatus);

  const filterByStatus = <T extends { status?: ProjectStatus | string | null }>(items: T[]) =>
    items.filter((item) => !isExcluded(item.status));

  return {
    ...result,
    projects: filterByStatus(result.projects),
    collaborations: filterByStatus(result.collaborations),
  };
};

/**
 * Retry Edge Function invocation with exponential backoff
 * Only retries on 503, 502, 504 errors (service unavailable)
 *
 * @param functionName - Name of the Edge Function to invoke
 * @param body - Request body to send to the function
 * @param maxRetries - Maximum number of retries (default: 3, total attempts: 4)
 * @returns Promise with data and error (same format as supabase.functions.invoke)
 */
async function retryEdgeFunctionInvoke(
  functionName: string,
  body: any,
  maxRetries = 3
): Promise<{ data: any; error: any }> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const { data, error } = await supabase.functions.invoke(functionName, { body });

    // Success - return immediately
    if (!error) {
      if (attempt > 0) {
        console.log(`[retryEdgeFunctionInvoke] Success on attempt ${attempt + 1}`);
      }
      return { data, error: null };
    }

    // Extract status code from error
    const statusCode = error?.status || error?.code;

    // Only retry on 503, 502, 504 errors (service unavailable)
    if (statusCode !== 503 && statusCode !== 502 && statusCode !== 504) {
      console.warn(`[retryEdgeFunctionInvoke] Non-retryable error (${statusCode}), not retrying:`, error);
      return { data: null, error };
    }

    // Last attempt - return error
    if (attempt === maxRetries) {
      console.warn(`[retryEdgeFunctionInvoke] Failed after ${maxRetries + 1} attempts (${statusCode}):`, error);
      return { data: null, error };
    }

    // Exponential backoff: 2^attempt seconds
    const delay = Math.pow(2, attempt) * 1000;
    console.log(`[retryEdgeFunctionInvoke] Attempt ${attempt + 1} failed (${statusCode}), retrying in ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Should never reach here, but TypeScript requires return
  return { data: null, error: new Error('Retry logic exhausted') };
}

/**
 * Fetch all explore data in a single request (batch API)
 * First tries Supabase Edge Function with retry logic, falls back to parallel calls
 *
 * @param options - Filter options
 * @returns Promise with projects, collaborations, and partners
 */
export async function fetchExploreBatch(options: FetchExploreBatchOptions): Promise<ExploreBatchResult> {
  const {
    category,
    statuses,
    searchQuery,
    cursor,
    cursors,
    limit = 10,
    activeTab,
    fetchMode = 'full',
  } = options;

  try {
    // Get current user for "My items" priority
    const { data: { user } } = await supabase.auth.getUser();

    // Try Supabase Edge Function with retry logic
    // Send type-specific cursors for independent pagination
    const { data, error } = await retryEdgeFunctionInvoke('explore-feed', {
      category: category === '전체' ? undefined : category,
      statuses,
      searchQuery,
      // Type-specific cursors (preferred)
      projectsCursor: cursors?.projectsCursor,
      collaborationsCursor: cursors?.collaborationsCursor,
      partnersCursor: cursors?.partnersCursor,
      // Legacy unified cursor (fallback)
      cursor: cursor || undefined,
      limit,
      activeTab,
      fetchMode,
      userId: user?.id,
    });

    if (error) {
      const statusCode = error?.status || error?.code;
      console.warn(`[fetchExploreBatch] Edge Function failed (${statusCode}), falling back to parallel calls:`, error);
      return fallbackFetchExplore(options, user?.id);
    }

    // Map Edge Function response using JOIN data + batch brand fetch
    const enriched = await enrichEdgeFunctionData(data, user?.id);
    return filterOutInactiveStatuses(enriched);
  } catch (error) {
    console.error('[fetchExploreBatch] Unexpected error:', error);
    // Fallback to parallel calls
    const { data: { user } } = await supabase.auth.getUser();
    return filterOutInactiveStatuses(await fallbackFetchExplore(options, user?.id));
  }
}

/**
 * Enrich Edge Function data with proper mapping
 * Uses lightweight member data from Edge Function and profile display maps
 * to avoid extra N+1 lookups for list cards
 */
async function enrichEdgeFunctionData(
  data: any,
  _userId?: string
): Promise<ExploreBatchResult> {
  if (!data) {
    return {
      projects: [],
      collaborations: [],
      partners: [],
      projectsCursor: null,
      collaborationsCursor: null,
      partnersCursor: null,
      nextCursor: null
    };
  }

  // Batch fetch all project leader info using getProfileDisplayMap (is_active 필터링, 역할 우선순위 적용)
  const projectCreatorIds = (data.projects || [])
    .map((row: any) => row.created_by)
    .filter((id: string) => id);

  const collaborationCreatorIds = (data.collaborations || [])
    .map((row: any) => row.created_by)
    .filter((id: string) => id);

  const allCreatorIds = [...new Set([...projectCreatorIds, ...collaborationCreatorIds])] as string[];

  // getProfileDisplayMap은 is_active=true인 활성 프로필만 조회하고, 역할 우선순위(브랜드>아티스트>크리에이티브>팬)를 적용
  const displayInfoMap = await getProfileDisplayMap(allCreatorIds);

  // Map and enrich projects using profile display data (is_active 필터링된 데이터)
  const projects = (data.projects || []).map((row: any) => {
    const profileDisplay = displayInfoMap.get(row.created_by);
    const display = profileDisplay ? toLegacyDisplayInfo(profileDisplay) : undefined;
    const project = mapProject(row, undefined, display);
    const leaderId = row.created_by;
    const leaderProfileDisplay = displayInfoMap.get(leaderId);

    // brandName은 활성 프로필 이름 사용
    project.brandName = leaderProfileDisplay?.name || '브랜드';

    // Build team info from getProfileDisplayMap data
    project.team = {
      leaderId,
      leaderName: leaderProfileDisplay?.name || '',
      leaderAvatar: leaderProfileDisplay?.avatar || '',
      leaderField: leaderProfileDisplay?.activityField || '',
      totalMembers: row.current_team_size || 1,
      members: [],
    };
    return project;
  });

  // Map collaborations (member count uses current_team_size from edge response)
  const collaborations = (data.collaborations || []).map((row: any) => {
    const collabProfileDisplay = displayInfoMap.get(row.created_by);
    const collabDisplay = collabProfileDisplay ? toLegacyDisplayInfo(collabProfileDisplay) : undefined;
    return mapCollaboration(row, undefined, collabDisplay);
  });

  // Map partners
  const partners = (data.partners || []).map((row: any) => {
    return mapPartner(row);
  });

  return {
    projects,
    collaborations,
    partners,
    // Type-specific cursors for independent pagination
    projectsCursor: data.projectsCursor ?? null,
    collaborationsCursor: data.collaborationsCursor ?? null,
    partnersCursor: data.partnersCursor ?? null,
    // Legacy unified cursor
    nextCursor: data.nextCursor ?? null,
  };
}

/**
 * Fallback implementation using parallel calls
 * Used when Edge Function is not available
 */
async function fallbackFetchExplore(
  options: FetchExploreBatchOptions,
  userId?: string
): Promise<ExploreBatchResult> {
  const {
    category,
    statuses,
    searchQuery,
    limit = 5,
    activeTab,
    fetchMode = 'full',
  } = options;

  const shouldFetchProjects = fetchMode === 'full' || activeTab === 'projects' || !activeTab;
  const shouldFetchCollaborations = fetchMode === 'full' || activeTab === 'collaborations' || !activeTab;
  const shouldFetchPartners = fetchMode === 'full' || activeTab === 'partners' || !activeTab;

  console.warn('[fallbackFetchExplore] Using fallback mode - fetching data directly from Supabase (slower but reliable)');

  // Fetch only the required tab in active-only mode
  const [projects, collaborations, partners] = await Promise.all([
    shouldFetchProjects
      ? (searchQuery
        ? searchProjectsWithFilters(searchQuery, category, statuses, { from: 0, limit })
        : getAllProjects({ from: 0, limit, category, statuses }))
      : Promise.resolve([]),
    shouldFetchCollaborations
      ? (searchQuery
        ? searchCollaborationsWithFilters(searchQuery, category, statuses, { from: 0, limit })
        : getAllCollaborations({ from: 0, limit, category, statuses }))
      : Promise.resolve([]),
    shouldFetchPartners
      ? (searchQuery
        ? searchPartnersWithFilters(searchQuery, category, { from: 0, limit })
        : getAllPartners({ from: 0, limit, category }))
      : Promise.resolve([]),
  ]);

  // Sort by "isMine" - put user's items first
  const sortByMine = <T extends { createdBy?: string; created_by?: string }>(items: T[]): T[] => {
    if (!userId) return items;
    const myItems = items.filter(item =>
      (item.createdBy === userId) || (item.created_by === userId)
    );
    const otherItems = items.filter(item =>
      (item.createdBy !== userId) && (item.created_by !== userId)
    );
    return [...myItems, ...otherItems];
  };

  return {
    ...filterOutInactiveStatuses({
      projects: sortByMine(projects).slice(0, limit),
      collaborations: sortByMine(collaborations).slice(0, limit),
      partners: partners.slice(0, limit), // Partners don't have "mine" concept
      // Fallback doesn't support pagination
      projectsCursor: null,
      collaborationsCursor: null,
      partnersCursor: null,
      nextCursor: null,
    }),
  };
}

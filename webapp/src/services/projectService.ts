/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Project Service
 * Manages project data with Supabase backend integration
 */

import {
  type ProjectCategory,
  type ProjectStatus,
  type WorkflowStep,
  type CreateProjectInput,
} from '../types/exploreTypes';
import type {
  PaginationOptions,
  Project,
  ProjectApplication,
  ProjectListOptions,
  TeamInfo,
  TeamMember,
} from './projectService.types';

// Re-export types that are used by other modules
export type { CreateProjectInput } from '../types/exploreTypes';
export type { Project, ProjectApplication, ProjectListOptions } from './projectService.types';
import { supabase } from '../lib/supabase';
import { mapProject } from '../utils/mappers';
import { calculateDeadline, mapToProjectCategory } from '../constants/projectConstants';
import { getExcludedProjectIds } from '../utils/preferenceHelpers';
import { messageService } from './messageService';
import { paymentService } from './paymentService';
import { getContentType } from '../utils/fileUtils';
import {
  getProfileDisplay,
  getProfileDisplayMap,
  toLegacyDisplayInfo,
} from './profileDisplayService';
import type { ProfileDisplayInfo } from '../types/profileDisplay.types';
import { getBrandMetrics as fetchBrandMetrics } from './brandMetricsService';
import { activityService } from './activityService';
import { badgeAutoGrantService } from './badgeAutoGrantService';

const DEFAULT_PAGE_SIZE = 10;

const resolveRange = (options?: PaginationOptions): { from: number; to: number } => {
  const limit = options?.limit ?? DEFAULT_PAGE_SIZE;
  const from = options?.from ?? 0;
  const to = from + limit - 1;
  return { from, to };
};

const mapProjectWithDisplay = async (row: any, members?: any[]) => {
  const profileDisplay = await getProfileDisplay(row.created_by || row.createdBy);
  const display = toLegacyDisplayInfo(profileDisplay);
  return mapProject(row, members, display);
};

/**
 * 여러 프로젝트를 배치로 매핑 (N+1 쿼리 방지)
 * 모든 created_by를 한 번에 조회하여 프로필 정보를 매핑
 */
export const mapProjectsWithDisplay = async (rows: any[]): Promise<Project[]> => {
  if (!rows || rows.length === 0) return [];

  // 1. 모든 created_by ID 수집
  const creatorIds = [...new Set(rows.map(r => r.created_by || r.createdBy).filter(Boolean))];

  // 2. 배치로 프로필 조회
  const profileMap = await getProfileDisplayMap(creatorIds);

  // 3. 동기적으로 매핑
  return rows.map(row => {
    const creatorId = row.created_by || row.createdBy;
    const profileDisplay = profileMap.get(creatorId);
    // profileDisplay가 undefined인 경우 기본 display 사용 (mapProject 내부에서 처리)
    const display = profileDisplay ? toLegacyDisplayInfo(profileDisplay) : undefined;
    return mapProject(row, undefined, display);
  });
};

/**
 * Get team information for a project from project_members and partners VIEW
 */
export const getProjectTeamInfo = async (projectId: string, createdBy: string): Promise<TeamInfo> => {
  try {
    // Validate inputs
    if (!projectId || projectId === 'undefined') {
      console.warn('[projectService] Invalid projectId in getProjectTeamInfo:', projectId);
      return {
        leaderId: createdBy || '',
        leaderName: '',
        leaderAvatar: '',
        leaderField: '',
        totalMembers: 1,
        members: [],
      };
    }

    // Get project members
    const { data: membersData, error: membersError } = await supabase
      .from('project_members')
      .select('user_id, position, is_leader, status')
      .eq('project_id', projectId)
      .eq('status', 'active');

    if (membersError) {
      console.error('[projectService] Error fetching project members:', membersError);
    }

    const members = membersData || [];
    const leaderMember = members.find((m) => m.is_leader === true);
    const leaderId = leaderMember?.user_id || createdBy;

    // 리더 정보 조회 (getProfileDisplay 사용 - 브랜드/아티스트/크리에이티브/팬 모두 지원, is_active 필터 적용, activityField 포함)
    let leaderName = '';
    let leaderAvatar = '';
    let leaderField = '';

    if (leaderId) {
      const leaderDisplay = await getProfileDisplay(leaderId);
      if (leaderDisplay) {
        leaderName = leaderDisplay.name || '';
        leaderAvatar = leaderDisplay.avatar || '';
        leaderField = leaderDisplay.activityField || '';
      }
    }

    // Get all member details (브랜드/아티스트/크리에이티브/팬 모두 지원)
    const memberIds = members
      .filter((m) => m.user_id !== leaderId)
      .map((m) => m.user_id);

    let memberPartners: TeamMember[] = [];
    if (memberIds.length > 0) {
      // 배치로 모든 유저 타입의 표시 정보 조회 (activityField 포함)
      const displayInfoMap = await getProfileDisplayMap(memberIds);

      // Build memberPartners array using actual user_id from project_members
      memberPartners = memberIds
        .map((userId) => {
          const displayInfo = displayInfoMap.get(userId);
          return {
            id: userId,
            name: displayInfo?.name || '',
            profileImageUrl: displayInfo?.avatar || undefined,
            activityField: displayInfo?.activityField || undefined,
          } as TeamMember;
        })
        .filter((m): m is TeamMember => m !== null);
    }

    return {
      leaderId,
      leaderName,
      leaderAvatar,
      leaderField,
      totalMembers: members.length || 1,
      members: memberPartners,
    };
  } catch (error) {
    console.error('[projectService] Error getting project team info:', error);
    // Return default team info
    return {
      leaderId: createdBy,
      leaderName: '',
      leaderAvatar: '',
      leaderField: '',
      totalMembers: 1,
      members: [],
    };
  }
};

/**
 * Get brand name from profile_brands table
 */
const getBrandName = async (userId: string): Promise<string> => {
  try {
    const { data } = await supabase
      .from('profile_brands')
      .select('brand_name')
      .eq('profile_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    return data?.brand_name || '브랜드';
  } catch (error) {
    console.error('[projectService] Error getting brand name:', error);
    return '브랜드';
  }
};

/**
 * Get live response metrics for a brand (projects/collaborations owned by the brand)
 */
export const getBrandMetricsById = async (brandId: string) => {
  return fetchBrandMetrics(brandId);
};

/**
 * Get all projects from Supabase with optional pagination and filters
 * Automatically filters out hidden and blocked projects for the current user at query level
 */
export const getAllProjects = async (options: ProjectListOptions = {}): Promise<Project[]> => {
  try {
    const limit = options?.limit ?? DEFAULT_PAGE_SIZE;
    const baseFrom = options?.from ?? 0;

    // Get current user and excluded IDs
    const { data: { user } } = await supabase.auth.getUser();
    const excludedIds = user ? await getExcludedProjectIds(user.id) : new Set<string>();
    const excludedIdsArray = Array.from(excludedIds);

    let allResults: Project[] = [];
    let currentFrom = baseFrom;
    const maxIterations = 3; // 최대 3회 반복으로 무한 루프 방지
    let iteration = 0;

    while (allResults.length < limit && iteration < maxIterations) {
      const currentTo = currentFrom + limit - 1;

      let queryBuilder = supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply excluded IDs filter (only if there are excluded IDs)
      if (excludedIdsArray.length > 0) {
        queryBuilder = queryBuilder.not('id', 'in', `(${excludedIdsArray.join(',')})`);
      }

      if (options.category && options.category !== '전체') {
        queryBuilder = queryBuilder.eq('category', options.category);
      }

      if (options.statuses && options.statuses.length > 0) {
        queryBuilder = queryBuilder.in('status', options.statuses);
      }

      // Always include draft projects created by current user, regardless of status filter
      // This is handled in post-processing to avoid complex OR queries

      const { data, error } = await queryBuilder.range(currentFrom, currentTo);

      if (error) {
        console.error('[projectService] Error fetching projects:', error);
        throw new Error(`프로젝트 목록을 불러오는데 실패했어요: ${error.message}`);
      }

      // Map projects and enrich with team info
      let projects = await Promise.all(
        (data || []).map(async (row) => {
          const project = await mapProjectWithDisplay(row);
          project.team = await getProjectTeamInfo(row.id, row.created_by);
          return project;
        })
      );

      // If status filter doesn't include draft, add current user's draft projects
      if (user && (!options.statuses || !options.statuses.includes('draft'))) {
        const { data: draftData } = await supabase
          .from('projects')
          .select('*')
          .eq('status', 'draft')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false })
          .limit(10); // Limit draft projects to avoid too many results

        if (draftData && draftData.length > 0) {
          const draftProjects = await Promise.all(
            draftData.map(async (row) => {
              const project = await mapProjectWithDisplay(row);
              project.team = await getProjectTeamInfo(row.id, row.created_by);
              return project;
            })
          );
          // Merge draft projects with other projects, avoiding duplicates
          const existingIds = new Set(projects.map(p => p.id));
          const newDrafts = draftProjects.filter(p => !existingIds.has(p.id));
          projects = [...projects, ...newDrafts];
        }
      }

      if (projects.length === 0) {
        // 더 이상 데이터가 없으면 중단
        break;
      }

      allResults = [...allResults, ...projects];

      // 다음 반복을 위해 offset 조정
      currentFrom = currentTo + 1;
      iteration++;
    }

    // 요청한 limit만큼만 반환
    return allResults.slice(0, limit);
  } catch (error) {
    console.error('[projectService] getAllProjects failed:', error);
    throw error;
  }
};

/**
 * Get projects where the current user is a leader or a member
 */
export const getMyProjects = async (options?: { limit?: number; offset?: number }): Promise<Project[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    // 1. Get projects where user is the leader (created_by)
    let createdQuery = supabase
      .from('projects')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    // Apply pagination if provided
    if (options?.limit !== undefined && options?.offset !== undefined) {
      createdQuery = createdQuery.range(options.offset, options.offset + options.limit - 1);
    }

    const { data: createdData, error: createdError } = await createdQuery;

    if (createdError) {
      console.error('[projectService] Error fetching created projects:', createdError);
      throw new Error(`내가 만든 프로젝트를 불러오는데 실패했어요: ${createdError.message}`);
    }

    // 2. Get projects where user is a member (from project_members table)
    let memberQuery = supabase
      .from('project_members')
      .select('project_id, projects(*)')
      .eq('user_id', user.id)
      .eq('status', 'active');

    // Apply pagination if provided
    if (options?.limit !== undefined && options?.offset !== undefined) {
      memberQuery = memberQuery.range(options.offset, options.offset + options.limit - 1);
    }

    const { data: memberProjects, error: memberError } = await memberQuery;

    if (memberError) {
      console.error('[projectService] Error fetching member projects:', memberError);
    }

    // Batch fetch brand names for all created projects (is_active 필터 추가)
    const createdByUserIds = [...new Set((createdData || []).map(row => row.created_by).filter(Boolean))];
    const brandNamesMap = new Map<string, string>();
    if (createdByUserIds.length > 0) {
      const { data: brandData } = await supabase
        .from('profile_brands')
        .select('profile_id, brand_name')
        .in('profile_id', createdByUserIds)
        .eq('is_active', true);

      if (brandData) {
        brandData.forEach(brand => {
          brandNamesMap.set(brand.profile_id, brand.brand_name || '브랜드');
        });
      }
    }

    // Batch fetch team info for all created projects
    const createdProjectIds = (createdData || []).map(row => row.id).filter(Boolean);
    const teamInfoMap = new Map<string, TeamInfo>();
    // 프로필 정보를 블록 밖에서도 사용하기 위해 미리 선언
    let createdDisplayInfoMap = new Map<string, ProfileDisplayInfo>();

    if (createdProjectIds.length > 0) {
      // Get all project members in one query
      const { data: allMembersData } = await supabase
        .from('project_members')
        .select('project_id, user_id, position, is_leader, status')
        .in('project_id', createdProjectIds)
        .eq('status', 'active');

      // Group members by project_id
      const membersByProject = new Map<string, typeof allMembersData>();
      (allMembersData || []).forEach(member => {
        if (!membersByProject.has(member.project_id)) {
          membersByProject.set(member.project_id, []);
        }
        membersByProject.get(member.project_id)!.push(member);
      });

      // Get all unique user IDs (leaders and members)
      const allUserIds = new Set<string>();
      (createdData || []).forEach(row => {
        if (row.created_by) allUserIds.add(row.created_by);
        const members = membersByProject.get(row.id) || [];
        members.forEach(m => allUserIds.add(m.user_id));
      });

      // Batch fetch user display info using getProfileDisplayMap (is_active 필터링 포함)
      const userIdsArray = Array.from(allUserIds);
      createdDisplayInfoMap = await getProfileDisplayMap(userIdsArray);

      // Build team info for each project
      createdProjectIds.forEach(projectId => {
        const row = createdData!.find(r => r.id === projectId);
        if (!row) return;

        const members = membersByProject.get(projectId) || [];
        const leaderMember = members.find(m => m.is_leader === true);
        const leaderId = leaderMember?.user_id || row.created_by;

        // Get leader info from createdDisplayInfoMap
        const leaderDisplayInfo = createdDisplayInfoMap.get(leaderId);
        const leaderName = leaderDisplayInfo?.name || '';
        const leaderAvatar = leaderDisplayInfo?.avatar || '';
        const leaderField = leaderDisplayInfo?.activityField || '';

        // Get member details
        const memberIds = members.filter(m => m.user_id !== leaderId).map(m => m.user_id);
        const memberPartners: TeamMember[] = memberIds.map(userId => {
          const memberDisplayInfo = createdDisplayInfoMap.get(userId);
          return {
            id: userId,
            name: memberDisplayInfo?.name || '',
            profileImageUrl: memberDisplayInfo?.avatar,
            activityField: memberDisplayInfo?.activityField,
          } as TeamMember;
        }).filter(m => m !== null);

        teamInfoMap.set(projectId, {
          leaderId,
          leaderName,
          leaderAvatar,
          leaderField,
          totalMembers: members.length + 1,
          members: memberPartners,
        });
      });
    }

    // 이미 createdDisplayInfoMap에서 프로필 정보를 가지고 있으므로 동기적으로 매핑 (중복 쿼리 방지)
    const createdProjects = (createdData || [])
      .filter((row) => row && row.id && row.created_by)
      .map((row) => {
        const profileDisplay = createdDisplayInfoMap.get(row.created_by);
        const display = profileDisplay ? toLegacyDisplayInfo(profileDisplay) : undefined;
        const project = mapProject(row, undefined, display);
        project.brandName = brandNamesMap.get(row.created_by) || project.display.displayName || '브랜드';
        project.team = teamInfoMap.get(row.id) || {
          leaderId: row.created_by,
          leaderName: '',
          leaderAvatar: '',
          leaderField: '',
          totalMembers: 1,
          members: [],
        };
        return project;
      });

    // Process member projects - Supabase returns projects as object (not array) when using single select
    const memberProjectRows = (memberProjects || [])
      .map((mp) => {
        // Supabase returns projects as object when using single select
        const project = Array.isArray(mp.projects) ? mp.projects[0] : mp.projects;
        return project;
      })
      .filter((project) => {
        // Filter out null/undefined projects and projects where user is creator
        return project && project.id && project.created_by && project.created_by !== user.id;
      });

    // Batch fetch brand names and team info for member projects (is_active 필터 추가)
    const memberProjectCreatedByIds = [...new Set(memberProjectRows.map(row => row.created_by).filter(Boolean))];
    const memberBrandNamesMap = new Map<string, string>();
    if (memberProjectCreatedByIds.length > 0) {
      const { data: memberBrandData } = await supabase
        .from('profile_brands')
        .select('profile_id, brand_name')
        .in('profile_id', memberProjectCreatedByIds)
        .eq('is_active', true);

      if (memberBrandData) {
        memberBrandData.forEach(brand => {
          memberBrandNamesMap.set(brand.profile_id, brand.brand_name || '브랜드');
        });
      }
    }

    const memberProjectIds = memberProjectRows.map(row => row.id).filter(Boolean);
    const memberTeamInfoMap = new Map<string, TeamInfo>();
    // 프로필 정보를 블록 밖에서도 사용하기 위해 미리 선언
    let memberDisplayInfoMap = new Map<string, ProfileDisplayInfo>();

    if (memberProjectIds.length > 0) {
      // Get all project members in one query
      const { data: allMemberProjectsMembersData } = await supabase
        .from('project_members')
        .select('project_id, user_id, position, is_leader, status')
        .in('project_id', memberProjectIds)
        .eq('status', 'active');

      // Group members by project_id
      const memberProjectsMembersByProject = new Map<string, typeof allMemberProjectsMembersData>();
      (allMemberProjectsMembersData || []).forEach(member => {
        if (!memberProjectsMembersByProject.has(member.project_id)) {
          memberProjectsMembersByProject.set(member.project_id, []);
        }
        memberProjectsMembersByProject.get(member.project_id)!.push(member);
      });

      // Get all unique user IDs
      const allMemberProjectUserIds = new Set<string>();
      memberProjectRows.forEach(row => {
        if (row.created_by) allMemberProjectUserIds.add(row.created_by);
        const members = memberProjectsMembersByProject.get(row.id) || [];
        members.forEach(m => allMemberProjectUserIds.add(m.user_id));
      });

      // Batch fetch user display info using getProfileDisplayMap (is_active 필터링 포함)
      const memberUserIdsArray = Array.from(allMemberProjectUserIds);
      memberDisplayInfoMap = await getProfileDisplayMap(memberUserIdsArray);

      // Build team info for each member project
      memberProjectIds.forEach(projectId => {
        const row = memberProjectRows.find(r => r.id === projectId);
        if (!row) return;

        const members = memberProjectsMembersByProject.get(projectId) || [];
        const leaderMember = members.find(m => m.is_leader === true);
        const leaderId = leaderMember?.user_id || row.created_by;

        // Get leader info from displayInfoMap
        const leaderDisplayInfo = memberDisplayInfoMap.get(leaderId);
        const leaderName = leaderDisplayInfo?.name || '';
        const leaderAvatar = leaderDisplayInfo?.avatar || '';
        const leaderField = leaderDisplayInfo?.activityField || '';

        // Get member details
        const memberIds = members.filter(m => m.user_id !== leaderId).map(m => m.user_id);
        const memberPartners: TeamMember[] = memberIds.map(userId => {
          const memberDisplayInfo = memberDisplayInfoMap.get(userId);
          return {
            id: userId,
            name: memberDisplayInfo?.name || '',
            profileImageUrl: memberDisplayInfo?.avatar,
            activityField: memberDisplayInfo?.activityField,
          } as TeamMember;
        }).filter(m => m !== null);

        memberTeamInfoMap.set(projectId, {
          leaderId,
          leaderName,
          leaderAvatar,
          leaderField,
          totalMembers: members.length + 1,
          members: memberPartners,
        });
      });
    }

    // 이미 memberDisplayInfoMap에서 프로필 정보를 가지고 있으므로 동기적으로 매핑 (중복 쿼리 방지)
    const participatingProjects = memberProjectRows
      .filter((row) => row && row.id && row.created_by)
      .map((row) => {
        const profileDisplay = memberDisplayInfoMap.get(row.created_by);
        const display = profileDisplay ? toLegacyDisplayInfo(profileDisplay) : undefined;
        const project = mapProject(row, undefined, display);
        project.brandName = memberBrandNamesMap.get(row.created_by) || project.display.displayName || '브랜드';
        project.team = memberTeamInfoMap.get(row.id) || {
          leaderId: row.created_by,
          leaderName: '',
          leaderAvatar: '',
          leaderField: '',
          totalMembers: 1,
          members: [],
        };
        return project;
      });

    // Merge and deduplicate by ID
    const allProjects = [...createdProjects, ...participatingProjects];
    const uniqueProjects = Array.from(new Map(allProjects.map(item => [item.id, item])).values());

    // Sort by createdAt desc
    uniqueProjects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply client-side pagination if options provided (after deduplication)
    if (options?.limit !== undefined && options?.offset !== undefined) {
      return uniqueProjects.slice(options.offset, options.offset + options.limit);
    }

    return uniqueProjects;
  } catch (error) {
    console.error('[projectService] getMyProjects failed:', error);
    throw error;
  }
};

/**
 * Get project by ID
 */
export const getProjectById = async (id: string): Promise<Project | null> => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      console.error('[projectService] Error fetching project:', error);
      throw new Error(`프로젝트를 불러오는데 실패했어요: ${error.message}`);
    }

    if (!data) return null;

    const project = await mapProjectWithDisplay(data);
    project.team = await getProjectTeamInfo(data.id, data.created_by);
    project.createdBy = data.created_by;

    return project;
  } catch (error) {
    console.error('[projectService] getProjectById failed:', error);
    throw error;
  }
};

/**
 * Get projects by category
 */
export const getProjectsByCategory = async (category: ProjectCategory): Promise<Project[]> => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[projectService] Error fetching projects by category:', error);
      throw new Error(`카테고리별 프로젝트를 불러오는데 실패했어요: ${error.message}`);
    }

    return await Promise.all(
      (data || []).map(async (row) => {
        const project = await mapProjectWithDisplay(row);
        project.team = await getProjectTeamInfo(row.id, row.created_by);
        return project;
      })
    );
  } catch (error) {
    console.error('[projectService] getProjectsByCategory failed:', error);
    throw error;
  }
};

/**
 * Get projects by status
 */
export const getProjectsByStatus = async (status: ProjectStatus): Promise<Project[]> => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[projectService] Error fetching projects by status:', error);
      throw new Error(`상태별 프로젝트를 불러오는데 실패했어요: ${error.message}`);
    }

    return await Promise.all(
      (data || []).map(async (row) => {
        const project = await mapProjectWithDisplay(row);
        project.team = await getProjectTeamInfo(row.id, row.created_by);
        return project;
      })
    );
  } catch (error) {
    console.error('[projectService] getProjectsByStatus failed:', error);
    throw error;
  }
};

/**
 * Search projects by query (title, description, brandName, tags)
 * Uses pg_trgm GIN indexes for optimized text search
 */
export const searchProjects = async (query: string): Promise<Project[]> => {
  try {
    if (!query.trim()) {
      return getAllProjects();
    }

    const lowerQuery = query.toLowerCase().trim();

    // Supabase full-text search using ilike (optimized with pg_trgm GIN indexes)
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .or(`title.ilike.%${lowerQuery}%,description.ilike.%${lowerQuery}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[projectService] Error searching projects:', error);
      throw new Error(`프로젝트 검색에 실패했어요: ${error.message}`);
    }

    // Map projects and enrich with team info
    const results = await Promise.all(
      (data || []).map(async (row) => {
        const project = await mapProjectWithDisplay(row);
        project.team = await getProjectTeamInfo(row.id, row.created_by);
        return project;
      })
    );

    // Additional client-side filtering for tags (since tags is an array)
    return results.filter((project) => {
      const queryInTitle = project.title.toLowerCase().includes(lowerQuery);
      const queryInDescription = project.description.toLowerCase().includes(lowerQuery);
      const queryInBrand = project.brandName?.toLowerCase().includes(lowerQuery) ?? false;
      const queryInTags = project.tags.some((tag) => tag.toLowerCase().includes(lowerQuery));
      return queryInTitle || queryInDescription || queryInBrand || queryInTags;
    });
  } catch (error) {
    console.error('[projectService] searchProjects failed:', error);
    throw error;
  }
};

/**
 * Search projects with filters (query, category, status)
 * Server-side filtering for better performance
 */
export const searchProjectsWithFilters = async (
  query: string,
  category: ProjectCategory | '전체',
  statuses: ProjectStatus[],
  options: PaginationOptions = {},
): Promise<Project[]> => {
  try {
    const { from, to } = resolveRange(options);
    const trimmedQuery = query.trim();
    const hasQuery = trimmedQuery.length > 0;
    const lowerQuery = trimmedQuery.toLowerCase();

    let queryBuilder = supabase
      .from('projects')
      .select('*');

    // Apply search query filter (uses pg_trgm GIN indexes)
    if (hasQuery) {
      queryBuilder = queryBuilder.or(
        `title.ilike.%${lowerQuery}%,description.ilike.%${lowerQuery}%`
      );
    }

    // Apply category filter
    if (category !== '전체') {
      queryBuilder = queryBuilder.eq('category', category);
    }

    // Apply status filter
    if (statuses.length > 0) {
      queryBuilder = queryBuilder.in('status', statuses);
    }

    // Order by created_at
    queryBuilder = queryBuilder.order('created_at', { ascending: false }).range(from, to);

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('[projectService] Error searching projects with filters:', error);
      throw new Error(`프로젝트 검색에 실패했어요: ${error.message}`);
    }

    // Map results and enrich with team info
    const results = await Promise.all(
      (data || []).map(async (row) => {
        const project = await mapProjectWithDisplay(row);
        project.team = await getProjectTeamInfo(row.id, row.created_by);
        return project;
      })
    );

    // Additional client-side filtering for tags if query exists
    if (hasQuery) {
      return results.filter((project) => {
        const queryInTitle = project.title.toLowerCase().includes(lowerQuery);
        const queryInDescription = project.description.toLowerCase().includes(lowerQuery);
        const queryInBrand = project.brandName?.toLowerCase().includes(lowerQuery) ?? false;
        const queryInTags = project.tags.some((tag) => tag.toLowerCase().includes(lowerQuery));
        return queryInTitle || queryInDescription || queryInBrand || queryInTags;
      });
    }

    return results;
  } catch (error) {
    console.error('[projectService] searchProjectsWithFilters failed:', error);
    throw error;
  }
};

/**
 * Filter projects by search query, category, and status (client-side for flexibility)
 * For better performance, consider moving this logic to Supabase queries
 */
export const filterProjects = (
  projects: Project[],
  searchQuery: string,
  selectedCategory: ProjectCategory | '전체',
  selectedStatuses: ProjectStatus[],
): Project[] => {
  let filtered = [...projects];

  // Filter by search query (title and description)
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (project) =>
        project.title.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query) ||
        project.display.displayName.toLowerCase().includes(query) ||
        project.tags.some((tag) => tag.toLowerCase().includes(query)),
    );
  }

  // Filter by category
  if (selectedCategory !== '전체') {
    filtered = filtered.filter((project) => project.category === selectedCategory);
  }

  // Filter by status
  if (selectedStatuses.length > 0) {
    filtered = filtered.filter((project) => selectedStatuses.includes(project.status));
  }

  return filtered;
};

/**
 * Upload project cover image to Supabase Storage
 */
const uploadProjectImage = async (file: File, userId: string): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Get Content-Type for the file
    const contentType = getContentType(file);
    // Supabase가 지정된 MIME 타입으로 저장하도록 안전하게 강제.
    // 혹시 file.type이 비어있거나 잘못 전달돼도 이미지로 업로드되도록 보정한다.
    const safeContentType = contentType && contentType.startsWith('image/')
      ? contentType
      : 'image/jpeg';

    console.log('[projectService] Uploading image:', {
      fileName: file.name,
      fileType: file.type,
      contentType,
      safeContentType,
      fileSize: file.size,
    });

    // Upload file with explicit Content-Type
    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('project-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: safeContentType,
      });

    if (uploadError) {
      console.error('[projectService] Upload error:', uploadError);
      throw uploadError;
    }

    // Verify upload was successful
    if (!uploadData) {
      throw new Error('파일 업로드가 완료되지 않았어요.');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('project-images')
      .getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) {
      throw new Error('Public URL을 생성할 수 없어요.');
    }

    console.log('[projectService] Image uploaded successfully:', {
      filePath,
      publicUrl: urlData.publicUrl,
      contentType,
    });

    return urlData.publicUrl;
  } catch (error) {
    console.error('[projectService] Error uploading project image:', error);
    const errorMessage = error instanceof Error ? error.message : '이미지 업로드에 실패했어요.';
    throw new Error(errorMessage);
  }
};

/**
 * Create a new project
 */
export const createProject = async (input: CreateProjectInput): Promise<Project> => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요해요');
    }

    // Upload cover image if provided
    let coverImageUrl = input.cover_image_url || '';
    if (input.cover_image_file) {
      coverImageUrl = await uploadProjectImage(input.cover_image_file, user.id);
    }

    // Get user's brand information from brands table
    const { data: brandData } = await supabase
      .from('profile_brands')
      .select('brand_name, cover_image_url, logo_image_url')
      .eq('profile_id', user.id)
      .maybeSingle();

    // Get user's username from profiles table
    const { data: profileData } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle();

    // Calculate deadline from duration
    const deadline = input.duration ? calculateDeadline(input.duration) : null;

    // Map category to valid ProjectCategory
    const category = mapToProjectCategory(input.category);

    // Prepare project data
    const projectData = {
      created_by: user.id,
      title: input.title,
      description: input.description,
      goal: input.goal || null,
      requirements: input.requirements || null,
      category,
      budget_range: input.budget || null,
      duration: input.duration || null,
      deadline: deadline ? deadline.toISOString().split('T')[0] : null,
      team_size: input.capacity || 1,
      skills: input.skills || [],
      status: 'open' as ProjectStatus, // 초기 작성시 '작성중'으로 설정
      cover_image_url: coverImageUrl,
      video_url: input.video_url || null,
      tags: input.tags || input.skills || [],
      workflow_steps: [],
      files: [],
      scheduled_start_date: input.scheduled_start_date ? new Date(input.scheduled_start_date).toISOString() : null,
      scheduled_end_date: input.scheduled_end_date ? new Date(input.scheduled_end_date).toISOString() : null,
    };

    // Insert into database
    const { data: projectRow, error: projectError } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single();

    if (projectError) {
      console.error('[projectService] Error creating project:', projectError);
      throw new Error(`프로젝트 생성에 실패했어요: ${projectError.message}`);
    }

    // Get leader info from partners VIEW or profiles
    let leaderName = profileData?.username || '담당자';
    let leaderAvatar = brandData?.logo_image_url || '';
    let leaderField = '브랜드 매니저';

    const { data: leaderPartner } = await supabase
      .from('partners')
      .select('name, profile_image_url, activity_field')
      .eq('id', user.id)
      .maybeSingle();

    if (leaderPartner) {
      leaderName = leaderPartner.name || leaderName;
      leaderAvatar = leaderPartner.profile_image_url || leaderAvatar;
      leaderField = leaderPartner.activity_field || leaderField;
    }

    // Insert leader into project_members table
    const { error: memberError } = await supabase
      .from('project_members')
      .insert({
        project_id: projectRow.id,
        user_id: user.id,
        position: '리더',
        is_leader: true,
        status: 'active',
        can_invite: true,
        can_edit: true,
      });

    if (memberError) {
      console.error('[projectService] Error creating project member:', memberError);
      // Continue even if member creation fails - project is already created
    }

    // Create team chat room for the project
    try {
      const chatRoomId = await messageService.createRoom(
        'project',
        `${input.title}`,
        [], // Only creator initially
        { projectId: projectRow.id, includeInitialSystemMessage: true }
      );
      if (chatRoomId) {
        console.log('[projectService] Created chat room for project:', chatRoomId);
      }
    } catch (chatError) {
      console.error('[projectService] Error creating chat room:', chatError);
      // Continue even if chat room creation fails
    }

    // Map and enrich project with team info
    const project = await mapProjectWithDisplay(projectRow);
    project.brandName = brandData?.brand_name || project.display.displayName || '브랜드';
    project.team = {
      leaderId: user.id,
      leaderName,
      leaderAvatar,
      leaderField,
      totalMembers: 1,
      members: [],
    };

    return project;
  } catch (error) {
    console.error('[projectService] createProject failed:', error);
    throw error;
  }
};

/**
 * Save or update a draft project
 * @param draftProjectId - 기존 draft 프로젝트 ID (없으면 새로 생성)
 * @param input - 프로젝트 데이터 (null 필드 허용)
 * @returns 생성/업데이트된 프로젝트 ID
 */
export const saveDraftProject = async (
  draftProjectId: string | null,
  input: Partial<CreateProjectInput>
): Promise<string> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요해요');
    }

    // Upload cover image if provided
    let coverImageUrl = input.cover_image_url || '';
    if (input.cover_image_file) {
      coverImageUrl = await uploadProjectImage(input.cover_image_file, user.id);
    }

    // Calculate deadline from duration
    const deadline = input.duration ? calculateDeadline(input.duration) : null;

    // Map category to valid ProjectCategory (null 허용)
    const category = input.category ? mapToProjectCategory(input.category) : null;

    // Prepare project data (null 필드 허용)
    const projectData: any = {
      created_by: user.id,
      status: 'draft' as ProjectStatus,
    };

    // 필드가 있으면 업데이트, 없으면 null
    if (input.title !== undefined) projectData.title = input.title || null;
    if (input.description !== undefined) projectData.description = input.description || null;
    if (input.goal !== undefined) projectData.goal = input.goal || null;
    if (category !== null) projectData.category = category;
    if (input.budget !== undefined) projectData.budget_range = input.budget || null;
    if (deadline !== null) projectData.deadline = deadline.toISOString().split('T')[0];
    if (input.capacity !== undefined) projectData.team_size = input.capacity || 1;
    if (input.skills !== undefined) projectData.skills = input.skills || [];
    if (coverImageUrl) projectData.cover_image_url = coverImageUrl;
    if (input.video_url !== undefined) projectData.video_url = input.video_url || null;
    if (input.scheduled_start_date !== undefined) {
      projectData.scheduled_start_date = input.scheduled_start_date ? new Date(input.scheduled_start_date).toISOString() : null;
    }
    if (input.scheduled_end_date !== undefined) {
      projectData.scheduled_end_date = input.scheduled_end_date ? new Date(input.scheduled_end_date).toISOString() : null;
    }

    let projectId: string;

    if (draftProjectId) {
      // 기존 draft 업데이트
      const { data: updatedProject, error: updateError } = await supabase
        .from('projects')
        .update(projectData)
        .eq('id', draftProjectId)
        .eq('created_by', user.id)
        .eq('status', 'draft')
        .select('id')
        .single();

      if (updateError) {
        console.error('[projectService] Error updating draft project:', updateError);
        throw new Error(`프로젝트 저장에 실패했어요: ${updateError.message}`);
      }

      if (!updatedProject) {
        throw new Error('프로젝트를 찾을 수 없어요');
      }

      projectId = updatedProject.id;
    } else {
      // 새 draft 생성
      // workflow_steps와 files는 빈 배열로 초기화
      projectData.workflow_steps = [];
      projectData.files = [];
      projectData.tags = [];

      const { data: newProject, error: insertError } = await supabase
        .from('projects')
        .insert(projectData)
        .select('id')
        .single();

      if (insertError) {
        console.error('[projectService] Error creating draft project:', insertError);
        throw new Error(`프로젝트 저장에 실패했어요: ${insertError.message}`);
      }

      if (!newProject) {
        throw new Error('프로젝트 생성에 실패했어요');
      }

      projectId = newProject.id;

      // 프로젝트 멤버가 없으면 생성자 추가
      const { data: existingMember } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingMember) {
        await supabase
          .from('project_members')
          .insert({
            project_id: projectId,
            user_id: user.id,
            position: '리더',
            is_leader: true,
            status: 'active',
            can_invite: true,
            can_edit: true,
          });
      }
    }

    return projectId;
  } catch (error) {
    console.error('[projectService] saveDraftProject failed:', error);
    throw error;
  }
};

/**
 * Update project (complete draft to open)
 * @param projectId - 프로젝트 ID
 * @param input - 프로젝트 데이터
 * @returns 업데이트된 프로젝트
 */
export const updateProject = async (
  projectId: string,
  input: CreateProjectInput
): Promise<Project> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요해요');
    }

    // Verify that the user is the creator
    const { data: existingProject, error: fetchError } = await supabase
      .from('projects')
      .select('created_by, cover_image_url, status')
      .eq('id', projectId)
      .single();

    if (fetchError || !existingProject) {
      throw new Error('프로젝트를 찾을 수 없어요');
    }

    if (existingProject.created_by !== user.id) {
      throw new Error('프로젝트 작성자만 수정할 수 있어요');
    }

    // Upload cover image if provided
    let coverImageUrl = input.cover_image_url || existingProject.cover_image_url || '';
    if (input.cover_image_file) {
      // 기존 이미지가 있으면 삭제 (선택사항)
      coverImageUrl = await uploadProjectImage(input.cover_image_file, user.id);
    }

    // Get user's brand information
    const { data: brandData } = await supabase
      .from('profile_brands')
      .select('brand_name, cover_image_url, logo_image_url')
      .eq('profile_id', user.id)
      .single();

    // Calculate deadline from duration
    const deadline = input.duration ? calculateDeadline(input.duration) : null;

    // Map category to valid ProjectCategory
    const category = mapToProjectCategory(input.category);

    // Prepare project data (status는 기존 상태 유지 - 변경하지 않음)
    const projectData = {
      title: input.title,
      description: input.description,
      goal: input.goal || null,
      category,
      budget_range: input.budget || null,
      deadline: deadline ? deadline.toISOString().split('T')[0] : null,
      team_size: input.capacity || 1,
      skills: input.skills || [],
      tags: input.tags || input.skills || [],
      requirements: input.requirements || [],
      // status는 유지 (draft인 경우에만 open으로 변경)
      ...(existingProject.status === 'draft' ? { status: 'open' as ProjectStatus } : {}),
      cover_image_url: coverImageUrl,
      video_url: input.video_url || null,
      scheduled_start_date: input.scheduled_start_date ? new Date(input.scheduled_start_date).toISOString() : null,
      scheduled_end_date: input.scheduled_end_date ? new Date(input.scheduled_end_date).toISOString() : null,
    };

    // Update project
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update(projectData)
      .eq('id', projectId)
      .select()
      .single();

    if (updateError) {
      console.error('[projectService] Error updating project:', updateError);
      throw new Error(`프로젝트 업데이트에 실패했어요: ${updateError.message}`);
    }

    // Map and enrich project with team info
    const project = await mapProjectWithDisplay(updatedProject);
    project.brandName = brandData?.brand_name || project.display.displayName || '브랜드';

    // Get team info
    project.team = await getProjectTeamInfo(projectId, user.id);

    return project;
  } catch (error) {
    console.error('[projectService] updateProject failed:', error);
    throw error;
  }
};

/**
 * Load draft project data for editing
 * @param projectId - 프로젝트 ID
 * @returns 프로젝트 데이터를 CreateProjectInput 형식으로 변환
 */
export const loadDraftProject = async (projectId: string): Promise<Partial<CreateProjectInput> & { id: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('로그인이 필요해요');
    }

    // Get raw project data from database
    const { data: projectData, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('created_by', user.id)
      .single();

    if (error || !projectData) {
      throw new Error('프로젝트를 찾을 수 없어요');
    }

    if (projectData.status !== 'draft') {
      throw new Error('작성중인 프로젝트만 불러올 수 있어요');
    }

    // Convert database row to CreateProjectInput format
    return {
      id: projectData.id,
      title: projectData.title || '',
      description: projectData.description || '',
      goal: projectData.goal || undefined,
      category: projectData.category as ProjectCategory,
      budget: projectData.budget_range || undefined,
      duration: undefined, // duration은 deadline에서 역산 불가능하므로 undefined
      capacity: projectData.team_size || 1,
      skills: projectData.skills || [],
      cover_image_url: projectData.cover_image_url || undefined,
      scheduled_start_date: projectData.scheduled_start_date || undefined,
      scheduled_end_date: projectData.scheduled_end_date || undefined,
    };
  } catch (error) {
    console.error('[projectService] loadDraftProject failed:', error);
    throw error;
  }
};

// ============================================================================
// User Preferences: Hide/Block Functionality (Status-based)
// ============================================================================



/**
 * Hide a project from the user's feed
 */
export const hideProject = async (projectId: string, reason?: string): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요해요');
    }

    const { error } = await supabase
      .from('user_project_preferences')
      .upsert({
        profile_id: user.id,
        project_id: projectId,
        status: 'hidden',
        reason: reason || null,
      }, {
        onConflict: 'profile_id,project_id',
      });

    if (error) {
      console.error('[projectService] Error hiding project:', error);
      throw new Error(`프로젝트 숨김에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[projectService] hideProject failed:', error);
    throw error;
  }
};

/**
 * Unhide a project (removes preference record)
 */
export const unhideProject = async (projectId: string): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요해요');
    }

    const { error } = await supabase
      .from('user_project_preferences')
      .delete()
      .eq('profile_id', user.id)
      .eq('project_id', projectId)
      .eq('status', 'hidden');

    if (error) {
      console.error('[projectService] Error unhiding project:', error);
      throw new Error(`프로젝트 숨김 해제에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[projectService] unhideProject failed:', error);
    throw error;
  }
};

/**
 * Block a project permanently
 */
export const blockProject = async (projectId: string, reason?: string): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요해요');
    }

    const { error } = await supabase
      .from('user_project_preferences')
      .upsert({
        profile_id: user.id,
        project_id: projectId,
        status: 'blocked',
        reason: reason || null,
      }, {
        onConflict: 'profile_id,project_id',
      });

    if (error) {
      console.error('[projectService] Error blocking project:', error);
      throw new Error(`프로젝트 차단에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[projectService] blockProject failed:', error);
    throw error;
  }
};

/**
 * Unblock a project (removes preference record)
 */
export const unblockProject = async (projectId: string): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요해요');
    }

    const { error } = await supabase
      .from('user_project_preferences')
      .delete()
      .eq('profile_id', user.id)
      .eq('project_id', projectId)
      .eq('status', 'blocked');

    if (error) {
      console.error('[projectService] Error unblocking project:', error);
      throw new Error(`프로젝트 차단 해제에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[projectService] unblockProject failed:', error);
    throw error;
  }
};

/**
 * Get all hidden projects for the current user
 */
export const getHiddenProjects = async (): Promise<Project[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요해요');
    }

    // Get hidden project IDs
    const { data: preferences, error: prefError } = await supabase
      .from('user_project_preferences')
      .select('project_id')
      .eq('profile_id', user.id)
      .eq('status', 'hidden');

    if (prefError) {
      console.error('[projectService] Error fetching hidden projects:', prefError);
      throw new Error(`숨긴 프로젝트 목록을 불러오는데 실패했어요: ${prefError.message}`);
    }

    if (!preferences || preferences.length === 0) return [];

    const projectIds = preferences.map(p => p.project_id);

    // Fetch project details
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .in('id', projectIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[projectService] Error fetching hidden project details:', error);
      throw new Error(`숨긴 프로젝트 상세 정보를 불러오는데 실패했어요: ${error.message}`);
    }

    return await Promise.all(
      (data || []).map(async (row) => {
        const project = await mapProjectWithDisplay(row);
        project.team = await getProjectTeamInfo(row.id, row.created_by);
        return project;
      })
    );
  } catch (error) {
    console.error('[projectService] getHiddenProjects failed:', error);
    throw error;
  }
};

/**
 * Get all blocked projects for the current user
 */
export const getBlockedProjects = async (): Promise<Project[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요해요');
    }

    // Get blocked project IDs
    const { data: preferences, error: prefError } = await supabase
      .from('user_project_preferences')
      .select('project_id')
      .eq('profile_id', user.id)
      .eq('status', 'blocked');

    if (prefError) {
      console.error('[projectService] Error fetching blocked projects:', prefError);
      throw new Error(`차단한 프로젝트 목록을 불러오는데 실패했어요: ${prefError.message}`);
    }

    if (!preferences || preferences.length === 0) return [];

    const projectIds = preferences.map(p => p.project_id);

    // Fetch project details
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .in('id', projectIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[projectService] Error fetching blocked project details:', error);
      throw new Error(`차단한 프로젝트 상세 정보를 불러오는데 실패했어요: ${error.message}`);
    }

    return await Promise.all(
      (data || []).map(async (row) => {
        const project = await mapProjectWithDisplay(row);
        project.team = await getProjectTeamInfo(row.id, row.created_by);
        return project;
      })
    );
  } catch (error) {
    console.error('[projectService] getBlockedProjects failed:', error);
    throw error;
  }
};

/**
 * Get projects by IDs
 */
export const getProjectsByIds = async (ids: string[]): Promise<Project[]> => {
  try {
    if (!ids || ids.length === 0) return [];

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .in('id', ids)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[projectService] Error fetching projects by IDs:', error);
      throw new Error(`프로젝트 목록을 불러오는데 실패했어요: ${error.message}`);
    }

    return await Promise.all(
      (data || []).map(async (row) => {
        const project = await mapProjectWithDisplay(row);
        project.team = await getProjectTeamInfo(row.id, row.created_by);
        return project;
      })
    );
  } catch (error) {
    console.error('[projectService] getProjectsByIds failed:', error);
    throw error;
  }
};

/**
 * Check if a project is hidden
 */
export const isProjectHidden = async (projectId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('user_project_preferences')
      .select('status')
      .eq('profile_id', user.id)
      .eq('project_id', projectId)
      .single();

    return data?.status === 'hidden';
  } catch (error) {
    console.error('[projectService] isProjectHidden failed:', error);
    return false;
  }
};

/**
 * Check if a project is blocked
 */
export const isProjectBlocked = async (projectId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('user_project_preferences')
      .select('status')
      .eq('profile_id', user.id)
      .eq('project_id', projectId)
      .single();

    return data?.status === 'blocked';
  } catch (error) {
    console.error('[projectService] isProjectBlocked failed:', error);
    return false;
  }
};

/**
 * Get applications sent by the current user
 * @param includeHidden - Whether to include hidden applications (default: false)
 */
export const getMyApplications = async (includeHidden: boolean = false): Promise<ProjectApplication[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요해요');
    }

    let query = supabase
      .from('project_applications')
      .select(`
        *,
        project:projects(title, created_by, status, cover_image_url, category)
      `)
      .eq('applicant_id', user.id);

    if (!includeHidden) {
      query = query.eq('is_hidden_by_applicant', false);
    }

    const { data, error } = await query.order('applied_date', { ascending: false });

    if (error) {
      console.error('[projectService] Error fetching my applications:', error);
      throw new Error(`보낸 지원 내역을 불러오는데 실패했어요: ${error.message}`);
    }

    // Batch fetch profile display for all projects (creators)
    const projectCreatedByIds = [...new Set((data || []).map((row: any) => row.project?.created_by).filter(Boolean))];
    const displayMap = await getProfileDisplayMap(projectCreatedByIds);

    return (data || []).map((row: any) => {
      const display = displayMap.get(row.project?.created_by);
      const brandName = display?.name || '브랜드';

      return {
        id: row.id,
        projectId: row.project_id,
        applicantId: row.applicant_id,
        status: row.status,
        coverLetter: row.cover_letter,
        appliedDate: row.applied_date,
        isHiddenByApplicant: row.is_hidden_by_applicant,
        isHiddenByReviewer: row.is_hidden_by_reviewer,
        project: {
          title: row.project?.title,
          brandName,
          status: row.project?.status,
          coverImage: row.project?.cover_image_url,
          category: row.project?.category,
          profileType: display?.profileType !== 'customer' ? display?.profileType : undefined,
        },
      };
    });
  } catch (error) {
    console.error('[projectService] getMyApplications failed:', error);
    throw error;
  }
};

/**
 * Cancel/Withdraw an application
 */
export const cancelApplication = async (applicationId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('project_applications')
      .update({ status: 'withdrawn' })
      .eq('id', applicationId);

    if (error) {
      console.error('[projectService] Error cancelling application:', error);
      throw new Error(`지원 취소에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[projectService] cancelApplication failed:', error);
    throw error;
  }
};

/**
 * Get applications received by the current user's projects (Brand)
 * @param includeHidden - Whether to include hidden applications (default: false)
 */
export const getReceivedApplications = async (includeHidden: boolean = false): Promise<ProjectApplication[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요해요');
    }

    // Fetch applications for projects created by the current user
    let query = supabase
      .from('project_applications')
      .select(`
        *,
        project:projects!inner(title, created_by, status, cover_image_url, category)
      `)
      .eq('project.created_by', user.id);

    if (!includeHidden) {
      query = query.eq('is_hidden_by_reviewer', false);
    }

    const { data, error } = await query.order('applied_date', { ascending: false });

    if (error) {
      console.error('[projectService] Error fetching received applications:', error);
      throw new Error(`받은 지원을 불러오는데 실패했어요: ${error.message}`);
    }

    // 배치로 applicant 정보 조회 (브랜드/아티스트/크리에이티브/팬 모두 지원)
    const applicantIds = [...new Set((data || []).map((row: any) => row.applicant_id).filter(Boolean))];
    const applicantDisplayMap = await getProfileDisplayMap(applicantIds);

    // partners 테이블에서 activity_field 배치 조회 (역할 정보용)
    const partnersMap = new Map<string, { activity_field?: string }>();
    if (applicantIds.length > 0) {
      const { data: partnersData } = await supabase
        .from('partners')
        .select('id, activity_field')
        .in('id', applicantIds);
      (partnersData || []).forEach(p => partnersMap.set(p.id, { activity_field: p.activity_field }));
    }

    // 현재 사용자(브랜드)의 이름을 한 번만 조회 (모든 프로젝트가 현재 사용자 소유)
    const brandName = await getBrandName(user.id);

    return (data || []).map((row: any) => {

      // 배치로 조회한 applicant 정보 사용
      const applicantDisplay = applicantDisplayMap.get(row.applicant_id);
      const partnerInfo = partnersMap.get(row.applicant_id);

      return {
        id: row.id,
        projectId: row.project_id,
        applicantId: row.applicant_id,
        status: row.status,
        coverLetter: row.cover_letter,
        appliedDate: row.applied_date,
        budgetRange: row.budget_range,
        duration: row.duration,
        portfolioLinks: row.portfolio_links || [],
        resumeUrl: row.resume_url,
        skills: row.skills || [],
        experienceYears: row.experience_years,
        availability: row.availability,
        reviewerNote: row.reviewer_note,
        rejectionReason: row.rejection_reason,
        isShortlisted: row.is_shortlisted,
        isHiddenByApplicant: row.is_hidden_by_applicant,
        isHiddenByReviewer: row.is_hidden_by_reviewer,
        createdAt: row.applied_date,
        project: {
          title: row.project?.title,
          brandName,
          status: row.project?.status,
          coverImage: row.project?.cover_image_url,
          category: row.project?.category,
        },
        applicant: {
          name: applicantDisplay?.name || '알 수 없음',
          avatarUrl: applicantDisplay?.avatar || '',
          activityField: partnerInfo?.activity_field || '',
          profileType: applicantDisplay?.profileType !== 'customer' ? applicantDisplay?.profileType : undefined,
        },
      };
    });
  } catch (error) {
    console.error('[projectService] getReceivedApplications failed:', error);
    throw error;
  }
};

/**
 * Update reviewer note on an application (Brand)
 */
export const updateApplicationReviewerNote = async (applicationId: string, note: string): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요해요');
    }

    const { error } = await supabase
      .from('project_applications')
      .update({
        reviewer_note: note,
        reviewer_id: user.id,
        reviewed_date: new Date().toISOString()
      })
      .eq('id', applicationId);

    if (error) {
      console.error('[projectService] Error updating reviewer note:', error);
      throw new Error(`메모 업데이트에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[projectService] updateApplicationReviewerNote failed:', error);
    throw error;
  }
};

/**
 * Accept an application and add to project members (Brand)
 */
export const acceptApplication = async (applicationId: string): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요해요');
    }

    // Get application details with project info
    const { data: application, error: appError } = await supabase
      .from('project_applications')
      .select('project_id, applicant_id, project:projects(title, team_size, current_team_size)')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      throw new Error('지원서를 찾을 수 없어요');
    }

    // 팀 사이즈 제한 확인
    const project = application.project as any;
    if (project?.team_size && project?.current_team_size >= project?.team_size) {
      throw new Error('팀 인원이 이미 가득 찼습니다');
    }

    // Update application status
    const { error: updateError } = await supabase
      .from('project_applications')
      .update({
        status: 'accepted',
        response_date: new Date().toISOString()
      })
      .eq('id', applicationId);

    if (updateError) {
      console.error('[projectService] Error accepting application:', updateError);
      throw new Error(`지원 수락에 실패했어요: ${updateError.message}`);
    }

    // 지원자(applicant)에게 수락 알림 전송
    const projectTitle = (application.project as any)?.title || '프로젝트';
    try {
      // 비팬 표기에 맞는 sender(수락한 사용자) 정보 가져오기
      const senderDisplayInfo = await getProfileDisplay(user.id);
      const senderName = senderDisplayInfo?.name || '사용자';
      const senderAvatar = senderDisplayInfo?.avatar;

      await supabase.from('user_notifications').insert({
        receiver_id: application.applicant_id,
        type: 'application_accepted',
        title: '지원이 수락됐어요',
        content: `${senderName}님이 "${projectTitle}" 프로젝트 지원을 수락했어요. 이제 프로젝트에 참여할 수 있어요!`,
        related_id: application.project_id,
        related_type: 'project',
        metadata: {
          sender_id: user.id,
          project_id: application.project_id,
          sender_name: senderName,
          sender_avatar: senderAvatar
        }
      });
    } catch (notifError) {
      console.error('[projectService] Error sending notification:', notifError);
    }

    // Get applicant's role/position info
    const { data: profile } = await supabase
      .from('partners')
      .select('activity_field')
      .eq('id', application.applicant_id)
      .maybeSingle();

    // Add to project_members
    const { error: memberError } = await supabase.from('project_members').insert({
      project_id: application.project_id,
      user_id: application.applicant_id,
      position: profile?.activity_field || 'Member',
      status: 'active',
      is_leader: false
    });

    if (memberError) {
      console.error('[projectService] Error adding project member:', memberError);
      // Don't throw here - application is already accepted
    } else {
      // member_added 활동 기록 (프로젝트 생성자에게)
      activityService.createActivityViaRPC({
        userId: user.id,
        activityType: 'member_added',
        relatedEntityType: 'project',
        relatedEntityId: application.project_id,
        title: '새 멤버가 프로젝트에 참여했어요',
        description: projectTitle,
        metadata: {
          member_id: application.applicant_id,
          application_id: applicationId,
        },
      }).catch((err) => console.warn('[projectService] Failed to record member_added activity:', err));

      // application_accepted 활동 기록 (지원자에게)
      activityService.createActivityViaRPC({
        userId: application.applicant_id,
        activityType: 'application_accepted',
        relatedEntityType: 'project',
        relatedEntityId: application.project_id,
        title: `${projectTitle} 지원이 수락되었어요`,
        description: '',
        metadata: {
          project_id: application.project_id,
          project_title: projectTitle,
        },
      }).catch((err) => console.warn('[projectService] Failed to record application_accepted activity:', err));
    }

    // 채팅방에 새 멤버 추가
    try {
      const chatRoomId = await messageService.getRoomByProjectId(application.project_id);
      if (chatRoomId) {
        await messageService.addParticipantToRoom(chatRoomId, application.applicant_id);
        console.log('[projectService] Added applicant to chat room:', application.applicant_id);
      }
    } catch (chatError) {
      console.error('[projectService] Error adding applicant to chat room:', chatError);
      // Continue even if chat room update fails
    }
  } catch (error) {
    console.error('[projectService] acceptApplication failed:', error);
    throw error;
  }
};

/**
 * Reject an application with optional reason (Brand)
 */
export const rejectApplicationWithReason = async (applicationId: string, reason?: string): Promise<void> => {
  try {
    // 현재 사용자 및 지원 정보 확인
    const { data: { user } } = await supabase.auth.getUser();
    const { data: application } = await supabase
      .from('project_applications')
      .select('applicant_id, project_id, project:projects(title)')
      .eq('id', applicationId)
      .single();

    const { error } = await supabase
      .from('project_applications')
      .update({
        status: 'rejected',
        rejection_reason: reason || null,
        response_date: new Date().toISOString()
      })
      .eq('id', applicationId);

    if (error) {
      console.error('[projectService] Error rejecting application:', error);
      throw new Error(`지원 거절에 실패했어요: ${error.message}`);
    }

    // 지원자(applicant)에게 거절 알림 전송
    if (application && user) {
      const projectTitle = (application.project as any)?.title || '프로젝트';
      try {
        // 비팬 표기에 맞는 sender(거절한 사용자) 정보 가져오기
        const senderDisplayInfo = await getProfileDisplay(user.id);
        const senderName = senderDisplayInfo?.name || '사용자';
        const senderAvatar = senderDisplayInfo?.avatar;

        await supabase.from('user_notifications').insert({
          receiver_id: application.applicant_id,
          type: 'application_rejected',
          title: '지원이 거절됐어요',
          content: `${senderName}님이 "${projectTitle}" 프로젝트 지원을 거절했어요.`,
          related_id: application.project_id,
          related_type: 'project',
          metadata: {
            sender_id: user.id,
            project_id: application.project_id,
            reason: reason || null,
            sender_name: senderName,
            sender_avatar: senderAvatar
          }
        });
      } catch (notifError) {
        console.error('[projectService] Error sending notification:', notifError);
      }
    }
  } catch (error) {
    console.error('[projectService] rejectApplicationWithReason failed:', error);
    throw error;
  }
};

/**
 * Shortlist/Unshortlist an application (Brand)
 */
export const toggleApplicationShortlist = async (applicationId: string, shortlist: boolean): Promise<void> => {
  try {
    const { error } = await supabase
      .from('project_applications')
      .update({
        is_shortlisted: shortlist,
        status: shortlist ? 'shortlisted' : 'reviewed'
      })
      .eq('id', applicationId);

    if (error) {
      console.error('[projectService] Error toggling shortlist:', error);
      throw new Error(`관심 상태 변경에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[projectService] toggleApplicationShortlist failed:', error);
    throw error;
  }
};

/**
 * Update project workflow steps
 */
export const updateProjectWorkflowSteps = async (
  projectId: string,
  steps: WorkflowStep[],
  previousSteps?: WorkflowStep[]
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // 프로젝트 정보 조회 (제목 확인)
    const { data: project } = await supabase
      .from('projects')
      .select('title, workflow_steps')
      .eq('id', projectId)
      .single();

    const { error } = await supabase
      .from('projects')
      .update({ workflow_steps: steps })
      .eq('id', projectId);

    if (error) {
      console.error('[projectService] Error updating workflow steps:', error);
      throw new Error(`워크플로우 업데이트에 실패했어요: ${error.message}`);
    }

    if (user) {
      const completedSteps = steps.filter((s) => s.isCompleted).length;
      const totalSteps = steps.length;

      // 이전 단계와 비교하여 새로 완료된 단계 찾기
      const oldSteps = previousSteps || (project?.workflow_steps as WorkflowStep[]) || [];
      const newlyCompletedSteps = steps.filter((step) => {
        const isNowCompleted = step.isCompleted;
        const oldStep = oldSteps.find((s) => s.name === step.name);
        const wasCompleted = oldStep ? oldStep.isCompleted : false;
        return isNowCompleted && !wasCompleted;
      });

      // workflow_step_completed 활동 기록 (새로 완료된 단계가 있을 때)
      if (newlyCompletedSteps.length > 0) {
        newlyCompletedSteps.forEach((step) => {
          activityService
            .createActivity({
              userId: user.id,
              activityType: 'workflow_step_completed',
              relatedEntityType: 'project',
              relatedEntityId: projectId,
              title: '프로젝트 작업을 완료했어요',
              description: step.name,
              metadata: {
                step_name: step.name,
                project_title: project?.title,
                completed_at: step.completedAt || new Date().toISOString(),
              },
            })
            .catch((err) =>
              console.warn('[projectService] Failed to record workflow_step_completed activity:', err)
            );
        });
      }

      // workflow_step_updated 활동 기록 (업데이터에게)
      activityService
        .createActivityViaRPC({
          userId: user.id,
          activityType: 'workflow_step_updated',
          relatedEntityType: 'project',
          relatedEntityId: projectId,
          title: `${project?.title || '프로젝트'}에서 작업이 업데이트되었어요`,
          description: '',
          metadata: {
            completed_steps: completedSteps,
            total_steps: totalSteps,
            progress_percent: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
          },
        })
        .catch((err) =>
          console.warn('[projectService] Failed to record workflow_step_updated activity:', err)
        );

      // personInCharge 담당자들에게 활동 기록
      const personInChargeMap = new Map<string, string[]>();
      steps.forEach((step) => {
        if (step.personInCharge && step.personInCharge !== user.id) {
          const existing = personInChargeMap.get(step.personInCharge) || [];
          existing.push(step.name);
          personInChargeMap.set(step.personInCharge, existing);
        }
      });

      personInChargeMap.forEach((stepNames, personId) => {
        activityService
          .createActivityViaRPC({
            userId: personId,
            activityType: 'workflow_step_updated',
            relatedEntityType: 'project',
            relatedEntityId: projectId,
            title: `${project?.title || '프로젝트'}에서 담당 작업이 업데이트되었어요`,
            description: stepNames.join(', '),
            metadata: {
              completed_steps: completedSteps,
              total_steps: totalSteps,
              progress_percent: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
              assigned_steps: stepNames,
            },
          })
          .catch((err) =>
            console.warn('[projectService] Failed to record personInCharge activity:', err)
          );
      });

      // project_update 알림 발송 (프로젝트 멤버 전원)
      const { data: members } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId)
        .eq('status', 'active');

      if (members && members.length > 0) {
        const senderDisplayInfo = await getProfileDisplay(user.id);
        const senderName = senderDisplayInfo?.name || '프로젝트 멤버';
        const senderAvatar = senderDisplayInfo?.avatar;

        const notifications = members
          .filter((m) => m.user_id !== user.id) // 업데이트한 본인 제외
          .map((m) => ({
            receiver_id: m.user_id,
            type: 'project_update',
            title: '프로젝트 작업이 업데이트되었어요',
            content: `${senderName}님이 "${project?.title || '프로젝트'}"의 워크플로우를 업데이트했어요.`,
            related_id: projectId,
            related_type: 'project',
            is_read: false,
            metadata: {
              sender_id: user.id,
              sender_name: senderName,
              sender_avatar: senderAvatar,
              project_id: projectId,
              project_title: project?.title,
              update_type: 'workflow',
              completed_steps: completedSteps,
              total_steps: totalSteps,
            },
          }));

        if (notifications.length > 0) {
          supabase.from('user_notifications').insert(notifications).then(({ error }) => {
            if (error) console.warn('[projectService] Failed to send project_update notifications:', error);
          });
        }
      }
    }
  } catch (error) {
    console.error('[projectService] updateProjectWorkflowSteps failed:', error);
    throw error;
  }
};

/**
 * Update project status
 * When status changes to 'completed', records activity and checks badges
 */
export const updateProjectStatus = async (
  projectId: string,
  status: ProjectStatus
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('로그인이 필요해요');
    }

    // Verify that the user is the creator of the project
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('created_by, title')
      .eq('id', projectId)
      .single();

    if (fetchError || !project) {
      throw new Error('프로젝트를 찾을 수 없어요');
    }

    if (project.created_by !== user.id) {
      throw new Error('프로젝트 작성자만 상태를 변경할 수 있어요');
    }

    const { error } = await supabase
      .from('projects')
      .update({ status })
      .eq('id', projectId);

    if (error) {
      console.error('[projectService] Error updating project status:', error);
      throw new Error(`상태 업데이트에 실패했어요: ${error.message}`);
    }

    // 프로젝트 완료 시 활동 기록 및 배지 체크 (비동기, 에러 무시)
    if (status === 'completed') {
      handleProjectCompleted(user.id, projectId, project.title).catch((err) => {
        console.warn('[projectService] Failed to handle project completed:', err);
      });
    }
  } catch (error) {
    console.error('[projectService] updateProjectStatus failed:', error);
    throw error;
  }
};

/**
 * Handle project completion - activity recording and badge checks
 */
const handleProjectCompleted = async (
  userId: string,
  projectId: string,
  projectTitle?: string
): Promise<void> => {
  try {
    // 1. 프로젝트 완료 활동 기록
    await activityService.createActivity({
      userId,
      activityType: 'project_completed',
      relatedEntityType: 'project',
      relatedEntityId: projectId,
      title: '프로젝트를 완료했어요',
      description: projectTitle || '',
    });

    // 2. 프로젝트 멤버들에게 완료 알림 발송
    const { data: members } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', projectId)
      .eq('status', 'active');

    if (members && members.length > 0) {
      const senderDisplayInfo = await getProfileDisplay(userId);
      const senderName = senderDisplayInfo?.name || '프로젝트 리더';
      const senderAvatar = senderDisplayInfo?.avatar;

      const notifications = members
        .filter((m) => m.user_id !== userId) // 완료한 본인 제외
        .map((m) => ({
          receiver_id: m.user_id,
          type: 'project_complete',
          title: '프로젝트가 완료되었어요',
          content: `${senderName}님이 "${projectTitle || '프로젝트'}"를 완료했어요.`,
          related_id: projectId,
          related_type: 'project',
          is_read: false,
          metadata: {
            sender_id: userId,
            sender_name: senderName,
            sender_avatar: senderAvatar,
            project_id: projectId,
            project_title: projectTitle,
          },
        }));

      if (notifications.length > 0) {
        await supabase.from('user_notifications').insert(notifications);
      }
    }

    // 3. 프로젝트 마스터 배지 체크
    await badgeAutoGrantService.checkProjectMasterBadge(userId);

    // 4. 기능 탐험가 배지 체크 (프로젝트 + 협업 모두 완료)
    await badgeAutoGrantService.checkExplorerBadge(userId);

    // 5. 대표유저 배지 체크 (20개 이상 참여)
    await badgeAutoGrantService.checkRepresentativeBadge(userId);
  } catch (err) {
    console.warn('[projectService] handleProjectCompleted failed:', err);
  }
};

/**
 * Check if project has related magazines
 */
export const hasProjectRelatedMagazines = async (projectId: string): Promise<boolean> => {
  try {
    const { count, error } = await supabase
      .from('magazines')
      .select('id', { count: 'exact', head: true })
      .eq('related_project', projectId);

    if (error) {
      console.error('[projectService] Error checking related magazines:', error);
      throw new Error(`연관 매거진을 확인하는 중 오류가 발생했어요: ${error.message}`);
    }

    return (count ?? 0) > 0;
  } catch (error) {
    console.error('[projectService] hasProjectRelatedMagazines failed:', error);
    throw error;
  }
};

/**
 * Delete a project (creator only)
 */
export const deleteProject = async (projectId: string): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('로그인이 필요해요');
    }

    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('created_by')
      .eq('id', projectId)
      .single();

    if (fetchError || !project) {
      throw new Error('프로젝트를 찾을 수 없어요');
    }

    if (project.created_by !== user.id) {
      throw new Error('프로젝트 작성자만 삭제할 수 있어요');
    }

    // 매거진 참조 해제: related_project 컬럼을 null로 설정
    const { error: detachMagazinesError } = await supabase
      .from('magazines')
      .update({ related_project: null })
      .eq('related_project', projectId);

    if (detachMagazinesError) {
      console.error('[projectService] Error detaching related magazines:', detachMagazinesError);
      throw new Error(`연관 매거진 참조 해제에 실패했어요: ${detachMagazinesError.message}`);
    }

    // 참조가 남아있는지 확인 후 남아있으면 삭제 중단
    const { count: remainingCount, error: remainingCheckError } = await supabase
      .from('magazines')
      .select('id', { count: 'exact', head: true })
      .eq('related_project', projectId);

    if (remainingCheckError) {
      console.error('[projectService] Error re-checking related magazines:', remainingCheckError);
      throw new Error(`연관 매거진 확인에 실패했어요: ${remainingCheckError.message}`);
    }

    if ((remainingCount ?? 0) > 0) {
      throw new Error('연관 매거진의 연결을 해제하지 못해 프로젝트를 삭제할 수 없어요. 관리자에게 문의해주세요.');
    }

    const { error } = await supabase
      .from('projects')
      .update({ status: 'deleted' })
      .eq('id', projectId)
      .eq('created_by', user.id);
    if (error) {
      console.error('[projectService] Error marking project as deleted:', error);
      throw new Error(`프로젝트 삭제에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[projectService] deleteProject failed:', error);
    throw error;
  }
};

// ============================================================================
// Hide/Unhide Applications
// ============================================================================

/**
 * Hide an application (by applicant or reviewer)
 * @param applicationId - ID of the application to hide
 * @param role - 'applicant' (partner) or 'reviewer' (brand)
 */
export const hideApplication = async (applicationId: string, role: 'applicant' | 'reviewer'): Promise<void> => {
  try {
    const column = role === 'applicant' ? 'is_hidden_by_applicant' : 'is_hidden_by_reviewer';
    const { error } = await supabase
      .from('project_applications')
      .update({ [column]: true })
      .eq('id', applicationId);

    if (error) {
      console.error('[projectService] Error hiding application:', error);
      throw new Error(`지원 숨김에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[projectService] hideApplication failed:', error);
    throw error;
  }
};

/**
 * Unhide an application (by applicant or reviewer)
 * @param applicationId - ID of the application to unhide
 * @param role - 'applicant' (partner) or 'reviewer' (brand)
 */
export const unhideApplication = async (applicationId: string, role: 'applicant' | 'reviewer'): Promise<void> => {
  try {
    const column = role === 'applicant' ? 'is_hidden_by_applicant' : 'is_hidden_by_reviewer';
    const { error } = await supabase
      .from('project_applications')
      .update({ [column]: false })
      .eq('id', applicationId);

    if (error) {
      console.error('[projectService] Error unhiding application:', error);
      throw new Error(`지원 숨김 해제에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[projectService] unhideApplication failed:', error);
    throw error;
  }
};

/**
 * Hide multiple applications at once
 * @param applicationIds - Array of application IDs to hide
 * @param role - 'applicant' (partner) or 'reviewer' (brand)
 */
export const hideApplications = async (applicationIds: string[], role: 'applicant' | 'reviewer'): Promise<void> => {
  try {
    const column = role === 'applicant' ? 'is_hidden_by_applicant' : 'is_hidden_by_reviewer';
    const { error } = await supabase
      .from('project_applications')
      .update({ [column]: true })
      .in('id', applicationIds);

    if (error) {
      console.error('[projectService] Error hiding applications:', error);
      throw new Error(`지원 숨김에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[projectService] hideApplications failed:', error);
    throw error;
  }
};

/**
 * Unhide multiple applications at once
 * @param applicationIds - Array of application IDs to unhide
 * @param role - 'applicant' (partner) or 'reviewer' (brand)
 */
export const unhideApplications = async (applicationIds: string[], role: 'applicant' | 'reviewer'): Promise<void> => {
  try {
    const column = role === 'applicant' ? 'is_hidden_by_applicant' : 'is_hidden_by_reviewer';
    const { error } = await supabase
      .from('project_applications')
      .update({ [column]: false })
      .in('id', applicationIds);

    if (error) {
      console.error('[projectService] Error unhiding applications:', error);
      throw new Error(`지원 숨김 해제에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[projectService] unhideApplications failed:', error);
    throw error;
  }
};

// ============================================================================
// Team Member Management (Leave / Remove / Transfer Leadership)
// ============================================================================

/**
 * 프로젝트 리더 권한 이전
 * @param projectId - 프로젝트 ID
 * @param newLeaderId - 새 리더가 될 멤버 ID
 */
export const transferProjectLeadership = async (projectId: string, newLeaderId: string): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요해요');
    }

    // 현재 유저가 리더인지 확인
    const { data: currentMember, error: currentMemberError } = await supabase
      .from('project_members')
      .select('id, is_leader')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (currentMemberError || !currentMember?.is_leader) {
      throw new Error('리더만 권한을 이전할 수 있어요');
    }

    // 새 리더가 활성 멤버인지 확인
    const { data: newLeaderMember, error: newLeaderError } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', newLeaderId)
      .eq('status', 'active')
      .single();

    if (newLeaderError || !newLeaderMember) {
      throw new Error('권한을 이전할 멤버를 찾을 수 없어요');
    }

    // 기존 리더 권한 해제
    const { error: removeLeaderError } = await supabase
      .from('project_members')
      .update({ is_leader: false })
      .eq('project_id', projectId)
      .eq('user_id', user.id);

    if (removeLeaderError) {
      throw new Error(`리더 권한 해제에 실패했어요: ${removeLeaderError.message}`);
    }

    // 새 리더 권한 부여
    const { error: grantLeaderError } = await supabase
      .from('project_members')
      .update({ is_leader: true, can_invite: true, can_edit: true })
      .eq('project_id', projectId)
      .eq('user_id', newLeaderId);

    if (grantLeaderError) {
      // 롤백: 기존 리더 권한 복구
      await supabase
        .from('project_members')
        .update({ is_leader: true })
        .eq('project_id', projectId)
        .eq('user_id', user.id);
      throw new Error(`새 리더 권한 부여에 실패했어요: ${grantLeaderError.message}`);
    }

    console.log('[projectService] Leadership transferred successfully');
  } catch (error) {
    console.error('[projectService] transferProjectLeadership failed:', error);
    throw error;
  }
};

/**
 * 프로젝트 나가기 (본인)
 * 리더인 경우 다른 멤버가 있으면 권한 이전 필수
 * @param projectId - 프로젝트 ID
 * @param handoverLeaderId - 리더 권한을 넘길 멤버 ID (리더인 경우 필수)
 */
export const leaveProject = async (projectId: string, handoverLeaderId?: string): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요해요');
    }

    // 현재 유저의 멤버 정보 확인
    const { data: currentMember, error: currentMemberError } = await supabase
      .from('project_members')
      .select('id, is_leader')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (currentMemberError || !currentMember) {
      throw new Error('프로젝트 멤버가 아니에요');
    }

    // 다른 활성 멤버 확인
    const { data: otherMembers, error: otherMembersError } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', projectId)
      .eq('status', 'active')
      .neq('user_id', user.id);

    if (otherMembersError) {
      throw new Error('멤버 정보를 확인하는 중 오류가 발생했어요');
    }

    const hasOtherMembers = (otherMembers?.length || 0) > 0;

    // 리더이고 다른 멤버가 있는 경우 권한 이전 필수
    if (currentMember.is_leader && hasOtherMembers) {
      if (!handoverLeaderId) {
        throw new Error('다른 멤버에게 리더 권한을 이전해야 해요');
      }
      await transferProjectLeadership(projectId, handoverLeaderId);
    }

    // 멤버 상태를 'left'로 변경
    const { error: leaveError } = await supabase
      .from('project_members')
      .update({ status: 'left', is_leader: false })
      .eq('project_id', projectId)
      .eq('user_id', user.id);

    if (leaveError) {
      throw new Error(`프로젝트 나가기에 실패했어요: ${leaveError.message}`);
    }

    // 관련 지원 레코드 삭제 (있는 경우)
    try {
      await supabase
        .from('project_applications')
        .delete()
        .eq('project_id', projectId)
        .eq('applicant_id', user.id);
      console.log('[projectService] Deleted project application records');
    } catch (appDeleteError) {
      console.error('[projectService] Error deleting project applications:', appDeleteError);
      // 삭제 실패해도 나가기는 성공으로 처리
    }

    // 관련 초대 레코드 삭제 (있는 경우)
    try {
      await supabase
        .from('invitations')
        .delete()
        .eq('target_id', projectId)
        .eq('invitation_type', 'project')
        .eq('receiver_id', user.id);
      console.log('[projectService] Deleted project invitation records');
    } catch (invDeleteError) {
      console.error('[projectService] Error deleting project invitations:', invDeleteError);
      // 삭제 실패해도 나가기는 성공으로 처리
    }

    // 채팅방에서도 제거 (본인 나가기) - 프로젝트의 모든 채팅방에서 나가기
    try {
      // 프로젝트에 연결된 모든 채팅방 찾기
      const { data: chatRooms } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('project_id', projectId);

      if (chatRooms && chatRooms.length > 0) {
        const roomIds = chatRooms.map(room => room.id);
        // 모든 채팅방에서 본인을 제거
        await supabase
          .from('chat_participants')
          .delete()
          .in('room_id', roomIds)
          .eq('user_id', user.id);
        console.log(`[projectService] Removed from ${chatRooms.length} chat room(s)`);
      }
    } catch (chatError) {
      console.error('[projectService] Error removing from chat room:', chatError);
      // 채팅방 제거 실패해도 나가기는 성공으로 처리
    }

    // 리더에게 멤버 퇴장 알림 발송 (본인이 리더가 아닌 경우)
    try {
      const { data: projectData } = await supabase
        .from('projects')
        .select('title, created_by')
        .eq('id', projectId)
        .single();

      const projectTitle = projectData?.title || '프로젝트';
      const leaderId = projectData?.created_by;

      if (leaderId && leaderId !== user.id) {
        const senderDisplayInfo = await getProfileDisplay(user.id);
        const senderName = senderDisplayInfo?.name || '멤버';
        const senderAvatar = senderDisplayInfo?.avatar;

        await supabase.from('user_notifications').insert({
          receiver_id: leaderId,
          type: 'member_left',
          title: '멤버가 프로젝트를 떠났어요',
          content: `${senderName}님이 "${projectTitle}" 프로젝트에서 퇴장했어요.`,
          related_id: projectId,
          related_type: 'project',
          metadata: {
            sender_id: user.id,
            project_id: projectId,
            sender_name: senderName,
            sender_avatar: senderAvatar,
          }
        });
        console.log('[projectService] Sent member_left notification to leader');
      }
    } catch (notifError) {
      console.error('[projectService] Error sending member_left notification:', notifError);
      // 알림 실패해도 나가기는 성공으로 처리
    }

    console.log('[projectService] Left project successfully');
  } catch (error) {
    console.error('[projectService] leaveProject failed:', error);
    throw error;
  }
};

/**
 * 프로젝트 멤버 추방 (리더만 가능)
 * @param projectId - 프로젝트 ID
 * @param targetUserId - 추방할 멤버 ID
 */
export const removeMemberFromProject = async (projectId: string, targetUserId: string): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요해요');
    }

    // 현재 유저가 리더인지 확인
    const { data: currentMember, error: currentMemberError } = await supabase
      .from('project_members')
      .select('is_leader')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (currentMemberError || !currentMember?.is_leader) {
      throw new Error('리더만 멤버를 내보낼 수 있어요');
    }

    // 대상 멤버 확인 (리더는 추방 불가)
    const { data: targetMember, error: targetMemberError } = await supabase
      .from('project_members')
      .select('id, is_leader')
      .eq('project_id', projectId)
      .eq('user_id', targetUserId)
      .eq('status', 'active')
      .single();

    if (targetMemberError || !targetMember) {
      throw new Error('멤버를 찾을 수 없어요');
    }

    if (targetMember.is_leader) {
      throw new Error('리더는 내보낼 수 없어요');
    }

    // 멤버 상태를 'removed'로 변경
    const { error: removeError } = await supabase
      .from('project_members')
      .update({ status: 'removed' })
      .eq('project_id', projectId)
      .eq('user_id', targetUserId);

    if (removeError) {
      throw new Error(`멤버 내보내기에 실패했어요: ${removeError.message}`);
    }

    // 채팅방에서도 제거 (새 RPC 사용)
    try {
      const { error: kickError } = await supabase.rpc('kick_chat_participant_by_entity', {
        p_entity_type: 'project',
        p_entity_id: projectId,
        p_target_user_id: targetUserId,
      });
      if (kickError) {
        console.error('[projectService] kick_chat_participant_by_entity error:', kickError);
      } else {
        console.log('[projectService] Removed member from chat room');
      }
    } catch (chatError) {
      console.error('[projectService] Error removing member from chat room:', chatError);
    }

    // 프로젝트 정보 가져오기
    const { data: projectData } = await supabase
      .from('projects')
      .select('title')
      .eq('id', projectId)
      .single();

    const projectTitle = projectData?.title || '프로젝트';

    // 추방된 멤버에게 알림 발송
    try {
      const senderDisplayInfo = await getProfileDisplay(user.id);
      const senderName = senderDisplayInfo?.name || '리더';

      await supabase.from('user_notifications').insert({
        receiver_id: targetUserId,
        type: 'member_removed',
        title: '프로젝트에서 제외됐어요',
        content: `"${projectTitle}" 프로젝트에서 제외됐어요.`,
        related_id: projectId,
        related_type: 'project',
        metadata: {
          sender_id: user.id,
          project_id: projectId,
          sender_name: senderName,
        }
      });
    } catch (notifError) {
      console.error('[projectService] Error sending removal notification:', notifError);
    }

    console.log('[projectService] Member removed successfully');
  } catch (error) {
    console.error('[projectService] removeMemberFromProject failed:', error);
    throw error;
  }
};

/**
 * 프로젝트의 다른 멤버 목록 가져오기 (리더 권한 이전용)
 */
export const getOtherProjectMembers = async (projectId: string): Promise<Array<{ userId: string; name: string }>> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: members, error } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', projectId)
      .eq('status', 'active')
      .neq('user_id', user.id);

    if (error || !members) return [];

    const memberIds = members.map(m => m.user_id);
    const displayMap = await getProfileDisplayMap(memberIds);

    return memberIds.map(userId => ({
      userId,
      name: displayMap.get(userId)?.name || '멤버',
    }));
  } catch (error) {
    console.error('[projectService] getOtherProjectMembers failed:', error);
    return [];
  }
};

const getMyActiveProjectsCount = async (): Promise<number> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('project_members')
      .select('project_id, projects!inner(status)', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('projects.status', ['in_progress']);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Failed to get active project count:', error);
    return 0;
  }
};

/**
 * 프로젝트 지원을 확인됨으로 표시 (reviewer용)
 * @param applicationId - 지원 ID
 */
export const markApplicationAsViewed = async (applicationId: string): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요해요');
    }

    // 지원 정보 확인 (프로젝트 소유자인지 체크)
    const { data: application, error: fetchError } = await supabase
      .from('project_applications')
      .select('id, project_id, projects!inner(created_by)')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      console.error('[projectService] markApplicationAsViewed: application not found');
      return;
    }

    // 프로젝트 소유자인지 확인
    const projectCreatedBy = (application as any).projects?.created_by;
    if (projectCreatedBy !== user.id) {
      // 권한 없음 - 조용히 무시
      return;
    }

    const { error } = await supabase
      .from('project_applications')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', applicationId)
      .is('viewed_at', null);

    if (error) {
      console.error('[projectService] markApplicationAsViewed failed:', error);
    }
  } catch (error) {
    console.error('[projectService] markApplicationAsViewed error:', error);
  }
};

/**
 * Toggle project hidden state in ManageAll page (per user)
 * Uses RPC to bypass RLS infinite recursion
 * @param projectId - Project ID
 * @param isHidden - New hidden state
 */
export const toggleProjectHiddenInManage = async (projectId: string, isHidden: boolean): Promise<void> => {
  try {
    const { error } = await supabase.rpc('toggle_project_hidden_in_manage', {
      p_project_id: projectId,
      p_is_hidden: isHidden,
    });

    if (error) {
      console.error('[projectService] Error toggling project hidden state:', error);
      throw new Error(`숨김 상태 변경에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[projectService] toggleProjectHiddenInManage failed:', error);
    throw error;
  }
};

/**
 * Update project settlement status and related fields after successful payment
 */
export const updateProjectSettlement = async (
  projectId: string,
  orderId: string,
  confirmedBudget: number
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('projects')
      .update({
        settlement_status: 'paid',
        confirmed_budget: confirmedBudget,
        settlement_paid_at: new Date().toISOString(),
        settlement_order_id: orderId,
      })
      .eq('id', projectId);

    if (error) {
      console.error('[projectService] updateProjectSettlement failed:', error);
      throw new Error(`정산 상태 업데이트에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[projectService] updateProjectSettlement failed:', error);
    throw error;
  }
};

/**
 * Cancel project settlement (within 7 business days)
 */
export const cancelProjectSettlement = async (projectId: string): Promise<void> => {
  try {
    // 1. Get project's settlement_order_id
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('settlement_order_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error('프로젝트를 찾을 수 없어요.');
    }

    if (!project.settlement_order_id) {
      throw new Error('정산 주문 정보를 찾을 수 없어요.');
    }

    // 2. Call paymentService to cancel the actual payment via Toss API
    const response = await paymentService.cancelPayment({
      orderId: project.settlement_order_id,
      cancelReason: '7영업일 이내 결제 취소',
    });

    if (!response.success) {
      throw new Error(response.message || '결제 취소에 실패했어요.');
    }

    // 3. Update project settlement_status to 'cancelled'
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        settlement_status: 'cancelled',
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('[projectService] Failed to update project status after payment cancellation:', updateError);
      throw new Error(`프로젝트 상태 업데이트에 실패했어요: ${updateError.message}`);
    }

    console.log('[projectService] Successfully cancelled project settlement:', projectId);
  } catch (error) {
    console.error('[projectService] cancelProjectSettlement failed:', error);
    throw error;
  }
};

/**
 * Get project team member IDs (excluding creator)
 */
export const getProjectTeamMemberIds = async (projectId: string, excludeCreatorId?: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', projectId)
      .eq('status', 'active');

    if (error) {
      console.error('[projectService] getProjectTeamMemberIds failed:', error);
      throw new Error(`팀원 목록 조회에 실패했어요: ${error.message}`);
    }

    const memberIds = (data || []).map(m => m.user_id);

    // Filter out creator if specified
    if (excludeCreatorId) {
      return memberIds.filter(id => id !== excludeCreatorId);
    }

    return memberIds;
  } catch (error) {
    console.error('[projectService] getProjectTeamMemberIds failed:', error);
    throw error;
  }
};

/**
 * Get completed projects created by the user for settlement selection.
 * Used on the project settlement selection page.
 * Only shows projects with status='completed' AND settlement_status='paid'.
 */
export const getCompletedProjectsForSettlement = async (userId: string): Promise<Project[]> => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('created_by', userId)
      .eq('status', 'completed')
      .eq('settlement_status', 'paid')
      .order('settlement_paid_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[projectService] getCompletedProjectsForSettlement failed:', error);
      throw new Error(`정산 대상 프로젝트를 불러오는데 실패했어요: ${error.message}`);
    }

    const projects = await mapProjectsWithDisplay(data || []);
    for (const row of data || []) {
      const p = projects.find(pr => pr.id === row.id);
      if (p) {
        p.team = await getProjectTeamInfo(row.id, row.created_by);
      }
    }
    return projects;
  } catch (error) {
    console.error('[projectService] getCompletedProjectsForSettlement failed:', error);
    throw error;
  }
};

/**
 * Submit distribution request for a project (sets status to 'submitted').
 * Called when user clicks "정산 요청하기" on the distribution page.
 * contributions can be stored later if a separate table is added.
 */
export const submitDistributionRequest = async (
  projectId: string,
  _contributions?: Record<string, number>
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('projects')
      .update({ distribution_request_status: 'submitted' })
      .eq('id', projectId);

    if (error) {
      console.error('[projectService] submitDistributionRequest failed:', error);
      throw new Error(`정산 요청 제출에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[projectService] submitDistributionRequest failed:', error);
    throw error;
  }
};

export const projectService = {
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
  hasProjectRelatedMagazines,
  deleteProject,
  // User specific
  getMyProjects,
  getProjectsByIds,
  getBrandMetricsById,
  // User preferences
  hideProject,
  unhideProject,
  blockProject,
  unblockProject,
  getHiddenProjects,
  getBlockedProjects,
  isProjectHidden,
  isProjectBlocked,
  // Applications (Partner sends, Brand receives)
  getMyApplications,
  getReceivedApplications,
  cancelApplication,
  acceptApplication,
  rejectApplicationWithReason,
  updateApplicationReviewerNote,
  toggleApplicationShortlist,
  // Application hide/unhide
  hideApplication,
  unhideApplication,
  hideApplications,
  unhideApplications,
  markApplicationAsViewed,
  // Team member management
  leaveProject,
  removeMemberFromProject,
  transferProjectLeadership,
  getOtherProjectMembers,
  getMyActiveProjectsCount,
  // ManageAll hide/unhide
  toggleProjectHiddenInManage,
  // Settlement
  updateProjectSettlement,
  cancelProjectSettlement,
  getProjectTeamMemberIds,
  getCompletedProjectsForSettlement,
  submitDistributionRequest,
  // Alias for backward compatibility
  getProject: getProjectById,
};

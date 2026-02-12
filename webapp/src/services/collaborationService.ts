/**
 * Collaboration Service
 * Manages collaboration data with Supabase backend integration
 */

import {
  type ProjectCategory,
  type ProjectStatus,
  type WorkflowStep,
  type CollaborationMember,
} from '../types/exploreTypes';
import type {
  CollaborationListOptions,
  Collaboration,
  CollaborationApplication,
  CollaborationInvitation,
  CreateCollaborationInput,
  PaginationOptions,
  TeamInfo,
  TeamMember,
} from './collaborationService.types';
export type {
  CollaborationListOptions,
  Collaboration,
  CollaborationApplication,
  CollaborationInvitation,
  CreateCollaborationInput,
  PaginationOptions,
  TeamInfo,
  TeamMember,
} from './collaborationService.types';
import { supabase } from '../lib/supabase';
import { mapCollaboration } from '../utils/mappers';
import { getExcludedCollaborationIds } from '../utils/preferenceHelpers';
import { imageUploadService } from './imageUploadService';
import { getLeaderName } from '../utils/teamHelpers';
import { messageService } from './messageService';
import { WORK_TYPE_VALUES } from '../constants/projectConstants';
import {
  getProfileDisplay,
  getProfileDisplayMap,
  toLegacyDisplayInfo,
} from './profileDisplayService';
import { activityService } from './activityService';
import { badgeAutoGrantService } from './badgeAutoGrantService';

const DEFAULT_PAGE_SIZE = 10;

const resolveRange = (options?: PaginationOptions): { from: number; to: number } => {
  const limit = options?.limit ?? DEFAULT_PAGE_SIZE;
  const from = options?.from ?? 0;
  const to = from + limit - 1;
  return { from, to };
};

const mapCollaborationWithDisplay = async (row: any, members?: CollaborationMember[]) => {
  const profileDisplay = await getProfileDisplay(row.created_by || row.createdBy);
  const display = toLegacyDisplayInfo(profileDisplay);
  return mapCollaboration(row, members, display);
};

/**
 * 여러 협업을 배치로 매핑 (N+1 쿼리 방지)
 * 모든 created_by를 한 번에 조회하여 프로필 정보를 매핑
 */
export const mapCollaborationsWithDisplay = async (rows: any[]): Promise<Collaboration[]> => {
  if (!rows || rows.length === 0) return [];

  // 모든 created_by ID 수집
  const creatorIds = [...new Set(rows.map(r => r.created_by || r.createdBy).filter(Boolean))];

  // 배치로 프로필 조회
  const profileMap = await getProfileDisplayMap(creatorIds);

  // 동기적으로 매핑
  return rows.map(row => {
    const creatorId = row.created_by || row.createdBy;
    const profileDisplay = profileMap.get(creatorId);
    // profileDisplay가 undefined인 경우 기본 display 사용 (mapCollaboration 내부에서 처리)
    const display = profileDisplay ? toLegacyDisplayInfo(profileDisplay) : undefined;
    return mapCollaboration(row, undefined, display);
  });
};

/**
 * Get team information for a collaboration from collaboration_members and partners VIEW
 */
export const getCollaborationTeamInfo = async (collaborationId: string, createdBy: string): Promise<TeamInfo> => {
  try {
    if (!collaborationId || collaborationId === 'undefined') {
      console.warn('[collaborationService] Invalid collaborationId in getCollaborationTeamInfo:', collaborationId);
      return {
        leaderId: createdBy || '',
        leaderName: '',
        leaderAvatar: '',
        leaderField: '',
        totalMembers: 1,
        members: [],
      };
    }

    const { data: membersData, error: membersError } = await supabase
      .from('collaboration_members')
      .select('user_id, position, is_leader, status')
      .eq('collaboration_id', collaborationId)
      .eq('status', 'active');

    if (membersError) {
      console.error('[collaborationService] Error fetching collaboration members:', membersError);
    }

    const members = membersData || [];
    const leaderMember = members.find((m) => m.is_leader === true);
    const leaderId = leaderMember?.user_id || createdBy;

    let leaderName = '';
    let leaderAvatar = '';
    let leaderField = '';

    // 리더 정보 조회 (getProfileDisplay 사용 - 브랜드/아티스트/크리에이티브/팬 모두 지원, is_active 필터 적용, activityField 포함)
    if (leaderId) {
      const leaderDisplay = await getProfileDisplay(leaderId);
      if (leaderDisplay) {
        leaderName = leaderDisplay.name || '';
        leaderAvatar = leaderDisplay.avatar || '';
        leaderField = leaderDisplay.activityField || '';
      }
    }

    const memberIds = members
      .filter((m) => m.user_id !== leaderId)
      .map((m) => m.user_id);

    let memberPartners: TeamMember[] = [];
    if (memberIds.length > 0) {
      // 배치로 모든 유저 타입의 표시 정보 조회 (브랜드/아티스트/크리에이티브/팬 지원, is_active 필터 적용, activityField 포함)
      const displayInfoMap = await getProfileDisplayMap(memberIds);

      // partners 테이블에서 is_online 정보만 조회 (activityField는 displayInfoMap에서 가져옴)
      const partnerInfoMap = new Map<string, { is_online?: boolean }>();
      const { data: partnersData } = await supabase
        .from('partners')
        .select('id, is_online')
        .in('id', memberIds);
      (partnersData || []).forEach((p) => {
        partnerInfoMap.set(p.id, { is_online: p.is_online });
      });

      memberPartners = memberIds
        .map((userId) => {
          const displayInfo = displayInfoMap.get(userId);
          const partnerInfo = partnerInfoMap.get(userId);
          return {
            id: userId,
            name: displayInfo?.name || '',
            profileImageUrl: displayInfo?.avatar || undefined,
            activityField: displayInfo?.activityField || undefined,
            isOnline: partnerInfo?.is_online,
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
    console.error('[collaborationService] Error getting collaboration team info:', error);
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
 * 여러 협업의 팀 정보를 배치로 조회 (N+1 쿼리 방지)
 * @param collaborations - 협업 목록 (id, createdBy 필수)
 * @returns Map<collaborationId, TeamInfo>
 */
export const getCollaborationTeamInfoBatch = async (
  collaborations: Array<{ id: string; createdBy: string }>
): Promise<Map<string, TeamInfo>> => {
  const result = new Map<string, TeamInfo>();

  if (!collaborations || collaborations.length === 0) return result;

  try {
    const collabIds = collaborations.map(c => c.id).filter(Boolean);

    // 1. 모든 협업의 멤버를 한 번에 조회
    const { data: allMembersData, error: membersError } = await supabase
      .from('collaboration_members')
      .select('collaboration_id, user_id, position, is_leader, status')
      .in('collaboration_id', collabIds)
      .eq('status', 'active');

    if (membersError) {
      console.error('[collaborationService] Error fetching collaboration members batch:', membersError);
    }

    // 협업별로 멤버 그룹화
    const membersByCollab = new Map<string, typeof allMembersData>();
    (allMembersData || []).forEach(member => {
      if (!membersByCollab.has(member.collaboration_id)) {
        membersByCollab.set(member.collaboration_id, []);
      }
      membersByCollab.get(member.collaboration_id)!.push(member);
    });

    // 2. 모든 사용자 ID 수집 (리더 + 멤버)
    const allUserIds = new Set<string>();
    collaborations.forEach(collab => {
      if (collab.createdBy) allUserIds.add(collab.createdBy);
      const members = membersByCollab.get(collab.id) || [];
      members.forEach(m => allUserIds.add(m.user_id));
    });

    // 3. 배치로 프로필 정보 조회
    const userIdsArray = Array.from(allUserIds);
    const displayInfoMap = await getProfileDisplayMap(userIdsArray);

    // 4. is_online 정보 배치 조회
    const partnerInfoMap = new Map<string, { is_online?: boolean }>();
    if (userIdsArray.length > 0) {
      const { data: partnersData } = await supabase
        .from('partners')
        .select('id, is_online')
        .in('id', userIdsArray);
      (partnersData || []).forEach(p => {
        partnerInfoMap.set(p.id, { is_online: p.is_online });
      });
    }

    // 5. 각 협업의 팀 정보 구성
    collaborations.forEach(collab => {
      const members = membersByCollab.get(collab.id) || [];
      const leaderMember = members.find(m => m.is_leader === true);
      const leaderId = leaderMember?.user_id || collab.createdBy;

      const leaderDisplay = displayInfoMap.get(leaderId);
      const leaderName = leaderDisplay?.name || '';
      const leaderAvatar = leaderDisplay?.avatar || '';
      const leaderField = leaderDisplay?.activityField || '';

      const memberIds = members.filter(m => m.user_id !== leaderId).map(m => m.user_id);
      const memberPartners: TeamMember[] = memberIds.map(userId => {
        const displayInfo = displayInfoMap.get(userId);
        const partnerInfo = partnerInfoMap.get(userId);
        return {
          id: userId,
          name: displayInfo?.name || '',
          profileImageUrl: displayInfo?.avatar || undefined,
          activityField: displayInfo?.activityField || undefined,
          isOnline: partnerInfo?.is_online,
        };
      });

      result.set(collab.id, {
        leaderId,
        leaderName,
        leaderAvatar,
        leaderField,
        totalMembers: members.length || 1,
        members: memberPartners,
      });
    });

    return result;
  } catch (error) {
    console.error('[collaborationService] Error getting collaboration team info batch:', error);
    // 실패 시 빈 기본값으로 채움
    collaborations.forEach(collab => {
      result.set(collab.id, {
        leaderId: collab.createdBy,
        leaderName: '',
        leaderAvatar: '',
        leaderField: '',
        totalMembers: 1,
        members: [],
      });
    });
    return result;
  }
};

/**
 * Create a new collaboration
 */
export const createCollaboration = async (input: CreateCollaborationInput): Promise<Collaboration> => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    // Upload cover image to collaboration-images bucket
    const { publicUrl: coverImageUrl, fileName: coverImageFileName } = await imageUploadService.uploadImage(
      input.coverFile,
      'collaboration-images'
    );

    try {
      // Get user's profile information
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, roles')
        .eq('id', user.id)
        .single();

      // Get user's role-specific profile for position
      let leaderPosition = '';

      if (profileData?.roles.includes('brand')) {
        const { data: brandData } = await supabase
          .from('profile_brands')
          .select('brand_name')
          .eq('profile_id', user.id)
          .single();
        leaderPosition = brandData?.brand_name || '브랜드 담당자';
      } else if (profileData?.roles.includes('artist')) {
        const { data: artistData } = await supabase
          .from('profile_artists')
          .select('activity_field')
          .eq('profile_id', user.id)
          .single();
        leaderPosition = artistData?.activity_field || '아티스트';
      } else if (profileData?.roles.includes('creative')) {
        leaderPosition = '크리에이터';
      } else if (profileData?.roles.includes('fan')) {
        leaderPosition = '팬';
      }

      // Convert Korean work type to English DB value
      const workTypeDbValue = WORK_TYPE_VALUES[input.workType] || input.workType;

      // Prepare collaboration data (without team object)
      const collaborationData = {
        created_by: user.id,
        title: input.title,
        //brief_description: input.briefDescription,
        description: input.description,
        goal: input.goal || null,
        category: input.category,
        skills: input.skills,
        requirements: input.requirements,
        benefits: input.benefits,
        team_size: input.capacity,
        current_team_size: 1,
        duration: input.duration,
        work_type: workTypeDbValue,
        tags: input.tags,
        cover_image_url: coverImageUrl,
        region: input.region ?? null,
        status: 'open' as ProjectStatus,
        workflow_steps: [],
        files: [],
      };

      // Insert collaboration into database
      const { data: collaboration, error: collaborationError } = await supabase
        .from('collaborations')
        .insert(collaborationData)
        .select()
        .single();

      if (collaborationError) {
        console.error('[collaborationService] Error creating collaboration:', collaborationError);
        throw new Error(`협업 생성에 실패했어요: ${collaborationError.message}`);
      }

      // Add creator as leader in collaboration_members table
      const { error: memberError } = await supabase
        .from('collaboration_members')
        .insert({
          collaboration_id: collaboration.id,
          user_id: user.id,
          position: leaderPosition,
          is_leader: true,
          status: 'active',
          can_invite: true,
          can_edit: true,
        });

      if (memberError) {
        console.error('[collaborationService] Error adding leader to collaboration_members:', memberError);
        // Rollback: Delete the collaboration if member insert fails
        await supabase.from('collaborations').delete().eq('id', collaboration.id);
        throw new Error(`협업 멤버 추가에 실패했어요: ${memberError.message}`);
      }

      // Create team chat room for the collaboration
      try {
        const chatRoomId = await messageService.createRoom(
          'collaboration',
          `${input.title}`,
          [], // Only creator initially
          { collaborationId: collaboration.id, includeInitialSystemMessage: true }
        );
        if (chatRoomId) {
          console.log('[collaborationService] Created chat room for collaboration:', chatRoomId);
        }
      } catch (chatError) {
        console.error('[collaborationService] Error creating chat room:', chatError);
        // Continue even if chat room creation fails
      }

      return mapCollaborationWithDisplay(collaboration);
    } catch (error) {
      // Rollback: Delete uploaded cover image if collaboration creation fails
      await imageUploadService.deleteImage('collaboration-images', coverImageFileName);
      throw error;
    }
  } catch (error) {
    console.error('[collaborationService] createCollaboration failed:', error);
    throw error;
  }
};

/**
 * Save or update a draft collaboration
 * @param draftCollaborationId - 기존 draft 협업 ID (없으면 새로 생성)
 * @param input - 협업 데이터 (null 필드 허용)
 * @returns 생성/업데이트된 협업 ID
 */
export const saveDraftCollaboration = async (
  draftCollaborationId: string | null,
  input: Partial<CreateCollaborationInput>
): Promise<string> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    // Upload cover image if provided
    let coverImageUrl = '';
    let coverImageFileName = '';
    if (input.coverFile) {
      const uploadResult = await imageUploadService.uploadImage(
        input.coverFile,
        'collaboration-images'
      );
      coverImageUrl = uploadResult.publicUrl;
      coverImageFileName = uploadResult.fileName;
    }

    // Convert Korean work type to English DB value
    const workTypeDbValue = input.workType ? (WORK_TYPE_VALUES[input.workType] || input.workType) : null;

    // Prepare collaboration data (null 필드 허용)
    const collaborationData: any = {
      created_by: user.id,
      status: 'draft' as ProjectStatus,
    };

    // 필드가 있으면 업데이트, 없으면 null (undefined를 null로 변환)
    if (input.title !== undefined) collaborationData.title = input.title ?? null;
    //if (input.briefDescription !== undefined) collaborationData.brief_description = input.briefDescription ?? null;
    if (input.description !== undefined) collaborationData.description = input.description ?? null;
    if (input.goal !== undefined) collaborationData.goal = input.goal ?? null;
    if (input.category !== undefined) collaborationData.category = input.category ?? null;
    if (input.skills !== undefined) collaborationData.skills = input.skills || [];
    if (input.requirements !== undefined) collaborationData.requirements = input.requirements || [];
    if (input.benefits !== undefined) collaborationData.benefits = input.benefits || [];
    if (input.capacity !== undefined) collaborationData.team_size = input.capacity || 1;
    if (input.duration !== undefined) collaborationData.duration = input.duration ?? null;
    if (workTypeDbValue !== null && workTypeDbValue !== undefined) collaborationData.work_type = workTypeDbValue;
    if (input.tags !== undefined) collaborationData.tags = input.tags || [];
    if (coverImageUrl) collaborationData.cover_image_url = coverImageUrl;
    if (input.region !== undefined) collaborationData.region = input.region ?? null;

    let collaborationId: string;

    if (draftCollaborationId) {
      // 기존 draft 업데이트
      const { data: updatedCollaboration, error: updateError } = await supabase
        .from('collaborations')
        .update(collaborationData)
        .eq('id', draftCollaborationId)
        .eq('created_by', user.id)
        .eq('status', 'draft')
        .select('id')
        .single();

      if (updateError) {
        console.error('[collaborationService] Error updating draft collaboration:', updateError);
        // 업로드한 이미지 삭제
        if (coverImageFileName) {
          await imageUploadService.deleteImage('collaboration-images', coverImageFileName);
        }
        throw new Error(`협업 저장에 실패했어요: ${updateError.message}`);
      }

      if (!updatedCollaboration) {
        throw new Error('협업을 찾을 수 없어요');
      }

      collaborationId = updatedCollaboration.id;
    } else {
      // 새 draft 생성
      collaborationData.workflow_steps = [];
      collaborationData.files = [];
      collaborationData.current_team_size = 1;

      const { data: newCollaboration, error: insertError } = await supabase
        .from('collaborations')
        .insert(collaborationData)
        .select('id')
        .single();

      if (insertError) {
        console.error('[collaborationService] Error creating draft collaboration:', insertError);
        // 업로드한 이미지 삭제
        if (coverImageFileName) {
          await imageUploadService.deleteImage('collaboration-images', coverImageFileName);
        }
        throw new Error(`협업 저장에 실패했어요: ${insertError.message}`);
      }

      if (!newCollaboration) {
        throw new Error('협업 생성에 실패했어요');
      }

      collaborationId = newCollaboration.id;

      // 협업 멤버가 없으면 생성자 추가
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, roles')
        .eq('id', user.id)
        .single();

      let leaderPosition = '';
      if (profileData?.roles.includes('brand')) {
        const { data: brandData } = await supabase
          .from('profile_brands')
          .select('brand_name')
          .eq('profile_id', user.id)
          .single();
        leaderPosition = brandData?.brand_name || '브랜드 담당자';
      } else if (profileData?.roles.includes('artist')) {
        const { data: artistData } = await supabase
          .from('profile_artists')
          .select('activity_field')
          .eq('profile_id', user.id)
          .single();
        leaderPosition = artistData?.activity_field || '아티스트';
      } else if (profileData?.roles.includes('creative')) {
        leaderPosition = '크리에이터';
      } else if (profileData?.roles.includes('fan')) {
        leaderPosition = '팬';
      }

      const { data: existingMember } = await supabase
        .from('collaboration_members')
        .select('id')
        .eq('collaboration_id', collaborationId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingMember) {
        await supabase
          .from('collaboration_members')
          .insert({
            collaboration_id: collaborationId,
            user_id: user.id,
            position: leaderPosition,
            is_leader: true,
            status: 'active',
            can_invite: true,
            can_edit: true,
          });
      }
    }

    return collaborationId;
  } catch (error) {
    console.error('[collaborationService] saveDraftCollaboration failed:', error);
    throw error;
  }
};

/**
 * Update collaboration (complete draft to open)
 * @param collaborationId - 협업 ID
 * @param input - 협업 데이터
 * @returns 업데이트된 협업
 */
export const updateCollaboration = async (
  collaborationId: string,
  input: CreateCollaborationInput
): Promise<Collaboration> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    // Verify that the user is the creator
    const { data: existingCollaboration, error: fetchError } = await supabase
      .from('collaborations')
      .select('created_by, cover_image_url')
      .eq('id', collaborationId)
      .single();

    if (fetchError || !existingCollaboration) {
      throw new Error('협업을 찾을 수 없어요');
    }

    if (existingCollaboration.created_by !== user.id) {
      throw new Error('협업 작성자만 수정할 수 있어요');
    }

    // Upload cover image if provided
    let coverImageUrl = existingCollaboration.cover_image_url || '';
    if (input.coverFile) {
      // 기존 이미지가 있으면 삭제 (선택사항)
      coverImageUrl = (await imageUploadService.uploadImage(
        input.coverFile,
        'collaboration-images'
      )).publicUrl;
    }

    // Get user's profile information
    // Convert Korean work type to English DB value
    const workTypeDbValue = WORK_TYPE_VALUES[input.workType] || input.workType;

    // Prepare collaboration data
    const collaborationData = {
      title: input.title,
      //brief_description: input.briefDescription,
      description: input.description,
      goal: input.goal || null,
      category: input.category,
      skills: input.skills,
      requirements: input.requirements,
      benefits: input.benefits,
      team_size: input.capacity,
      duration: input.duration,
      work_type: workTypeDbValue,
      tags: input.tags,
      cover_image_url: coverImageUrl,
      region: input.region ?? null,
      status: 'open' as ProjectStatus, // 완성 시 '모집중'으로 변경
    };

    // Update collaboration
    const { data: updatedCollaboration, error: updateError } = await supabase
      .from('collaborations')
      .update(collaborationData)
      .eq('id', collaborationId)
      .select()
      .single();

    if (updateError) {
      console.error('[collaborationService] Error updating collaboration:', updateError);
      throw new Error(`협업 업데이트에 실패했어요: ${updateError.message}`);
    }

    return mapCollaborationWithDisplay(updatedCollaboration);
  } catch (error) {
    console.error('[collaborationService] updateCollaboration failed:', error);
    throw error;
  }
};

/**
 * Load draft collaboration data for editing
 * @param collaborationId - 협업 ID
 * @returns 협업 데이터를 CreateCollaborationInput 형식으로 변환
 */
export const loadDraftCollaboration = async (collaborationId: string): Promise<Partial<CreateCollaborationInput> & { id: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('로그인이 필요합니다');
    }

    // Get raw collaboration data from database
    const { data: collaborationData, error } = await supabase
      .from('collaborations')
      .select('*')
      .eq('id', collaborationId)
      .eq('created_by', user.id)
      .single();

    if (error || !collaborationData) {
      throw new Error('협업을 찾을 수 없어요');
    }

    if (collaborationData.status !== 'draft') {
      throw new Error('작성중인 협업만 불러올 수 있어요');
    }

    // Convert database row to CreateCollaborationInput format
    return {
      id: collaborationData.id,
      title: collaborationData.title || '',
      //brief_description: collaborationData.brief_description || '',
      description: collaborationData.description || '',
      goal: collaborationData.goal || undefined,
      category: collaborationData.category as ProjectCategory,
      skills: collaborationData.skills || [],
      requirements: collaborationData.requirements || [],
      benefits: collaborationData.benefits || [],
      capacity: collaborationData.team_size || 1,
      duration: collaborationData.duration || '',
      workType: collaborationData.work_type || '',
      tags: collaborationData.tags || [],
      region: collaborationData.region || null,
      // coverFile은 URL이므로 File로 변환 불가능, 나중에 처리
    };
  } catch (error) {
    console.error('[collaborationService] loadDraftCollaboration failed:', error);
    throw error;
  }
};

/**
 * Get all collaborations from Supabase with optional pagination and filters
 * Automatically filters out hidden and blocked collaborations for the current user
 */
export const getAllCollaborations = async (options: CollaborationListOptions = {}): Promise<Collaboration[]> => {
  try {
    const limit = options?.limit ?? DEFAULT_PAGE_SIZE;
    const baseFrom = options?.from ?? 0;

    // Get current user and excluded IDs
    const { data: { user } } = await supabase.auth.getUser();
    const excludedIds = user ? await getExcludedCollaborationIds(user.id) : new Set<string>();
    const excludedIdsArray = Array.from(excludedIds);

    let allResults: Collaboration[] = [];
    let currentFrom = baseFrom;
    const maxIterations = 3;
    let iteration = 0;

    while (allResults.length < limit && iteration < maxIterations) {
      const currentTo = currentFrom + limit - 1;

      let queryBuilder = supabase
        .from('collaborations')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply excluded IDs filter
      if (excludedIdsArray.length > 0) {
        queryBuilder = queryBuilder.not('id', 'in', `(${excludedIdsArray.join(',')})`);
      }

      if (options.category && options.category !== '전체') {
        queryBuilder = queryBuilder.eq('category', options.category);
      }

      if (options.statuses && options.statuses.length > 0) {
        queryBuilder = queryBuilder.in('status', options.statuses);
      }

      const { data, error } = await queryBuilder.range(currentFrom, currentTo);

      if (error) {
        console.error('[collaborationService] Error fetching collaborations:', error);
        throw new Error(`협업 목록을 불러오는데 실패했어요: ${error.message}`);
      }

      // 배치 함수 사용 (N+1 쿼리 방지)
      let fetchedCollaborations = await mapCollaborationsWithDisplay(data || []);

      // If status filter doesn't include draft, add current user's draft collaborations
      if (user && (!options.statuses || !options.statuses.includes('draft'))) {
        const { data: draftData } = await supabase
          .from('collaborations')
          .select('*')
          .eq('status', 'draft')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false })
          .limit(10); // Limit draft collaborations to avoid too many results

        if (draftData && draftData.length > 0) {
          // 배치 함수 사용 (N+1 쿼리 방지)
          const draftCollaborations = await mapCollaborationsWithDisplay(draftData);
          // Merge draft collaborations with other collaborations, avoiding duplicates
          const existingIds = new Set(fetchedCollaborations.map(c => c.id));
          const newDrafts = draftCollaborations.filter(c => !existingIds.has(c.id));
          fetchedCollaborations = [...fetchedCollaborations, ...newDrafts];
        }
      }

      if (fetchedCollaborations.length === 0) {
        break;
      }

      allResults = [...allResults, ...fetchedCollaborations];
      currentFrom = currentTo + 1;
      iteration++;
    }

    return allResults.slice(0, limit);
  } catch (error) {
    console.error('[collaborationService] getAllCollaborations failed:', error);
    throw error;
  }
};

/**
 * Get collaborations where the current user is a leader or a member
 * Uses collaboration_members table to find user's collaborations
 */
export const getMyCollaborations = async (options?: { limit?: number; offset?: number }): Promise<Collaboration[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    // Get collaboration IDs where user is a member
    let membershipQuery = supabase
      .from('collaboration_members')
      .select('collaboration_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    // Apply pagination if provided
    if (options?.limit !== undefined && options?.offset !== undefined) {
      membershipQuery = membershipQuery.range(options.offset, options.offset + options.limit - 1);
    }

    const { data: membershipData, error: membershipError } = await membershipQuery;

    if (membershipError) {
      console.error('[collaborationService] Error fetching user memberships:', membershipError);
      throw new Error(`협업 멤버십을 불러오는데 실패했어요: ${membershipError.message}`);
    }

    // If user has no memberships, return empty array
    if (!membershipData || membershipData.length === 0) {
      return [];
    }

    // Get collaboration details for all memberships
    const collaborationIds = membershipData.map(m => m.collaboration_id);

    const { data: collaborationsData, error: collaborationsError } = await supabase
      .from('collaborations')
      .select('*')
      .in('id', collaborationIds)
      .order('created_at', { ascending: false });

    if (collaborationsError) {
      console.error('[collaborationService] Error fetching collaborations:', collaborationsError);
      throw new Error(`협업 목록을 불러오는데 실패했어요: ${collaborationsError.message}`);
    }

    // 배치 함수 사용 (N+1 쿼리 방지)
    return await mapCollaborationsWithDisplay(collaborationsData || []);
  } catch (error) {
    console.error('[collaborationService] getMyCollaborations failed:', error);
    throw error;
  }
};

/**
 * Get collaboration by ID with full team and members information
 * Used for detail pages
 */
export const getCollaborationById = async (id: string): Promise<Collaboration | null> => {
  try {
    // Get collaboration basic data
    const { data: collaboration, error: collaborationError } = await supabase
      .from('collaborations')
      .select('*')
      .eq('id', id)
      .single();

    if (collaborationError) {
      if (collaborationError.code === 'PGRST116') {
        // No rows found
        return null;
      }
      console.error('[collaborationService] Error fetching collaboration:', collaborationError);
      throw new Error(`협업을 불러오는데 실패했어요: ${collaborationError.message}`);
    }

    if (!collaboration) return null;

    // Get collaboration members
    const { data: membersData, error: membersError } = await supabase
      .from('collaboration_members')
      .select('*')
      .eq('collaboration_id', id)
      .eq('status', 'active')
      .order('is_leader', { ascending: false }); // Leader first

    if (membersError) {
      console.error('[collaborationService] Error fetching members:', membersError);
      // Continue without members data if fetch fails
    }

    // 배치로 모든 유저 타입의 표시 정보 조회 (브랜드/아티스트/크리에이티브/팬 지원, is_active 필터 적용, activityField 포함)
    const memberUserIds = (membersData || []).map(m => m.user_id);
    const displayInfoMap = await getProfileDisplayMap(memberUserIds);

    // partners 테이블에서 is_online 정보만 조회 (activityField는 displayInfoMap에서 가져옴)
    const partnerInfoMap = new Map<string, { is_online?: boolean }>();
    if (memberUserIds.length > 0) {
      const { data: partnersData } = await supabase
        .from('partners')
        .select('id, is_online')
        .in('id', memberUserIds);
      (partnersData || []).forEach(p => {
        partnerInfoMap.set(p.id, { is_online: p.is_online });
      });
    }

    // Combine member data with display information
    const members: CollaborationMember[] = (membersData || []).map(member => {
      const displayInfo = displayInfoMap.get(member.user_id);
      const partnerInfo = partnerInfoMap.get(member.user_id);

      return {
        id: member.id,
        collaborationId: member.collaboration_id,
        userId: member.user_id,
        position: member.position,
        status: member.status,
        isLeader: member.is_leader,
        canInvite: member.can_invite || false,
        canEdit: member.can_edit || false,
        joinedDate: member.joined_date || member.created_at,
        name: displayInfo?.name || '사용자',
        activityField: displayInfo?.activityField || member.position || '',
        profileImageUrl: displayInfo?.avatar || '',
        isOnline: partnerInfo?.is_online || false,
      };
    });

    return mapCollaborationWithDisplay(collaboration, members);
  } catch (error) {
    console.error('[collaborationService] getCollaborationById failed:', error);
    throw error;
  }
};

/**
 * Get collaborations by category
 */
export const getCollaborationsByCategory = async (category: ProjectCategory): Promise<Collaboration[]> => {
  try {
    const { data, error } = await supabase
      .from('collaborations')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[collaborationService] Error fetching collaborations by category:', error);
      throw new Error(`카테고리별 협업을 불러오는데 실패했어요: ${error.message}`);
    }

    // 배치 함수 사용 (N+1 쿼리 방지)
    return await mapCollaborationsWithDisplay(data || []);
  } catch (error) {
    console.error('[collaborationService] getCollaborationsByCategory failed:', error);
    throw error;
  }
};

/**
 * Get collaborations by status
 */
export const getCollaborationsByStatus = async (status: ProjectStatus): Promise<Collaboration[]> => {
  try {
    const { data, error } = await supabase
      .from('collaborations')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[collaborationService] Error fetching collaborations by status:', error);
      throw new Error(`상태별 협업을 불러오는데 실패했어요: ${error.message}`);
    }

    // 배치 함수 사용 (N+1 쿼리 방지)
    return await mapCollaborationsWithDisplay(data || []);
  } catch (error) {
    console.error('[collaborationService] getCollaborationsByStatus failed:', error);
    throw error;
  }
};

/**
 * Search collaborations by query (title, description, leader name, tags)
 * Uses pg_trgm GIN indexes for optimized text search
 */
export const searchCollaborations = async (query: string): Promise<Collaboration[]> => {
  try {
    if (!query.trim()) {
      return getAllCollaborations();
    }

    const lowerQuery = query.toLowerCase().trim();

    // Supabase full-text search using ilike (optimized with pg_trgm GIN indexes)
    const { data, error } = await supabase
      .from('collaborations')
      .select('*')
      .or(`title.ilike.%${lowerQuery}%,brief_description.ilike.%${lowerQuery}%,description.ilike.%${lowerQuery}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[collaborationService] Error searching collaborations:', error);
      throw new Error(`협업 검색에 실패했어요: ${error.message}`);
    }

    // 배치 함수 사용 (N+1 쿼리 방지) + client-side filtering for tags and leader name
    const results = await mapCollaborationsWithDisplay(data || []);
    return results.filter(
      (collab) =>
        collab.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
        || getLeaderName(collab.members).toLowerCase().includes(lowerQuery)
        || results.includes(collab) // Already matched by title/description
    );
  } catch (error) {
    console.error('[collaborationService] searchCollaborations failed:', error);
    throw error;
  }
};

/**
 * Search collaborations with filters (query, category, status)
 * Server-side filtering for better performance
 */
export const searchCollaborationsWithFilters = async (
  query: string,
  category: ProjectCategory | '전체',
  statuses: ProjectStatus[],
  options: PaginationOptions = {},
): Promise<Collaboration[]> => {
  try {
    const { from, to } = resolveRange(options);
    const trimmedQuery = query.trim();
    const hasQuery = trimmedQuery.length > 0;
    const lowerQuery = trimmedQuery.toLowerCase();

    let queryBuilder = supabase
      .from('collaborations')
      .select('*');

    // Apply search query filter (uses pg_trgm GIN indexes)
    if (hasQuery) {
      queryBuilder = queryBuilder.or(
        `title.ilike.%${lowerQuery}%,brief_description.ilike.%${lowerQuery}%,description.ilike.%${lowerQuery}%`
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
      console.error('[collaborationService] Error searching collaborations with filters:', error);
      throw new Error(`협업 검색에 실패했어요: ${error.message}`);
    }

    // 배치 함수 사용 (N+1 쿼리 방지) + filter tags/leader name client-side
    const results = await mapCollaborationsWithDisplay(data || []);

    // Additional client-side filtering for tags and leader name if query exists
    if (hasQuery) {
      return results.filter(
        (collab) =>
          collab.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
          || getLeaderName(collab.members).toLowerCase().includes(lowerQuery)
          || results.includes(collab) // Already matched by title/description
      );
    }

    return results;
  } catch (error) {
    console.error('[collaborationService] searchCollaborationsWithFilters failed:', error);
    throw error;
  }
};

/**
 * Filter collaborations by search query, category, and status (client-side for flexibility)
 */
export const filterCollaborations = (
  collaborations: Collaboration[],
  searchQuery: string,
  selectedCategory: ProjectCategory | '전체',
  selectedStatuses: ProjectStatus[],
): Collaboration[] => {
  let filtered = [...collaborations];

  // Filter by search query (title, description, tags, leader name)
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (collab) =>
        collab.title.toLowerCase().includes(query) ||
        //collab.briefDescription.toLowerCase().includes(query) ||
        collab.description.toLowerCase().includes(query) ||
        getLeaderName(collab.members).toLowerCase().includes(query) ||
        collab.tags.some((tag) => tag.toLowerCase().includes(query)),
    );
  }

  // Filter by category
  if (selectedCategory !== '전체') {
    filtered = filtered.filter((collab) => collab.category === selectedCategory);
  }

  // Filter by status
  if (selectedStatuses.length > 0) {
    filtered = filtered.filter((collab) => selectedStatuses.includes(collab.status));
  }

  return filtered;
};

// ============================================================================
// User Preferences: Hide/Block Functionality
// ============================================================================



/**
 * Hide a collaboration from the user's feed
 */
export const hideCollaboration = async (collaborationId: string, reason?: string): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    const { error } = await supabase
      .from('user_collaboration_preferences')
      .upsert({
        profile_id: user.id,
        collaboration_id: collaborationId,
        status: 'hidden',
        reason: reason || null,
      }, {
        onConflict: 'profile_id,collaboration_id',
      });

    if (error) {
      console.error('[collaborationService] Error hiding collaboration:', error);
      throw new Error(`협업 숨김에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[collaborationService] hideCollaboration failed:', error);
    throw error;
  }
};

/**
 * Unhide a collaboration (removes preference record)
 */
export const unhideCollaboration = async (collaborationId: string): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    const { error } = await supabase
      .from('user_collaboration_preferences')
      .delete()
      .eq('profile_id', user.id)
      .eq('collaboration_id', collaborationId)
      .eq('status', 'hidden');

    if (error) {
      console.error('[collaborationService] Error unhiding collaboration:', error);
      throw new Error(`협업 숨김 해제에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[collaborationService] unhideCollaboration failed:', error);
    throw error;
  }
};

/**
 * Block a collaboration permanently
 */
export const blockCollaboration = async (collaborationId: string, reason?: string): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    const { error } = await supabase
      .from('user_collaboration_preferences')
      .upsert({
        profile_id: user.id,
        collaboration_id: collaborationId,
        status: 'blocked',
        reason: reason || null,
      }, {
        onConflict: 'profile_id,collaboration_id',
      });

    if (error) {
      console.error('[collaborationService] Error blocking collaboration:', error);
      throw new Error(`협업 차단에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[collaborationService] blockCollaboration failed:', error);
    throw error;
  }
};

/**
 * Unblock a collaboration (removes preference record)
 */
export const unblockCollaboration = async (collaborationId: string): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    const { error } = await supabase
      .from('user_collaboration_preferences')
      .delete()
      .eq('profile_id', user.id)
      .eq('collaboration_id', collaborationId)
      .eq('status', 'blocked');

    if (error) {
      console.error('[collaborationService] Error unblocking collaboration:', error);
      throw new Error(`협업 차단 해제에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[collaborationService] unblockCollaboration failed:', error);
    throw error;
  }
};

/**
 * Get all hidden collaborations for the current user
 */
export const getHiddenCollaborations = async (): Promise<Collaboration[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    // Get hidden collaboration IDs
    const { data: preferences, error: prefError } = await supabase
      .from('user_collaboration_preferences')
      .select('collaboration_id')
      .eq('profile_id', user.id)
      .eq('status', 'hidden');

    if (prefError) {
      console.error('[collaborationService] Error fetching hidden collaborations:', prefError);
      throw new Error(`숨긴 협업 목록을 불러오는데 실패했어요: ${prefError.message}`);
    }

    if (!preferences || preferences.length === 0) return [];

    const collaborationIds = preferences.map(p => p.collaboration_id);

    // Fetch collaboration details
    const { data, error } = await supabase
      .from('collaborations')
      .select('*')
      .in('id', collaborationIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[collaborationService] Error fetching hidden collaboration details:', error);
      throw new Error(`숨긴 협업 상세 정보를 불러오는데 실패했어요: ${error.message}`);
    }

    // 배치 함수 사용 (N+1 쿼리 방지)
    return await mapCollaborationsWithDisplay(data || []);
  } catch (error) {
    console.error('[collaborationService] getHiddenCollaborations failed:', error);
    throw error;
  }
};

/**
 * Get all blocked collaborations for the current user
 */
export const getBlockedCollaborations = async (): Promise<Collaboration[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    // Get blocked collaboration IDs
    const { data: preferences, error: prefError } = await supabase
      .from('user_collaboration_preferences')
      .select('collaboration_id')
      .eq('profile_id', user.id)
      .eq('status', 'blocked');

    if (prefError) {
      console.error('[collaborationService] Error fetching blocked collaborations:', prefError);
      throw new Error(`차단한 협업 목록을 불러오는데 실패했어요: ${prefError.message}`);
    }

    if (!preferences || preferences.length === 0) return [];

    const collaborationIds = preferences.map(p => p.collaboration_id);

    // Fetch collaboration details
    const { data, error } = await supabase
      .from('collaborations')
      .select('*')
      .in('id', collaborationIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[collaborationService] Error fetching blocked collaboration details:', error);
      throw new Error(`차단한 협업 상세 정보를 불러오는데 실패했어요: ${error.message}`);
    }

    // 배치 함수 사용 (N+1 쿼리 방지)
    return await mapCollaborationsWithDisplay(data || []);
  } catch (error) {
    console.error('[collaborationService] getBlockedCollaborations failed:', error);
    throw error;
  }
};

/**
 * Get collaborations by IDs
 */
export const getCollaborationsByIds = async (ids: string[]): Promise<Collaboration[]> => {
  try {
    if (!ids || ids.length === 0) return [];

    const { data, error } = await supabase
      .from('collaborations')
      .select('*')
      .in('id', ids)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[collaborationService] Error fetching collaborations by IDs:', error);
      throw new Error(`협업 목록을 불러오는데 실패했어요: ${error.message}`);
    }

    // 배치 함수 사용 (N+1 쿼리 방지)
    return await mapCollaborationsWithDisplay(data || []);
  } catch (error) {
    console.error('[collaborationService] getCollaborationsByIds failed:', error);
    throw error;
  }
};

/**
 * Check if a collaboration is hidden
 */
export const isCollaborationHidden = async (collaborationId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('user_collaboration_preferences')
      .select('status')
      .eq('profile_id', user.id)
      .eq('collaboration_id', collaborationId)
      .single();

    return data?.status === 'hidden';
  } catch (error) {
    console.error('[collaborationService] isCollaborationHidden failed:', error);
    return false;
  }
};

/**
 * Check if a collaboration is blocked
 */
export const isCollaborationBlocked = async (collaborationId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('user_collaboration_preferences')
      .select('status')
      .eq('profile_id', user.id)
      .eq('collaboration_id', collaborationId)
      .single();

    return data?.status === 'blocked';
  } catch (error) {
    console.error('[collaborationService] isCollaborationBlocked failed:', error);
    return false;
  }
};

/**
 * Get invitations received by the current user
 * @param includeHidden - Whether to include hidden invitations (default: false)
 */
export const getReceivedInvitations = async (includeHidden: boolean = false): Promise<CollaborationInvitation[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    let query = supabase
      .from('collaboration_invitations')
      .select(`
        *,
        collaboration:collaborations(title, collaboration_type, cover_image_url),
        inviter:profiles!inviter_id(username, avatar_url)
      `)
      .eq('invitee_id', user.id);

    if (!includeHidden) {
      query = query.eq('is_hidden_by_invitee', false);
    }

    const { data, error } = await query.order('sent_date', { ascending: false });

    if (error) {
      console.error('[collaborationService] Error fetching received invitations:', error);
      // Table might not exist yet or schema differs, return empty array gracefully
      return [];
    }

    // Batch fetch inviter details (unified profile)
    const inviterIds = [...new Set((data || []).map((row: any) => row.inviter_id).filter(Boolean))];
    const inviterDisplayMap = await getProfileDisplayMap(inviterIds);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((row: any) => {
      const inviterDisplay = inviterDisplayMap.get(row.inviter_id);
      const inviterDetails = {
        name: inviterDisplay?.name || row.inviter?.username || '알 수 없음',
        avatarUrl: inviterDisplay?.avatar || row.inviter?.avatar_url,
        profileType: inviterDisplay?.profileType !== 'customer' ? inviterDisplay?.profileType : undefined,
      };

      return {
        id: row.id,
        collaborationId: row.collaboration_id,
        inviterId: row.inviter_id,
        inviteeId: row.invitee_id,
        status: row.status,
        message: row.message,
        sentDate: row.sent_date,
        isHiddenByInviter: row.is_hidden_by_inviter,
        isHiddenByInvitee: row.is_hidden_by_invitee,
        collaboration: {
          title: row.collaboration?.title,
          coverImageUrl: row.collaboration?.cover_image_url,
          category: row.collaboration?.category,
        },
        inviter: inviterDetails,
      };
    });
  } catch (error) {
    console.error('[collaborationService] getReceivedInvitations failed:', error);
    return [];
  }
};

/**
 * Get applications sent by the current user
 * @param includeHidden - Whether to include hidden applications (default: false)
 */
export const getMyCollaborationApplications = async (includeHidden: boolean = false): Promise<CollaborationApplication[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    let query = supabase
      .from('collaboration_applications')
      .select(`
        *,
        collaboration:collaborations(title, collaboration_type, status, created_by, cover_image_url, category)
      `)
      .eq('applicant_id', user.id);

    if (!includeHidden) {
      query = query.eq('is_hidden_by_applicant', false);
    }

    const { data, error } = await query.order('applied_date', { ascending: false });

    if (error) {
      console.error('[collaborationService] Error fetching my applications:', error);
      return [];
    }

    // 협업 생성자의 display 정보 배치 조회 (getProfileDisplayMap 사용 - is_active 필터 적용)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const creatorIds = [...new Set((data || []).map((row: any) => row.collaboration?.created_by).filter(Boolean))];
    const displayMap = await getProfileDisplayMap(creatorIds);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((row: any) => ({
      id: row.id,
      collaborationId: row.collaboration_id,
      applicantId: row.applicant_id,
      status: row.status,
      coverLetter: row.cover_letter,
      appliedDate: row.applied_date,
      budgetRange: row.budget_range,
      duration: row.duration,
      availability: row.availability,
      portfolioLinks: row.portfolio_links || [],
      resumeUrl: row.resume_url,
      skills: row.skills || [],
      experienceYears: row.experience_years,
      isHiddenByApplicant: row.is_hidden_by_applicant,
      isHiddenByReviewer: row.is_hidden_by_reviewer,
      collaboration: {
        title: row.collaboration?.title,
        status: row.collaboration?.status,
        createdBy: row.collaboration?.created_by,
        coverImageUrl: row.collaboration?.cover_image_url,
        category: row.collaboration?.category,
        profileType: displayMap.get(row.collaboration?.created_by)?.profileType === 'customer'
          ? undefined
          : (displayMap.get(row.collaboration?.created_by)?.profileType as 'brand' | 'artist' | 'creative' | 'fan' | undefined),
      },
    }));
  } catch (error) {
    console.error('[collaborationService] getMyCollaborationApplications failed:', error);
    return [];
  }
};

/**
 * Get applications received for the current user's collaborations
 * @param includeHidden - Whether to include hidden applications (default: false)
 */
export const getReceivedCollaborationApplications = async (includeHidden: boolean = false): Promise<CollaborationApplication[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    // Fetch applications where the collaboration's creator is the current user
    let query = supabase
      .from('collaboration_applications')
      .select(`
        *,
        collaboration:collaborations!inner(title, collaboration_type, status, created_by, cover_image_url, category),
        applicant:profiles!applicant_id(username, avatar_url)
      `)
      .eq('collaboration.created_by', user.id);

    if (!includeHidden) {
      query = query.eq('is_hidden_by_reviewer', false);
    }

    const { data, error } = await query.order('applied_date', { ascending: false });

    if (error) {
      console.error('[collaborationService] Error fetching received applications:', error);
      return [];
    }

    // 배치로 applicant 정보 조회 (브랜드/아티스트/크리에이티브/팬 모두 지원, is_active 필터 적용)
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

    // 협업 생성자의 display 정보 배치 조회 (getProfileDisplayMap 사용 - is_active 필터 적용)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const creatorIds = [...new Set((data || []).map((row: any) => row.collaboration?.created_by).filter(Boolean))];
    const displayMap = await getProfileDisplayMap(creatorIds);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((row: any) => {
      // 배치로 조회한 applicant 정보 사용
      const applicantDisplay = applicantDisplayMap.get(row.applicant_id);
      const partnerInfo = partnersMap.get(row.applicant_id);
      const applicantDetails = {
        name: applicantDisplay?.name || '알 수 없음',
        avatarUrl: applicantDisplay?.avatar || '',
        activityField: partnerInfo?.activity_field || '',
        profileType: applicantDisplay?.profileType !== 'customer' ? applicantDisplay?.profileType : undefined,
      };

      return {
        id: row.id,
        collaborationId: row.collaboration_id,
        applicantId: row.applicant_id,
        status: row.status,
        coverLetter: row.cover_letter,
        appliedDate: row.applied_date,
        budgetRange: row.budget_range,
        duration: row.duration,
        availability: row.availability,
        portfolioLinks: row.portfolio_links || [],
        resumeUrl: row.resume_url,
        skills: row.skills || [],
        experienceYears: row.experience_years,
        isHiddenByApplicant: row.is_hidden_by_applicant,
        isHiddenByReviewer: row.is_hidden_by_reviewer,
        reviewerNote: row.reviewer_note,
        rejectionReason: row.rejection_reason,
        createdAt: row.applied_date,
        collaboration: {
          title: row.collaboration?.title,
          status: row.collaboration?.status,
          createdBy: row.collaboration?.created_by,
          coverImageUrl: row.collaboration?.cover_image_url,
          category: row.collaboration?.category,
          display: displayMap.get(row.collaboration?.created_by),
        },
        applicant: applicantDetails,
      };
    });
  } catch (error) {
    console.error('[collaborationService] getReceivedCollaborationApplications failed:', error);
    return [];
  }
};

/**
 * Update reviewer note on a collaboration application (Brand/Owner)
 */
export const updateCollaborationApplicationReviewerNote = async (applicationId: string, note: string): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    const { error } = await supabase
      .from('collaboration_applications')
      .update({
        reviewer_note: note,
        reviewer_id: user.id,
        reviewed_date: new Date().toISOString(),
      })
      .eq('id', applicationId);

    if (error) {
      console.error('[collaborationService] Error updating collaboration application reviewer note:', error);
      throw new Error(`메모 업데이트에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[collaborationService] updateCollaborationApplicationReviewerNote failed:', error);
    throw error;
  }
};

/**
 * Respond to an invitation (accept/reject)
 */
export const respondToInvitation = async (
  invitationId: string,
  status: 'accepted' | 'rejected'
): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('로그인이 필요합니다');

    // 먼저 초대 정보 조회 (inviter_id와 collaboration 정보 포함)
    const { data: invitationInfo } = await supabase
      .from('collaboration_invitations')
      .select('inviter_id, collaboration_id, collaboration:collaborations(title)')
      .eq('id', invitationId)
      .single();

    // Update invitation status
    const { data: invitation, error } = await supabase
      .from('collaboration_invitations')
      .update({
        status,
        response_date: new Date().toISOString()
      })
      .eq('id', invitationId)
      .select()
      .single();

    if (error) {
      console.error('[collaborationService] Error responding to invitation:', error);
      throw new Error(`초대 응답에 실패했어요: ${error.message}`);
    }

    // 초대자(inviter)에게 수락/거절 알림 전송
    if (invitationInfo) {
      const collabTitle = (invitationInfo.collaboration as any)?.title || '협업';
      try {
        // 비팬 표기에 맞는 sender(수락/거절한 사용자) 정보 가져오기
        const senderDisplayInfo = await getProfileDisplay(user.id);
        const senderName = senderDisplayInfo?.name || '사용자';
        const senderAvatar = senderDisplayInfo?.avatar;

        await supabase.from('user_notifications').insert({
          receiver_id: invitationInfo.inviter_id,
          type: status === 'accepted' ? 'invitation_accepted' : 'invitation_rejected',
          title: status === 'accepted' ? '초대가 수락되었어요.' : '초대가 거절되었어요.',
          content: status === 'accepted'
            ? `${senderName}님이 "${collabTitle}" 협업 초대를 수락했어요.`
            : `${senderName}님이 "${collabTitle}" 협업 초대를 거절했어요.`,
          related_id: invitationInfo.collaboration_id,
          related_type: 'collaboration',
          metadata: {
            sender_id: user.id,
            collaboration_id: invitationInfo.collaboration_id,
            sender_name: senderName,
            sender_avatar: senderAvatar
          }
        });
      } catch (notifError) {
        console.error('[collaborationService] Error sending notification:', notifError);
      }
    }

    // If accepted, add user to collaboration members
    if (status === 'accepted' && invitation) {
      // Get user's role/position info
      const { data: profile } = await supabase
        .from('partners')
        .select('activity_field')
        .eq('id', user.id)
        .maybeSingle();

      const { error: memberError } = await supabase.from('collaboration_members').insert({
        collaboration_id: invitation.collaboration_id,
        user_id: user.id,
        position: profile?.activity_field || 'Member',
        status: 'active',
        is_leader: false
      });

      // member_added 활동 기록 (초대자에게)
      if (!memberError && invitationInfo?.inviter_id) {
        const collabTitle = (invitationInfo.collaboration as any)?.title || '협업';
        activityService.createActivityViaRPC({
          userId: invitationInfo.inviter_id,
          activityType: 'member_added',
          relatedEntityType: 'collaboration',
          relatedEntityId: invitation.collaboration_id,
          title: '새 멤버가 협업에 참여했어요',
          description: collabTitle,
          metadata: {
            member_id: user.id,
            invitation_id: invitationId,
          },
        }).catch((err) => console.warn('[collaborationService] Failed to record member_added activity:', err));

        // invitation_accepted 활동 기록 (수락자에게)
        const senderDisplayInfo = await getProfileDisplay(user.id);
        const senderName = senderDisplayInfo?.name || '사용자';

        activityService.createActivityViaRPC({
          userId: user.id,
          activityType: 'invitation_accepted',
          relatedEntityType: 'collaboration',
          relatedEntityId: invitation.collaboration_id,
          title: `${collabTitle} 초대를 수락했어요`,
          description: '',
          metadata: {
            collaboration_title: collabTitle,
            inviter_id: invitationInfo.inviter_id,
          },
        }).catch((err) => console.warn('[collaborationService] Failed to record receiver invitation_accepted activity:', err));

        // invitation_accepted 활동 기록 (초대자에게도)
        activityService.createActivityViaRPC({
          userId: invitationInfo.inviter_id,
          activityType: 'invitation_accepted',
          relatedEntityType: 'collaboration',
          relatedEntityId: invitation.collaboration_id,
          title: `${collabTitle} 초대가 수락되었어요`,
          description: senderName,
          metadata: {
            collaboration_title: collabTitle,
            receiver_id: user.id,
            receiver_name: senderName,
          },
        }).catch((err) => console.warn('[collaborationService] Failed to record sender invitation_accepted activity:', err));
      }

      // 채팅방에 새 멤버 추가
      try {
        const chatRoomId = await messageService.getRoomByCollaborationId(invitation.collaboration_id);
        if (chatRoomId) {
          await messageService.addParticipantToRoom(chatRoomId, user.id);
          console.log('[collaborationService] Added member to chat room:', user.id);
        }
      } catch (chatError) {
        console.error('[collaborationService] Error adding member to chat room:', chatError);
        // Continue even if chat room update fails
      }
    } else if (status === 'rejected' && invitationInfo?.inviter_id) {
      // invitation_rejected 활동 기록 (초대자에게)
      const collabTitle = (invitationInfo.collaboration as any)?.title || '협업';
      const senderDisplayInfo = await getProfileDisplay(user.id);
      const senderName = senderDisplayInfo?.name || '사용자';

      activityService.createActivityViaRPC({
        userId: invitationInfo.inviter_id,
        activityType: 'invitation_rejected',
        relatedEntityType: 'collaboration',
        relatedEntityId: invitationInfo.collaboration_id,
        title: `${collabTitle} 초대가 거절되었어요`,
        description: senderName,
        metadata: {
          collaboration_title: collabTitle,
          receiver_id: user.id,
          receiver_name: senderName,
        },
      }).catch((err) => console.warn('[collaborationService] Failed to record invitation_rejected activity:', err));
    }
  } catch (error) {
    console.error('[collaborationService] respondToInvitation failed:', error);
    throw error;
  }
};

/**
 * Cancel/Withdraw a collaboration application
 */
export const cancelCollaborationApplication = async (applicationId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('collaboration_applications')
      .update({ status: 'withdrawn' })
      .eq('id', applicationId);

    if (error) {
      console.error('[collaborationService] Error cancelling application:', error);
      throw new Error(`지원 취소에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[collaborationService] cancelCollaborationApplication failed:', error);
    throw error;
  }
};

/**
 * Respond to a collaboration application (accept/reject)
 */
export const respondToCollaborationApplication = async (
  applicationId: string,
  status: 'accepted' | 'rejected' | 'shortlisted'
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // 먼저 지원 정보 조회 (알림용 정보 포함)
    const { data: applicationInfo } = await supabase
      .from('collaboration_applications')
      .select('collaboration_id, applicant_id, collaboration:collaborations(title, team_size, current_team_size)')
      .eq('id', applicationId)
      .single();

    // 수락하는 경우 팀 사이즈 제한 확인
    if (status === 'accepted' && applicationInfo) {
      const collaboration = applicationInfo.collaboration as any;
      if (collaboration?.team_size && collaboration?.current_team_size >= collaboration?.team_size) {
        throw new Error('팀 인원이 이미 가득 찼습니다');
      }
    }

    const { error } = await supabase
      .from('collaboration_applications')
      .update({
        status,
        response_date: new Date().toISOString()
      })
      .eq('id', applicationId);

    if (error) {
      console.error('[collaborationService] Error responding to application:', error);
      throw new Error(`지원 응답에 실패했어요: ${error.message}`);
    }

    // 지원자(applicant)에게 수락/거절 알림 전송 (shortlisted는 제외)
    if (applicationInfo && user && (status === 'accepted' || status === 'rejected')) {
      const collabTitle = (applicationInfo.collaboration as any)?.title || '협업';
      try {
        // 비팬 표기에 맞는 sender(수락/거절한 협업 리더) 정보 가져오기
        const senderDisplayInfo = await getProfileDisplay(user.id);
        const senderName = senderDisplayInfo?.name || '협업 리더';
        const senderAvatar = senderDisplayInfo?.avatar;

        await supabase.from('user_notifications').insert({
          receiver_id: applicationInfo.applicant_id,
          type: status === 'accepted' ? 'application_accepted' : 'application_rejected',
          title: status === 'accepted' ? '협업 지원이 수락되었어요.' : '협업 지원이 거절되었어요.',
          content: status === 'accepted'
            ? `${senderName}님이 "${collabTitle}" 협업 지원을 수락했어요. 이제 협업에 참여할 수 있어요!`
            : `${senderName}님이 "${collabTitle}" 협업 지원을 거절했어요.`,
          related_id: applicationInfo.collaboration_id,
          related_type: 'collaboration',
          metadata: {
            sender_id: user.id,
            collaboration_id: applicationInfo.collaboration_id,
            sender_name: senderName,
            sender_avatar: senderAvatar
          }
        });
      } catch (notifError) {
        console.error('[collaborationService] Error sending notification:', notifError);
      }
    }

    // If accepted, add applicant to collaboration members
    if (status === 'accepted' && applicationInfo) {
      // Get applicant's role/position info
      const { data: profile } = await supabase
        .from('partners')
        .select('activity_field')
        .eq('id', applicationInfo.applicant_id)
        .maybeSingle();

      const { error: memberError } = await supabase.from('collaboration_members').insert({
        collaboration_id: applicationInfo.collaboration_id,
        user_id: applicationInfo.applicant_id,
        position: profile?.activity_field || 'Member',
        status: 'active',
        is_leader: false
      });

      // member_added 활동 기록 (협업 생성자에게)
      if (!memberError && user) {
        const collabTitle = (applicationInfo.collaboration as any)?.title || '협업';
        activityService.createActivity({
          userId: user.id,
          activityType: 'member_added',
          relatedEntityType: 'collaboration',
          relatedEntityId: applicationInfo.collaboration_id,
          title: '새 멤버가 협업에 참여했어요',
          description: collabTitle,
          metadata: {
            member_id: applicationInfo.applicant_id,
            application_id: applicationId,
          },
        }).catch((err) => console.warn('[collaborationService] Failed to record member_added activity:', err));
      }

      // 채팅방에 새 멤버 추가
      try {
        const chatRoomId = await messageService.getRoomByCollaborationId(applicationInfo.collaboration_id);
        if (chatRoomId) {
          await messageService.addParticipantToRoom(chatRoomId, applicationInfo.applicant_id);
          console.log('[collaborationService] Added applicant to chat room:', applicationInfo.applicant_id);
        }
      } catch (chatError) {
        console.error('[collaborationService] Error adding applicant to chat room:', chatError);
        // Continue even if chat room update fails
      }
    }
  } catch (error) {
    console.error('[collaborationService] respondToCollaborationApplication failed:', error);
    throw error;
  }
};

/**
 * Update collaboration status
 * When status changes to 'completed', records activity and checks badges
 */
export const updateCollaborationStatus = async (
  collaborationId: string,
  status: ProjectStatus
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('로그인이 필요합니다');
    }

    // Verify that the user is the creator of the collaboration
    const { data: collaboration, error: fetchError } = await supabase
      .from('collaborations')
      .select('created_by, title')
      .eq('id', collaborationId)
      .single();

    if (fetchError || !collaboration) {
      throw new Error('협업을 찾을 수 없어요');
    }

    if (collaboration.created_by !== user.id) {
      throw new Error('협업 작성자만 상태를 변경할 수 있어요');
    }

    const { error } = await supabase
      .from('collaborations')
      .update({ status })
      .eq('id', collaborationId);

    if (error) {
      console.error('[collaborationService] Error updating collaboration status:', error);
      throw new Error(`상태 업데이트에 실패했어요: ${error.message}`);
    }

    // 협업 완료 시 활동 기록 및 배지 체크 (비동기, 에러 무시)
    if (status === 'completed') {
      handleCollaborationCompleted(user.id, collaborationId, collaboration.title).catch((err) => {
        console.warn('[collaborationService] Failed to handle collaboration completed:', err);
      });
    }
  } catch (error) {
    console.error('[collaborationService] updateCollaborationStatus failed:', error);
    throw error;
  }
};

/**
 * Handle collaboration completion - activity recording and badge checks
 */
const handleCollaborationCompleted = async (
  userId: string,
  collaborationId: string,
  collaborationTitle?: string
): Promise<void> => {
  try {
    // 1. 협업 완료 활동 기록
    await activityService.createActivity({
      userId,
      activityType: 'collaboration_completed',
      relatedEntityType: 'collaboration',
      relatedEntityId: collaborationId,
      title: '협업을 완료했어요',
      description: collaborationTitle || '',
    });

    // 2. 협업 멤버들에게 완료 알림 발송
    const { data: members } = await supabase
      .from('collaboration_members')
      .select('user_id')
      .eq('collaboration_id', collaborationId)
      .eq('status', 'active');

    if (members && members.length > 0) {
      const senderDisplayInfo = await getProfileDisplay(userId);
      const senderName = senderDisplayInfo?.name || '협업 리더';
      const senderAvatar = senderDisplayInfo?.avatar;

      const notifications = members
        .filter((m) => m.user_id !== userId) // 완료한 본인 제외
        .map((m) => ({
          receiver_id: m.user_id,
          type: 'project_complete',
          title: '협업이 완료되었어요',
          content: `${senderName}님이 "${collaborationTitle || '협업'}"를 완료했어요.`,
          related_id: collaborationId,
          related_type: 'collaboration',
          is_read: false,
          metadata: {
            sender_id: userId,
            sender_name: senderName,
            sender_avatar: senderAvatar,
            collaboration_id: collaborationId,
            collaboration_title: collaborationTitle,
          },
        }));

      if (notifications.length > 0) {
        await supabase.from('user_notifications').insert(notifications);
      }
    }

    // 3. 협업 마스터 배지 체크
    await badgeAutoGrantService.checkCollabMasterBadge(userId);

    // 4. 기능 탐험가 배지 체크 (프로젝트 + 협업 모두 완료)
    await badgeAutoGrantService.checkExplorerBadge(userId);

    // 5. 대표유저 배지 체크 (20개 이상 참여)
    await badgeAutoGrantService.checkRepresentativeBadge(userId);
  } catch (err) {
    console.warn('[collaborationService] handleCollaborationCompleted failed:', err);
  }
};

/**
 * Update collaboration workflow steps
 */
export const updateCollaborationWorkflowSteps = async (
  collaborationId: string,
  steps: WorkflowStep[],
  previousSteps?: WorkflowStep[]
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // 협업 정보 조회 (제목 확인)
    const { data: collaboration } = await supabase
      .from('collaborations')
      .select('title, workflow_steps')
      .eq('id', collaborationId)
      .single();

    const { error } = await supabase
      .from('collaborations')
      .update({ workflow_steps: steps })
      .eq('id', collaborationId);

    if (error) {
      console.error('[collaborationService] Error updating workflow steps:', error);
      throw new Error(`워크플로우 업데이트에 실패했어요: ${error.message}`);
    }

    if (user) {
      const completedSteps = steps.filter((s) => s.isCompleted).length;
      const totalSteps = steps.length;

      // 이전 단계와 비교하여 새로 완료된 단계 찾기
      const oldSteps = previousSteps || (collaboration?.workflow_steps as WorkflowStep[]) || [];
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
              relatedEntityType: 'collaboration',
              relatedEntityId: collaborationId,
              title: '협업 작업을 완료했어요',
              description: step.name,
              metadata: {
                step_name: step.name,
                collaboration_title: collaboration?.title,
                completed_at: step.completedAt || new Date().toISOString(),
              },
            })
            .catch((err) =>
              console.warn('[collaborationService] Failed to record workflow_step_completed activity:', err)
            );
        });
      }

      // workflow_step_updated 활동 기록 (업데이터에게)
      activityService
        .createActivityViaRPC({
          userId: user.id,
          activityType: 'workflow_step_updated',
          relatedEntityType: 'collaboration',
          relatedEntityId: collaborationId,
          title: `${collaboration?.title || '협업'}에서 작업이 업데이트되었어요`,
          description: '',
          metadata: {
            completed_steps: completedSteps,
            total_steps: totalSteps,
            progress_percent: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
          },
        })
        .catch((err) =>
          console.warn('[collaborationService] Failed to record workflow_step_updated activity:', err)
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
            relatedEntityType: 'collaboration',
            relatedEntityId: collaborationId,
            title: `${collaboration?.title || '협업'}에서 담당 작업이 업데이트되었어요`,
            description: stepNames.join(', '),
            metadata: {
              completed_steps: completedSteps,
              total_steps: totalSteps,
              progress_percent: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
              assigned_steps: stepNames,
            },
          })
          .catch((err) =>
            console.warn('[collaborationService] Failed to record personInCharge activity:', err)
          );
      });

      // project_update 알림 발송 (협업 멤버 전원)
      const { data: members } = await supabase
        .from('collaboration_members')
        .select('user_id')
        .eq('collaboration_id', collaborationId)
        .eq('status', 'active');

      if (members && members.length > 0) {
        const senderDisplayInfo = await getProfileDisplay(user.id);
        const senderName = senderDisplayInfo?.name || '협업 멤버';
        const senderAvatar = senderDisplayInfo?.avatar;

        const notifications = members
          .filter((m) => m.user_id !== user.id) // 업데이트한 본인 제외
          .map((m) => ({
            receiver_id: m.user_id,
            type: 'project_update',
            title: '협업 작업이 업데이트되었어요',
            content: `${senderName}님이 "${collaboration?.title || '협업'}"의 워크플로우를 업데이트했어요.`,
            related_id: collaborationId,
            related_type: 'collaboration',
            is_read: false,
            metadata: {
              sender_id: user.id,
              sender_name: senderName,
              sender_avatar: senderAvatar,
              collaboration_id: collaborationId,
              collaboration_title: collaboration?.title,
              update_type: 'workflow',
              completed_steps: completedSteps,
              total_steps: totalSteps,
            },
          }));

        if (notifications.length > 0) {
          supabase.from('user_notifications').insert(notifications).then(({ error }) => {
            if (error) console.warn('[collaborationService] Failed to send project_update notifications:', error);
          });
        }
      }
    }
  } catch (error) {
    console.error('[collaborationService] updateCollaborationWorkflowSteps failed:', error);
    throw error;
  }
};

/**
 * Delete a collaboration (creator only)
 */
export const deleteCollaboration = async (collaborationId: string): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('로그인이 필요합니다');
    }

    const { data: collaboration, error: fetchError } = await supabase
      .from('collaborations')
      .select('created_by')
      .eq('id', collaborationId)
      .single();

    if (fetchError || !collaboration) {
      throw new Error('협업을 찾을 수 없어요');
    }

    if (collaboration.created_by !== user.id) {
      throw new Error('협업 작성자만 삭제할 수 있어요');
    }

    const { error } = await supabase
      .from('collaborations')
      .update({ status: 'deleted' })
      .eq('id', collaborationId)
      .eq('created_by', user.id);
    if (error) {
      console.error('[collaborationService] Error marking collaboration as deleted:', error);
      throw new Error(`협업 삭제에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[collaborationService] deleteCollaboration failed:', error);
    throw error;
  }
};

// ============================================================================
// Hide/Unhide Invitations and Collaboration Applications
// ============================================================================

/**
 * Hide an invitation (by inviter or invitee)
 * @param invitationId - ID of the invitation to hide
 * @param role - 'inviter' or 'invitee'
 */
export const hideInvitation = async (invitationId: string, role: 'inviter' | 'invitee'): Promise<void> => {
  try {
    const column = role === 'inviter' ? 'is_hidden_by_inviter' : 'is_hidden_by_invitee';
    const { error } = await supabase
      .from('collaboration_invitations')
      .update({ [column]: true })
      .eq('id', invitationId);

    if (error) {
      console.error('[collaborationService] Error hiding invitation:', error);
      throw new Error(`초대 숨김에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[collaborationService] hideInvitation failed:', error);
    throw error;
  }
};

/**
 * Unhide an invitation (by inviter or invitee)
 * @param invitationId - ID of the invitation to unhide
 * @param role - 'inviter' or 'invitee'
 */
export const unhideInvitation = async (invitationId: string, role: 'inviter' | 'invitee'): Promise<void> => {
  try {
    const column = role === 'inviter' ? 'is_hidden_by_inviter' : 'is_hidden_by_invitee';
    const { error } = await supabase
      .from('collaboration_invitations')
      .update({ [column]: false })
      .eq('id', invitationId);

    if (error) {
      console.error('[collaborationService] Error unhiding invitation:', error);
      throw new Error(`초대 숨김 해제에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[collaborationService] unhideInvitation failed:', error);
    throw error;
  }
};

/**
 * Hide multiple invitations at once
 * @param invitationIds - Array of invitation IDs to hide
 * @param role - 'inviter' or 'invitee'
 */
export const hideInvitations = async (invitationIds: string[], role: 'inviter' | 'invitee'): Promise<void> => {
  try {
    const column = role === 'inviter' ? 'is_hidden_by_inviter' : 'is_hidden_by_invitee';
    const { error } = await supabase
      .from('collaboration_invitations')
      .update({ [column]: true })
      .in('id', invitationIds);

    if (error) {
      console.error('[collaborationService] Error hiding invitations:', error);
      throw new Error(`초대 숨김에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[collaborationService] hideInvitations failed:', error);
    throw error;
  }
};

/**
 * Unhide multiple invitations at once
 * @param invitationIds - Array of invitation IDs to unhide
 * @param role - 'inviter' or 'invitee'
 */
export const unhideInvitations = async (invitationIds: string[], role: 'inviter' | 'invitee'): Promise<void> => {
  try {
    const column = role === 'inviter' ? 'is_hidden_by_inviter' : 'is_hidden_by_invitee';
    const { error } = await supabase
      .from('collaboration_invitations')
      .update({ [column]: false })
      .in('id', invitationIds);

    if (error) {
      console.error('[collaborationService] Error unhiding invitations:', error);
      throw new Error(`초대 숨김 해제에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[collaborationService] unhideInvitations failed:', error);
    throw error;
  }
};

/**
 * Hide a collaboration application (by applicant or reviewer)
 * @param applicationId - ID of the application to hide
 * @param role - 'applicant' or 'reviewer'
 */
export const hideCollaborationApplication = async (applicationId: string, role: 'applicant' | 'reviewer'): Promise<void> => {
  try {
    const column = role === 'applicant' ? 'is_hidden_by_applicant' : 'is_hidden_by_reviewer';
    const { error } = await supabase
      .from('collaboration_applications')
      .update({ [column]: true })
      .eq('id', applicationId);

    if (error) {
      console.error('[collaborationService] Error hiding collaboration application:', error);
      throw new Error(`지원 숨김에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[collaborationService] hideCollaborationApplication failed:', error);
    throw error;
  }
};

/**
 * Unhide a collaboration application (by applicant or reviewer)
 * @param applicationId - ID of the application to unhide
 * @param role - 'applicant' or 'reviewer'
 */
export const unhideCollaborationApplication = async (applicationId: string, role: 'applicant' | 'reviewer'): Promise<void> => {
  try {
    const column = role === 'applicant' ? 'is_hidden_by_applicant' : 'is_hidden_by_reviewer';
    const { error } = await supabase
      .from('collaboration_applications')
      .update({ [column]: false })
      .eq('id', applicationId);

    if (error) {
      console.error('[collaborationService] Error unhiding collaboration application:', error);
      throw new Error(`지원 숨김 해제에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[collaborationService] unhideCollaborationApplication failed:', error);
    throw error;
  }
};

/**
 * Hide multiple collaboration applications at once
 * @param applicationIds - Array of application IDs to hide
 * @param role - 'applicant' or 'reviewer'
 */
export const hideCollaborationApplications = async (applicationIds: string[], role: 'applicant' | 'reviewer'): Promise<void> => {
  try {
    const column = role === 'applicant' ? 'is_hidden_by_applicant' : 'is_hidden_by_reviewer';
    const { error } = await supabase
      .from('collaboration_applications')
      .update({ [column]: true })
      .in('id', applicationIds);

    if (error) {
      console.error('[collaborationService] Error hiding collaboration applications:', error);
      throw new Error(`지원 숨김에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[collaborationService] hideCollaborationApplications failed:', error);
    throw error;
  }
};

/**
 * Unhide multiple collaboration applications at once
 * @param applicationIds - Array of application IDs to unhide
 * @param role - 'applicant' or 'reviewer'
 */
export const unhideCollaborationApplications = async (applicationIds: string[], role: 'applicant' | 'reviewer'): Promise<void> => {
  try {
    const column = role === 'applicant' ? 'is_hidden_by_applicant' : 'is_hidden_by_reviewer';
    const { error } = await supabase
      .from('collaboration_applications')
      .update({ [column]: false })
      .in('id', applicationIds);

    if (error) {
      console.error('[collaborationService] Error unhiding collaboration applications:', error);
      throw new Error(`지원 숨김 해제에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[collaborationService] unhideCollaborationApplications failed:', error);
    throw error;
  }
};

// ============================================================================
// Team Member Management (Leave / Remove / Transfer Leadership)
// ============================================================================

/**
 * 협업 리더 권한 이전
 * @param collaborationId - 협업 ID
 * @param newLeaderId - 새 리더가 될 멤버 ID
 */
export const transferCollaborationLeadership = async (collaborationId: string, newLeaderId: string): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    // 현재 유저가 리더인지 확인
    const { data: currentMember, error: currentMemberError } = await supabase
      .from('collaboration_members')
      .select('id, is_leader')
      .eq('collaboration_id', collaborationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (currentMemberError || !currentMember?.is_leader) {
      throw new Error('리더만 권한을 이전할 수 있어요');
    }

    // 새 리더가 활성 멤버인지 확인
    const { data: newLeaderMember, error: newLeaderError } = await supabase
      .from('collaboration_members')
      .select('id')
      .eq('collaboration_id', collaborationId)
      .eq('user_id', newLeaderId)
      .eq('status', 'active')
      .single();

    if (newLeaderError || !newLeaderMember) {
      throw new Error('권한을 이전할 멤버를 찾을 수 없어요');
    }

    // 기존 리더 권한 해제
    const { error: removeLeaderError } = await supabase
      .from('collaboration_members')
      .update({ is_leader: false })
      .eq('collaboration_id', collaborationId)
      .eq('user_id', user.id);

    if (removeLeaderError) {
      throw new Error(`리더 권한 해제에 실패했어요: ${removeLeaderError.message}`);
    }

    // 새 리더 권한 부여
    const { error: grantLeaderError } = await supabase
      .from('collaboration_members')
      .update({ is_leader: true, can_invite: true, can_edit: true })
      .eq('collaboration_id', collaborationId)
      .eq('user_id', newLeaderId);

    if (grantLeaderError) {
      // 롤백: 기존 리더 권한 복구
      await supabase
        .from('collaboration_members')
        .update({ is_leader: true })
        .eq('collaboration_id', collaborationId)
        .eq('user_id', user.id);
      throw new Error(`새 리더 권한 부여에 실패했어요: ${grantLeaderError.message}`);
    }

    console.log('[collaborationService] Leadership transferred successfully');
  } catch (error) {
    console.error('[collaborationService] transferCollaborationLeadership failed:', error);
    throw error;
  }
};

/**
 * 협업 나가기 (본인)
 * 리더인 경우 다른 멤버가 있으면 권한 이전 필수
 * @param collaborationId - 협업 ID
 * @param handoverLeaderId - 리더 권한을 넘길 멤버 ID (리더인 경우 필수)
 */
export const leaveCollaboration = async (collaborationId: string, handoverLeaderId?: string): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    // 현재 유저의 멤버 정보 확인
    const { data: currentMember, error: currentMemberError } = await supabase
      .from('collaboration_members')
      .select('id, is_leader')
      .eq('collaboration_id', collaborationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (currentMemberError || !currentMember) {
      throw new Error('협업 멤버가 아닙니다');
    }

    // 다른 활성 멤버 확인
    const { data: otherMembers, error: otherMembersError } = await supabase
      .from('collaboration_members')
      .select('user_id')
      .eq('collaboration_id', collaborationId)
      .eq('status', 'active')
      .neq('user_id', user.id);

    if (otherMembersError) {
      throw new Error('멤버 정보를 확인하는 중 오류가 발생했어요');
    }

    const hasOtherMembers = (otherMembers?.length || 0) > 0;

    // 리더이고 다른 멤버가 있는 경우 권한 이전 필수
    if (currentMember.is_leader && hasOtherMembers) {
      if (!handoverLeaderId) {
        throw new Error('다른 멤버에게 리더 권한을 이전해야 합니다');
      }
      await transferCollaborationLeadership(collaborationId, handoverLeaderId);
    }

    // 멤버 상태를 'left'로 변경
    const { error: leaveError } = await supabase
      .from('collaboration_members')
      .update({ status: 'left', is_leader: false })
      .eq('collaboration_id', collaborationId)
      .eq('user_id', user.id);

    if (leaveError) {
      throw new Error(`협업 나가기에 실패했어요: ${leaveError.message}`);
    }

    // 관련 지원 레코드 삭제 (있는 경우)
    try {
      await supabase
        .from('collaboration_applications')
        .delete()
        .eq('collaboration_id', collaborationId)
        .eq('applicant_id', user.id);
      console.log('[collaborationService] Deleted collaboration application records');
    } catch (appDeleteError) {
      console.error('[collaborationService] Error deleting collaboration applications:', appDeleteError);
      // 삭제 실패해도 나가기는 성공으로 처리
    }

    // 관련 초대 레코드 삭제 (있는 경우)
    try {
      await supabase
        .from('invitations')
        .delete()
        .eq('target_id', collaborationId)
        .eq('invitation_type', 'collaboration')
        .eq('receiver_id', user.id);
      console.log('[collaborationService] Deleted collaboration invitation records');
    } catch (invDeleteError) {
      console.error('[collaborationService] Error deleting collaboration invitations:', invDeleteError);
      // 삭제 실패해도 나가기는 성공으로 처리
    }

    // 채팅방에서도 제거 - 본인 나가기는 직접 DELETE로 처리 (협업의 모든 채팅방에서 나가기)
    try {
      // 협업에 연결된 모든 채팅방 찾기
      const { data: chatRooms } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('collaboration_id', collaborationId);

      if (chatRooms && chatRooms.length > 0) {
        const roomIds = chatRooms.map(room => room.id);
        // 모든 채팅방에서 본인을 제거
        await supabase
          .from('chat_participants')
          .delete()
          .in('room_id', roomIds)
          .eq('user_id', user.id);
        console.log(`[collaborationService] Removed from ${chatRooms.length} chat room(s)`);
      }
    } catch (chatError) {
      console.error('[collaborationService] Error removing from chat room:', chatError);
      // 채팅방 제거 실패해도 나가기는 성공으로 처리
    }

    // 리더에게 멤버 퇴장 알림 발송 (본인이 리더가 아닌 경우)
    try {
      const { data: collabData } = await supabase
        .from('collaborations')
        .select('title, created_by')
        .eq('id', collaborationId)
        .single();

      const collabTitle = collabData?.title || '협업';
      const leaderId = collabData?.created_by;

      if (leaderId && leaderId !== user.id) {
        const senderDisplayInfo = await getProfileDisplay(user.id);
        const senderName = senderDisplayInfo?.name || '멤버';
        const senderAvatar = senderDisplayInfo?.avatar;

        await supabase.from('user_notifications').insert({
          receiver_id: leaderId,
          type: 'member_left',
          title: '멤버가 협업을 떠났어요.',
          content: `${senderName}님이 "${collabTitle}" 협업에서 퇴장했어요.`,
          related_id: collaborationId,
          related_type: 'collaboration',
          metadata: {
            sender_id: user.id,
            collaboration_id: collaborationId,
            sender_name: senderName,
            sender_avatar: senderAvatar,
          }
        });
        console.log('[collaborationService] Sent member_left notification to leader');
      }
    } catch (notifError) {
      console.error('[collaborationService] Error sending member_left notification:', notifError);
      // 알림 실패해도 나가기는 성공으로 처리
    }

    console.log('[collaborationService] Left collaboration successfully');
  } catch (error) {
    console.error('[collaborationService] leaveCollaboration failed:', error);
    throw error;
  }
};

/**
 * 협업 멤버 추방 (리더만 가능)
 * @param collaborationId - 협업 ID
 * @param targetUserId - 추방할 멤버 ID
 */
export const removeMemberFromCollaboration = async (collaborationId: string, targetUserId: string): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    // 현재 유저가 리더인지 확인
    const { data: currentMember, error: currentMemberError } = await supabase
      .from('collaboration_members')
      .select('is_leader')
      .eq('collaboration_id', collaborationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (currentMemberError || !currentMember?.is_leader) {
      throw new Error('리더만 멤버를 내보낼 수 있어요');
    }

    // 대상 멤버 확인 (리더는 추방 불가)
    const { data: targetMember, error: targetMemberError } = await supabase
      .from('collaboration_members')
      .select('id, is_leader')
      .eq('collaboration_id', collaborationId)
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
      .from('collaboration_members')
      .update({ status: 'removed' })
      .eq('collaboration_id', collaborationId)
      .eq('user_id', targetUserId);

    if (removeError) {
      throw new Error(`멤버 내보내기에 실패했어요: ${removeError.message}`);
    }

    // 채팅방에서도 제거 - 협업 리더 권한으로 멤버 추방
    try {
      const { error: kickError } = await supabase.rpc('kick_chat_participant_by_entity', {
        p_entity_type: 'collaboration',
        p_entity_id: collaborationId,
        p_target_user_id: targetUserId,
      });

      if (kickError) {
        console.error('[collaborationService] Error kicking from chat:', kickError);
      } else {
        console.log('[collaborationService] Removed member from chat room');
      }
    } catch (chatError) {
      console.error('[collaborationService] Error removing member from chat room:', chatError);
    }

    // 협업 정보 가져오기
    const { data: collaborationData } = await supabase
      .from('collaborations')
      .select('title')
      .eq('id', collaborationId)
      .single();

    const collaborationTitle = collaborationData?.title || '협업';

    // 추방된 멤버에게 알림 발송
    try {
      const senderDisplayInfo = await getProfileDisplay(user.id);
      const senderName = senderDisplayInfo?.name || '리더';

      await supabase.from('user_notifications').insert({
        receiver_id: targetUserId,
        type: 'member_removed',
        title: '협업에서 제외되었어요.',
        content: `"${collaborationTitle}" 협업에서 제외되었어요.`,
        related_id: collaborationId,
        related_type: 'collaboration',
        metadata: {
          sender_id: user.id,
          collaboration_id: collaborationId,
          sender_name: senderName,
        }
      });
    } catch (notifError) {
      console.error('[collaborationService] Error sending removal notification:', notifError);
    }

    console.log('[collaborationService] Member removed successfully');
  } catch (error) {
    console.error('[collaborationService] removeMemberFromCollaboration failed:', error);
    throw error;
  }
};

/**
 * 협업의 다른 멤버 목록 가져오기 (리더 권한 이전용)
 */
export const getOtherCollaborationMembers = async (collaborationId: string): Promise<Array<{ userId: string; name: string }>> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: members, error } = await supabase
      .from('collaboration_members')
      .select('user_id')
      .eq('collaboration_id', collaborationId)
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
    console.error('[collaborationService] getOtherCollaborationMembers failed:', error);
    return [];
  }
};

const getMyActiveCollaborationsCount = async (): Promise<number> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('collaboration_members')
      .select('collaboration_id, collaborations!inner(status)', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('collaborations.status', ['recruiting', 'in_progress']);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Failed to get active collaboration count:', error);
    return 0;
  }
};

/**
 * 협업 지원을 확인됨으로 표시 (reviewer용)
 * @param applicationId - 지원 ID
 */
export const markCollaborationApplicationAsViewed = async (applicationId: string): Promise<void> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요해요');
    }

    // 지원 정보 확인 (협업 소유자인지 체크)
    const { data: application, error: fetchError } = await supabase
      .from('collaboration_applications')
      .select('id, collaboration_id, collaborations!inner(created_by)')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      console.error('[collaborationService] markCollaborationApplicationAsViewed: application not found');
      return;
    }

    // 협업 소유자인지 확인
    const collabCreatedBy = (application as any).collaborations?.created_by;
    if (collabCreatedBy !== user.id) {
      // 권한 없음 - 조용히 무시
      return;
    }

    const { error } = await supabase
      .from('collaboration_applications')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', applicationId)
      .is('viewed_at', null);

    if (error) {
      console.error('[collaborationService] markCollaborationApplicationAsViewed failed:', error);
    }
  } catch (error) {
    console.error('[collaborationService] markCollaborationApplicationAsViewed error:', error);
  }
};

/**
 * Toggle collaboration hidden state in ManageAll page (per user)
 * Uses RPC to bypass RLS infinite recursion
 * @param collaborationId - Collaboration ID
 * @param isHidden - New hidden state
 */
export const toggleCollaborationHiddenInManage = async (collaborationId: string, isHidden: boolean): Promise<void> => {
  try {
    const { error } = await supabase.rpc('toggle_collaboration_hidden_in_manage', {
      p_collaboration_id: collaborationId,
      p_is_hidden: isHidden,
    });

    if (error) {
      console.error('[collaborationService] Error toggling collaboration hidden state:', error);
      throw new Error(`숨김 상태 변경에 실패했어요: ${error.message}`);
    }
  } catch (error) {
    console.error('[collaborationService] toggleCollaborationHiddenInManage failed:', error);
    throw error;
  }
};

export const collaborationService = {
  createCollaboration,
  getAllCollaborations,
  getCollaborationById,
  getCollaborationTeamInfo,
  getCollaborationsByCategory,
  getCollaborationsByStatus,
  searchCollaborations,
  searchCollaborationsWithFilters,
  filterCollaborations,
  getMyCollaborations,
  getCollaborationsByIds,
  // User preferences
  hideCollaboration,
  unhideCollaboration,
  blockCollaboration,
  unblockCollaboration,
  getHiddenCollaborations,
  getBlockedCollaborations,
  isCollaborationHidden,
  isCollaborationBlocked,
  getReceivedInvitations,
  getMyCollaborationApplications,
  getReceivedCollaborationApplications,
  respondToInvitation,
  cancelCollaborationApplication,
  respondToCollaborationApplication,
  updateCollaborationStatus,
  updateCollaborationWorkflowSteps,
  deleteCollaboration,
  // Invitation hide/unhide
  hideInvitation,
  unhideInvitation,
  hideInvitations,
  unhideInvitations,
  // Collaboration application hide/unhide
  hideCollaborationApplication,
  unhideCollaborationApplication,
  hideCollaborationApplications,
  unhideCollaborationApplications,
  updateCollaborationApplicationReviewerNote,
  markCollaborationApplicationAsViewed,
  // Team member management
  leaveCollaboration,
  removeMemberFromCollaboration,
  transferCollaborationLeadership,
  getOtherCollaborationMembers,
  getMyActiveCollaborationsCount,
  // ManageAll hide/unhide
  toggleCollaborationHiddenInManage,
};

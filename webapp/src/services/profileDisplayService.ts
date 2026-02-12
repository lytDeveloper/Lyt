/**
 * Profile Display Service
 *
 * 통합 프로필 표시 서비스
 * - 4가지 프로필 타입(brand, artist, creative, fan) 지원
 * - brand > artist > creative > fan 우선순위 적용
 * - is_active=true 필터 항상 적용
 * - 배치 조회로 N+1 쿼리 방지
 *
 * 기존 displayService.ts와 userNotificationService.ts의 getVfanDisplayInfo* 함수를 대체
 */

import { supabase } from '../lib/supabase';
import type {
  ProfileType,
  ProfileDisplayInfo,
  ProfileDisplayMap,
  ProfileDisplaySource,
  LegacyDisplayInfo,
  LegacyDisplaySource,
} from '../types/profileDisplay.types';
import {
  PROFILE_TABLE_CONFIG,
  PROFILE_PRIORITY,
  DEFAULT_ACTIVITY_FIELD,
} from '../types/profileDisplay.types';

// ============================================================================
// 폴백 생성
// ============================================================================

/**
 * 기본 폴백 ProfileDisplayInfo 생성
 */
const createFallbackDisplay = (userId: string): ProfileDisplayInfo => ({
  name: '',
  avatar: undefined,
  activityField: undefined,
  profileType: 'customer',
  source: 'fallback',
  userId,
  isActive: false,
});

// ============================================================================
// 단일 사용자 조회
// ============================================================================

/**
 * 단일 사용자의 프로필 표시 정보 조회
 *
 * 우선순위: brand > artist > creative > fan > profiles(fallback)
 * 모든 조회에 is_active=true 필터 적용
 *
 * @param userId 사용자 ID
 * @returns 프로필 표시 정보
 *
 * @example
 * ```ts
 * const display = await getProfileDisplay(userId);
 * console.log(display.name); // "브랜드명" 또는 "아티스트명" 등
 * ```
 */
export const getProfileDisplay = async (
  userId?: string | null
): Promise<ProfileDisplayInfo> => {
  if (!userId) return createFallbackDisplay('');

  try {
    // 1. profiles 테이블에서 roles 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, roles, nickname, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    if (!profile) return createFallbackDisplay(userId);

    const roles: string[] = Array.isArray(profile.roles) ? profile.roles : [];

    // 2. 우선순위에 따라 프로필 조회 (brand > artist > creative > fan)
    for (const profileType of PROFILE_PRIORITY) {
      if (!roles.includes(profileType)) continue;

      const tableConfig = PROFILE_TABLE_CONFIG[profileType];

      if (profileType === 'fan') {
        // fan은 profile_fans에서 이미지만, 이름은 profiles.nickname
        const { data: fanData } = await supabase
          .from('profile_fans')
          .select('profile_id, profile_image_url')
          .eq('profile_id', userId)
          .eq('is_active', true)
          .maybeSingle();

        if (fanData) {
          return {
            name: profile.nickname || '팬',
            avatar: fanData.profile_image_url,
            activityField: '팬',
            profileType: 'fan',
            source: 'fan',
            userId,
            isActive: true,
          };
        }
      } else {
        const { data } = await supabase
          .from(tableConfig.table)
          .select(tableConfig.selectFields)
          .eq('profile_id', userId)
          .eq('is_active', true)
          .maybeSingle();

        if (data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const dataAny = data as any;
          return {
            name: tableConfig.nameField ? dataAny[tableConfig.nameField] || '' : '',
            avatar: dataAny[tableConfig.avatarField],
            activityField: dataAny.activity_field || DEFAULT_ACTIVITY_FIELD[profileType],
            profileType,
            source: profileType as ProfileDisplaySource,
            userId,
            isActive: true,
          };
        }
      }
    }

    // 3. 폴백: profiles 테이블 기본 정보
    return {
      name: profile.nickname || '',
      avatar: profile.avatar_url,
      activityField: roles[0] || '',
      profileType: 'customer',
      source: 'profile',
      userId,
      isActive: false,
    };
  } catch (error) {
    console.error('[profileDisplayService] getProfileDisplay failed:', error);
    return createFallbackDisplay(userId);
  }
};

// ============================================================================
// 배치 조회 (성능 최적화)
// ============================================================================

/**
 * 여러 사용자의 프로필 표시 정보를 배치 조회
 *
 * N+1 쿼리 방지를 위해 모든 테이블을 병렬 조회 후 우선순위에 따라 매핑
 *
 * @param userIds 사용자 ID 배열
 * @returns userId -> ProfileDisplayInfo 맵
 *
 * @example
 * ```ts
 * const displayMap = await getProfileDisplayMap([userId1, userId2, userId3]);
 * const user1Display = displayMap.get(userId1);
 * ```
 */
export const getProfileDisplayMap = async (
  userIds: Array<string | null | undefined>
): Promise<ProfileDisplayMap> => {
  const uniqueIds = Array.from(new Set(userIds.filter((id): id is string => !!id)));
  const result: ProfileDisplayMap = new Map();

  if (uniqueIds.length === 0) return result;

  try {
    // 1. 모든 profiles에서 roles와 기본 정보 조회
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, roles, nickname, avatar_url')
      .in('id', uniqueIds);

    if (!profiles) return result;

    const profilesMap = new Map(
      profiles.map((p) => [
        p.id,
        {
          roles: Array.isArray(p.roles) ? (p.roles as string[]) : [],
          nickname: p.nickname || '',
          avatar_url: p.avatar_url,
        },
      ])
    );

    // 2. 역할별 ID 분류 (모든 역할에 대해 분류 - else if 사용 안함)
    const brandIds: string[] = [];
    const artistIds: string[] = [];
    const creativeIds: string[] = [];
    const fanIds: string[] = [];

    uniqueIds.forEach((id) => {
      const profile = profilesMap.get(id);
      if (!profile) return;
      if (profile.roles.includes('brand')) brandIds.push(id);
      if (profile.roles.includes('artist')) artistIds.push(id);
      if (profile.roles.includes('creative')) creativeIds.push(id);
      if (profile.roles.includes('fan')) fanIds.push(id);
    });

    // 3. 병렬로 각 테이블에서 is_active=true 조회
    const [brandsResult, artistsResult, creativesResult, fansResult] = await Promise.all([
      brandIds.length > 0
        ? supabase
            .from('profile_brands')
            .select('profile_id, brand_name, logo_image_url, activity_field')
            .in('profile_id', brandIds)
            .eq('is_active', true)
        : Promise.resolve({ data: null }),
      artistIds.length > 0
        ? supabase
            .from('profile_artists')
            .select('profile_id, artist_name, logo_image_url, activity_field')
            .in('profile_id', artistIds)
            .eq('is_active', true)
        : Promise.resolve({ data: null }),
      creativeIds.length > 0
        ? supabase
            .from('profile_creatives')
            .select('profile_id, nickname, profile_image_url, activity_field')
            .in('profile_id', creativeIds)
            .eq('is_active', true)
        : Promise.resolve({ data: null }),
      fanIds.length > 0
        ? supabase
            .from('profile_fans')
            .select('profile_id, profile_image_url')
            .in('profile_id', fanIds)
            .eq('is_active', true)
        : Promise.resolve({ data: null }),
    ]);

    // 4. 우선순위에 따라 결과 매핑 (brand > artist > creative > fan)
    (brandsResult.data || []).forEach((b) => {
      result.set(b.profile_id, {
        name: b.brand_name || '브랜드',
        avatar: b.logo_image_url,
        activityField: b.activity_field || '브랜드',
        profileType: 'brand',
        source: 'brand',
        userId: b.profile_id,
        isActive: true,
      });
    });

    (artistsResult.data || []).forEach((a) => {
      if (!result.has(a.profile_id)) {
        result.set(a.profile_id, {
          name: a.artist_name || '아티스트',
          avatar: a.logo_image_url,
          activityField: a.activity_field || '아티스트',
          profileType: 'artist',
          source: 'artist',
          userId: a.profile_id,
          isActive: true,
        });
      }
    });

    (creativesResult.data || []).forEach((c) => {
      if (!result.has(c.profile_id)) {
        result.set(c.profile_id, {
          name: c.nickname || '크리에이티브',
          avatar: c.profile_image_url,
          activityField: c.activity_field || '크리에이티브',
          profileType: 'creative',
          source: 'creative',
          userId: c.profile_id,
          isActive: true,
        });
      }
    });

    (fansResult.data || []).forEach((f) => {
      if (!result.has(f.profile_id)) {
        const profile = profilesMap.get(f.profile_id);
        result.set(f.profile_id, {
          name: profile?.nickname || '팬',
          avatar: f.profile_image_url,
          activityField: '팬',
          profileType: 'fan',
          source: 'fan',
          userId: f.profile_id,
          isActive: true,
        });
      }
    });

    // 5. 나머지는 기본 프로필 정보로 폴백
    uniqueIds.forEach((id) => {
      if (!result.has(id)) {
        const profile = profilesMap.get(id);
        const primaryRole = profile?.roles?.[0] || '';
        result.set(id, {
          name: profile?.nickname || '사용자',
          avatar: profile?.avatar_url,
          activityField: primaryRole,
          profileType: 'customer',
          source: 'profile',
          userId: id,
          isActive: false,
        });
      }
    });
  } catch (error) {
    console.error('[profileDisplayService] getProfileDisplayMap failed:', error);
    // 에러 시 빈 폴백 설정
    uniqueIds.forEach((id) => {
      if (!result.has(id)) {
        result.set(id, createFallbackDisplay(id));
      }
    });
  }

  return result;
};

/**
 * 최적화된 배치 조회 (단일 RPC 호출)
 *
 * Supabase RPC 함수 `get_profile_display_batch`를 사용하여
 * 5개의 병렬 쿼리를 1개의 SQL 쿼리로 통합합니다.
 *
 * @param userIds 사용자 ID 배열
 * @returns 프로필 표시 정보 맵
 *
 * 성능 개선:
 * - Before: 5개 쿼리 (profiles 1개 + 프로필 타입별 4개)
 * - After: 1개 RPC 쿼리
 * - 50명 즐겨찾기: 250개 쿼리 → 1개 쿼리
 *
 * 폴백:
 * - RPC 함수가 없거나 에러 발생 시 기존 getProfileDisplayMap으로 자동 폴백
 *
 * @example
 * ```ts
 * const profileMap = await getProfileDisplayMapOptimized([userId1, userId2]);
 * const user1 = profileMap.get(userId1);
 * ```
 */
export const getProfileDisplayMapOptimized = async (
  userIds: Array<string | null | undefined>
): Promise<ProfileDisplayMap> => {
  const uniqueIds = Array.from(new Set(userIds.filter((id): id is string => !!id)));
  const result: ProfileDisplayMap = new Map();

  if (uniqueIds.length === 0) return result;

  try {
    const { data, error } = await supabase.rpc('get_profile_display_batch', {
      user_ids: uniqueIds,
    });

    if (error) throw error;

    // RPC 응답 매핑
    (data || []).forEach((row: any) => {
      result.set(row.user_id, {
        name: row.name || '',
        avatar: row.avatar,
        activityField: row.activity_field,
        profileType: row.profile_type as ProfileType,
        source: row.source as ProfileDisplaySource,
        userId: row.user_id,
        isActive: row.is_active,
      });
    });

    // 결과에 없는 ID는 폴백 설정
    uniqueIds.forEach((id) => {
      if (!result.has(id)) {
        result.set(id, createFallbackDisplay(id));
      }
    });

    console.log(`[profileDisplayService] RPC optimized: ${uniqueIds.length} users in 1 query`);
  } catch (error) {
    console.warn('[profileDisplayService] RPC failed, falling back to legacy method:', error);
    // 에러 시 기존 방식으로 폴백 (앱 중단 방지)
    return getProfileDisplayMap(userIds);
  }

  return result;
};

// ============================================================================
// 특정 타입 조회
// ============================================================================

/**
 * 특정 프로필 타입의 활성 프로필만 조회
 *
 * @param userId 사용자 ID
 * @param profileType 조회할 프로필 타입
 * @returns 프로필 표시 정보 또는 null
 *
 * @example
 * ```ts
 * const brandProfile = await getProfileDisplayByType(userId, 'brand');
 * if (brandProfile) {
 *   console.log(brandProfile.name); // 브랜드명
 * }
 * ```
 */
export const getProfileDisplayByType = async (
  userId: string,
  profileType: ProfileType
): Promise<ProfileDisplayInfo | null> => {
  if (!userId) return null;

  if (profileType === 'customer') {
    // customer는 프로필 테이블만 조회
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_url, roles')
      .eq('id', userId)
      .maybeSingle();

    if (!profile) return null;

    return {
      name: profile.nickname || '',
      avatar: profile.avatar_url,
      activityField: '',
      profileType: 'customer',
      source: 'profile',
      userId,
      isActive: false,
    };
  }

  const tableConfig = PROFILE_TABLE_CONFIG[profileType];
  if (!tableConfig) return null;

  try {
    if (profileType === 'fan') {
      const [{ data: fanData }, { data: profileData }] = await Promise.all([
        supabase
          .from('profile_fans')
          .select('profile_id, profile_image_url')
          .eq('profile_id', userId)
          .eq('is_active', true)
          .maybeSingle(),
        supabase.from('profiles').select('nickname').eq('id', userId).maybeSingle(),
      ]);

      if (!fanData) return null;

      return {
        name: profileData?.nickname || '팬',
        avatar: fanData.profile_image_url,
        activityField: '팬',
        profileType: 'fan',
        source: 'fan',
        userId,
        isActive: true,
      };
    }

    const { data } = await supabase
      .from(tableConfig.table)
      .select(tableConfig.selectFields)
      .eq('profile_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (!data) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataAny = data as any;
    return {
      name: tableConfig.nameField ? dataAny[tableConfig.nameField] || '' : '',
      avatar: dataAny[tableConfig.avatarField],
      activityField: dataAny.activity_field || DEFAULT_ACTIVITY_FIELD[profileType],
      profileType,
      source: profileType as ProfileDisplaySource,
      userId,
      isActive: true,
    };
  } catch (error) {
    console.error('[profileDisplayService] getProfileDisplayByType failed:', error);
    return null;
  }
};

// ============================================================================
// 레거시 호환 함수
// ============================================================================

/**
 * ProfileDisplayInfo -> LegacyDisplayInfo 변환
 * @deprecated 기존 코드 호환용, 신규 코드에서는 ProfileDisplayInfo 직접 사용 권장
 */
export const toLegacyDisplayInfo = (info: ProfileDisplayInfo): LegacyDisplayInfo => {
  // ProfileDisplaySource를 기존 DisplaySource로 매핑
  // 'artist' | 'creative' → 'partner', 'fan' → 'profile'
  let displaySource: LegacyDisplaySource = 'fallback';
  if (info.source === 'brand') {
    displaySource = 'brand';
  } else if (info.source === 'artist' || info.source === 'creative') {
    displaySource = 'partner';
  } else if (info.source === 'fan' || info.source === 'profile') {
    displaySource = 'profile';
  }

  return {
    displayName: info.name,
    displayAvatar: info.avatar,
    displayField: info.activityField,
    displayCategory: info.profileType,
    displaySource,
  };
};

/**
 * getDisplayInfoByUserId 호환 함수
 * @deprecated profileDisplayService.getProfileDisplay 사용 권장
 */
export const getDisplayInfoByUserId = async (
  userId?: string | null
): Promise<LegacyDisplayInfo> => {
  const info = await getProfileDisplay(userId);
  return toLegacyDisplayInfo(info);
};

/**
 * getDisplayInfoMap 호환 함수
 * @deprecated profileDisplayService.getProfileDisplayMap 사용 권장
 */
export const getDisplayInfoMap = async (
  userIds: Array<string | null | undefined>
): Promise<Map<string, LegacyDisplayInfo>> => {
  const infoMap = await getProfileDisplayMap(userIds);
  const legacyMap = new Map<string, LegacyDisplayInfo>();
  infoMap.forEach((info, id) => {
    legacyMap.set(id, toLegacyDisplayInfo(info));
  });
  return legacyMap;
};

/**
 * getVfanDisplayInfo 호환 함수 (Nonfan으로 이름 변경됨)
 * @deprecated getProfileDisplay 사용 권장
 */
export const getNonfanDisplayInfo = getProfileDisplay;

/**
 * getVfanDisplayInfoMap 호환 함수 (Nonfan으로 이름 변경됨)
 * @deprecated getProfileDisplayMap 사용 권장
 */
export const getNonfanDisplayInfoMap = getProfileDisplayMap;

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 프로필 타입에 따른 역할 레이블 반환
 */
export const getRoleLabel = (profileType: ProfileType): string => {
  switch (profileType) {
    case 'brand':
      return '브랜드';
    case 'artist':
      return '아티스트';
    case 'creative':
      return '크리에이티브';
    case 'fan':
      return '팬';
    case 'customer':
      return 'Customer';
    default:
      return '';
  }
};

/**
 * 활성 프로필 이름만 빠르게 조회 (이미지 불필요한 경우)
 */
export const getActiveProfileName = async (userId?: string | null): Promise<string> => {
  if (!userId) return '';

  try {
    // 브랜드 확인
    const { data: brandData } = await supabase
      .from('profile_brands')
      .select('brand_name')
      .eq('profile_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (brandData?.brand_name) return brandData.brand_name;

    // 아티스트 확인
    const { data: artistData } = await supabase
      .from('profile_artists')
      .select('artist_name')
      .eq('profile_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (artistData?.artist_name) return artistData.artist_name;

    // 크리에이티브 확인
    const { data: creativeData } = await supabase
      .from('profile_creatives')
      .select('nickname')
      .eq('profile_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (creativeData?.nickname) return creativeData.nickname;

    // 폴백: profiles.nickname
    const { data: profileData } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', userId)
      .maybeSingle();

    return profileData?.nickname || '';
  } catch (error) {
    console.error('[profileDisplayService] getActiveProfileName failed:', error);
    return '';
  }
};

/**
 * 배치 버전: 활성 프로필 이름 맵
 */
export const getActiveProfileNameMap = async (
  userIds: Array<string | null | undefined>
): Promise<Map<string, string>> => {
  const displayMap = await getProfileDisplayMap(userIds);
  const nameMap = new Map<string, string>();

  displayMap.forEach((info, id) => {
    nameMap.set(id, info.name);
  });

  return nameMap;
};

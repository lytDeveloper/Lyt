import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import type { ProfileRecordSummary, NonFanProfileSummary } from '../stores/profileStore';

/**
 * 현재 사용자의 프로필 데이터를 사전 로드
 * AuthProvider 초기화 시 한 번만 호출됨
 * profileStore를 fan/nonfan 프로필 요약 정보로 채움
 */
export async function preloadProfiles(userId: string): Promise<void> {
  try {
    console.log('[ProfilePreload] Starting profile preload for user:', userId);

    // 1. roles 조회 (어떤 프로필이 있는지 확인)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('roles, nickname')
      .eq('id', userId)
      .single();

    const activeRoles = Array.isArray(profileData?.roles) ? profileData.roles : [];
    const hasFan = activeRoles.includes('fan');
    const hasBrand = activeRoles.includes('brand');
    const hasArtist = activeRoles.includes('artist');
    const hasCreative = activeRoles.includes('creative');

    // 2. 활성 프로필만 병렬 조회 (불필요한 쿼리 방지)
    const [fanRes, brandRes, artistRes, creativeRes] = await Promise.all([
      hasFan
        ? supabase
            .from('profile_fans')
            .select('profile_id')
            .eq('profile_id', userId)
            .eq('is_active', true)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      hasBrand
        ? supabase
            .from('profile_brands')
            .select('profile_id, brand_name, approval_status')
            .eq('profile_id', userId)
            .eq('is_active', true)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      hasArtist
        ? supabase
            .from('profile_artists')
            .select('profile_id, artist_name')
            .eq('profile_id', userId)
            .eq('is_active', true)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      hasCreative
        ? supabase
            .from('profile_creatives')
            .select('profile_id, nickname')
            .eq('profile_id', userId)
            .eq('is_active', true)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    // 3. Fan 프로필 정리
    const fanNickname = typeof profileData?.nickname === 'string' ? profileData.nickname : undefined;
    const fanSummary: ProfileRecordSummary | null = fanRes.data
      ? { profile_id: fanRes.data.profile_id, nickname: fanNickname }
      : null;

    // 4. Non-fan 프로필 정리 (우선순위: brand > artist > creative)
    let nonfanSummary: NonFanProfileSummary | null = null;
    if (brandRes.data) {
      nonfanSummary = {
        type: 'brand',
        record: {
          profile_id: brandRes.data.profile_id,
          brand_name: brandRes.data.brand_name,
          approval_status: brandRes.data.approval_status,
        },
      };
    } else if (artistRes.data) {
      nonfanSummary = {
        type: 'artist',
        record: { profile_id: artistRes.data.profile_id, artist_name: artistRes.data.artist_name },
      };
    } else if (creativeRes.data) {
      nonfanSummary = {
        type: 'creative',
        record: { profile_id: creativeRes.data.profile_id, nickname: creativeRes.data.nickname },
      };
    }

    // 5. Store 업데이트 (동기 방식, 재렌더링 이슈 없음)
    useProfileStore.getState().setProfileSummary({
      userId,
      fan: fanSummary,
      nonfan: nonfanSummary,
    });

    // 6. 초기 활성 프로필이 비어있다면 기본 활성 프로필 설정
    const { type: currentType, profileId: currentProfileId, setActiveProfile } = useProfileStore.getState();
    if (!currentType || !currentProfileId) {
      if (nonfanSummary) {
        setActiveProfile({ type: nonfanSummary.type, profileId: nonfanSummary.record.profile_id });
      } else if (fanSummary) {
        setActiveProfile({ type: 'fan', profileId: fanSummary.profile_id });
      }
    }

    console.log('[ProfilePreload] Profile preload completed:', {
      fanSummary,
      nonfanSummary,
    });
  } catch (error) {
    console.error('[ProfilePreload] Error preloading profiles:', error);
    // 에러 발생 시에도 앱은 계속 동작 (throw 안 함)
  }
}

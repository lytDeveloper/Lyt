import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  useProfileStore,
  type ProfileType,
  type NonFanProfileSummary,
  type ProfileRecordSummary,
} from '../../stores/profileStore';
import { profileService } from '../../services/profileService';
interface ProfileSwitcherRenderProps {
  fan: ProfileRecordSummary | null;
  nonfan: NonFanProfileSummary | null;
  handleSelect: (type: ProfileType) => Promise<void>;
  handleCreate: () => void;
  fanImage: string | null;
  nonfanImage: string | null;
  close: () => void;
}

interface ProfileSwitcherProps {
  open: boolean;
  onClose: () => void;
  render?: (props: ProfileSwitcherRenderProps) => ReactNode;
}

export default function ProfileSwitcher({ open, onClose, render }: ProfileSwitcherProps) {
  const navigate = useNavigate();
  const {
    setActiveProfile,
    switchNonFanType,
    setProfileSummary,
    fanProfile,
    nonFanProfile,
    userId,
  } = useProfileStore();

  const hasPrefetchedRef = useRef(false);
  const lastFanProfileIdRef = useRef<string | null>(null);
  const lastNonfanKeyRef = useRef<string | null>(null);
  const [fanImage, setFanImage] = useState<string | null>(null);
  const [nonfanImage, setNonfanImage] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const uid = user?.id ?? null;
    if (!uid) {
      setProfileSummary({ userId: null, fan: null, nonfan: null });
      return;
    }

    // profiles.roles 배열을 먼저 확인하여 활성화된 프로필 파악
    const { data: profileData } = await supabase
      .from('profiles')
      .select('roles, nickname')
      .eq('id', uid)
      .single();

    const activeRoles = Array.isArray(profileData?.roles)
      ? (profileData.roles as string[])
      : [];
    const hasFan = activeRoles.includes('fan');
    const hasBrand = activeRoles.includes('brand');
    const hasArtist = activeRoles.includes('artist');
    const hasCreative = activeRoles.includes('creative');

    // 활성화된 프로필의 상세 정보만 조회 (불필요한 쿼리 제거)
    const [fanRes, brandRes, artistRes, creativeRes] = await Promise.all([
      hasFan
        ? supabase.from('profile_fans').select('profile_id').eq('profile_id', uid).eq('is_active', true).maybeSingle()
        : Promise.resolve({ data: null }),
      hasBrand
        ? supabase
          .from('profile_brands')
          .select('profile_id, brand_name, approval_status')
          .eq('profile_id', uid)
          .eq('is_active', true)
          .maybeSingle()
        : Promise.resolve({ data: null }),
      hasArtist
        ? supabase.from('profile_artists').select('profile_id, artist_name').eq('profile_id', uid).eq('is_active', true).maybeSingle()
        : Promise.resolve({ data: null }),
      hasCreative
        ? supabase.from('profile_creatives').select('profile_id, nickname').eq('profile_id', uid).eq('is_active', true).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const fanNickname = typeof profileData?.nickname === 'string' ? profileData.nickname : undefined;
    const fanSummary: ProfileRecordSummary | null = fanRes.data
      ? { profile_id: fanRes.data.profile_id, nickname: fanNickname }
      : null;

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

    setProfileSummary({
      userId: uid,
      fan: fanSummary,
      nonfan: nonfanSummary,
    });
  }, [setProfileSummary]);

  useEffect(() => {
    if (!hasPrefetchedRef.current && !fanProfile && !nonFanProfile) {
      hasPrefetchedRef.current = true;
      void loadProfiles();
    }
  }, [fanProfile, nonFanProfile, loadProfiles]);

  useEffect(() => {
    if (!open) return;
    if (!fanProfile && !nonFanProfile) {
      void loadProfiles();
    }
  }, [open, fanProfile, nonFanProfile, loadProfiles]);

  // Fetch profile images
  useEffect(() => {
    let cancelled = false;

    const preloadImage = async (url: string) => {
      try {
        const img = new Image();
        img.src = url;
        // decode()가 지원되면 paint 이전에 디코드까지 완료시켜 깜빡임 최소화
        if (typeof (img as unknown as { decode?: () => Promise<void> }).decode === 'function') {
          await (img as unknown as { decode: () => Promise<void> }).decode();
        }
      } catch {
        // ignore
      }
    };

    const fetchImages = async () => {
      // Fetch fan image (fan uses profile_image_url, not logo_image_url)
      if (fanProfile) {
        try {
          const fanId = fanProfile.profile_id;
          const shouldFetchFan = lastFanProfileIdRef.current !== fanId || fanImage === null;
          if (!shouldFetchFan) {
            // 이미 같은 프로필 이미지가 준비되어 있음
          } else {
          const profile = await profileService.getProfile(fanProfile.profile_id, 'fan');
          if (profile) {
            const url = profile.profile_image_url || null;
            if (url) await preloadImage(url);
            if (!cancelled) {
              lastFanProfileIdRef.current = fanId;
              setFanImage(url);
            }
          } else if (!cancelled) {
            lastFanProfileIdRef.current = fanId;
            setFanImage(null);
          }
          }
        } catch (error) {
          console.error('Error fetching fan image:', error);
          if (!cancelled) setFanImage(null);
        }
      } else {
        if (!cancelled) {
          lastFanProfileIdRef.current = null;
          setFanImage(null);
        }
      }

      // Fetch nonfan image
      if (nonFanProfile) {
        try {
          const nonfanKey = `${nonFanProfile.type}:${nonFanProfile.record.profile_id}`;
          const shouldFetchNonfan = lastNonfanKeyRef.current !== nonfanKey || nonfanImage === null;
          if (!shouldFetchNonfan) {
            // 이미 같은 프로필 이미지가 준비되어 있음
          } else {
          const profile = await profileService.getProfile(nonFanProfile.record.profile_id, nonFanProfile.type);
          if (profile) {
            let imageUrl: string | null = null;
            if (nonFanProfile.type === 'brand' || nonFanProfile.type === 'artist') {
              imageUrl = profile.logo_image_url || null;
            } else if (nonFanProfile.type === 'creative') {
              imageUrl = profile.profile_image_url || null;
            }
            if (imageUrl) await preloadImage(imageUrl);
            if (!cancelled) {
              lastNonfanKeyRef.current = nonfanKey;
              setNonfanImage(imageUrl);
            }
          } else if (!cancelled) {
            lastNonfanKeyRef.current = nonfanKey;
            setNonfanImage(null);
          }
          }
        } catch (error) {
          console.error('Error fetching nonfan image:', error);
          if (!cancelled) setNonfanImage(null);
        }
      } else {
        if (!cancelled) {
          lastNonfanKeyRef.current = null;
          setNonfanImage(null);
        }
      }
    };

    // 프리패치: open 여부와 무관하게 프로필이 있으면 미리 이미지 로드
    if (fanProfile || nonFanProfile) {
      void fetchImages();
    } else {
      // 둘 다 없으면 상태 초기화
      if (!cancelled) {
        lastFanProfileIdRef.current = null;
        lastNonfanKeyRef.current = null;
        setFanImage(null);
        setNonfanImage(null);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [fanProfile, nonFanProfile, fanImage, nonfanImage]);

  const handleSelect = async (type: ProfileType) => {
    if (type === nonFanProfile?.type) {
      setActiveProfile({ type, profileId: nonFanProfile.record.profile_id });
      onClose();
      return;
    }
    if (type === 'fan') {
      if (fanProfile) setActiveProfile({ type: 'fan', profileId: fanProfile.profile_id });
      onClose();
      return;
    }
    // 아래 분기는 다른 비팬 타입으로 전환할 때만 사용자 ID 필요
    if (!userId) return;
    // 다른 비팬 타입을 선택하는 경우 확인 모달
    const confirmed = window.confirm('기존 비팬 프로필을 비활성화하고 이 타입으로 전환하시겠어요?');
    if (!confirmed) return;
    await switchNonFanType(userId, type);
    // 전환 후 해당 온보딩으로 이동하여 생성/업데이트 유도
    if (type === 'brand') navigate('/onboarding/brand/name');
    if (type === 'artist') navigate('/onboarding/artist/name');
    if (type === 'creative') navigate('/onboarding/creative/image');
    onClose();
  };

  const handleCreate = () => {
    onClose();
    navigate('/onboarding/profile');
  };

  if (render) {
    if (!open) return null;
    return (
      <>
        {render({
          fan: fanProfile,
          nonfan: nonFanProfile,
          fanImage,
          nonfanImage,
          handleSelect,
          handleCreate,
          close: onClose,
        })}
      </>
    );
  }

  //const getRoleLabel = (type: ProfileType) => {
   // switch (type) {
  //    case 'brand': return '브랜드';
  //    case 'artist': return '아티스트';
  //    case 'creative': return '크리에이티브';
  //    case 'fan': return '팬';
  //    default: return '';
  //  }
  //};

 // const getNonfanName = () => {
 //   if (!nonFanProfile) return '';
 //   if (nonFanProfile.type === 'brand') return nonFanProfile.record.brand_name || '브랜드';
 //   if (nonFanProfile.type === 'artist') return nonFanProfile.record.artist_name || '아티스트';
 //   return nonFanProfile.record.nickname || '크리에이티브';
 // };

 // const activeProfileCount = (fanProfile ? 1 : 0) + (nonFanProfile ? 1 : 0);
  // 프로필이 없거나 1개만 있을 때 '프로필 만들기' 표시 (customer role 등 프로필 없는 경우 포함)
  //const showCreateProfile = activeProfileCount <= 1;

  return (
    <>
    </>
  );
}



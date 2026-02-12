import { useMemo } from 'react';
import { useProfileStore } from '../stores/profileStore';

type BrandApprovalStatus = 'pending' | 'approved' | 'rejected';

export function useBrandApprovalStatus() {
  const activeProfileType = useProfileStore((state) => state.type);
  const nonFanProfile = useProfileStore((state) => state.nonFanProfile);

  return useMemo(() => {
    // 활성 프로필이 브랜드이거나, 저장된 비팬 프로필이 브랜드인 경우 모두 브랜드로 간주
    const isBrandProfile =
      activeProfileType === 'brand' || nonFanProfile?.type === 'brand';

    const rawStatus =
      nonFanProfile?.type === 'brand'
        ? (nonFanProfile.record?.approval_status as BrandApprovalStatus | undefined)
        : undefined;

    // 브랜드 프로필인데 상태를 못 가져온 경우 보수적으로 pending 처리해 UI 차단
    const fallbackStatus: BrandApprovalStatus = isBrandProfile ? 'pending' : 'approved';
    const approvalStatus: BrandApprovalStatus = rawStatus ?? fallbackStatus;
    const isRestricted = isBrandProfile && approvalStatus !== 'approved';

    return {
      isBrandProfile,
      approvalStatus,
      isRestricted,
    };
  }, [activeProfileType, nonFanProfile]);
}






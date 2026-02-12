import { create } from 'zustand';
import { profileQueryService } from '../services/profileQueryService';

export type ProfileType = 'fan' | 'brand' | 'artist' | 'creative' | 'customer';

export interface ProfileRecordSummary {
  profile_id: string;
  nickname?: string;
  brand_name?: string;
  artist_name?: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
}

export interface NonFanProfileSummary {
  type: 'brand' | 'artist' | 'creative';
  record: ProfileRecordSummary;
}

export interface ActiveProfileContext {
  type: ProfileType | null;
  profileId: string | null; // 각 profile_*의 id
}

interface ProfileStoreState extends ActiveProfileContext {
  fanProfile: ProfileRecordSummary | null;
  nonFanProfile: NonFanProfileSummary | null;
  userId: string | null;
  setActiveProfile: (ctx: ActiveProfileContext) => void;
  setProfileSummary: (payload: {
    userId: string | null;
    fan: ProfileRecordSummary | null;
    nonfan: NonFanProfileSummary | null;
  }) => void;
  switchNonFanType: (userId: string, targetType: Exclude<ProfileType, 'fan'>) => Promise<void>;
}

export const useProfileStore = create<ProfileStoreState>((set) => ({
  type: null,
  profileId: null,
  fanProfile: null,
  nonFanProfile: null,
  userId: null,

  setActiveProfile: (ctx) => set(() => ({ type: ctx.type, profileId: ctx.profileId })),

  setProfileSummary: ({ userId, fan, nonfan }) =>
    set(() => ({
      userId,
      fanProfile: fan,
      nonFanProfile: nonfan,
    })),

  // 비팬 타입 전환 전 서버에서 기존 비팬 비활성화
  switchNonFanType: async (userId, targetType) => {
    await profileQueryService.switchNonFanType(userId, targetType);
  },
}));



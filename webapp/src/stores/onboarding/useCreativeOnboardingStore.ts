import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Creative onboarding store
 * Manages creative-specific onboarding data (4 steps)
 * Uses persist middleware to preserve data across app switches
 */

export interface SnsChannel {
  type: string;
  url: string;
  is_main: boolean;
}

interface CreativeOnboardingState {
  // Step 1: Profile Image, Nickname, Activity Field, Tags, Bio
  activityField: string;
  tags: string[];
  bio: string;

  // Step 2: SNS Channels
  snsChannels: SnsChannel[];

  // Step 3: Acquisition Source & Region
  acquisitionSource: string;
  region: string | null;

  // Actions
  setBasicInfo: (activityField: string, tags: string[], bio: string) => void;
  setSnsChannels: (channels: SnsChannel[]) => void;
  setAcquisitionSource: (source: string) => void;
  setRegion: (region: string | null) => void;
  resetCreative: () => void;
}

const initialState = {
  activityField: '',
  tags: [] as string[],
  bio: '',
  snsChannels: [] as SnsChannel[],
  acquisitionSource: '',
  region: null as string | null,
};

export const useCreativeOnboardingStore = create<CreativeOnboardingState>()(
  persist(
    (set) => ({
      ...initialState,

      setBasicInfo: (activityField, tags, bio) => set({ activityField, tags, bio }),

      setSnsChannels: (channels) => set({ snsChannels: channels }),

      setAcquisitionSource: (source) => set({ acquisitionSource: source }),

      setRegion: (region) => set({ region }),

      resetCreative: () => set(initialState),
    }),
    {
      name: 'creative-onboarding-storage',
    }
  )
);

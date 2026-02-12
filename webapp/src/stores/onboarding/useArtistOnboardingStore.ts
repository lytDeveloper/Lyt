import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Artist onboarding store
 * Manages artist-specific onboarding data (4 steps)
 * Uses persist middleware to preserve data across app switches
 */

interface ArtistOnboardingState {
  // Step 1: Basic Info
  artistName: string;
  activityField: string;
  tags: string[];

  // Step 2: Additional Info
  highlightKeywords: string[];
  bio: string;
  portfolioUrl: string;
  region: string | null;

  // Actions
  setBasicInfo: (artistName: string, activityField: string, tags: string[]) => void;
  setAdditionalInfo: (
    highlightKeywords: string[],
    bio: string,
    portfolioUrl: string,
    region: string | null
  ) => void;
  resetArtist: () => void;
}

const initialState = {
  artistName: '',
  activityField: '',
  tags: [] as string[],
  highlightKeywords: [] as string[],
  bio: '',
  portfolioUrl: '',
  region: null as string | null,
};

export const useArtistOnboardingStore = create<ArtistOnboardingState>()(
  persist(
    (set) => ({
      ...initialState,

      setBasicInfo: (artistName, activityField, tags) =>
        set({ artistName, activityField, tags }),

      setAdditionalInfo: (highlightKeywords, bio, portfolioUrl, region) =>
        set({ highlightKeywords, bio, portfolioUrl, region }),

      resetArtist: () => set(initialState),
    }),
    {
      name: 'artist-onboarding-storage',
    }
  )
);

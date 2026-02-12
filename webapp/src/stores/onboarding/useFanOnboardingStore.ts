import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Fan onboarding store
 * Manages fan-specific onboarding data (5 steps)
 * Uses persist middleware to preserve data across app switches
 */

interface FanOnboardingState {
  // Step 1: Interests
  interests: string[];

  // Step 2: Persona
  persona: string;

  // Step 3: Specific Interests
  specificInterests: string[];

  // Step 4: Preferred Regions
  preferredRegions: string[];

  // Step 5: Notification Preferences (in complete step)
  notificationPreferences: string[];

  // Actions
  setInterests: (interests: string[]) => void;
  setPersona: (persona: string) => void;
  setSpecificInterests: (specificInterests: string[]) => void;
  setPreferredRegions: (preferredRegions: string[]) => void;
  setNotificationPreferences: (notificationPreferences: string[]) => void;
  resetFan: () => void;
}

const initialState = {
  interests: [] as string[],
  persona: '',
  specificInterests: [] as string[],
  preferredRegions: [] as string[],
  notificationPreferences: [] as string[],
};

export const useFanOnboardingStore = create<FanOnboardingState>()(
  persist(
    (set) => ({
      ...initialState,

      setInterests: (interests) => set({ interests }),

      setPersona: (persona) => set({ persona }),

      setSpecificInterests: (specificInterests) => set({ specificInterests }),

      setPreferredRegions: (preferredRegions) => set({ preferredRegions }),

      setNotificationPreferences: (notificationPreferences) =>
        set({ notificationPreferences }),

      resetFan: () => set(initialState),
    }),
    {
      name: 'fan-onboarding-storage',
    }
  )
);

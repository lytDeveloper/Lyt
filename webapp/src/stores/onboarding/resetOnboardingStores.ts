import { useCommonOnboardingStore } from './useCommonOnboardingStore';
import { useBrandOnboardingStore } from './useBrandOnboardingStore';
import { useArtistOnboardingStore } from './useArtistOnboardingStore';
import { useCreativeOnboardingStore } from './useCreativeOnboardingStore';
import { useFanOnboardingStore } from './useFanOnboardingStore';

// localStorage keys for each persist store
const STORAGE_KEYS = [
  'common-onboarding-storage',
  'brand-onboarding-storage',
  'artist-onboarding-storage',
  'creative-onboarding-storage',
  'fan-onboarding-storage',
] as const;

/**
 * Resets all onboarding stores to their initial state
 * Also clears localStorage to ensure persisted data is removed
 */
export const resetAllOnboardingStores = () => {
  // Reset Zustand stores
  useCommonOnboardingStore.getState().resetCommon();
  useBrandOnboardingStore.getState().resetBrand();
  useArtistOnboardingStore.getState().resetArtist();
  useCreativeOnboardingStore.getState().resetCreative();
  useFanOnboardingStore.getState().resetFan();

  // Clear localStorage to remove persisted data
  STORAGE_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove ${key} from localStorage:`, error);
    }
  });
};

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Brand onboarding store
 * Manages brand-specific onboarding data (7 steps)
 * Uses persist middleware to preserve data across app switches
 */

interface BrandOnboardingState {
  // Step 1: Name
  brandName: string;
  description: string;
  businessRegistrationNumber: string;
  establishedAt: string; // YYYY-MM-DD

  // Step 2: Details
  activityField: string;
  targetAudiences: string[];
  preferredCreatorTypes: string[];

  // Step 3: Images (handled by common store)

  // Step 4: Collaboration
  collaborationTypes: string[];
  monthlyBudget: string;

  // Step 5: Business Info
  websiteUrl: string | null;
  snsChannel: string | null;
  contactInfo: string | null;
  region: string | null;
  // Actions
  setBrandName: (name: string) => void;
  setDescription: (description: string) => void;
  setDetails: (
    activityField: string,
    targetAudiences: string[],
    preferredCreatorTypes: string[]
  ) => void;
  setCollaboration: (collaborationTypes: string[], monthlyBudget: string) => void;
  setBusinessInfo: (
    websiteUrl: string | null,
    snsChannel: string | null,
    contactInfo: string | null,
    region: string | null
  ) => void;
  setBusinessRegistrationNumber: (businessRegistrationNumber: string) => void;
  setEstablishedAt: (date: string) => void;
  resetBrand: () => void;
}


const initialState = {
  brandName: '',
  description: '',
  activityField: '',
  targetAudiences: [] as string[],
  preferredCreatorTypes: [] as string[],
  collaborationTypes: [] as string[],
  monthlyBudget: '',
  businessRegistrationNumber: '',
  establishedAt: '',
  websiteUrl: null as string | null,
  snsChannel: null as string | null,
  contactInfo: null as string | null,
  region: null as string | null,
};

export const useBrandOnboardingStore = create<BrandOnboardingState>()(
  persist(
    (set) => ({
      ...initialState,

      setBrandName: (name) => set({ brandName: name }),
      setDescription: (description) => set({ description }),

      setDetails: (activityField, targetAudiences, preferredCreatorTypes) =>
        set({ activityField, targetAudiences, preferredCreatorTypes }),

      setCollaboration: (collaborationTypes, monthlyBudget) =>
        set({ collaborationTypes, monthlyBudget }),

      setBusinessInfo: (websiteUrl, snsChannel, contactInfo, region) =>
        set({ websiteUrl, snsChannel, contactInfo, region }),

      setBusinessRegistrationNumber: (businessRegistrationNumber) =>
        set({ businessRegistrationNumber }),

      setEstablishedAt: (date) => set({ establishedAt: date }),

      resetBrand: () => set(initialState),
    }),
    {
      name: 'brand-onboarding-storage',
    }
  )
);

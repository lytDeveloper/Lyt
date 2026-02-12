import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Common onboarding store
 * Shared state across all user types (brand, artist, creative, fan)
 * Uses persist middleware to preserve data across app switches
 * Note: File objects (coverFile, logoFile) are not persisted as they cannot be serialized
 */

interface CommonOnboardingState {
  // Shared fields
  nickname: string;
  coverFile: File | null;
  logoFile: File | null;
  /** Activity-field related keywords selected during onboarding */
  selectedKeywords: string[];

  // Actions
  setNickname: (nickname: string) => void;
  setImages: (coverFile: File | null, logoFile: File | null) => void;
  setCoverFile: (coverFile: File | null) => void;
  setLogoFile: (logoFile: File | null) => void;
  setSelectedKeywords: (keywords: string[]) => void;
  addSelectedKeyword: (keyword: string, options?: { max?: number }) => void;
  removeSelectedKeyword: (keyword: string) => void;
  clearSelectedKeywords: () => void;
  resetCommon: () => void;
}

const initialState = {
  nickname: '',
  coverFile: null as File | null,
  logoFile: null as File | null,
  selectedKeywords: [] as string[],
};

export const useCommonOnboardingStore = create<CommonOnboardingState>()(
  persist(
    (set) => ({
      ...initialState,

      setNickname: (nickname) => set({ nickname }),

      setImages: (coverFile, logoFile) => set({ coverFile, logoFile }),

      setCoverFile: (coverFile) => set({ coverFile }),

      setLogoFile: (logoFile) => set({ logoFile }),

      setSelectedKeywords: (keywords) =>
        set({
          selectedKeywords: (keywords || [])
            .map((k) => (k || '').trim().replace(/^#+/, ''))
            .filter(Boolean),
        }),

      addSelectedKeyword: (keyword, options) =>
        set((state) => {
          const normalized = (keyword || '').trim().replace(/^#+/, '');
          if (!normalized) return state;
          if (state.selectedKeywords.includes(normalized)) return state;

          const max = options?.max ?? 5;
          if (max > 0 && state.selectedKeywords.length >= max) return state;

          return { selectedKeywords: [...state.selectedKeywords, normalized] };
        }),

      removeSelectedKeyword: (keyword) =>
        set((state) => {
          const normalized = (keyword || '').trim().replace(/^#+/, '');
          return { selectedKeywords: state.selectedKeywords.filter((k) => k !== normalized) };
        }),

      clearSelectedKeywords: () => set({ selectedKeywords: [] }),

      resetCommon: () => set(initialState),
    }),
    {
      name: 'common-onboarding-storage',
      // Exclude File objects from persistence (they cannot be serialized)
      partialize: (state) => ({
        nickname: state.nickname,
        selectedKeywords: state.selectedKeywords,
        // coverFile and logoFile are intentionally excluded
      }),
    }
  )
);

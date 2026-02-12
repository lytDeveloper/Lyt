import { create } from 'zustand';

export type ProfileTab = 'overview' | 'reviews' | 'settings';

interface ProfileTabState {
    activeTab: ProfileTab;
    setActiveTab: (tab: ProfileTab) => void;
}

export const useProfileTabStore = create<ProfileTabState>((set) => ({
    activeTab: 'overview',
    setActiveTab: (tab) => set({ activeTab: tab }),
}));

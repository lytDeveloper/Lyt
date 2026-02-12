/**
 * Community Store
 *
 * Manages global state for community tab including:
 * - Active tab selection (all/project/collaboration)
 * - Category filtering
 * - Liked items (optimistic updates)
 *
 * Pattern: Follows exploreStore.ts architecture
 */

import { create } from 'zustand';
import type { CommunityTabKey } from '../types/community.types';

interface CommunityState {
  // UI State
  activeTab: CommunityTabKey;
  selectedCategory: string;

  // Social State (optimistic updates)
  likedItems: Set<string>;

  // Actions
  setActiveTab: (tab: CommunityTabKey) => void;
  setSelectedCategory: (category: string) => void;
  toggleLike: (itemId: string) => void;
  setLikedItems: (items: string[]) => void;
  isLiked: (itemId: string) => boolean;
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  // Initial state
  activeTab: 'all',
  selectedCategory: '전체',
  likedItems: new Set<string>(),

  // Tab management
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Category filtering
  setSelectedCategory: (category) => set({ selectedCategory: category }),

  // Like management (optimistic updates)
  toggleLike: (itemId) =>
    set((state) => {
      const newLiked = new Set(state.likedItems);
      if (newLiked.has(itemId)) {
        newLiked.delete(itemId);
      } else {
        newLiked.add(itemId);
      }
      return { likedItems: newLiked };
    }),

  setLikedItems: (items) => set({ likedItems: new Set(items) }),

  isLiked: (itemId) => get().likedItems.has(itemId),
}));

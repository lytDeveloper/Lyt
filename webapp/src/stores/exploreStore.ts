import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProjectCategory, ProjectStatus } from '../services/exploreService';
import { socialService, type LikeableEntityType } from '../services/socialService';
import { supabase } from '../lib/supabase';

// ActorInfo 타입 정의 (역할 스냅샷용)
export interface ActorInfo {
  role: 'fan' | 'brand' | 'artist' | 'creative';
  profileId: string;
  name: string;
  avatarUrl?: string;
}

export type ExploreTab = 'projects' | 'collaborations' | 'partners';

// LocalStorage keys (used as fallback when not logged in)
const LIKED_PROJECTS_KEY = 'likedProjects';
const LIKED_COLLABORATIONS_KEY = 'likedCollaborations';
const LIKED_PARTNERS_KEY = 'likedPartners';
const FOLLOWED_PARTNERS_KEY = 'followedPartners';

// Helper to load from localStorage
const loadFromStorage = (key: string): string[] => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Helper to save to localStorage
const saveToStorage = (key: string, ids: string[]): void => {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Silent fail if localStorage is unavailable
  }
};

interface ExploreState {
  // Active tab
  activeTab: ExploreTab;
  setActiveTab: (tab: ExploreTab) => void;

  // Search query
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Category filter
  selectedCategory: ProjectCategory | '전체';
  setSelectedCategory: (category: ProjectCategory | '전체') => void;

  // Status filter (multi-select)
  selectedStatuses: ProjectStatus[];
  toggleStatus: (status: ProjectStatus) => void;
  clearStatuses: () => void;

  // Artist-only filter (for Partners tab when navigating from Home)
  artistOnlyFilter: boolean;
  setArtistOnlyFilter: (value: boolean) => void;

  // Reset all filters
  resetFilters: () => void;

  // Liked projects
  likedProjectIds: string[];
  toggleLikeProject: (id: string) => void;
  isProjectLiked: (id: string) => boolean;

  // Liked collaborations
  likedCollaborationIds: string[];
  toggleLikeCollaboration: (id: string) => void;
  isCollaborationLiked: (id: string) => boolean;

  // Liked partners
  likedPartnerIds: string[];
  toggleLikePartner: (id: string, actorInfo?: ActorInfo) => void;
  isPartnerLiked: (id: string) => boolean;

  // Followed partners
  followedPartnerIds: string[];
  toggleFollowPartner: (id: string, actorInfo?: ActorInfo) => void;
  isPartnerFollowed: (id: string) => boolean;

  // Initialize likes/follows from DB
  initializeSocialData: () => Promise<void>;
  clearSocialState: () => void;
}

export const useExploreStore = create<ExploreState>()(
  persist(
    (set, get) => ({
  // Initial state
  activeTab: 'projects',
  searchQuery: '',
  selectedCategory: '전체',
  selectedStatuses: [],
  artistOnlyFilter: false,
  likedProjectIds: loadFromStorage(LIKED_PROJECTS_KEY),
  likedCollaborationIds: loadFromStorage(LIKED_COLLABORATIONS_KEY),
  likedPartnerIds: loadFromStorage(LIKED_PARTNERS_KEY),
  followedPartnerIds: loadFromStorage(FOLLOWED_PARTNERS_KEY),

  // Actions
  setActiveTab: (tab) => set({ activeTab: tab }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSelectedCategory: (category) => set({ selectedCategory: category }),

  toggleStatus: (status) =>
    set((state) => {
      const isSelected = state.selectedStatuses.includes(status);
      return {
        selectedStatuses: isSelected
          ? state.selectedStatuses.filter((s) => s !== status)
          : [...state.selectedStatuses, status],
      };
    }),

  clearStatuses: () => set({ selectedStatuses: [] }),

  setArtistOnlyFilter: (value) => set({ artistOnlyFilter: value }),

  resetFilters: () =>
    set({
      searchQuery: '',
      selectedCategory: '전체',
      selectedStatuses: [],
      artistOnlyFilter: false,
    }),

  // Initialize social data from DB
  initializeSocialData: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [likedProjects, likedCollabs, likedPartners, followedPartners] = await Promise.all([
        socialService.getLikedEntities(user.id, 'project'),
        socialService.getLikedEntities(user.id, 'collaboration'),
        socialService.getLikedEntities(user.id, 'partner'),
        socialService.getFollowedUsers(user.id), // Use correct function for follows
      ]);

      set({
        likedProjectIds: likedProjects,
        likedCollaborationIds: likedCollabs,
        likedPartnerIds: likedPartners,
        followedPartnerIds: followedPartners,
      });

      // Also update localStorage
      saveToStorage(LIKED_PROJECTS_KEY, likedProjects);
      saveToStorage(LIKED_COLLABORATIONS_KEY, likedCollabs);
      saveToStorage(LIKED_PARTNERS_KEY, likedPartners);
      saveToStorage(FOLLOWED_PARTNERS_KEY, followedPartners);
    } catch (error) {
      console.error('Failed to initialize social data:', error);
    }
  },
  clearSocialState: () => {
    set({
      likedProjectIds: [],
      likedCollaborationIds: [],
      likedPartnerIds: [],
      followedPartnerIds: [],
    });
    try {
      localStorage.removeItem(LIKED_PROJECTS_KEY);
      localStorage.removeItem(LIKED_COLLABORATIONS_KEY);
      localStorage.removeItem(LIKED_PARTNERS_KEY);
      localStorage.removeItem(FOLLOWED_PARTNERS_KEY);
    } catch {
      // Silent fail if localStorage is unavailable
    }
  },

  // Like functionality - Projects
  toggleLikeProject: (id) => {
    const state = get();
    const isLiked = state.likedProjectIds.includes(id);
    const newLikedIds = isLiked
      ? state.likedProjectIds.filter((likedId) => likedId !== id)
      : [...state.likedProjectIds, id];

    // Optimistic update
    set({ likedProjectIds: newLikedIds });
    saveToStorage(LIKED_PROJECTS_KEY, newLikedIds);

    // Persist to DB
    persistLikeToggle(id, 'project', isLiked);
  },

  isProjectLiked: (id) => get().likedProjectIds.includes(id),

  // Like functionality - Collaborations
  toggleLikeCollaboration: (id) => {
    const state = get();
    const isLiked = state.likedCollaborationIds.includes(id);
    const newLikedIds = isLiked
      ? state.likedCollaborationIds.filter((likedId) => likedId !== id)
      : [...state.likedCollaborationIds, id];

    // Optimistic update
    set({ likedCollaborationIds: newLikedIds });
    saveToStorage(LIKED_COLLABORATIONS_KEY, newLikedIds);

    // Persist to DB
    persistLikeToggle(id, 'collaboration', isLiked);
  },

  isCollaborationLiked: (id) => get().likedCollaborationIds.includes(id),

  // Like functionality - Partners
  toggleLikePartner: (id, actorInfo) => {
    const state = get();
    const isLiked = state.likedPartnerIds.includes(id);
    const newLikedIds = isLiked
      ? state.likedPartnerIds.filter((likedId) => likedId !== id)
      : [...state.likedPartnerIds, id];

    // Optimistic update
    set({ likedPartnerIds: newLikedIds });
    saveToStorage(LIKED_PARTNERS_KEY, newLikedIds);

    // Persist to DB
    persistLikeToggle(id, 'partner', isLiked, actorInfo);
  },

  isPartnerLiked: (id) => get().likedPartnerIds.includes(id),

  // Follow functionality - Partners (uses 'user' type with 'follow' preference_type)
  toggleFollowPartner: (id, actorInfo) => {
    const state = get();
    const isFollowed = state.followedPartnerIds.includes(id);
    const newFollowedIds = isFollowed
      ? state.followedPartnerIds.filter((followedId) => followedId !== id)
      : [...state.followedPartnerIds, id];

    // Optimistic update
    set({ followedPartnerIds: newFollowedIds });
    saveToStorage(FOLLOWED_PARTNERS_KEY, newFollowedIds);

    // Persist to DB
    persistFollowToggle(id, isFollowed, actorInfo);
  },

  isPartnerFollowed: (id) => get().followedPartnerIds.includes(id),
    }),
    {
      name: 'explore-store',
      partialize: (state) => ({
        // 필터 상태만 persist (좋아요/팔로우는 localStorage에 이미 저장됨)
        selectedCategory: state.selectedCategory,
        selectedStatuses: state.selectedStatuses,
        artistOnlyFilter: state.artistOnlyFilter,
      }),
    }
  )
);

// Helper function to persist like toggle to DB
async function persistLikeToggle(
  targetId: string,
  targetType: LikeableEntityType,
  wasLiked: boolean,
  actorInfo?: ActorInfo
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 자기 자신 좋아요 방지 (partner 타입인 경우)
    if (targetType === 'partner' && user.id === targetId) {
      console.warn('자기 자신을 좋아요할 수 없어요.');
      // 낙관적 업데이트 롤백
      const state = useExploreStore.getState();
      const revertedIds = wasLiked
        ? [...state.likedPartnerIds, targetId]
        : state.likedPartnerIds.filter((id) => id !== targetId);
      useExploreStore.setState({ likedPartnerIds: revertedIds });
      saveToStorage(LIKED_PARTNERS_KEY, revertedIds);
      return;
    }

    if (wasLiked) {
      await socialService.unlikeEntity(user.id, targetId, targetType);
    } else {
      await socialService.likeEntity(user.id, targetId, targetType, actorInfo);
    }
  } catch (error) {
    console.error('Failed to persist like toggle:', error);
    // Note: We don't revert the optimistic update here to avoid flickering
    // The data will be correct on next initialization
  }
}

// Helper function to persist follow toggle to DB
async function persistFollowToggle(
  targetUserId: string,
  wasFollowed: boolean,
  actorInfo?: ActorInfo
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 자기 자신 팔로우 방지
    if (user.id === targetUserId) {
      console.warn('자기 자신을 팔로우할 수 없어요.');
      // 낙관적 업데이트 롤백
      const state = useExploreStore.getState();
      const revertedIds = wasFollowed
        ? [...state.followedPartnerIds, targetUserId]
        : state.followedPartnerIds.filter((id) => id !== targetUserId);
      useExploreStore.setState({ followedPartnerIds: revertedIds });
      saveToStorage(FOLLOWED_PARTNERS_KEY, revertedIds);
      return;
    }

    if (wasFollowed) {
      await socialService.unfollowUser(user.id, targetUserId);
    } else {
      await socialService.followUser(user.id, targetUserId, actorInfo);
    }
  } catch (error) {
    console.error('Failed to persist follow toggle:', error);
    // Note: We don't revert the optimistic update here to avoid flickering
  }
}

import { create } from 'zustand';
import type { GroupedSearchResults } from '../types/search.types';

interface SearchState {
    // Search query
    query: string;
    setQuery: (query: string) => void;

    // Search results (cached)
    results: GroupedSearchResults;
    setResults: (results: GroupedSearchResults) => void;

    // Modal open state (synced with Header)
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;

    // Clear all state
    clear: () => void;
}

const EMPTY_RESULTS: GroupedSearchResults = {
    projects: [],
    partners: [],
    collaborations: [],
};

export const useSearchStore = create<SearchState>((set) => ({
    query: '',
    setQuery: (query) => set({ query }),

    results: EMPTY_RESULTS,
    setResults: (results) => set({ results }),

    isOpen: false,
    setIsOpen: (isOpen) => set({ isOpen }),

    clear: () => set({ query: '', results: EMPTY_RESULTS }),
}));

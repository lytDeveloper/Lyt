/**
 * Create Project Store
 * 프로젝트 생성 폼 데이터를 관리하는 Zustand 스토어
 */

import { create } from 'zustand';

interface CreateProjectState {
  // Step 1: 기본 정보
  title: string;
  category: string;
  description: string;
  goal: string;
  coverImage: File | null; // Added for Step 1
  requirements: string[];

  // Step 2: 조건
  budget: string;
  duration: string;
  capacity: number;
  startDate: string; // Added for Step 2
  endDate: string;   // Added for Step 2

  // Step 3: 스킬
  skills: string[];

  // Draft 프로젝트 ID
  draftProjectId: string | null;

  // Actions
  setStep1: (
    title: string,
    category: string,
    description: string,
    goal: string,
    coverImage?: File | null,
    requirements?: string[],
  ) => void;
  setStep2: (budget: string, duration: string, capacity: number, startDate?: string, endDate?: string) => void;
  setStep3: (skills: string[]) => void;
  setCapacity: (capacity: number) => void;
  setDraftProjectId: (id: string | null) => void;
  reset: () => void;
}

const initialState = {
  title: '',
  category: '',
  description: '',
  goal: '',
  coverImage: null,
  requirements: [],
  budget: '',
  duration: '',
  capacity: 1,
  startDate: '',
  endDate: '',
  skills: [],
  draftProjectId: null,
};

export const useCreateProjectStore = create<CreateProjectState>((set) => ({
  ...initialState,

  setStep1: (title, category, description, goal, coverImage = null, requirements = []) =>
    set({ title, category, description, goal, coverImage, requirements }),

  setStep2: (budget, duration, capacity, startDate = '', endDate = '') =>
    set({ budget, duration, capacity, startDate, endDate }),

  setStep3: (skills) =>
    set({ skills }),

  setCapacity: (capacity) =>
    set({ capacity }),

  setDraftProjectId: (id) =>
    set({ draftProjectId: id }),

  reset: () => set(() => ({ ...initialState })),
}));

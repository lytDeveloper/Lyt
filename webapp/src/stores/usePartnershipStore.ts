import { create } from 'zustand';

export interface PartnershipInquiryData {
    // Step 1
    companyName: string;
    contactName: string;
    email: string;
    phone: string;

    // Step 2
    projectType: string; // 프로젝트 유형 (브랜드 콜라보레이션, 제품 개발 등)
    budgetRange: string;
    duration: string;

    // Step 3
    description: string;
    goals: string;
    experience: string; // Collaboration experience (optional)
    files: File[]; // Attachments (optional)
}

interface PartnershipStore {
    step: number;
    data: PartnershipInquiryData;
    
    // Actions
    setStep: (step: number) => void;
    nextStep: () => void;
    prevStep: () => void;
    updateData: (data: Partial<PartnershipInquiryData>) => void;
    setFiles: (files: File[]) => void;
    reset: () => void;
}

const INITIAL_DATA: PartnershipInquiryData = {
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    projectType: '',
    budgetRange: '',
    duration: '',
    description: '',
    goals: '',
    experience: '',
    files: [],
};

export const usePartnershipStore = create<PartnershipStore>((set) => ({
    step: 1,
    data: INITIAL_DATA,

    setStep: (step) => set({ step }),
    nextStep: () => set((state) => ({ step: Math.min(state.step + 1, 3) })),
    prevStep: () => set((state) => ({ step: Math.max(state.step - 1, 1) })),
    updateData: (newData) => set((state) => ({ data: { ...state.data, ...newData } })),
    setFiles: (files) => set((state) => ({ data: { ...state.data, files } })),
    reset: () => set({ step: 1, data: INITIAL_DATA }),
}));


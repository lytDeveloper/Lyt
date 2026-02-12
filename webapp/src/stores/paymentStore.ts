import { create } from 'zustand';
import type { Order } from '../types/payment.types';

interface PaymentState {
  currentOrder: Order | null;
  lastError: string | null;
  setCurrentOrder: (order: Order | null) => void;
  setLastError: (error: string | null) => void;
  clear: () => void;
}

export const usePaymentStore = create<PaymentState>((set) => ({
  currentOrder: null,
  lastError: null,
  setCurrentOrder: (order) => set({ currentOrder: order }),
  setLastError: (error) => set({ lastError: error }),
  clear: () => set({ currentOrder: null, lastError: null }),
}));

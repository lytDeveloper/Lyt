import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceStoreState {
  /** 현재 온라인인 사용자 ID Set */
  onlineUsers: Set<string>;
  /** Presence 채널 참조 */
  channel: RealtimeChannel | null;
  /** 채널 연결 상태 */
  isConnected: boolean;

  /** 온라인 사용자 목록 전체 업데이트 */
  setOnlineUsers: (userIds: string[]) => void;
  /** 사용자 온라인 추가 */
  addOnlineUser: (userId: string) => void;
  /** 사용자 오프라인 제거 */
  removeOnlineUser: (userId: string) => void;
  /** 채널 참조 설정 */
  setChannel: (channel: RealtimeChannel | null) => void;
  /** 연결 상태 설정 */
  setIsConnected: (connected: boolean) => void;
  /** 스토어 초기화 */
  reset: () => void;
}

export const usePresenceStore = create<PresenceStoreState>((set) => ({
  onlineUsers: new Set<string>(),
  channel: null,
  isConnected: false,

  setOnlineUsers: (userIds) =>
    set(() => ({
      onlineUsers: new Set(userIds),
    })),

  addOnlineUser: (userId) =>
    set((state) => {
      const newSet = new Set(state.onlineUsers);
      newSet.add(userId);
      return { onlineUsers: newSet };
    }),

  removeOnlineUser: (userId) =>
    set((state) => {
      const newSet = new Set(state.onlineUsers);
      newSet.delete(userId);
      return { onlineUsers: newSet };
    }),

  setChannel: (channel) => set(() => ({ channel })),

  setIsConnected: (connected) => set(() => ({ isConnected: connected })),

  reset: () =>
    set(() => ({
      onlineUsers: new Set<string>(),
      channel: null,
      isConnected: false,
    })),
}));

/**
 * 특정 사용자가 온라인인지 확인하는 헬퍼 함수
 * 컴포넌트에서 직접 사용 가능
 */
export const isUserOnline = (userId: string): boolean => {
  return usePresenceStore.getState().onlineUsers.has(userId);
};

/**
 * 온라인 사용자 수 반환
 */
export const getOnlineUserCount = (): number => {
  return usePresenceStore.getState().onlineUsers.size;
};
























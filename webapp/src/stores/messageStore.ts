import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface MessageStoreState {
  /** 실시간 구독 채널 맵 (roomId -> channel) */
  subscriptionChannels: Map<string, RealtimeChannel>;
  /** 방별 읽음 상태 (roomId -> lastReadAt) */
  lastReadAtMap: Map<string, string>;
  /** 방별 새 메시지 수 (roomId -> count) */
  unreadCountMap: Map<string, number>;
  /** 구독 중인 방 ID Set */
  subscribedRooms: Set<string>;
  /** 현재 열려있는 채팅방 ID (알림 억제용) */
  currentRoomId: string | null;
  
  /** 구독 채널 추가 */
  addSubscriptionChannel: (roomId: string, channel: RealtimeChannel) => void;
  /** 구독 채널 제거 */
  removeSubscriptionChannel: (roomId: string) => void;
  /** 모든 구독 채널 정리 */
  clearAllChannels: () => void;
  
  /** 읽음 시간 업데이트 */
  setLastReadAt: (roomId: string, timestamp: string) => void;
  /** 읽음 시간 가져오기 */
  getLastReadAt: (roomId: string) => string | undefined;
  
  /** 새 메시지 수 증가 */
  incrementUnreadCount: (roomId: string) => void;
  /** 새 메시지 수 설정 */
  setUnreadCount: (roomId: string, count: number) => void;
  /** 새 메시지 수 초기화 (읽음 처리 시) */
  resetUnreadCount: (roomId: string) => void;
  /** 새 메시지 수 가져오기 */
  getUnreadCount: (roomId: string) => number;
  
  /** 구독 중인 방 추가 */
  addSubscribedRoom: (roomId: string) => void;
  /** 구독 중인 방 제거 */
  removeSubscribedRoom: (roomId: string) => void;
  /** 구독 중인지 확인 */
  isSubscribed: (roomId: string) => boolean;
  
  /** 현재 열려있는 채팅방 설정 */
  setCurrentRoomId: (roomId: string | null) => void;
  /** 현재 열려있는 채팅방 ID 가져오기 */
  getCurrentRoomId: () => string | null;
  
  /** 스토어 초기화 */
  reset: () => void;
}

export const useMessageStore = create<MessageStoreState>((set, get) => ({
  subscriptionChannels: new Map(),
  lastReadAtMap: new Map(),
  unreadCountMap: new Map(),
  subscribedRooms: new Set(),
  currentRoomId: null,

  addSubscriptionChannel: (roomId, channel) =>
    set((state) => {
      const newChannels = new Map(state.subscriptionChannels);
      // 기존 채널이 있으면 먼저 정리
      const existing = newChannels.get(roomId);
      if (existing) {
        existing.unsubscribe();
      }
      newChannels.set(roomId, channel);
      return { subscriptionChannels: newChannels };
    }),

  removeSubscriptionChannel: (roomId) =>
    set((state) => {
      const newChannels = new Map(state.subscriptionChannels);
      const channel = newChannels.get(roomId);
      if (channel) {
        channel.unsubscribe();
        newChannels.delete(roomId);
      }
      return { subscriptionChannels: newChannels };
    }),

  clearAllChannels: () =>
    set((state) => {
      // 모든 채널 정리
      state.subscriptionChannels.forEach((channel) => {
        channel.unsubscribe();
      });
      return {
        subscriptionChannels: new Map(),
        subscribedRooms: new Set(),
      };
    }),

  setLastReadAt: (roomId, timestamp) =>
    set((state) => {
      const newMap = new Map(state.lastReadAtMap);
      newMap.set(roomId, timestamp);
      return { lastReadAtMap: newMap };
    }),

  getLastReadAt: (roomId) => {
    return get().lastReadAtMap.get(roomId);
  },

  incrementUnreadCount: (roomId) =>
    set((state) => {
      const newMap = new Map(state.unreadCountMap);
      const current = newMap.get(roomId) || 0;
      newMap.set(roomId, current + 1);
      return { unreadCountMap: newMap };
    }),

  setUnreadCount: (roomId, count) =>
    set((state) => {
      const newMap = new Map(state.unreadCountMap);
      newMap.set(roomId, count);
      return { unreadCountMap: newMap };
    }),

  resetUnreadCount: (roomId) =>
    set((state) => {
      const newMap = new Map(state.unreadCountMap);
      newMap.set(roomId, 0);
      return { unreadCountMap: newMap };
    }),

  getUnreadCount: (roomId) => {
    return get().unreadCountMap.get(roomId) || 0;
  },

  addSubscribedRoom: (roomId) =>
    set((state) => {
      const newSet = new Set(state.subscribedRooms);
      newSet.add(roomId);
      return { subscribedRooms: newSet };
    }),

  removeSubscribedRoom: (roomId) =>
    set((state) => {
      const newSet = new Set(state.subscribedRooms);
      newSet.delete(roomId);
      return { subscribedRooms: newSet };
    }),

  isSubscribed: (roomId) => {
    return get().subscribedRooms.has(roomId);
  },

  setCurrentRoomId: (roomId) =>
    set(() => ({ currentRoomId: roomId })),

  getCurrentRoomId: () => {
    return get().currentRoomId;
  },

  reset: () =>
    set(() => {
      // 모든 채널 정리
      const state = get();
      state.subscriptionChannels.forEach((channel) => {
        channel.unsubscribe();
      });
      return {
        subscriptionChannels: new Map(),
        lastReadAtMap: new Map(),
        unreadCountMap: new Map(),
        subscribedRooms: new Set(),
        currentRoomId: null,
      };
    }),
}));

/**
 * 특정 방의 읽지 않은 메시지 수 가져오기
 */
export const getRoomUnreadCount = (roomId: string): number => {
  return useMessageStore.getState().getUnreadCount(roomId);
};

/**
 * 전체 읽지 않은 메시지 수 가져오기
 */
export const getTotalUnreadCount = (): number => {
  const state = useMessageStore.getState();
  let total = 0;
  state.unreadCountMap.forEach((count) => {
    total += count;
  });
  return total;
};

/**
 * 현재 열려있는 채팅방 ID 가져오기
 */
export const getCurrentRoomId = (): string | null => {
  return useMessageStore.getState().getCurrentRoomId();
};


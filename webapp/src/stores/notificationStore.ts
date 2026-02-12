import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface NotificationStoreState {
  /** 실시간 구독 채널 (userId -> channel) */
  subscriptionChannel: RealtimeChannel | null;
  /** 구독 중인지 여부 */
  isSubscribed: boolean;
  /** 전체 읽지 않은 알림 수 */
  unreadCount: number;
  
  /** 구독 채널 설정 */
  setSubscriptionChannel: (channel: RealtimeChannel | null) => void;
  /** 구독 상태 설정 */
  setIsSubscribed: (isSubscribed: boolean) => void;
  /** 읽지 않은 알림 수 설정 */
  setUnreadCount: (count: number) => void;
  /** 읽지 않은 알림 수 증가 */
  incrementUnreadCount: () => void;
  /** 읽지 않은 알림 수 감소 */
  decrementUnreadCount: () => void;
  /** 모든 구독 정리 */
  clearSubscription: () => void;
  /** 스토어 초기화 */
  reset: () => void;
}

export const useNotificationStore = create<NotificationStoreState>((set) => ({
  subscriptionChannel: null,
  isSubscribed: false,
  unreadCount: 0,

  setSubscriptionChannel: (channel) =>
    set(() => {
      // 채널 교체 시 기존 채널은 clearSubscription()에서만 정리
      // 자동 unsubscribe를 제거하여 다른 컴포넌트가 구독을 끊는 문제 방지
      return { subscriptionChannel: channel };
    }),

  setIsSubscribed: (isSubscribed) => set({ isSubscribed }),

  setUnreadCount: (count) => set({ unreadCount: count }),

  incrementUnreadCount: () =>
    set((state) => ({ unreadCount: state.unreadCount + 1 })),

  decrementUnreadCount: () =>
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),

  clearSubscription: () =>
    set((state) => {
      if (state.subscriptionChannel) {
        state.subscriptionChannel.unsubscribe();
      }
      return {
        subscriptionChannel: null,
        isSubscribed: false,
      };
    }),

  reset: () =>
    set((state) => {
      if (state.subscriptionChannel) {
        state.subscriptionChannel.unsubscribe();
      }
      return {
        subscriptionChannel: null,
        isSubscribed: false,
        unreadCount: 0,
      };
    }),
}));

/**
 * 전체 읽지 않은 알림 수 가져오기
 */
export const getTotalUnreadCount = (): number => {
  return useNotificationStore.getState().unreadCount;
};


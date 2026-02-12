/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { UserNotification } from '../types/userNotification';
import InAppNotificationBanner from '../components/notification/InAppNotificationBanner';
import { useNotificationRealtime } from '../hooks/useNotificationRealtime';
import { useAuth } from '../providers/AuthContext';
import { userNotificationService } from '../services/userNotificationService';
import { useMessageStore } from '../stores/messageStore';

interface InAppNotificationContextType {
  showNotification: (notification: UserNotification) => void;
}

const InAppNotificationContext = createContext<InAppNotificationContextType | undefined>(undefined);

export const useInAppNotification = () => {
  const context = useContext(InAppNotificationContext);
  if (!context) {
    throw new Error('useInAppNotification must be used within InAppNotificationProvider');
  }
  return context;
};

export const InAppNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notificationQueue, setNotificationQueue] = useState<UserNotification[]>([]);
  const [currentNotification, setCurrentNotification] = useState<UserNotification | null>(null);
  const { user } = useAuth();
  const lastShownNotificationIdRef = useRef<string | null>(null);

  const showNotification = useCallback((notification: UserNotification) => {
      // 중복 방지: 최근 표시한 알림과 동일한 ID면 무시
      if (lastShownNotificationIdRef.current === notification.id) {
        return;
      }

      // 메시지 알림이고, 현재 해당 채팅방에 있으면 배너 표시 안 함
      if (notification.type === 'message') {
        const currentRoomId = useMessageStore.getState().getCurrentRoomId();
        const messageRoomId = notification.relatedId || notification.activityId;
        if (currentRoomId && messageRoomId === currentRoomId) {
          return; // 큐에 추가하지 않음
        }
      }

      lastShownNotificationIdRef.current = notification.id;
      setNotificationQueue((prev) => [...prev, notification]);
  }, []);

  // 전역 실시간 알림 구독 (인앱 배너 표시 활성화)
  useNotificationRealtime(user?.id, !!user, showNotification);

  // 네이티브 푸시 fallback: PUSH_RECEIVED 이벤트 구독
  useEffect(() => {
    if (!user) return;

    const handlePushReceived = async (event: CustomEvent) => {
      const { title, body } = event.detail as { 
        data?: Record<string, unknown>; 
        title?: string | null; 
        body?: string | null;
      };

      try {
        // 최신 알림 1개 조회 (unread만, 최신순)
        const notifications = await userNotificationService.getUserNotifications(user.id, {
          isRead: false,
          limit: 1,
        });

        if (notifications.length > 0) {
          const latestNotification = notifications[0];
          // 중복 방지 체크
          if (lastShownNotificationIdRef.current !== latestNotification.id) {
            showNotification(latestNotification);
            console.log('[InAppNotificationProvider] Push fallback: showing notification', latestNotification.id);
          }
        } else if (title || body) {
          // 알림이 없지만 푸시 payload가 있으면 임시 알림 생성 (fallback)
          // 이 경우는 드물지만, realtime이 완전히 미스한 경우를 대비
          console.log('[InAppNotificationProvider] Push fallback: no notification found, payload available but skipping banner');
        }
      } catch (error) {
        console.error('[InAppNotificationProvider] Push fallback: error fetching notification', error);
      }
    };

    const eventHandler = handlePushReceived as unknown as EventListener;
    window.addEventListener('bridge:push-received', eventHandler);
    return () => {
      window.removeEventListener('bridge:push-received', eventHandler);
    };
  }, [user, showNotification]);

  // Process queue
  useEffect(() => {
    if (!currentNotification && notificationQueue.length > 0) {
      const nextNotification = notificationQueue[0];

      // 메시지 알림이고 현재 해당 채팅방에 있으면 스킵 (채팅방 이동 후 큐에 남은 알림 처리)
      if (nextNotification.type === 'message') {
        const currentRoomId = useMessageStore.getState().getCurrentRoomId();
        const messageRoomId = nextNotification.relatedId || nextNotification.activityId;
        if (currentRoomId && messageRoomId === currentRoomId) {
          // 큐에서 제거하고 다음 알림 처리
          setNotificationQueue((prev) => prev.slice(1));
          return;
        }
      }

      setCurrentNotification(nextNotification);
      setNotificationQueue((prev) => prev.slice(1));
    }
  }, [currentNotification, notificationQueue]);

  const handleClose = useCallback(() => {
    setCurrentNotification(null);
  }, []);

  const handleDismiss = useCallback(() => {
    setCurrentNotification(null);
  }, []);

  return (
    <InAppNotificationContext.Provider value={{ showNotification }}>
      {children}
      <InAppNotificationBanner
        notification={currentNotification}
        onClose={handleClose}
        onDismiss={handleDismiss}
      />
    </InAppNotificationContext.Provider>
  );
};


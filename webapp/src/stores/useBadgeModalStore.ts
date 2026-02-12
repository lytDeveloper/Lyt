import { create } from 'zustand';

export interface BadgeQueueItem {
  badgeId: string;
  badgeName: string;
  badgeIcon: string;
  badgeDescription: string;
}

interface BadgeModalStore {
  queue: BadgeQueueItem[];
  currentBadge: BadgeQueueItem | null;
  isOpen: boolean;

  addBadgeToQueue: (badge: BadgeQueueItem) => void;
  showNextBadge: () => void;
  closeModal: () => void;
  clearQueue: () => void;
}

export const useBadgeModalStore = create<BadgeModalStore>((set, get) => ({
  queue: [],
  currentBadge: null,
  isOpen: false,

  // 배지를 큐에 추가하고, 현재 모달이 닫혀있으면 즉시 표시
  addBadgeToQueue: (badge: BadgeQueueItem) => {
    const { isOpen, queue } = get();

    if (!isOpen) {
      // 모달이 닫혀있으면 즉시 표시
      set({
        currentBadge: badge,
        isOpen: true,
        queue: [],
      });
    } else {
      // 모달이 열려있으면 큐에 추가
      set({
        queue: [...queue, badge],
      });
    }
  },

  // 큐에서 다음 배지를 꺼내 표시
  showNextBadge: () => {
    const { queue } = get();

    if (queue.length > 0) {
      const [nextBadge, ...remainingQueue] = queue;
      set({
        currentBadge: nextBadge,
        isOpen: true,
        queue: remainingQueue,
      });
    } else {
      set({
        currentBadge: null,
        isOpen: false,
      });
    }
  },

  // 현재 모달 닫고 다음 배지가 있으면 자동으로 표시
  closeModal: () => {
    const { queue } = get();

    if (queue.length > 0) {
      // 다음 배지가 있으면 즉시 표시
      const [nextBadge, ...remainingQueue] = queue;
      set({
        currentBadge: nextBadge,
        isOpen: true,
        queue: remainingQueue,
      });
    } else {
      // 다음 배지가 없으면 모달 닫기
      set({
        currentBadge: null,
        isOpen: false,
      });
    }
  },

  // 큐 초기화 (긴급 상황용)
  clearQueue: () => {
    set({
      queue: [],
      currentBadge: null,
      isOpen: false,
    });
  },
}));

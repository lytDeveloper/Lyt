/**
 * 상태 칩 설정 - 프로젝트, 협업, 제안, 지원 등의 상태 표시에 사용
 */

export interface StatusChipConfig {
  label: string;
  bgcolor: string;
  color: string;
}

// 제안/지원/초대 상태
export const INTERACTION_STATUS_CONFIG: Record<string, StatusChipConfig> = {
  pending: { label: '대기중', bgcolor: '#EFF6FF', color: '#2563EB' },
  viewed: { label: '확인됨', bgcolor: '#F3F4F6', color: '#4B5563' },
  accepted: { label: '수락됨', bgcolor: '#ECFDF5', color: '#059669' },
  rejected: { label: '거절됨', bgcolor: '#FEF2F2', color: '#DC2626' },
  expired: { label: '만료됨', bgcolor: '#F3F4F6', color: '#4B5563' },
  withdrawn: { label: '철회됨', bgcolor: '#F3F4F6', color: '#4B5563' },
  cancelled: { label: '취소됨', bgcolor: '#F3F4F6', color: '#4B5563' },
  reviewed: { label: '검토됨', bgcolor: '#F3F4F6', color: '#4B5563' },
  shortlisted: { label: '관심', bgcolor: '#FEF3C7', color: '#D97706' },
};

// 프로젝트/협업 상태
export const ITEM_STATUS_CONFIG: Record<string, StatusChipConfig> = {
  draft: { label: '임시저장', bgcolor: '#FEF3C7', color: '#D97706' },
  open: { label: '모집중', bgcolor: '#EFF6FF', color: '#2563EB' },
  in_progress: { label: '진행중', bgcolor: '#ECFDF5', color: '#059669' },
  completed: { label: '완료', bgcolor: '#F3F4F6', color: '#4B5563' },
  cancelled: { label: '취소됨', bgcolor: '#FEF2F2', color: '#DC2626' },
  closed: { label: '마감', bgcolor: '#F3F4F6', color: '#4B5563' },
};

// 기본 상태 (폴백용)
export const DEFAULT_STATUS_CONFIG: StatusChipConfig = {
  label: '알 수 없음',
  bgcolor: '#F3F4F6',
  color: '#4B5563',
};

/**
 * 상태에 따른 칩 설정 반환
 */
export function getInteractionStatusConfig(status: string): StatusChipConfig {
  return INTERACTION_STATUS_CONFIG[status] || DEFAULT_STATUS_CONFIG;
}

export function getItemStatusConfig(status: string): StatusChipConfig {
  return ITEM_STATUS_CONFIG[status] || DEFAULT_STATUS_CONFIG;
}

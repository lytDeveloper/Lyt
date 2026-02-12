import { Box } from '@mui/material';
import { useIsUserOnline } from '../../hooks/usePresence';

export type OnlineIndicatorSize = 'small' | 'medium' | 'large';

interface OnlineIndicatorProps {
  /** 확인할 사용자 ID */
  userId: string | null;
  /** 인디케이터 크기 */
  size?: OnlineIndicatorSize;
  /** 항상 표시할지 여부 (false면 온라인일 때만 표시) */
  showOffline?: boolean;
  /** 커스텀 위치 스타일 (absolute positioning에 사용) */
  position?: {
    bottom?: number | string;
    right?: number | string;
    top?: number | string;
    left?: number | string;
  };
}

const SIZE_MAP: Record<OnlineIndicatorSize, number> = {
  small: 8,
  medium: 12,
  large: 16,
};

const BORDER_WIDTH_MAP: Record<OnlineIndicatorSize, number> = {
  small: 1.5,
  medium: 2,
  large: 2.5,
};

/**
 * 온라인 상태 인디케이터 컴포넌트
 * 
 * 프로필 이미지 옆에 초록색(온라인)/회색(오프라인) 원을 표시합니다.
 * 
 * @example
 * // 기본 사용법 - 프로필 이미지와 함께
 * <Box sx={{ position: 'relative' }}>
 *   <Avatar src={profileUrl} />
 *   <OnlineIndicator userId={userId} />
 * </Box>
 * 
 * @example
 * // 커스텀 위치
 * <OnlineIndicator 
 *   userId={userId} 
 *   position={{ bottom: 0, right: 0 }} 
 * />
 */
export default function OnlineIndicator({
  userId,
  size = 'medium',
  showOffline = true,
  position = { bottom: 0, right: 0 },
}: OnlineIndicatorProps) {
  const isOnline = useIsUserOnline(userId);

  // 오프라인이고 showOffline이 false면 렌더링하지 않음
  if (!isOnline && !showOffline) {
    return null;
  }

  const indicatorSize = SIZE_MAP[size];
  const borderWidth = BORDER_WIDTH_MAP[size];

  return (
    <Box
      sx={{
        position: 'absolute',
        ...position,
        width: indicatorSize,
        height: indicatorSize,
        borderRadius: '50%',
        backgroundColor: isOnline ? '#22C55E' : '#9CA3AF', // 초록색 / 회색
        border: `${borderWidth}px solid #fff`,
        boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.1)',
        transition: 'background-color 0.2s ease',
        zIndex: 1,
      }}
      aria-label={isOnline ? '온라인' : '오프라인'}
    />
  );
}

/**
 * Avatar와 함께 사용하기 쉬운 래퍼 컴포넌트
 */
interface OnlineAvatarWrapperProps {
  children: React.ReactNode;
  userId: string | null;
  size?: OnlineIndicatorSize;
  showOffline?: boolean;
}

export function OnlineAvatarWrapper({
  children,
  userId,
  size = 'medium',
  showOffline = true,
}: OnlineAvatarWrapperProps) {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      {children}
      <OnlineIndicator
        userId={userId}
        size={size}
        showOffline={showOffline}
        position={{ bottom: 0, right: 0 }}
      />
    </Box>
  );
}

/**
 * 인라인 상태 텍스트 (옵션)
 * "온라인" / "오프라인" 텍스트를 인디케이터와 함께 표시
 */
interface OnlineStatusTextProps {
  userId: string | null;
  size?: OnlineIndicatorSize;
  showText?: boolean;
}

export function OnlineStatusText({
  userId,
  size = 'small',
  showText = true,
}: OnlineStatusTextProps) {
  const isOnline = useIsUserOnline(userId);
  const indicatorSize = SIZE_MAP[size];

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
      }}
    >
      <Box
        sx={{
          width: indicatorSize,
          height: indicatorSize,
          borderRadius: '50%',
          backgroundColor: isOnline ? '#22C55E' : '#9CA3AF',
          flexShrink: 0,
        }}
      />
      {showText && (
        <Box
          component="span"
          sx={{
            fontSize: 12,
            fontFamily: 'Pretendard, sans-serif',
            fontWeight: 400,
            color: isOnline ? '#22C55E' : '#9CA3AF',
          }}
        >
          {isOnline ? '온라인' : '오프라인'}
        </Box>
      )}
    </Box>
  );
}
























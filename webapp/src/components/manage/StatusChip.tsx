import { Chip } from '@mui/material';
import {
  getInteractionStatusConfig,
  getItemStatusConfig,
  type StatusChipConfig,
} from '../../constants/statusConfig';

interface StatusChipProps {
  status: string;
  type: 'interaction' | 'item';
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  clickable?: boolean;
}

/**
 * 상태 표시 칩 컴포넌트
 * - interaction: 제안/지원/초대 상태
 * - item: 프로젝트/협업 상태
 */
export default function StatusChip({
  status,
  type,
  onClick,
  clickable = false,
}: StatusChipProps) {
  const config: StatusChipConfig =
    type === 'interaction'
      ? getInteractionStatusConfig(status)
      : getItemStatusConfig(status);

  return (
    <Chip
      label={config.label}
      size="small"
      onClick={onClick}
      sx={{
        bgcolor: config.bgcolor,
        color: config.color,
        fontWeight: 600,
        height: 24,
        fontSize: 11,
        cursor: clickable ? 'pointer' : 'default',
      }}
    />
  );
}

import { Menu, MenuItem, Box, useTheme, type Theme } from '@mui/material';
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';
import { STATUS_LABELS } from '../../constants/projectConstants';
import type { ProjectStatus } from '../../types/exploreTypes';

interface StatusDropdownMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  currentStatus: ProjectStatus;
  onSelect: (status: ProjectStatus) => void;
  excludeStatuses?: ProjectStatus[]; // ManageAll: ['deleted'], ArchivePage: []
}

// 상태별 색상 매핑
const getStatusColors = (status: ProjectStatus, theme: Theme) => {
  switch (status) {
    case 'open':
      return {
        bg: theme.palette.bgColor?.green || '#F0FFF5',
        color: theme.palette.status?.green || '#16A34A',
      };
    case 'in_progress':
      return {
        bg: theme.palette.bgColor?.blue || '#ECFDF5',
        color: '#60A5FA', // 하늘색으로 변경
      };
    case 'completed':
      return {
        bg: theme.palette.icon?.default || '#2563EB',
        color: '#2563EB', // 진한 파란색으로 변경 (기존 진행중 색상)
      };
    case 'draft':
      return {
        bg: '#FFEDED',
        color: '#DC2626',
      };
    case 'cancelled':
      return {
        bg: '#FEF2F2',
        color: '#EF4444',
      };
    case 'on_hold':
      return {
        bg: '#FEF3C7',
        color: '#D97706',
      };
    case 'deleted':
      return {
        bg: '#F3F4F6',
        color: '#6B7280',
      };
    default:
      return {
        bg: '#F3F4F6',
        color: '#4B5563',
      };
  }
};

/**
 * 커스텀 상태 드롭다운 메뉴
 * - 둥근 모서리, 부드러운 그림자
 * - 선택된 항목에 체크 표시
 * - 상태별 색상 적용
 */
export default function StatusDropdownMenu({
  anchorEl,
  open,
  onClose,
  currentStatus,
  onSelect,
  excludeStatuses = [],
}: StatusDropdownMenuProps) {
  const theme = useTheme();

  // 표시할 상태 목록 필터링
  const visibleStatuses = Object.entries(STATUS_LABELS).filter(
    ([status]) => !excludeStatuses.includes(status as ProjectStatus)
  );

  const handleSelect = (status: ProjectStatus) => {
    if (status !== currentStatus) {
      onSelect(status);
    }
    onClose();
  };

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      keepMounted // DOM에 항상 유지하여 앵커 참조 안정화
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: {
          sx: {
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            minWidth: 140,
            mt: 0.5,
            '& .MuiList-root': {
              py: 0.5,
            },
          },
        },
      }}
    >
      {visibleStatuses.map(([status, label]) => {
        const statusKey = status as ProjectStatus;
        const isSelected = statusKey === currentStatus;
        const colors = getStatusColors(statusKey, theme);

        return (
          <MenuItem
            key={status}
            onClick={() => handleSelect(statusKey)}
            sx={{
              py: 1,
              px: 1.5,
              mx: 0.5,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              minHeight: 36,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* 상태 색상 점 */}
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: colors.color,
                  flexShrink: 0,
                }}
              />
              <Box
                component="span"
                sx={{
                  fontSize: 13,
                  fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? theme.palette.text.primary : theme.palette.text.secondary,
                }}
              >
                {label}
              </Box>
            </Box>
            {/* 선택된 항목에 체크 표시 */}
            {isSelected && (
              <CheckOutlinedIcon
                sx={{
                  fontSize: 16,
                  color: theme.palette.primary.main,
                }}
              />
            )}
          </MenuItem>
        );
      })}
    </Menu>
  );
}

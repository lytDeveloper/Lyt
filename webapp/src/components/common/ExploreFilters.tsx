import { Box, Typography, Chip, useTheme } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import type { ProjectCategory, ProjectStatus } from '../../types/exploreTypes';
import { CATEGORY_LABELS, STATUS_LABELS } from '../../constants/projectConstants';

import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import WindowOutlinedIcon from '@mui/icons-material/WindowOutlined';
import WindowIcon from '@mui/icons-material/Window';
import CheckroomRoundedIcon from '@mui/icons-material/CheckroomRounded';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import HeadphonesOutlinedIcon from '@mui/icons-material/HeadphonesOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import StorefrontIcon from '@mui/icons-material/Storefront';
import CelebrationOutlinedIcon from '@mui/icons-material/CelebrationOutlined';
import CelebrationIcon from '@mui/icons-material/Celebration';
import DoorbellOutlinedIcon from '@mui/icons-material/DoorbellOutlined';
import DoorbellIcon from '@mui/icons-material/Doorbell';
import ShopOutlinedIcon from '@mui/icons-material/ShopOutlined';
import ShopIcon from '@mui/icons-material/Shop';
import DesktopWindowsOutlinedIcon from '@mui/icons-material/DesktopWindowsOutlined';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import SavingsIcon from '@mui/icons-material/Savings';

export { ConfirmationNumberOutlinedIcon, ConfirmationNumberIcon, FavoriteBorderRoundedIcon, FavoriteRoundedIcon, ViewInArOutlinedIcon, ViewInArIcon, WindowOutlinedIcon, WindowIcon, CheckroomRoundedIcon, CheckroomIcon, HeadphonesIcon, HeadphonesOutlinedIcon, AutoAwesomeOutlinedIcon, AutoAwesomeIcon, StorefrontOutlinedIcon, StorefrontIcon, CelebrationOutlinedIcon, CelebrationIcon, DoorbellOutlinedIcon, DoorbellIcon, ShopOutlinedIcon, ShopIcon, DesktopWindowsOutlinedIcon, DesktopWindowsIcon, SavingsOutlinedIcon, SavingsIcon };

// Status Badge Component
interface StatusBadgeProps {
  status: ProjectStatus;
  label: string;
  isSelected: boolean;
  onClick: () => void;
}

const StatusBadge = ({ label, isSelected, onClick }: StatusBadgeProps) => {
  const theme = useTheme();

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <Box
        sx={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          backgroundColor: isSelected ? theme.palette.primary.main : theme.palette.divider,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isSelected && (
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: theme.palette.primary.contrastText,
            }}
          />
        )}
      </Box>
      <Typography
        sx={{
          fontFamily: 'Pretendard, sans-serif',
          fontSize: 12,
          fontWeight: 600,
          color: theme.palette.text.primary,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
};

// Main Component
interface ExploreFiltersProps {
  categories: Array<ProjectCategory | '전체'>;
  statuses: ProjectStatus[];
  selectedCategory: ProjectCategory | '전체';
  selectedStatuses: ProjectStatus[];
  onCategoryChange: (category: ProjectCategory | '전체') => void;
  onStatusToggle: (status: ProjectStatus) => void;
  showStatuses?: boolean;
}

type CategoryOption = ProjectCategory | '전체';

const CATEGORY_ICONS: Record<CategoryOption, SvgIconComponent> = {
  '전체': WindowOutlinedIcon,
  music: HeadphonesOutlinedIcon,
  fashion: CheckroomRoundedIcon,
  beauty: AutoAwesomeOutlinedIcon,
  contents: ViewInArOutlinedIcon,
  healing: FavoriteBorderRoundedIcon,
  market: StorefrontOutlinedIcon,
  event: CelebrationOutlinedIcon,
  ticket: ConfirmationNumberOutlinedIcon,
  tech: DesktopWindowsOutlinedIcon,
  life: DoorbellOutlinedIcon,
  liveShopping: ShopOutlinedIcon,
  Investment: SavingsOutlinedIcon,
};

const CATEGORY_ICONS_FILLED: Record<CategoryOption, SvgIconComponent> = {
  '전체': WindowIcon,
  music: HeadphonesIcon,
  fashion: CheckroomIcon, // Using Checkroom as filled/default
  beauty: AutoAwesomeIcon,
  contents: ViewInArIcon,
  healing: FavoriteRoundedIcon,
  market: StorefrontIcon,
  event: CelebrationIcon,
  ticket: ConfirmationNumberIcon,
  tech: DesktopWindowsIcon,
  life: DoorbellIcon,
  liveShopping: ShopIcon,
  Investment: SavingsIcon,
};

export default function ExploreFilters({
  categories,
  statuses,
  selectedCategory,
  selectedStatuses,
  onCategoryChange,
  onStatusToggle,
  showStatuses = true,
}: ExploreFiltersProps) {
  const theme = useTheme();

  return (
    <Box sx={{ mb: 2.5 }}>
      {/* Category Filter Chips */}
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          overflowX: 'auto',
          mb: showStatuses ? 2 : 0.5,
          pb: 0.5,
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        }}
      >
        {categories.map((category: CategoryOption) => {
          const isSelected = selectedCategory === category;
          // 선택 여부에 따라 아이콘 결정
          const IconComponent = isSelected
            ? CATEGORY_ICONS_FILLED[category as CategoryOption]
            : CATEGORY_ICONS[category as CategoryOption];

          // Display Korean label for UI
          const displayLabel = category === '전체' ? '전체' : CATEGORY_LABELS[category as ProjectCategory];
          const chipBg = isSelected ? theme.palette.primary.main : theme.palette.background.paper;
          return (
            <Chip
              key={category}
              label={displayLabel}
              onClick={() => {
                if (isSelected && category !== '전체') {
                  onCategoryChange('전체');
                } else {
                  onCategoryChange(category);
                }
              }}
              icon={
                IconComponent ? (
                  <IconComponent
                    sx={{
                      fontSize: 18,
                    }}
                  />
                ) : undefined
              }
              sx={{
                height: 32,
                borderRadius: '9999px',
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 12,
                fontWeight: 600,
                backgroundColor: chipBg,
                color: isSelected ? theme.palette.primary.contrastText : theme.palette.subText.default,
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:focus': {
                  backgroundColor: chipBg,
                },
                '&.MuiChip-clickable:hover': {
                  backgroundColor: chipBg,
                },
                '& .MuiChip-icon': {
                  marginLeft: 1,
                  marginRight: -1,
                  color: isSelected ? theme.palette.primary.contrastText : theme.palette.subText.default,
                },
                '& .MuiChip-label': {
                  px: 1.5,
                },
              }}
            />
          );
        })}
      </Box>

      {/* Status Filter */}
      {showStatuses && (
        <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'center', justifyContent: 'flex-end', }}>
          {statuses.map((status) => (
            <StatusBadge
              key={status}
              status={status}
              label={STATUS_LABELS[status]}
              isSelected={selectedStatuses.includes(status)}
              onClick={() => onStatusToggle(status)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

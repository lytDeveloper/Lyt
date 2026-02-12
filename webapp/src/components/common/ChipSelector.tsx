import { Box, Chip, styled, type SxProps, type Theme } from '@mui/material';

// Styled Components
export const ChipGroup = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(1),
  marginTop: theme.spacing(1.5),
}));

export const StyledChip = styled(Chip)<{ selected?: boolean }>(({ theme, selected }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 14,
  lineHeight: 1.4,
  fontWeight: 400,
  height: 38,
  paddingLeft: theme.spacing(1.5),
  paddingRight: theme.spacing(1.5),
  borderRadius: '100px',
  // border: `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
  backgroundColor: selected ? theme.palette.primary.main : theme.palette.grey[100],
  color: selected ? theme.palette.primary.contrastText : theme.palette.text.primary,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&.MuiChip-clickable:hover': {
    backgroundColor: selected ? theme.palette.primary.main : theme.palette.grey[100],
  },
  '&:focus': {
    backgroundColor: selected ? theme.palette.primary.main : theme.palette.grey[100],
  },
  '& .MuiChip-label': {
    padding: 0,
    paddingRight: theme.spacing(0.5),
  },
  '& .MuiChip-deleteIcon': {
    margin: 0,
    marginLeft: theme.spacing(0.5),
  },
  [theme.breakpoints.up('sm')]: {
    fontSize: 13,
    height: 36,
  },
}));

// Component Props
export interface ChipSelectorProps {
  /** Available options to display as chips */
  options: string[];

  /** Currently selected options */
  selected: string[];

  /** Callback when a chip is clicked/toggled */
  onToggle: (option: string) => void;

  /** Whether to show delete icon on selected chips */
  showDelete?: boolean;

  /** Maximum number of selections allowed */
  maxSelection?: number;

  /** Custom container styles */
  sx?: SxProps<Theme>;
}

/**
 * Reusable chip selector component for multi-select UI
 * Supports click to toggle and optional delete icon
 *
 * @example
 * ```tsx
 * const { selected, toggle } = useMultiSelect([], { maxSelection: 3 });
 *
 * <ChipSelector
 *   options={['Option 1', 'Option 2', 'Option 3']}
 *   selected={selected}
 *   onToggle={toggle}
 *   showDelete
 * />
 * ```
 */
export default function ChipSelector({
  options,
  selected,
  onToggle,
  showDelete = false,
  maxSelection,
  sx
}: ChipSelectorProps) {
  const handleChipClick = (option: string) => {
    onToggle(option);
  };

  const handleChipDelete = (option: string) => {
    if (selected.includes(option)) {
      onToggle(option);
    }
  };

  return (
    <ChipGroup sx={sx}>
      {options.map((option) => {
        const isSelected = selected.includes(option);
        const isDisabled = !isSelected && maxSelection !== undefined && selected.length >= maxSelection;

        return (
          <StyledChip
            key={option}
            label={option}
            selected={isSelected}
            onClick={() => !isDisabled && handleChipClick(option)}
            onDelete={showDelete && isSelected ? () => handleChipDelete(option) : undefined}
            disabled={isDisabled}
            sx={{
              opacity: isDisabled ? 0.5 : 1,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              width: '30%',
            }}
          />
        );
      })}
    </ChipGroup>
  );
}

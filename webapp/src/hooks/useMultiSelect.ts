import { useState, useCallback, useEffect } from 'react';

export interface UseMultiSelectOptions {
  /** Initial selection */
  initial?: string[];

  /** Maximum number of items that can be selected */
  max?: number;

  /** Minimum number of items that must be selected */
  min?: number;

  /** Callback when selection changes */
  onChange?: (selected: string[]) => void;
}

export interface UseMultiSelectReturn {
  /** Currently selected items */
  selected: string[];

  /** Toggle an item's selection state */
  toggle: (item: string) => void;

  /** Check if an item is selected */
  isSelected: (item: string) => boolean;

  /** Add an item to selection */
  add: (item: string) => void;

  /** Remove an item from selection */
  remove: (item: string) => void;

  /** Clear all selections */
  clear: () => void;

  /** Set the entire selection array */
  setSelected: (items: string[]) => void;

  /** Check if selection is valid (meets min/max requirements) */
  isValid: boolean;

  /** Check if max selection limit has been reached */
  isMaxReached: boolean;
}

/**
 * Custom hook for managing multi-select state (e.g., chips, tags, checkboxes)
 * Handles selection logic with optional min/max constraints
 *
 * @example
 * ```tsx
 * const { selected, toggle, isSelected, isValid } = useMultiSelect({
 *   initial: ['item1'],
 *   max: 3,
 *   min: 1,
 *   onChange: (items) => console.log('Selected:', items)
 * });
 *
 * // In component
 * {items.map(item => (
 *   <Chip
 *     key={item}
 *     selected={isSelected(item)}
 *     onClick={() => toggle(item)}
 *   />
 * ))}
 * ```
 */
export function useMultiSelect(
  options: UseMultiSelectOptions = {}
): UseMultiSelectReturn {
  const {
    initial = [],
    max: maxSelection,
    min: minSelection = 0,
    onChange
  } = options;

  const [selected, setSelected] = useState<string[]>(initial);

  // Sync selected state when initial prop changes
  useEffect(() => {
    setSelected(initial);
  }, [initial]);

  const toggle = useCallback((item: string) => {
    setSelected((prev) => {
      const isCurrentlySelected = prev.includes(item);

      if (isCurrentlySelected) {
        // Remove item
        const newSelection = prev.filter((i) => i !== item);
        onChange?.(newSelection);
        return newSelection;
      } else {
        // Add item only if max limit not reached
        if (maxSelection !== undefined && prev.length >= maxSelection) {
          return prev;
        }
        const newSelection = [...prev, item];
        onChange?.(newSelection);
        return newSelection;
      }
    });
  }, [maxSelection, onChange]);

  const isSelected = useCallback((item: string) => {
    return selected.includes(item);
  }, [selected]);

  const add = useCallback((item: string) => {
    if (selected.includes(item)) return;

    if (maxSelection !== undefined && selected.length >= maxSelection) {
      return;
    }

    const newSelection = [...selected, item];
    setSelected(newSelection);
    onChange?.(newSelection);
  }, [selected, maxSelection, onChange]);

  const remove = useCallback((item: string) => {
    const newSelection = selected.filter((i) => i !== item);
    setSelected(newSelection);
    onChange?.(newSelection);
  }, [selected, onChange]);

  const clear = useCallback(() => {
    setSelected([]);
    onChange?.([]);
  }, [onChange]);

  const handleSetSelected = useCallback((items: string[]) => {
    // Enforce max selection limit if provided
    const limitedItems = maxSelection !== undefined
      ? items.slice(0, maxSelection)
      : items;

    setSelected(limitedItems);
    onChange?.(limitedItems);
  }, [maxSelection, onChange]);

  const isValid = selected.length >= minSelection &&
    (maxSelection === undefined || selected.length <= maxSelection);

  const isMaxReached = maxSelection !== undefined && selected.length >= maxSelection;

  return {
    selected,
    toggle,
    isSelected,
    add,
    remove,
    clear,
    setSelected: handleSetSelected,
    isValid,
    isMaxReached
  };
}

/**
 * TagChipList Component
 *
 * Displays tags as chips with # prefix
 */

import { Box, Chip } from '@mui/material';

interface Props {
  tags: string[];
}

export default function TagChipList({ tags }: Props) {
  const safeTags = tags || []; // Defensive

  if (safeTags.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
      {safeTags.map((tag, idx) => (
        <Chip
          key={idx}
          label={`#${tag}`}
          size="small"
          sx={{
            backgroundColor: '#f3f4f6',
            color: '#6b7280',
            fontSize: 12,
            height: 28,
            '& .MuiChip-label': {
              padding: '0 12px',
            },
          }}
        />
      ))}
    </Box>
  );
}

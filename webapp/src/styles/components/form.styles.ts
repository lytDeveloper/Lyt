import { styled, TextField, Button, Box } from '@mui/material';

/**
 * Form Components (non-onboarding)
 * Used by: ExploreFilters, SearchBar, ApplicationModal, ReviewerNoteInput
 */

// Search input
export const SearchInput = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: theme.palette.background.paper,
    borderRadius: '12px',
    fontFamily: 'Pretendard, sans-serif',
    fontSize: 14,
    '& fieldset': {
      borderColor: theme.palette.divider,
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
      borderWidth: '2px',
    },
  },
  '& .MuiOutlinedInput-input': {
    padding: '10px 14px',
  },
}));

// Filter button (active state)
export const FilterButton = styled(Button)<{ active?: boolean }>(
  ({ theme, active }) => ({
    borderRadius: '8px',
    padding: '6px 12px',
    backgroundColor: active
      ? theme.palette.primary.main
      : theme.palette.background.paper,
    color: active
      ? theme.palette.primary.contrastText
      : theme.palette.text.primary,
    textTransform: 'none',
    fontSize: 13,
    fontFamily: 'Pretendard, sans-serif',
    fontWeight: 500,
    border: `1px solid ${active ? theme.palette.primary.main : theme.palette.divider}`,
    minWidth: 'auto',
  })
);

// Filter container
export const FilterContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  flexWrap: 'wrap',
  marginBottom: theme.spacing(2),
}));

// Text input (for forms)
export const FormTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: theme.palette.background.paper,
    borderRadius: '8px',
    fontFamily: 'Pretendard, sans-serif',
    fontSize: 14,
    '& fieldset': {
      borderColor: theme.palette.divider,
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
      borderWidth: '2px',
    },
  },
}));

// Textarea (multiline)
export const FormTextarea = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: theme.palette.background.paper,
    borderRadius: '8px',
    fontFamily: 'Pretendard, sans-serif',
    fontSize: 14,
    lineHeight: 1.5,
    '& fieldset': {
      borderColor: theme.palette.divider,
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
      borderWidth: '2px',
    },
  },
}));

// Primary button
export const PrimaryButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  borderRadius: '8px',
  padding: '10px 20px',
  fontSize: 14,
  fontWeight: 600,
  fontFamily: 'Pretendard, sans-serif',
  textTransform: 'none',
  boxShadow: 'none',
  '&:disabled': {
    backgroundColor: theme.palette.grey[100],
    color: theme.palette.text.secondary,
  },
}));

// Secondary button
export const SecondaryButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  borderRadius: '8px',
  padding: '10px 20px',
  fontSize: 14,
  fontWeight: 600,
  fontFamily: 'Pretendard, sans-serif',
  textTransform: 'none',
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: 'none',
}));

// Outlined button
export const OutlinedButton = styled(Button)(({ theme }) => ({
  backgroundColor: 'transparent',
  color: theme.palette.primary.main,
  borderRadius: '8px',
  padding: '10px 20px',
  fontSize: 14,
  fontWeight: 600,
  fontFamily: 'Pretendard, sans-serif',
  textTransform: 'none',
  border: `1px solid ${theme.palette.primary.main}`,
  boxShadow: 'none',
}));

// Danger button
export const DangerButton = styled(Button)({
  backgroundColor: '#DC2626',
  color: '#ffffff',
  borderRadius: '8px',
  padding: '10px 20px',
  fontSize: 14,
  fontWeight: 600,
  fontFamily: 'Pretendard, sans-serif',
  textTransform: 'none',
  boxShadow: 'none',
});

// Form label
export const FormLabel = styled(Box)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 13,
  fontWeight: 500,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(0.5),
}));

// Form helper text
export const FormHelperText = styled(Box)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 12,
  fontWeight: 400,
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
}));

// Form error text
export const FormErrorText = styled(Box)({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 12,
  fontWeight: 400,
  color: '#DC2626',
  marginTop: '4px',
});

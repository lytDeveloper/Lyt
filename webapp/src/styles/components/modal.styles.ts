import { styled, Box, Typography, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { alpha } from '@mui/material/styles';

/**
 * Modal/Dialog Components
 * Used by: ActionResultModal, ReasonModal, ConfirmDialog, FileUploadModal,
 * SearchModal, ProposalDetailModal, ApplicationDetailModal, etc.
 */

// Styled Dialog with backdrop
export const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiBackdrop-root': {
    backgroundColor: alpha(theme.palette.common.black, 0.5),
    backdropFilter: 'blur(6px)',
  },
  '& .MuiDialog-paper': {
    borderRadius: '16px',
    padding: 0,
    maxWidth: '480px',
    width: '90%',
    margin: theme.spacing(2),
  },
}));

// Modal paper container (for custom modals)
export const ModalPaper = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: '16px',
  padding: theme.spacing(3),
  maxWidth: 480,
  width: '90%',
  margin: '0 auto',
  boxShadow: theme.shadows[24],
}));

// Modal title
export const ModalTitle = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 18,
  fontWeight: 600,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(1),
}));

// Modal description/subtitle
export const ModalDescription = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 14,
  fontWeight: 400,
  color: theme.palette.text.secondary,
  lineHeight: 1.5,
  marginBottom: theme.spacing(3),
}));

// Modal content area
export const ModalContent = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
}));

// Modal actions container
export const ModalActions = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  justifyContent: 'flex-end',
  marginTop: theme.spacing(3),
}));

// Styled DialogTitle
export const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 18,
  fontWeight: 600,
  color: theme.palette.text.primary,
  padding: theme.spacing(3),
  paddingBottom: theme.spacing(2),
}));

// Styled DialogContent
export const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  padding: theme.spacing(0, 3),
  color: theme.palette.text.primary,
  fontFamily: 'Pretendard, sans-serif',
}));

// Styled DialogActions
export const StyledDialogActions = styled(DialogActions)(({ theme }) => ({
  padding: theme.spacing(2, 3, 3, 3),
  gap: theme.spacing(1),
}));

// Modal section (for organizing content)
export const ModalSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  '&:last-child': {
    marginBottom: 0,
  },
}));

// Modal section title
export const ModalSectionTitle = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 14,
  fontWeight: 600,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(1),
}));

// Full screen modal container
export const FullScreenModalContainer = styled(Box)(({ theme }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: theme.palette.background.default,
  zIndex: theme.zIndex.modal,
  overflowY: 'auto',
}));

// Close button container (top-right)
export const CloseButtonContainer = styled(Box)({
  position: 'absolute',
  top: 16,
  right: 16,
});

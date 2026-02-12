import { styled, Box, Typography } from '@mui/material';

/**
 * Workflow Components
 * Used by: WorkflowSteps, WorkflowCard, ProgressBar, CreateProjectProgressBar
 */

// Workflow step container
export const WorkflowStepContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1.5),
  alignItems: 'flex-start',
  marginBottom: theme.spacing(1.5),
  '&:last-child': {
    marginBottom: 0,
  },
}));

// Step number circle (completed vs pending)
export const StepNumber = styled(Box)<{ completed?: boolean }>(
  ({ theme, completed }) => ({
    width: 24,
    height: 24,
    borderRadius: '50%',
    backgroundColor: completed
      ? theme.palette.primary.main
      : theme.palette.grey[100],
    color: completed
      ? theme.palette.primary.contrastText
      : theme.palette.text.secondary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'Pretendard, sans-serif',
    flexShrink: 0,
  })
);

// Step content
export const StepContent = styled(Box)({
  flex: 1,
  overflow: 'hidden',
});

// Step title
export const StepTitle = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 13,
  fontWeight: 500,
  color: theme.palette.text.primary,
  lineHeight: 1.4,
}));

// Step description
export const StepDescription = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 12,
  fontWeight: 400,
  color: theme.palette.text.secondary,
  lineHeight: 1.4,
  marginTop: '2px',
}));

// Progress bar container
export const ProgressBarContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  height: 6,
  borderRadius: '3px',
  backgroundColor: theme.palette.grey[100],
  overflow: 'hidden',
  position: 'relative',
}));

// Progress bar fill
export const ProgressBarFill = styled(Box)(({ theme }) => ({
  height: '100%',
  backgroundColor: theme.palette.primary.main,
  transition: 'width 0.3s ease',
  borderRadius: '3px',
}));

// Progress bar label
export const ProgressBarLabel = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 12,
  fontWeight: 500,
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
  textAlign: 'right',
}));

// Workflow card container
export const WorkflowCard = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: '12px',
  padding: theme.spacing(2),
  border: `1px solid ${theme.palette.divider}`,
  marginBottom: theme.spacing(2),
}));

// Workflow header
export const WorkflowHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(2),
}));

// Workflow title
export const WorkflowTitle = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 15,
  fontWeight: 600,
  color: theme.palette.text.primary,
}));

// Completion badge
export const CompletionBadge = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.action.selected,
  color: theme.palette.primary.main,
  padding: '4px 10px',
  borderRadius: '12px',
  fontSize: 11,
  fontWeight: 600,
  fontFamily: 'Pretendard, sans-serif',
}));

// Step connector line
export const StepConnector = styled(Box)(({ theme }) => ({
  width: 2,
  height: '100%',
  backgroundColor: theme.palette.divider,
  marginLeft: 11,
  marginTop: 4,
  marginBottom: 4,
}));

// Vertical step container (with connector)
export const VerticalStepContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
});

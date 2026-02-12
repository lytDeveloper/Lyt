import { Box, Typography, useTheme } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { WorkflowStep } from '../../services/exploreService';
import TripOriginIcon from '@mui/icons-material/TripOrigin';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import { formatDate } from '../../utils/formatters';

interface WorkflowCardProps {
  step: WorkflowStep;
  onClick: () => void;
  isMember?: boolean;
}

export default function WorkflowCard({ step, onClick, isMember = false }: WorkflowCardProps) {
  const theme = useTheme();

  const handleClick = () => {
    if (isMember) {
      onClick();
    }
  };

  return (
    <Box
      onClick={handleClick}
      sx={{
        width: '100%',
        backgroundColor: theme.palette.background.paper,
        borderRadius: '12px',
        p: 2,
        cursor: isMember ? 'pointer' : 'default',
        transition: 'all 0.2s',
        opacity: isMember ? 1 : 0.6,
      }}
    >
      {/* Row 1: Status Dot + Name + Arrow */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mb: 1,
        }}
      >
        {/* Status Dot */}
        <Box
          sx={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            color: step.isCompleted ? theme.palette.status.Success : theme.palette.status.default,
            backgroundColor: step.isCompleted ? 'none' : `${theme.palette.status.default}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 1.5,
            flexShrink: 0,
          }}
        >
          {step.isCompleted && (
            <TripOriginIcon
              sx={{
                fontSize: 18,
              }}
            />
          )}
        </Box>

        {/* Step Name */}
        <Typography
          sx={{
            fontFamily: 'Pretendard, sans-serif',
            fontSize: 14,
            fontWeight: 500,
            color: theme.palette.text.primary,
            flex: 1,
          }}
        >
          {step.name}
        </Typography>

        {/* Arrow */}
        <ChevronRightIcon
          sx={{
            fontSize: 20,
            color: theme.palette.text.secondary,
            flexShrink: 0,
          }}
        />
      </Box>

      {/* Row 2: Detail */}
      <Typography
        sx={{
          fontFamily: 'Pretendard, sans-serif',
          fontSize: 14,
          color: theme.palette.text.secondary,
          mb: 1,
          lineHeight: 1.5,
          pl: 4,
        }}
      >
        {step.detail}
      </Typography>

      {/* Row 3: Person in Charge + Deadline */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          pl: 3.7,
        }}
      >
        {/* Person in Charge */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          {/* <PersonIcon
            sx={{
              fontSize: 14,
              color: theme.palette.text.secondary,
            }}
          /> */}
          <PeopleAltOutlinedIcon sx={{ fontSize: 12, color: theme.palette.icon.default }} />
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 12,
              color: theme.palette.text.secondary,
            }}
          >
            {step.personInCharge}
          </Typography>
        </Box>

        {/* Deadline */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          {/* <EventIcon
            sx={{
              fontSize: 14,
              color: theme.palette.text.secondary,
            }}
          /> */}
          <CalendarMonthOutlinedIcon sx={{ fontSize: 12, color: theme.palette.icon.default }} />
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 12,
              color: theme.palette.text.secondary,
            }}
          >
            {formatDate(step.deadline)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

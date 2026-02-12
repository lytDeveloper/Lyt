import { styled, Box, Typography } from '@mui/material';

/**
 * Card Components
 * Used by: ProjectCard, CollaborationCard, PartnerCard, ApplicationCard,
 * ProposalCard, InvitationCard, TeamMemberCard, FileCard, ReviewCard
 */

// Base card wrapper - Most reused pattern
export const Card = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 1px 1px rgba(0,0,0,0.1)',
  padding: theme.spacing(2),
  cursor: 'pointer',
  transition: 'box-shadow 0.2s',
}));

// Card with border (used in Manage components)
export const CardWithBorder = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: '16px',
  border: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  boxShadow: 'none',
}));

// Cover image container with size variants
export const CoverImage = styled(Box)<{ size?: 'small' | 'medium' | 'large' }>(
  ({ size = 'medium' }) => ({
    width: size === 'small' ? 60 : size === 'medium' ? 80 : 120,
    height: size === 'small' ? 60 : size === 'medium' ? 80 : 120,
    flexShrink: 0,
    borderRadius: '8px',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundColor: '#E9E9ED',  // Fallback color (keep hard-coded)
  })
);

// Profile image circle
export const ProfileImage = styled(Box)<{ size?: 'small' | 'medium' | 'large' }>(
  ({ size = 'medium' }) => ({
    width: size === 'small' ? 40 : size === 'medium' ? 48 : 64,
    height: size === 'small' ? 40 : size === 'medium' ? 48 : 64,
    flexShrink: 0,
    borderRadius: '50%',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundColor: '#E9E9ED',  // Fallback color (keep hard-coded)
  })
);

// Card info section (flex container)
export const CardInfoSection = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  overflow: 'hidden',
});

// Card title (appears in every card)
export const CardTitle = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 13.5,
  fontWeight: 600,
  color: theme.palette.text.primary,
  lineHeight: 1.3,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
}));

// Card subtitle (category, field, etc.)
export const CardSubtitle = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 12,
  fontWeight: 500,
  color: theme.palette.text.secondary,
  lineHeight: 1.4,
}));

// Card description
export const CardDescription = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 12,
  fontWeight: 400,
  color: theme.palette.text.secondary,
  lineHeight: 1.4,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
}));

// Card header (with title and optional action)
export const CardHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(1.5),
}));

// Card footer (for actions/meta info)
export const CardFooter = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: theme.spacing(1.5),
  paddingTop: theme.spacing(1.5),
  borderTop: `1px solid ${theme.palette.divider}`,
}));

// Team member section in cards
export const TeamMemberSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginTop: theme.spacing(1),
}));

// Tag container
export const TagContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(0.5),
  marginTop: theme.spacing(1),
}));

// Single tag chip
export const Tag = styled(Box)(({ theme }) => ({
  padding: '2px 8px',
  borderRadius: '4px',
  backgroundColor: theme.palette.grey[100],
  color: theme.palette.text.secondary,
  fontSize: 11,
  fontWeight: 500,
  fontFamily: 'Pretendard, sans-serif',
}));

/**
 * BrandPartnerInfoCard Component
 *
 * Displays brand/partner information with:
 * - Logo/avatar (borderRadius 15px)
 * - Name and category/field
 * - Follow/Unfollow chip button
 */

import { Box, Avatar, Typography, Chip, styled } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { useAuth } from '../../providers/AuthContext';

const CardContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: 16,
  backgroundColor: theme.palette.background.paper,
  borderRadius: 15,
  marginBottom: 16,
}));

const FollowChip = styled(Chip)({
  fontWeight: 500,
  height: 26,
  borderRadius: 999,
  boxShadow: 'none',
  fontSize: 14,
});

interface Props {
  info: {
    name: string;
    logoUrl: string;
    primary: string;
    secondary?: string;
  };
  isFollowed: boolean;
  onFollowToggle: () => void;
  sx?: SxProps<Theme>;
  creatorId?: string; // 생성자 ID (자기 자신이면 팔로우 버튼 숨김)
}

export default function BrandPartnerInfoCard({ info, isFollowed, onFollowToggle, sx, creatorId }: Props) {
  const { user } = useAuth();

  // 자기 자신인지 확인 (자기 프로필에는 팔로우 버튼 숨김)
  const isSelf = creatorId && user?.id === creatorId;
  return (
    <CardContainer sx={sx}>
      <Avatar
        src={info.logoUrl || undefined}
        sx={{
          width: 48,
          height: 48,
          borderRadius: 2, // 15px equivalent
        }}
      >
        {info.name.charAt(0)}
      </Avatar>

      <Box sx={{ ml: 2, flex: 1 }}>
        <Typography variant="body1" fontWeight={700}>
          {info.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {info.primary}
        </Typography>
        {/* {info.secondary && (
          <Typography variant="caption" color="text.secondary">
            {info.secondary}
          </Typography>
        )} */}
      </Box>

      {!isSelf && (
        <FollowChip
          label={isFollowed ? '팔로잉' : '+팔로우'}
          onClick={onFollowToggle}
          sx={{
            bgcolor: isFollowed ? 'grey.100' : 'primary.main',
            color: isFollowed ? 'text.primary' : 'primary.contrastText',
            '&:focus': {
              bgcolor: isFollowed ? 'grey.100' : 'primary.main',
            },
            '&:hover': {
              bgcolor: isFollowed ? 'grey.100' : 'primary.main',
            },
          }}
        />
      )}
    </CardContainer>
  );
}

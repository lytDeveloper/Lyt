/**
 * TeamMembersSection Component
 *
 * Displays team members with:
 * - Up to 4 overlapping avatars
 * - Total member count text
 */

import { Box, Avatar, AvatarGroup, Typography, useTheme } from '@mui/material';

interface Member {
  id: string;
  name: string;
  profileImageUrl: string;
}

interface Props {
  members: Member[];
}

export default function TeamMembersSection({ members }: Props) {
  const theme = useTheme();
  const safeMembers = members || []; // Defensive
  const displayMembers = safeMembers.slice(0, 4);
  const totalCount = safeMembers.length;
  const remainingCount = totalCount - displayMembers.length;

  if (totalCount === 0) return null;

  return (
    <Box sx={{
      mb: 3,
      px: 3,
      py: 2,
      backgroundColor: theme.palette.grey[100],
      borderRadius: '12px',
    }}>
      <Typography
        sx={{
          fontFamily: 'Pretendard, sans-serif',
          fontSize: 14,
          fontWeight: 500,
          color: '#111827',
          mb: 2,
        }}
      >
        참여중인 파트너
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { marginLeft: '-8px' } }}>
          {displayMembers.map((member) => (
            <Avatar
              key={member.id}
              src={member.profileImageUrl || undefined}
              sx={{ width: 36, height: 36 }}
            >
              {member.name.charAt(0)}
            </Avatar>
          ))}
        </AvatarGroup>

        <Typography
          sx={{
            fontFamily: 'Pretendard, sans-serif',
            fontSize: 14,
            color: '#4B5563',
          }}
        >
          {remainingCount > 0 && <span>외</span>}
          <span style={{ fontWeight: 700 }}>{remainingCount > 0 ? remainingCount : totalCount}</span>명이 참여중이에요.
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * CommunityDetailCover Component
 *
 * Cover image section for community detail page with:
 * - Responsive image (343px width @ 393px screen, 256px height)
 * - Box shadow (right/bottom)
 * - Like button overlay (top right)
 */

import { Box, IconButton, styled, useTheme } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';

const CoverSection = styled(Box)({
  width: '100%',
  maxWidth: '100%',
  height: 256,
  margin: '0 auto 24px',
  borderRadius: 12,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  position: 'relative',
  boxShadow: '4px 4px 12px rgba(0,0,0,0.15)', // Right/bottom shadow
});

interface Props {
  imageUrl: string;
  isLiked: boolean;
  onLikeToggle: () => void;
}

export default function CommunityDetailCover({ imageUrl, isLiked, onLikeToggle }: Props) {
  const theme = useTheme();
  return (
    <CoverSection
      sx={{
        backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
        backgroundColor: imageUrl ? 'transparent' : '#E9E9ED',
      }}
    >
      {/* Like Button - Top Right */}
      <IconButton
        sx={{
          width: '25px',
          height: '25px',
          position: 'absolute',
          top: 16,
          right: 16,
          bgcolor: theme.palette.transparent.white,
          border: `1px solid ${theme.palette.transparent.white}`,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onLikeToggle();
        }}
      >
        {isLiked ? (
          <FavoriteIcon sx={{ color: theme.palette.status.red, fontSize: 16 }} />
        ) : (
          <FavoriteBorderIcon sx={{ color: theme.palette.icon.default, fontSize: 16 }} />
        )}
      </IconButton>
    </CoverSection>
  );
}

import { Box, keyframes } from '@mui/material';

interface LightningLoaderProps {
  /** Size of the loader in pixels (default: 40) */
  size?: number;
  /** Color of the loader (default: #2563EB) */
  color?: string;
}

// Keyframes for the heartbeat animation
const lightningHeartbeat = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
`;

// Keyframes for the echo/glow animation
const lightningEcho = keyframes`
  0% {
    transform: perspective(160px) translateZ(0px) scale(1);
    opacity: 1;
  }
  100% {
    transform: perspective(160px) translateZ(80px) scale(1.5);
    opacity: 0;
  }
`;

// Lightning bolt clip-path polygon
const LIGHTNING_CLIP_PATH = 'polygon(50% 0%, 15% 55%, 45% 55%, 30% 100%, 85% 40%, 50% 40%)';

/**
 * Lightning bolt loading indicator
 * Replaces CircularProgress with a branded lightning animation
 */
export default function LightningLoader({ 
  size = 40, 
  color = '#2563EB' 
}: LightningLoaderProps) {
  const width = size;
  const height = size * 1.375; // Maintain lightning bolt aspect ratio

  return (
    <Box
      sx={{
        display: 'inline-flex',
        padding: '8px',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Box
        sx={{
          width,
          height,
          position: 'relative',
          filter: `drop-shadow(0 0 12px ${color})`,
          // Pseudo-elements for the lightning bolt
          '&::before, &::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            backgroundColor: color,
            clipPath: LIGHTNING_CLIP_PATH,
          },
          '&::before': {
            animation: `${lightningHeartbeat} 0.8s infinite cubic-bezier(0.45, 0.05, 0.55, 0.95)`,
          },
          '&::after': {
            animation: `${lightningEcho} 0.8s infinite cubic-bezier(0.215, 0.61, 0.355, 1)`,
          },
        }}
      />
    </Box>
  );
}


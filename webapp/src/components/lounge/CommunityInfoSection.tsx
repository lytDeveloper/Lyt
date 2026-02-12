/**
 * CommunityInfoSection Component
 *
 * Displays content sections:
 * - Description (소개)
 * - Goals (목표)
 * - Requirements (참여 요건)
 */

import { Box, Typography, useTheme } from '@mui/material';
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';

interface Props {
  type: 'project' | 'collaboration';
  description: string;
  goal: string;
  requirements: string[] | string;
}

export default function CommunityInfoSection({ type, description, goal, requirements }: Props) {
  const theme = useTheme();
  const typeLabel = type === 'project' ? '프로젝트' : '협업';

  // Normalize requirements to array
  const normalizedRequirements = (() => {
    if (Array.isArray(requirements)) {
      return requirements;
    }
    if (typeof requirements === 'string') {
      // Try to parse as JSON if it looks like JSON
      if (requirements.trim().startsWith('[') || requirements.trim().startsWith('"')) {
        try {
          const parsed = JSON.parse(requirements);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          // If parsing fails, treat as single item
          return requirements.trim() ? [requirements] : [];
        }
      }
      // If it's a plain string, return as single item array
      return requirements.trim() ? [requirements] : [];
    }
    return [];
  })();

  return (
    <Box sx={{ mb: 3 }}>
      {/* Description Section */}
      {description && (
        <Box sx={{
          mb: 3,
          px: 3,
          py: 2,
          boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)',
          borderRadius: '12px',
        }}>
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 14,
              fontWeight: 500,
              color: theme.palette.text.primary,
              mb: 1.5,
            }}
          >
            {typeLabel} 소개
          </Typography>
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 15,
              color: theme.palette.text.primary,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}
          >
            {description}
          </Typography>
        </Box>
      )}

      {/* Goals Section */}
      {goal && (
        <Box sx={{
          mb: 3,
          px: 3,
          py: 2,
          boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)',
          borderRadius: '12px',
        }}>
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 14,
              fontWeight: 500,
              color: theme.palette.text.primary,
              mb: 1.5,
            }}
          >
            {typeLabel} 목표
          </Typography>
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 15,
              color: theme.palette.text.primary,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}
          >
            {goal}
          </Typography>
        </Box>
      )}

      {/* Requirements Section */}
      {normalizedRequirements && normalizedRequirements.length > 0 && (
        <Box sx={{
          mb: 3,
          px: 3,
          py: 2,
          boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)',
          borderRadius: '12px',
        }}>
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 14,
              fontWeight: 500,
              color: theme.palette.text.primary,
              mb: 1.5,
            }}
          >
            참여 요건
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {normalizedRequirements.map((req, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>

                <CheckOutlinedIcon sx={{ fontSize: 20, color: theme.palette.primary.main }} />

                <Typography
                  sx={{
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 14,
                    color: theme.palette.text.primary,
                    lineHeight: 1.6,
                  }}
                >
                  {req}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

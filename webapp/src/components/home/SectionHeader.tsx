import { Box, Typography } from '@mui/material';
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded';
import { COLORS } from '../../styles/onboarding/common.styles';

interface SectionHeaderProps {
  /** 섹션 제목 */
  title: string;
  /** 클릭 핸들러 (있으면 클릭 가능, 화살표 표시) */
  onClick?: () => void;
  /** 화살표 아이콘 표시 여부 (기본: onClick이 있으면 true) */
  showArrow?: boolean;
  /** 하단 마진 (기본: 3) */
  mb?: number;
}

/**
 * 홈페이지 섹션 헤더 컴포넌트
 * 섹션 제목과 선택적으로 클릭 가능한 화살표 아이콘을 표시합니다.
 */
export default function SectionHeader({
  title,
  onClick,
  showArrow,
  mb = 3,
}: SectionHeaderProps) {
  const isClickable = !!onClick;
  const shouldShowArrow = showArrow ?? isClickable;

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb,
        ...(isClickable && {
          cursor: 'pointer',
          '&:active': { opacity: 0.7 },
        }),
      }}
    >
      <Typography
        sx={{
          fontFamily: 'Pretendard, sans-serif',
          fontSize: { xs: 16, sm: 18, md: 20 },
          fontWeight: 800,
          color: COLORS.TEXT_PRIMARY,
          letterSpacing: '-0.32px',
        }}
      >
        {title}
      </Typography>
      {shouldShowArrow && (
        <ArrowForwardIosRoundedIcon
          sx={{ fontSize: 18, color: COLORS.TEXT_PRIMARY }}
        />
      )}
    </Box>
  );
}

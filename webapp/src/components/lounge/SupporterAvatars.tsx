/**
 * SupporterAvatars Component
 *
 * Purpose: Row 7 - 프로필 사진 3개 오버랩 + "외 n명이 응원중" + 경과 시간
 *
 * Design Spec:
 * - 아바타 3개 오버랩 (왼쪽으로 -8px씩)
 * - 각 아바타 크기: 24x24px
 * - 흰색 테두리 2px
 * - z-index로 왼쪽 아바타가 위로 (3, 2, 1)
 * - 회색 텍스트 (13px) "외 n명이 응원중"
 * - 경과 시간 (11px, 더 연한 회색) "· 2분 전"
 *
 * Usage:
 * <SupporterAvatars
 *   supporters={item.latestSupporters}
 *   totalCount={item.likeCount}
 *   latestSupportAt={item.latestSupportAt}
 * />
 */

import { Box, Avatar, Typography, styled } from '@mui/material';
import { useElapsedTime } from '../../hooks/useElapsedTime';

const Container = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 14px',
  borderRadius: 14,
  backgroundColor: theme.palette.grey[100],
  boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
}));

const AvatarGroup = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  marginRight: 4,
});

const StyledAvatar = styled(Avatar)<{ index: number }>(({ index }) => ({
  width: 32,
  height: 32,
  border: '2px solid #fff',
  marginLeft: index > 0 ? -10 : 0,
  zIndex: 3 - index, // 왼쪽 아바타가 위로 (3, 2, 1)
}));

const SupportText = styled(Typography)(({ theme }) => ({
  fontSize: 15,
  color: theme.palette.text.secondary,
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}));

const SupportCount = styled('span')(({ theme }) => ({
  color: theme.palette.text.primary,
  fontWeight: 700,
}));

const ElapsedText = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.disabled,
  marginLeft: 'auto',
}));

interface Supporter {
  userId: string;
  name: string;
  avatarUrl: string;
}

interface SupporterAvatarsProps {
  supporters: Supporter[];
  totalCount: number;
  latestSupportAt?: string;
}

export default function SupporterAvatars({
  supporters,
  totalCount,
  latestSupportAt,
}: SupporterAvatarsProps) {
  const elapsed = useElapsedTime(latestSupportAt);

  // Don't render if no supporters
  if (totalCount === 0) return null;

  // Defensive programming: 배열 안전성 체크
  const safeSupporters = supporters || [];
  const avatarLimit = 3;
  const displaySupporters = safeSupporters.slice(0, avatarLimit);
  // 남은 인원은 총원 기준으로 계산 (아바타 수 부족해도 정확히 표시)
  const remainingCount = Math.max(totalCount - avatarLimit, 0);

  return (
    <Container>
      {/* Avatar Group */}
      <AvatarGroup>
        {displaySupporters.map((supporter, index) => (
          <StyledAvatar
            key={supporter.userId}
            index={index}
            src={supporter.avatarUrl}
            alt={supporter.name}
          >
            {/* Fallback: 이름의 첫 글자 */}
            {supporter.name.charAt(0)}
          </StyledAvatar>
        ))}
      </AvatarGroup>

      {/* Support Text */}
      <SupportText>
        {remainingCount > 0 && <span>외</span>}
        <SupportCount>{remainingCount > 0 ? remainingCount : totalCount}</SupportCount>
        명이 응원중
      </SupportText>

      {/* Elapsed Time */}
      {elapsed && <ElapsedText>{elapsed}</ElapsedText>}
    </Container>
  );
}

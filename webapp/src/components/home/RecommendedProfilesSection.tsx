import { memo, type RefObject } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { COLORS } from '../../styles/onboarding/common.styles';
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded';
import { SectionHeader } from './index';
import { RECOMMENDED_PROFILE_CONFIG } from '../../constants/homeConstants';
import type { RecommendedProfile } from '../../hooks/useRecommendedProfiles';
import { getThumbnailUrl } from '../../utils/signedUrl';

interface RecommendedProfilesSectionProps {
  /** 사용자 표시 이름 */
  displayName: string;
  /** 추천 프로필 목록 */
  profiles: RecommendedProfile[];
  /** 스크롤 컨테이너 ref */
  scrollRef: RefObject<HTMLDivElement | null>;
  /** 현재 중앙에 위치한 프로필 인덱스 */
  centerIndex: number;
  /** 스크롤 핸들러 */
  onScroll: () => void;
  /** 파트너 클릭 핸들러 */
  onPartnerClick?: (partnerId: string) => void;
}

/**
 * 추천 프로필 섹션 컴포넌트
 * - 가로 스크롤 프로필 카드 목록
 * - 중앙 정렬 및 스케일 효과
 * - 무한 스크롤 지원
 */
function RecommendedProfilesSection({
  displayName,
  profiles,
  scrollRef,
  centerIndex,
  onScroll,
  onPartnerClick,
}: RecommendedProfilesSectionProps) {
  const navigate = useNavigate();

  return (
    <Box sx={{ mb: 3 }}>
      <SectionHeader
        title={`✨${displayName}님을 위한 추천 파트너`}
        onClick={() => navigate('/explore?tab=partners')}
      />

      <Box
        ref={scrollRef}
        onScroll={onScroll}
        sx={{
          display: 'flex',
          overflowX: 'auto',
          gap: '16px',
          pb: 4,
          px: 'calc(50% - 50px)',
          scrollSnapType: 'x mandatory',
          py: 2,
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          scrollbarWidth: 'none',
          scrollBehavior: 'smooth',
        }}
      >
        {profiles.map((profile, index) => {
          const isCenter = index === centerIndex;
          return (
            <Box
              key={`${profile.id}-${index}`}
              onClick={() => onPartnerClick?.(profile.id)}
              sx={{
                flex: '0 0 auto',
                width: 100,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.75,
                scrollSnapAlign: 'center',
                transform: isCenter ? 'scale(1.15)' : 'scale(1)',
                transition: 'transform 0.3s ease',
                zIndex: isCenter ? 1 : 0,
                cursor: onPartnerClick ? 'pointer' : 'default',
              }}
            >
              <Box
                sx={{
                  width: 88,
                  height: 88,
                  backgroundColor: profile.color,
                  borderRadius: '50%',
                  boxShadow: isCenter
                    ? '0 8px 20px rgba(0,0,0,0.15)'
                    : '0 4px 12px rgba(0,0,0,0.08)',
                  transition: 'all 0.3s ease',
                  ...(profile.image_url && {
                    backgroundImage: `url(${getThumbnailUrl(profile.image_url, 176, 176, 75)})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }),
                }}
              />
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 13,
                  textAlign: 'center',
                  fontWeight: 700,
                  color: COLORS.TEXT_PRIMARY,
                  lineHeight: 1.3,
                  opacity: isCenter ? 1 : 0.7,
                  transition: 'opacity 0.3s',
                }}
              >
                {profile.name}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 11,
                  textAlign: 'center',
                  color: COLORS.TEXT_SECONDARY,
                  opacity: isCenter ? 1 : 0.6,
                  transition: 'opacity 0.3s',
                }}
              >
                {profile.job}
              </Typography>
            </Box>
          );
        })}

        {profiles.length >= RECOMMENDED_PROFILE_CONFIG.MAX_COUNT && (
          <Box
            onClick={() => navigate('/explore?tab=partners')}
            sx={{
              flex: '0 0 auto',
              width: 100,
              height: 130,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              scrollSnapAlign: 'center',
              cursor: 'pointer',
            }}
          >
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                backgroundColor: '#F3F4F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1,
              }}
            >
              <ArrowForwardIosRoundedIcon
                sx={{ fontSize: 20, color: COLORS.TEXT_SECONDARY }}
              />
            </Box>
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 12,
                fontWeight: 600,
                color: COLORS.TEXT_SECONDARY,
              }}
            >
              더 보기
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default memo(RecommendedProfilesSection);

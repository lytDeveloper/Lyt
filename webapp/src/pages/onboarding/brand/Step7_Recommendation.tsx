import { useState, useEffect, useMemo, useRef } from 'react';
import { Box, Typography, IconButton, Dialog } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import {
  PageContainer,
  ContentContainer,
  ButtonContainer,
  ButtonWrapper,
  ConfirmButton,
  PageTitle,
  PageSubtitle,
  SmallEm,
  UploadBadge,
} from '../../../styles/onboarding/common.styles';
import PartnerDetailContent from '../../../components/explore/PartnerDetailContent';
import { profileQueryService } from '../../../services/profileQueryService';
import { partnerService, type Partner } from '../../../services/partnerService';
import { useAuth } from '../../../providers/AuthContext';
import { useBrandOnboardingStore } from '../../../stores/onboarding/useBrandOnboardingStore';
import { LogoPreview, Tag, TagsRow } from '../../../styles/onboarding/profile.styles';
import OnboardingLayout from '../../../components/onboarding/OnboardingLayout';
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded';
type ArtistItem = {
  profile_id: string;
  artist_name: string | null;
  activity_field: string | null;
  cover_image_url: string | null;
  logo_image_url: string | null;
  specialized_roles: string[] | null;
  tags: string[] | null;
  highlight_keywords: string[] | null;
};

type CreativeItem = {
  profile_id: string;
  nickname: string | null;
  profile_image_url: string | null;
};

function shuffleAndPick<T>(arr: T[], count: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

const Arrow = styled(IconButton)(() => ({
  width: 36,
  height: 36,
  padding: 0,
  color: '#949196',
}));

const HorizontalViewport = styled(Box)({
  overflow: 'hidden',
  width: '100%',
  maxWidth: 300, // 카드 너비를 좁게
  margin: '0 auto',
});

const HorizontalTrack = styled(Box)({
  display: 'flex',
  willChange: 'transform',
});

const HorizontalItem = styled(Box)(() => ({
  display: 'flex',
  flexDirection: 'row', // 세로 배치
  alignItems: 'center', // 가로 중앙 정렬
  justifyContent: 'center', // 세로 중앙 정렬
  gap: 12,
  width: '100%',
  minWidth: '100%', // 부모 너비 전체 차지
  flexShrink: 0, // 크기 유지
  padding: '16px',
  borderRadius: 13,
  background: '#fff',
  border: '1px solid #E5E7EB',
}));

const SmallCover = styled('img')({
  width: 80,
  height: 80,
  objectFit: 'cover',
  borderRadius: 12,
  display: 'block',
});

const VerticalViewport = styled(Box)({
  width: '100%',
  maxWidth: 340,
  height: 'auto',
  aspectRatio: '1 / 1',
  borderRadius: '20px',
  overflow: 'hidden',
  border: '2px solid #E5E7EB',
  background: '#F3F7FF',
  margin: '0 auto',
  position: 'relative',
});

const VerticalTrack = styled(Box)({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  willChange: 'transform',
});

const VerticalItem = styled('img')({
  width: '100%',
  height: '100%',
  minHeight: '100%', // 최소 높이 보장
  flexShrink: 0, // 크기 유지
  objectFit: 'cover',
  display: 'block',
});

export default function Step7_Recommendation() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(1); // 무한 루프를 위해 1부터 시작
  const [isTransitioning, setIsTransitioning] = useState(true);

  // Fix: Wrap the component (usually at root) with QueryClientProvider to avoid "No QueryClient set" error.
  // For this file, don't use useQuery directly if QueryClientProvider is missing in the app tree.
  // Instead, fallback to a normal useEffect data loading for demo/SSR safety:

  const [artists, setArtists] = useState<ArtistItem[]>([]);
  const [isArtistsLoading, setIsArtistsLoading] = useState(true);
  const { profile } = useAuth();
  const { brandName } = useBrandOnboardingStore();

  // 스와이프 감지를 위한 ref
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const verticalRef = useRef<HTMLDivElement>(null);
  const horizontalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let isMounted = true;
    async function fetchArtists() {
      setIsArtistsLoading(true);
      try {
        // Use profileQueryService to get random artists
        const data = await profileQueryService.getRandomArtists(30);
        if (isMounted) {
          console.log('Artists fetched:', data?.length || 0, 'items');
          setArtists(shuffleAndPick<ArtistItem>((data ?? []) as unknown as ArtistItem[], 3));
        }
      } catch (e) {
        console.error('Failed to fetch artists:', e);
      } finally {
        if (isMounted) setIsArtistsLoading(false);
      }
    }
    fetchArtists();
    return () => { isMounted = false; };
  }, []);

  const [creatives, setCreatives] = useState<CreativeItem[]>([]);
  const [isCreativesLoading, setIsCreativesLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchCreatives() {
      setIsCreativesLoading(true);
      try {
        // Use profileQueryService to get random creatives
        const data = await profileQueryService.getRandomCreatives(30);
        if (isMounted) {
          console.log('Creatives fetched:', data?.length || 0, 'items');
          setCreatives(shuffleAndPick<CreativeItem>((data ?? []) as unknown as CreativeItem[], 3));
        }
      } catch (e) {
        console.error('Failed to fetch creatives:', e);
      } finally {
        if (isMounted) setIsCreativesLoading(false);
      }
    }
    fetchCreatives();
    return () => { isMounted = false; };
  }, []);

  const isLoading = isArtistsLoading || isCreativesLoading;

  const openPartnerDetail = async (profileId?: string | null) => {
    if (!profileId) return;
    try {
      setIsDetailLoading(true);
      const partner = await partnerService.getPartnerById(profileId);
      setSelectedPartner(partner);
      setIsDetailModalOpen(true);
    } catch (error) {
      console.error('[Step7_Recommendation] Failed to load partner detail:', error);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleArtistClick = (artist?: ArtistItem) => {
    void openPartnerDetail(artist?.profile_id ?? null);
  };

  const handleCreativeClick = (creative?: CreativeItem) => {
    void openPartnerDetail(creative?.profile_id ?? null);
  };

  const handleDetailModalClose = () => {
    setIsDetailModalOpen(false);
    setSelectedPartner(null);
  };

  // 무한 루프를 위한 아이템 배열 생성 (마지막, 원본들, 첫번째)
  const infiniteArtists = useMemo(() => {
    if (artists.length === 0) return [];
    return [artists[artists.length - 1], ...artists, artists[0]];
  }, [artists]);

  const infiniteCreatives = useMemo(() => {
    if (creatives.length === 0) return [];
    return [creatives[creatives.length - 1], ...creatives, creatives[0]];
  }, [creatives]);

  // 실제 아이템 인덱스 (무한 루프용)
  const actualIndex = useMemo(() => {
    if (current === 0) return artists.length - 1;
    if (current === infiniteArtists.length - 1) return 0;
    return current - 1;
  }, [current, artists.length, infiniteArtists.length]);

  const handleNext = () => {
    if (!isTransitioning) return;
    setCurrent((c) => c + 1);
  };

  const handlePrev = () => {
    if (!isTransitioning) return;
    setCurrent((c) => c - 1);
  };

  // 무한 루프 처리: 끝에 도달하면 순간이동
  useEffect(() => {
    if (infiniteArtists.length === 0) return;

    if (current === 0) {
      // 첫 번째 복제 아이템 → 실제 마지막으로 순간이동
      setTimeout(() => {
        setIsTransitioning(false);
        setCurrent(infiniteArtists.length - 2);
      }, 400);
      setTimeout(() => setIsTransitioning(true), 450);
    } else if (current === infiniteArtists.length - 1) {
      // 마지막 복제 아이템 → 실제 첫 번째로 순간이동
      setTimeout(() => {
        setIsTransitioning(false);
        setCurrent(1);
      }, 400);
      setTimeout(() => setIsTransitioning(true), 450);
    }
  }, [current, infiniteArtists.length]);

  // 터치 이벤트 핸들러
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchStartX.current - touchEndX;
    const deltaY = touchStartY.current - touchEndY;

    // 스와이프 임계값
    const threshold = 50;

    // 좌우 스와이프 처리
    if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) {
        // 좌로 스와이프 → 다음 (위로도 동시에)
        handleNext();
      } else {
        // 우로 스와이프 → 이전 (아래로도 동시에)
        handlePrev();
      }
    }
    // 상하 스와이프 처리
    else if (Math.abs(deltaY) > threshold && Math.abs(deltaY) > Math.abs(deltaX)) {
      if (deltaY > 0) {
        // 위로 스와이프 → 다음 (좌로도 동시에)
        handleNext();
      } else {
        // 아래로 스와이프 → 이전 (우로도 동시에)
        handlePrev();
      }
    }
  };

  // 가로 캐러셀: 각 아이템이 100% 너비 차지
  const horizontalOffset = useMemo(
    () => `translateX(-${current * 100}%)`,
    [current]
  );
  const verticalOffset = useMemo(
    () => `translateY(-${current * 100}%)`,
    [current]
  );

  const transitionStyle = isTransitioning ? 'transform 400ms ease' : 'none';

  return (
    <OnboardingLayout scrollable>
      <PageContainer sx={{ px: { xs: 3, sm: 4, md: 5 } }}>
        {/* 진행바 */}

        <ContentContainer sx={{ gap: 3, height: '100%' }}>
          <Box sx={{ marginBottom: -5 }}>
            <PageTitle>{brandName || profile?.nickname}님을 위한 추천 아티스트💞</PageTitle>
            <PageSubtitle>
              우리 브랜드와 잘 어울리는 아티스트를 추천해 드려요.
            </PageSubtitle>
          </Box>

          {/* 상단 세로 캐러셀 */}
          <Box sx={{ width: '100%', maxWidth: 340, margin: '0 auto' }}>
            {/* CanvasWrapper와 동일한 구조 */}
            <Box sx={{ position: 'relative', width: '100%', maxWidth: 340, margin: '0 auto' }}>
              <VerticalViewport
                ref={verticalRef}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onClick={() => handleArtistClick(artists[actualIndex])}
              >
                <VerticalTrack style={{ transform: verticalOffset, transition: transitionStyle }}>
                  {infiniteArtists.map((a, idx) => (
                    <Box key={`v-${idx}`} sx={{ width: '100%', height: '100%', minHeight: '100%', flexShrink: 0 }}>
                      {a?.cover_image_url ? (
                        <VerticalItem src={a.cover_image_url} alt={a?.artist_name ?? 'artist'} />
                      ) : (
                        <Box sx={{ width: '100%', height: '100%', minHeight: '100%', background: '#E9E9ED' }} />
                      )}
                    </Box>
                  ))}
                </VerticalTrack>
              </VerticalViewport>
              {/* 로고 배지 - 커버 이미지에 걸침 */}
              <UploadBadge>
                {artists[actualIndex]?.logo_image_url ? (
                  <LogoPreview src={artists[actualIndex].logo_image_url} alt={artists[actualIndex]?.artist_name ?? 'artist'} />
                ) : (
                  'image'
                )}
              </UploadBadge>
            </Box>

            {/* 로고 옆 정보 영역 */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                marginTop: 0,
                paddingLeft: '104px',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 0.25,
                }}
              >
                <Typography
                  sx={(theme) => ({
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 16,
                    fontWeight: 500,
                    color: theme.palette.text.primary,
                  })}
                >
                  {artists[actualIndex]?.artist_name ?? ''}
                </Typography>
                <SmallEm>{artists[actualIndex]?.activity_field ?? ''}</SmallEm>
              </Box>
            </Box>

            {/* 태그 영역 */}
            <TagsRow sx={{
              marginTop: 1.5,
              justifyContent: 'flex-start',
              paddingLeft: 2
            }}>
              {artists[actualIndex]?.specialized_roles?.map((role) => (
                <Tag key={role}>#{role}</Tag>
              ))}
              {artists[actualIndex]?.tags?.map((tag) => (
                <Tag key={tag}>#{tag}</Tag>
              ))}
              {artists[actualIndex]?.highlight_keywords?.map((keyword) => (
                <Tag key={keyword}>#{keyword}</Tag>
              ))}
            </TagsRow>
          </Box>

          <PageTitle sx={{ marginBottom: -2 }}>{brandName || profile?.nickname}님을 위한 추천 크리에이티브💞</PageTitle>
          <PageSubtitle sx={{ marginBottom: -2 }}>
            우리 브랜드와 잘 어울리는 크리에이터를 추천해 드려요.
          </PageSubtitle>

          {/* 하단 좌우 캐러셀 + 화살표 */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
            <Arrow aria-label="prev" onClick={handlePrev}>
              <ArrowBackIosNewRoundedIcon />
            </Arrow>

            <HorizontalViewport
              ref={horizontalRef}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <HorizontalTrack style={{ transform: horizontalOffset, transition: transitionStyle }}>
                {infiniteCreatives.map((c, idx) => (
                  <HorizontalItem
                    key={`h-${idx}`}
                    onClick={() => handleCreativeClick(c)}
                    sx={{ cursor: 'pointer', border: 'none' }}
                  >
                    {c?.profile_image_url ? (
                      <SmallCover src={c.profile_image_url} alt={c?.nickname ?? 'creative'} />
                    ) : (
                      <Box sx={{ width: 64, height: 64, borderRadius: 2 }} />
                    )}
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        textAlign: 'center',
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: 'Pretendard, sans-serif',
                          fontSize: 12,
                          color: '#949196',
                        }}
                      >
                        CREATIVE
                      </Typography>
                      <Typography
                        sx={(theme) => ({
                          fontFamily: 'Pretendard, sans-serif',
                          fontSize: 16,
                          fontWeight: 600,
                          color: theme.palette.text.primary,
                        })}
                      >
                        {c?.nickname ?? ''}
                      </Typography>
                    </Box>
                  </HorizontalItem>
                ))}
              </HorizontalTrack>
            </HorizontalViewport>

            <Arrow aria-label="next" onClick={handleNext}>
              <ArrowForwardIosRoundedIcon />
            </Arrow>
          </Box>
        </ContentContainer>

        <Dialog
          open={isDetailModalOpen}
          onClose={handleDetailModalClose}
          fullWidth
          maxWidth="md"
          scroll="paper"
          BackdropProps={{
            sx: {
              backdropFilter: 'blur(6px)',
            },
          }}
          PaperProps={{
            sx: {
              borderRadius: '16px',
              maxWidth: '768px',
              width: 'calc(100% - 40px)',
              m: { xs: '16px auto', sm: '48px auto' },
              maxHeight: { xs: 'calc(100vh - 64px)', sm: 'calc(100vh - 128px)' },
              overflow: 'hidden',
              backgroundColor: 'rgba(255,255,255,0.04)',
            },
          }}
        >
          {selectedPartner && (
            <PartnerDetailContent
              partner={selectedPartner}
              loading={isDetailLoading}
              onClose={handleDetailModalClose}
              showBottomNavigation={false}
              isModal
            />
          )}
        </Dialog>

        <ButtonContainer>
          <ButtonWrapper>
            <ConfirmButton fullWidth variant="contained" disabled={isLoading} onClick={() => navigate('/home', { replace: true })}>
              더 보러 가볼까요?
            </ConfirmButton>
          </ButtonWrapper>
        </ButtonContainer>

      </PageContainer >
    </OnboardingLayout>
  );
}



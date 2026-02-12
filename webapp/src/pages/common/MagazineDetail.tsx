import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Chip, IconButton, styled, Button, Skeleton } from '@mui/material';
import BookmarkBorderOutlinedIcon from '@mui/icons-material/BookmarkBorderOutlined';
import BookmarkOutlinedIcon from '@mui/icons-material/BookmarkOutlined';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LightningLoader } from '../../components/common';
import { magazineService } from '../../services/magazineService';
import { useAuth } from '../../providers/AuthContext';
import { useProfileStore } from '../../stores/profileStore';
import type { MagazineContentBlock } from '../../types/magazine.types';
import CompactMagazineCard from '../../components/lounge/CompactMagazineCard';
import Header from '../../components/common/Header';
import BottomNavigationBar, { BOTTOM_NAV_HEIGHT } from '../../components/navigation/BottomNavigationBar';
import SignedImage from '../../components/common/SignedImage';
import { useTheme } from '@mui/material';
import PlayCircleFilledOutlinedIcon from '@mui/icons-material/PlayCircleFilledOutlined';
import { nativeShare } from '../../utils/nativeShare';



// Styled Components
const PageContainer = styled(Box)({
  minHeight: '100vh',
  backgroundColor: '#fff',
  paddingBottom: BOTTOM_NAV_HEIGHT,
});

const PageTitle = styled(Typography)(({ theme }) => ({
  fontSize: 24,
  fontWeight: 700,
  color: theme.palette.text.primary,
  padding: '0px 5px 5px',
}));

const PageSubtitle = styled(Typography)(({ theme }) => ({
  fontSize: 14,
  color: theme.palette.text.secondary,
  padding: '0 5px 5px',
  marginBottom: '10px',
}));

const TopRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 16,
});

const MetaLeft = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
});

const ActionButtons = styled(Box)({
  display: 'flex',
  gap: 4,
});

const ContentContainer = styled(Box)({
  marginTop: '30px',
  padding: '0px 20px',

});

const Title = styled(Typography)(({ theme }) => ({
  fontSize: 24,
  fontWeight: 700,
  color: theme.palette.text.primary,
  lineHeight: 1.4,
  marginBottom: 12,
}));

const Subtitle = styled(Typography)(({ theme }) => ({
  fontSize: 14,
  color: theme.palette.text.secondary,
  lineHeight: 1.5,
  marginBottom: 24,
}));

const InfoRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginBottom: 16,
  flexWrap: 'nowrap',
  overflow: 'hidden',
});

const CategoryChip = styled(Chip)(({ theme }) => ({
  height: 28,
  fontSize: 13,
  fontWeight: 500,
  backgroundColor: theme.palette.bgColor.blue,
  color: theme.palette.primary.main,
}));

const ReadingTime = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  color: theme.palette.text.secondary,
}));

const MetaText = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  color: theme.palette.text.secondary,
}));


const ProjectCard = styled(Box)(({ theme }) => ({
  padding: 20,
  backgroundColor: theme.palette.grey[50],
  borderRadius: 16,
  marginBottom: 24,
}));

const ProjectHeader = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginBottom: 16,
});

const ProjectIcon = styled(Box)(({ theme }) => ({
  width: 24,
  height: 24,
  borderRadius: '50%',
  backgroundColor: theme.palette.primary.main,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.background.paper,
}));

const FilterChipGroup = styled(Box)({
  display: 'inline-flex',
  gap: 8,
  flexWrap: 'nowrap',
});

const FilterChip = styled(Chip)<{ selected: boolean }>(({ theme, selected }) => ({
  height: 25,
  fontSize: 11,
  fontWeight: 500,
  backgroundColor: selected ? theme.palette.primary.main : theme.palette.grey[50],
  color: selected ? theme.palette.primary.contrastText : theme.palette.text.secondary,
  cursor: 'pointer',
  transition: 'all 0.2s',
  '& .MuiChip-label': {
    padding: '0 12px',
  },
}));


const ProjectInfo = styled(Box)({
  flex: 1,
});

const ProjectBadge = styled(Chip)({
  height: 20,
  fontSize: 10,
  fontWeight: 600,
  backgroundColor: 'white',
  color: '#2563EB',
  '& .MuiChip-label': {
    padding: '0 8px',
  },
});

const ProjectTitle = styled(Typography)(({ theme }) => ({
  fontSize: 15,
  fontWeight: 700,
  color: theme.palette.text.primary,
  marginBottom: 12,
}));

const ProjectMeta = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 16,
});

const ProjectMetaItem = styled(Box)({
  flex: 1,
});

const ProjectMetaLabel = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.secondary,
  marginBottom: 4,
}));

const ProjectMetaValue = styled(Typography)(({ theme }) => ({
  fontSize: 14,
  fontWeight: 600,
  color: theme.palette.text.primary,
}));

const ProjectButtons = styled(Box)({
  display: 'flex',
  gap: 8,
});

const ProjectButton = styled(Button)({
  flex: 1,
  height: 44,
  fontSize: 14,
  fontWeight: 400,
  textTransform: 'none',
  borderRadius: 20,
});

const ImagesSection = styled(Box)({
  marginBottom: 32,
});

const ContentText = styled(Typography)(({ theme }) => ({
  fontSize: 15,
  color: theme.palette.text.primary,
  lineHeight: 1.8,
  whiteSpace: 'pre-wrap',
  marginBottom: 32,
}));

// const CTAButton = styled(Button)(({ theme }) => ({
//   padding: '10px 20px',
//   margin: '0 auto',
//   fontSize: 14,
//   fontWeight: 400,
//   textTransform: 'none',
//   borderRadius: 25,
//   backgroundColor: theme.palette.status.purple,

// }));

const RelatedSection = styled(Box)({
  marginTop: 48,
});

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: 18,
  fontWeight: 700,
  color: theme.palette.text.primary,
  marginBottom: 16,
}));

const RelatedGrid = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
});

const VideoSection = styled(Box)({
  marginBottom: 32,
  width: '100%',
});

const ReactionContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});

const ReactionButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== 'isActive' && prop !== 'reactionType',
})<{ isActive?: boolean; reactionType?: 'like' | 'dislike' }>(
  ({ theme, isActive, reactionType }) => ({
    width: 44,
    height: 44,
    borderRadius: '50%',
    backgroundColor: isActive
      ? reactionType === 'like'
        ? theme.palette.background.paper
        : theme.palette.background.paper
      : theme.palette.background.paper,
    color: isActive ? theme.palette.icon.default : theme.palette.text.secondary,
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: isActive
        ? reactionType === 'like'
          ? theme.palette.background.paper
          : theme.palette.background.paper
        : theme.palette.background.paper,
    },
    '& .MuiSvgIcon-root': {
      fontSize: 20,
    },
  })
);

// YouTube URL 감지 및 video ID 추출 헬퍼 함수
const getYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

const isWebmUrl = (url: string): boolean => {
  return url.toLowerCase().endsWith('.webm');
};

export default function MagazineDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const profileType = useProfileStore((state) => state.type);
  const isFanProfile = profileType === 'fan';

  // Fetch magazine detail
  const {
    data: magazine,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['magazine', id],
    queryFn: () => magazineService.getMagazineById(id!),
    enabled: !!id,
  });

  // Increment view count on mount
  useEffect(() => {
    if (id) {
      magazineService.incrementViewCount(id);
    }
  }, [id]);

  // Scroll to top when id changes
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [id]);

  // Fetch bookmark status
  const { data: isBookmarked = false } = useQuery({
    queryKey: ['magazine', id, 'bookmarked'],
    queryFn: () => magazineService.checkBookmarked(id!, user?.id || ''),
    enabled: !!id && !!user,
  });

  // Toggle bookmark mutation
  const bookmarkMutation = useMutation({
    mutationFn: () => magazineService.toggleBookmark(id!, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['magazine', id, 'bookmarked'] });
    },
  });

  // Fetch user's reaction (like/dislike)
  const { data: userReaction = null } = useQuery({
    queryKey: ['magazine', id, 'reaction', user?.id],
    queryFn: () => magazineService.getUserReaction(id!, user?.id || ''),
    enabled: !!id && !!user,
    initialData: null,
  });

  // Toggle reaction mutation
  const reactionMutation = useMutation({
    mutationFn: (reactionType: 'like' | 'dislike') =>
      magazineService.toggleReaction(id!, user?.id || '', reactionType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['magazine', id, 'reaction', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['magazine', id, 'reactionCounts'] });
    },
  });

  // Fetch related articles
  const { data: relatedMagazines = [] } = useQuery({
    queryKey: ['magazines', 'related', id, magazine?.category],
    queryFn: () => magazineService.getRelatedMagazines(id!, magazine!.category, 4),
    enabled: !!id && !!magazine,
  });

  const handleBack = () => {
    navigate(-1);
  };

  const handleBookmark = () => {
    if (!user) {
      alert('로그인 후 이용해주세요.');
      return;
    }
    bookmarkMutation.mutate();
  };

  const handleShare = async () => {
    // 크로스 플랫폼 공유 (WebView: 네이티브, 브라우저: Web Share API, Fallback: 클립보드)
    const result = await nativeShare({
      title: magazine?.title || '',
      text: magazine?.subtitle || '',
      url: window.location.href,
    });

    // 클립보드 복사 fallback 시 사용자에게 알림
    if (result.method === 'clipboard' && result.success) {
      alert('링크가 복사되었어요.');
    } else if (!result.success) {
      alert('공유에 실패했어요.');
    }
  };

  const handleReaction = (reactionType: 'like' | 'dislike') => {
    if (!user) {
      alert('로그인 후 이용해주세요.');
      return;
    }
    reactionMutation.mutate(reactionType);
  };

  // const handleStartProject = () => {
  //   // TODO: Navigate to project creation with magazine context
  //   console.log('Start similar project:', magazine?.id);
  // };

  const formatDate = useCallback((dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  }, []);

  // Defensive: Handle optional arrays
  const tags = magazine?.tags || [];

  const contentBlocks = useMemo<MagazineContentBlock[]>(() => {
    if (!magazine) return [];
    if (magazine.content_blocks && magazine.content_blocks.length > 0) {
      return magazine.content_blocks as MagazineContentBlock[];
    }

    const fallback: MagazineContentBlock[] = [];
    if (magazine.images && magazine.images.length > 0) {
      fallback.push(
        ...magazine.images.map((url) => ({
          type: 'image' as const,
          url,
        }))
      );
    }
    if (magazine.content) {
      fallback.push({
        type: 'text',
        content: magazine.content,
      });
    }
    return fallback;
  }, [magazine]);

  // 공간 체크를 위한 ref와 state (Hook은 항상 같은 순서로 호출되어야 함)
  const infoRowRef = useRef<HTMLDivElement>(null);
  const tagGroupRef = useRef<HTMLDivElement>(null);
  const [maxTags, setMaxTags] = useState<number>(tags.length || 0);

  // 공간이 부족할 때만 태그를 3개로 제한
  useEffect(() => {
    if (!magazine || tags.length === 0) {
      setMaxTags(0);
      return;
    }

    const checkSpace = () => {
      if (!infoRowRef.current || tags.length === 0) return;

      // 실제 렌더링된 요소들의 너비를 측정하기 위해 약간의 지연
      setTimeout(() => {
        if (!infoRowRef.current) return;

        // 작성자/날짜 그룹의 너비 측정
        const metaGroup = infoRowRef.current.querySelector('div:first-child') as HTMLElement;
        const metaWidth = metaGroup ? metaGroup.offsetWidth : 0;

        // InfoRow의 전체 너비
        const totalWidth = infoRowRef.current.offsetWidth;

        // 사용 가능한 너비 (gap 12px 고려)
        const availableWidth = totalWidth - metaWidth - 12;

        // 모든 태그를 렌더링해서 공간 체크
        const tempGroup = document.createElement('div');
        tempGroup.style.display = 'inline-flex';
        tempGroup.style.gap = '8px';
        tempGroup.style.visibility = 'hidden';
        tempGroup.style.position = 'absolute';
        tempGroup.style.fontSize = '11px';

        tags.forEach((tag) => {
          const chip = document.createElement('div');
          chip.style.height = '25px';
          chip.style.fontSize = '11px';
          chip.style.padding = '0 12px';
          chip.style.whiteSpace = 'nowrap';
          chip.style.fontWeight = '500';
          chip.textContent = `#${tag}`;
          tempGroup.appendChild(chip);
        });

        document.body.appendChild(tempGroup);
        const allTagsWidth = tempGroup.offsetWidth;
        document.body.removeChild(tempGroup);

        // 공간이 부족하면 3개로 제한, 충분하면 모두 표시
        if (allTagsWidth > availableWidth && tags.length > 3) {
          setMaxTags(3);
        } else {
          setMaxTags(tags.length);
        }
      }, 100);
    };

    // 초기 체크 및 리사이즈 이벤트 리스너
    checkSpace();
    window.addEventListener('resize', checkSpace);

    return () => {
      window.removeEventListener('resize', checkSpace);
    };
  }, [tags, magazine?.author, magazine?.created_at]);

  if (isLoading) {
    return (
      <PageContainer>
        <Header showBackButton={true} onBackClick={handleBack} />
        <ContentContainer>
          {/* 로딩 스켈레톤 UI */}
          <Skeleton variant="text" width={80} height={32} sx={{ mb: 1, mx: '5px' }} />
          <Skeleton variant="text" width="60%" height={20} sx={{ mb: 3, mx: '5px' }} />

          {/* 카테고리/읽기시간 스켈레톤 */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, px: '5px' }}>
            <Skeleton variant="rounded" width={60} height={28} />
            <Skeleton variant="text" width={40} height={20} />
          </Box>

          {/* 제목 스켈레톤 */}
          <Skeleton variant="text" width="90%" height={36} sx={{ mb: 1, mx: '5px' }} />
          <Skeleton variant="text" width="70%" height={36} sx={{ mb: 2, mx: '5px' }} />

          {/* 이미지 스켈레톤 */}
          <Skeleton
            variant="rounded"
            width="100%"
            height={200}
            sx={{ mb: 2, borderRadius: '12px' }}
          />

          {/* 본문 스켈레톤 */}
          <Box sx={{ px: '5px' }}>
            <Skeleton variant="text" width="100%" height={20} />
            <Skeleton variant="text" width="100%" height={20} />
            <Skeleton variant="text" width="100%" height={20} />
            <Skeleton variant="text" width="80%" height={20} />
          </Box>

          {/* 로딩 인디케이터 */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <LightningLoader size={32} />
          </Box>
        </ContentContainer>
        <BottomNavigationBar />
      </PageContainer>
    );
  }

  if (error || !magazine) {
    return (
      <PageContainer>
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            backgroundColor: 'transparent',
            backdropFilter: 'blur(3px) saturate(180%)',
            WebkitBackdropFilter: 'blur(3px) saturate(180%)',
          }}
        >
          <Header showBackButton={true} onBackClick={handleBack} />
        </Box>
        <ContentContainer>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '50vh',
              gap: 2,
              px: 4,
            }}
          >
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 600,
                color: 'text.primary',
                textAlign: 'center',
              }}
            >
              아티클을 불러올 수 없어요
            </Typography>
            <Typography
              sx={{
                fontSize: 14,
                color: 'text.secondary',
                textAlign: 'center',
              }}
            >
              네트워크 연결을 확인하고 다시 시도해주세요.
            </Typography>
            <Button
              variant="outlined"
              onClick={() => window.location.reload()}
              sx={{ mt: 2, borderRadius: 20 }}
            >
              다시 시도
            </Button>
          </Box>
        </ContentContainer>
        <BottomNavigationBar />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: 'transparent',
          backdropFilter: 'blur(3px) saturate(180%)',
          WebkitBackdropFilter: 'blur(3px) saturate(180%)',
        }}
      >
        <Header showBackButton={true} onBackClick={handleBack} />
      </Box>

      <ContentContainer>
        <PageTitle>매거진</PageTitle>
        <PageSubtitle>브랜드 스토리와 성공 프로젝트를 만나보세요</PageSubtitle>

        <TopRow>
          <MetaLeft>
            <CategoryChip label={magazine.category} />
            <ReadingTime>{magazine.reading_time}분</ReadingTime>
          </MetaLeft>
          <ActionButtons>
            <IconButton onClick={handleBookmark} size="small">
              {isBookmarked ? (
                <BookmarkOutlinedIcon color="primary" />
              ) : (
                <BookmarkBorderOutlinedIcon />
              )}
            </IconButton>
            <IconButton onClick={handleShare} size="small">
              <ShareOutlinedIcon />
            </IconButton>
          </ActionButtons>
        </TopRow>

        <Title sx={{ wordBreak: 'keep-all' }}>{magazine.title}</Title>
        {magazine.subtitle && <Subtitle>{magazine.subtitle}</Subtitle>}

        <InfoRow ref={infoRowRef} sx={{ borderBottom: `1px solid ${theme.palette.grey[100]}`, pb: 2 }}>
          {magazine.author && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
              <MetaText>{magazine.author.nickname || '작성자'}</MetaText>
              <MetaText>{formatDate(magazine.created_at)}</MetaText>
            </Box>
          )}
          {tags.length > 0 && (
            <FilterChipGroup ref={tagGroupRef} sx={{ flexShrink: 1, minWidth: 0 }}>
              {tags.slice(0, maxTags).map((tag) => (
                <FilterChip key={tag} label={`#${tag}`} selected={false} />
              ))}
            </FilterChipGroup>
          )}
        </InfoRow>

        {magazine.project && (
          <ProjectCard>
            <ProjectHeader>
              <ProjectIcon>
                <PlayCircleFilledOutlinedIcon sx={{ fontSize: 16 }} />
              </ProjectIcon>
              <ProjectInfo>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#2563EB' }}>
                    연관 진행중 프로젝트
                  </Typography>
                  <ProjectBadge label="진행중" />
                </Box>
              </ProjectInfo>
            </ProjectHeader>

            <ProjectTitle>{magazine.project.title}</ProjectTitle>

            <ProjectMeta>
              <ProjectMetaItem>
                <ProjectMetaLabel>예산 범위</ProjectMetaLabel>
                <ProjectMetaValue>{magazine.project.budget_range || '미정'}</ProjectMetaValue>
              </ProjectMetaItem>
              <ProjectMetaItem>
                <ProjectMetaLabel>마감일</ProjectMetaLabel>
                <ProjectMetaValue>{magazine.project.deadline ? formatDate(magazine.project.deadline) : '미정'}</ProjectMetaValue>
              </ProjectMetaItem>
            </ProjectMeta>

            <ProjectButtons>
              <ProjectButton
                variant="contained"
                onClick={() => navigate(`/lounge/community/${magazine.project!.id}?type=project`)}
              >
                프로젝트 상세보기
              </ProjectButton>
              {!isFanProfile && (
                <ProjectButton
                  variant="outlined"
                  onClick={() => navigate(`/explore/project/${magazine.project!.id}`)}
                >
                  참여 신청하기
                </ProjectButton>
              )}
            </ProjectButtons>
          </ProjectCard>
        )}

        {contentBlocks.length > 0 && (
          <ImagesSection>
            {contentBlocks.map((block, index) => {
              if (block.type === 'image' && block.url) {
                return (
                  <SignedImage
                    key={`image-${index}`}
                    src={block.url}
                    alt={`Article image ${index + 1}`}
                    sx={{
                      width: '100%',
                      borderRadius: '12px',
                      marginBottom: '16px',
                    }}
                    imgProps={{ loading: 'lazy' }}
                  />
                );
              }
              if (block.type === 'text' && block.content) {
                return (
                  <ContentText key={`text-${index}`}>
                    {block.content}
                  </ContentText>
                );
              }
              return null;
            })}
          </ImagesSection>
        )}

        {/* Video Section - YouTube or webm player */}
        {magazine.video_url && (
          <VideoSection>
            {(() => {
              const youtubeVideoId = getYouTubeVideoId(magazine.video_url);
              if (youtubeVideoId) {
                // YouTube 비디오
                return (
                  <Box
                    sx={{
                      position: 'relative',
                      paddingBottom: '56.25%', // 16:9 aspect ratio
                      height: 0,
                      overflow: 'hidden',
                      borderRadius: '12px',
                      marginBottom: '16px',
                    }}
                  >
                    <iframe
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                      }}
                      src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </Box>
                );
              } else if (isWebmUrl(magazine.video_url)) {
                // webm 비디오
                return (
                  <Box
                    sx={{
                      width: '100%',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      marginBottom: '16px',
                    }}
                  >
                    <video
                      controls
                      style={{
                        width: '100%',
                        maxWidth: '100%',
                        display: 'block',
                        borderRadius: '12px',
                      }}
                    >
                      <source src={magazine.video_url} type="video/webm" />
                      Your browser does not support the video tag.
                    </video>
                  </Box>
                );
              }
              return null;
            })()}
          </VideoSection>
        )}

        <Box
          sx={{
            px: 2,
            py: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography sx={{ fontSize: 16, fontWeight: 600, color: theme.palette.text.primary }}>
            이 아티클이 도움이 되셨나요?
          </Typography>
          <ReactionContainer>
            <ReactionButton
              isActive={userReaction === 'like'}
              reactionType="like"
              onClick={() => handleReaction('like')}
              disabled={reactionMutation.isPending}
            >
              {userReaction === 'like' ? <ThumbUpIcon /> : <ThumbUpOutlinedIcon />}
            </ReactionButton>
            <ReactionButton
              isActive={userReaction === 'dislike'}
              reactionType="dislike"
              onClick={() => handleReaction('dislike')}
              disabled={reactionMutation.isPending}
            >
              {userReaction === 'dislike' ? <ThumbDownIcon /> : <ThumbDownOutlinedIcon />}
            </ReactionButton>
          </ReactionContainer>
        </Box>

        {relatedMagazines.length > 0 && (
          <RelatedSection sx={{ mt: 4, mb: 6 }}>
            <SectionTitle>관련 아티클</SectionTitle>
            <RelatedGrid>
              {relatedMagazines.map((relatedMagazine) => (
                <CompactMagazineCard key={relatedMagazine.id} magazine={relatedMagazine} />
              ))}
            </RelatedGrid>
          </RelatedSection>
        )}
      </ContentContainer>
      <BottomNavigationBar />
    </PageContainer>
  );
}

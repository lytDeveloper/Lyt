import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  IconButton,
  Typography,
  Chip,
  Avatar,
  Button,
  Paper,
  useTheme,
} from '@mui/material';
import { LightningLoader } from '../common';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';
import BottomNavigationBar, { BOTTOM_NAV_HEIGHT } from '../navigation/BottomNavigationBar';
import { type Partner } from '../../services/exploreService';
import { OnlineStatusText } from '../common/OnlineIndicator';
import TabBar from '../common/TabBar';
import PendingApprovalNotice from '../common/PendingApprovalNotice';
import { useBrandApprovalStatus } from '../../hooks/useBrandApprovalStatus';
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import { profileService } from '../../services/profileService';
import { partnerService } from '../../services/partnerService';
import { getBrandStats } from '../../services/brandService';
import type { PortfolioItem, CareerItem } from '../../services/profileService';
import { addRecentlyViewed, addRecentlyViewedToServer } from '../../services/recentViewsService';
import { useAuth } from '../../providers/AuthContext';
import TalkRequestModal from './TalkRequestModal';
import ActionSuccessModal from '../notification/ActionSuccessModal';
import { createTalkRequest } from '../../services/talkRequestService';
import { toast } from 'react-toastify';
import { BlockService } from '../../services/blockService';
import PartnerReviewTabContent from './PartnerReviewTabContent';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../utils/formatters';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`partner-tabpanel-${index}`}
      aria-labelledby={`partner-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}


// 기간 형식을 "YYYY-MM ~ YYYY-MM" 또는 "YYYY-MM ~ 현재"에서 "YYYY년 M월 ~ YYYY년 M월" 또는 "YYYY년 M월 ~ 현재"로 변환하는 함수
function formatPeriodToKorean(period: string): string {
  if (!period) return '';

  // "YYYY-MM ~ YYYY-MM" 형식인 경우
  const periodMatch = period.match(/^(\d{4})[.-](\d{1,2})\s*[~-]\s*(\d{4})[.-](\d{1,2})$/);
  if (periodMatch) {
    const startYear = periodMatch[1];
    const startMonth = parseInt(periodMatch[2], 10);
    const endYear = periodMatch[3];
    const endMonth = parseInt(periodMatch[4], 10);
    return `${startYear}년 ${startMonth}월 ~ ${endYear}년 ${endMonth}월`;
  }

  // "YYYY-MM ~ 현재" 형식인 경우
  const currentMatch = period.match(/^(\d{4})[.-](\d{1,2})\s*[~-]\s*현재$/);
  if (currentMatch) {
    const year = currentMatch[1];
    const month = parseInt(currentMatch[2], 10);
    return `${year}년 ${month}월 ~ 현재`;
  }

  // 이미 변환된 형식이거나 다른 형식인 경우 그대로 반환
  return period;
}

interface PartnerDetailContentProps {
  partner: Partner | null;
  loading?: boolean;
  onClose?: () => void;
  showBottomNavigation?: boolean;
  isModal?: boolean;
  onChatRequest?: () => void;
}

export default function PartnerDetailContent({
  partner,
  loading = false,
  onClose,
  showBottomNavigation = true,
  isModal = false,
  onChatRequest: _onChatRequest,
}: PartnerDetailContentProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [showApprovalOverlay, setShowApprovalOverlay] = useState(false);
  const { isRestricted: isBrandApprovalRestricted } = useBrandApprovalStatus();
  const [mainSnsChannelUrl, setMainSnsChannelUrl] = useState<string | null>(null);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  // 대화 요청 모달 상태
  const [talkRequestModalOpen, setTalkRequestModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  // 숨김 상태: 상대방이 나를 숨겼는지 여부 (Talk Request 버튼 숨김용)
  const [isHiddenByPartner, setIsHiddenByPartner] = useState(false);
  const [careerItems, setCareerItems] = useState<CareerItem[]>([]);
  const [profileDetailLoading, setProfileDetailLoading] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(new Set());
  const [expandedCareerDescriptions, setExpandedCareerDescriptions] = useState<Set<number>>(new Set());
  const [stats, setStats] = useState<{
    rating: number | null;
    reviewCount: number;
    responseRate: number | null;
    responseTime: string | null;
    matchingRate: number | null;
  }>({
    rating: partner?.rating ?? null,
    reviewCount: partner?.reviewCount ?? 0,
    responseRate: partner?.responseRate ?? null,
    responseTime: partner?.responseTime ?? null,
    matchingRate: partner?.matchingRate ?? null,
  });

  // 브랜드 유저용: profile_brands에서 activity_field, tags, established_at 직접 조회
  const [brandData, setBrandData] = useState<{ activityField: string; tags: string[]; establishedAt: string | null } | null>(null);

  // 브랜드일 경우 profile_brands에서 activity_field, tags, established_at 가져오기
  useEffect(() => {
    if (partner?.role !== 'brand' || !partner?.id) {
      setBrandData(null);
      return;
    }

    let isMounted = true;

    const fetchBrandData = async () => {
      try {
        const { data, error } = await supabase
          .from('profile_brands')
          .select('activity_field, tags, established_at')
          .eq('profile_id', partner.id)
          .maybeSingle();

        if (isMounted && !error && data) {
          setBrandData({
            activityField: data.activity_field || '',
            tags: data.tags || [],
            establishedAt: data.established_at || null,
          });
        }
      } catch {
        if (isMounted) setBrandData(null);
      }
    };

    fetchBrandData();

    return () => {
      isMounted = false;
    };
  }, [partner?.id, partner?.role]);

  // 브랜드일 경우 brandData 우선 사용, 아니면 partner 데이터 사용
  const displayActivityField = partner?.role === 'brand' && brandData ? brandData.activityField : (partner?.activityField || '');
  const displayTags = partner?.role === 'brand' && brandData ? brandData.tags : (partner?.tags || []);

  const partnerRoleLabel =
    partner?.role === 'creative' ? '크리에이티브' : partner?.role === 'artist' ? '아티스트' : partner?.role === 'brand' ? '브랜드' : null;

  // 경력 기간 계산 함수
  const calculateTotalCareerPeriod = (careers: CareerItem[]): string => {
    if (!careers || careers.length === 0) {
      return partner?.career || '-';
    }

    let totalMonths = 0;
    const dateRanges: Array<{ start: Date; end: Date }> = [];

    // 각 경력의 period를 파싱하여 날짜 범위 추출
    careers.forEach((career) => {
      if (!career.period) return;

      // "YYYY-MM ~ YYYY-MM" 또는 "YYYY.MM ~ YYYY.MM" 형식 파싱
      const periodMatch = career.period.match(/(\d{4})[.-](\d{2})\s*[~-]\s*(\d{4})[.-](\d{2})/);
      if (!periodMatch) {
        // "YYYY-MM ~ 현재" 형식도 처리
        const currentMatch = career.period.match(/(\d{4})[.-](\d{2})\s*[~-]\s*(현재|now)/i);
        if (currentMatch) {
          const year = parseInt(currentMatch[1], 10);
          const month = parseInt(currentMatch[2], 10);
          const now = new Date();
          dateRanges.push({
            start: new Date(year, month - 1),
            end: new Date(now.getFullYear(), now.getMonth()),
          });
        }
        return;
      }

      const startYear = parseInt(periodMatch[1], 10);
      const startMonth = parseInt(periodMatch[2], 10);
      const endYear = parseInt(periodMatch[3], 10);
      const endMonth = parseInt(periodMatch[4], 10);

      dateRanges.push({
        start: new Date(startYear, startMonth - 1),
        end: new Date(endYear, endMonth - 1),
      });
    });

    if (dateRanges.length === 0) {
      return partner?.career || '정보 없음';
    }

    // 날짜 범위를 정렬
    dateRanges.sort((a, b) => a.start.getTime() - b.start.getTime());

    // 중복되지 않는 기간들을 합산
    const mergedRanges: Array<{ start: Date; end: Date }> = [];
    for (const range of dateRanges) {
      if (mergedRanges.length === 0) {
        mergedRanges.push({ ...range });
      } else {
        const lastRange = mergedRanges[mergedRanges.length - 1];
        // 겹치거나 연속된 기간인 경우 합치기
        if (range.start <= lastRange.end ||
          range.start.getTime() - lastRange.end.getTime() <= 30 * 24 * 60 * 60 * 1000) {
          lastRange.end = range.end > lastRange.end ? range.end : lastRange.end;
        } else {
          mergedRanges.push({ ...range });
        }
      }
    }

    // 총 개월 수 계산
    mergedRanges.forEach((range) => {
      const months = (range.end.getFullYear() - range.start.getFullYear()) * 12 +
        (range.end.getMonth() - range.start.getMonth()) + 1;
      totalMonths += months;
    });

    // 년과 월로 변환
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;

    if (years === 0) {
      return `${months}개월`;
    } else if (months === 0) {
      return `${years}년`;
    } else {
      return `${years}년 ${months}개월`;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchProfileDetail = async () => {
      if (!partner?.id || !partner?.role || (partner.role !== 'creative' && partner.role !== 'artist' && partner.role !== 'brand')) {
        if (isMounted) {
          setMainSnsChannelUrl(null);
          setPortfolioItems([]);
          setCareerItems([]);
          setProfileDetailLoading(false);
        }
        return;
      }

      try {
        if (isMounted) setProfileDetailLoading(true);
        const profile = (await profileService.getProfile(partner.id, partner.role as any)) as any;

        if (!isMounted) return;

        setPortfolioItems(Array.isArray(profile?.portfolios) ? profile.portfolios : []);
        setCareerItems(Array.isArray(profile?.careers) ? profile.careers : []);

        if (partner.role === 'creative') {
          const channels = (profile?.sns_channels || profile?.snsChannels) as any[] | undefined;
          const main = Array.isArray(channels)
            ? channels.find((c) => c?.is_main === true || c?.isMain === true)
            : null;
          const url = (main?.url || main?.URL || null) as string | null;
          setMainSnsChannelUrl(url && typeof url === 'string' ? url : null);
        } else {
          setMainSnsChannelUrl(null);
        }
      } catch (err) {
        console.error('[PartnerDetailContent] Failed to fetch profile detail:', err);
        if (isMounted) {
          setMainSnsChannelUrl(null);
          setPortfolioItems([]);
          setCareerItems([]);
        }
      } finally {
        if (isMounted) setProfileDetailLoading(false);
      }
    };

    fetchProfileDetail();

    return () => {
      isMounted = false;
    };
  }, [partner?.id, partner?.role]);

  // 뒤로 가기 처리를 위한 ref
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const historyPushedRef = useRef(false);

  // OS/브라우저 뒤로 가기 시 모달만 닫히도록 처리
  useEffect(() => {
    if (!isModal || !partner) {
      historyPushedRef.current = false;
      return;
    }

    // 모달이 열릴 때 history에 상태 추가
    window.history.pushState({ modal: 'partnerDetail' }, '');
    historyPushedRef.current = true;

    const handlePopState = () => {
      historyPushedRef.current = false;
      onCloseRef.current?.();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // 모달이 닫힐 때 history 정리 (정상 닫기 시)
      if (historyPushedRef.current) {
        window.history.back();
        historyPushedRef.current = false;
      }
    };
  }, [isModal, partner?.id]);

  // 모달로 열렸을 때 최근 본 파트너에 기록
  useEffect(() => {
    if (isModal && partner) {
      const viewItem = {
        id: partner.id,
        type: 'partner' as const,
        title: partner.name,
        image: partner.profileImageUrl,
        subtitle: partner.role === 'brand'
          ? `브랜드 • ${partner.category || ''}`
          : partner.role === 'artist'
            ? `아티스트 • ${partner.activityField || ''}`
            : `크리에이티브 • ${partner.activityField || ''}`,
      };

      // LocalStorage에 저장 (비로그인 fallback)
      addRecentlyViewed(viewItem);

      // 로그인 사용자: 서버에도 저장
      if (user?.id) {
        addRecentlyViewedToServer(user.id, viewItem).catch((err) => {
          console.error('[PartnerDetailContent] Failed to save recently viewed to server:', err);
        });
      }
    }
  }, [isModal, partner, user?.id]);

  useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      const defaults = {
        rating: partner?.rating ?? null,
        reviewCount: partner?.reviewCount ?? 0,
        responseRate: partner?.responseRate ?? null,
        responseTime: partner?.responseTime ?? null,
        matchingRate: partner?.matchingRate ?? null,
      };
      if (!partner?.id) {
        if (isMounted) setStats(defaults);
        return;
      }

      if (isMounted) setStats(defaults);

      try {
        // Brand uses different stats function
        if (partner.role === 'brand') {
          const brandStats = await getBrandStats(partner.id);
          if (isMounted) {
            setStats({
              rating: brandStats.rating ?? defaults.rating,
              reviewCount: brandStats.reviewCount ?? defaults.reviewCount,
              responseRate: brandStats.responseRate ?? defaults.responseRate,
              responseTime: brandStats.responseTime ?? defaults.responseTime,
              matchingRate: defaults.matchingRate,
            });
          }
        } else {
          const fresh = await partnerService.getPartnerStats(partner.id);
          if (isMounted) {
            setStats({
              rating: fresh.rating ?? defaults.rating,
              reviewCount: fresh.reviewCount ?? defaults.reviewCount,
              responseRate: fresh.responseRate ?? defaults.responseRate,
              responseTime: fresh.responseTime ?? defaults.responseTime,
              matchingRate: fresh.matchingRate ?? defaults.matchingRate,
            });
          }
        }
      } catch (err) {
        console.error('[PartnerDetailContent] Failed to load partner stats:', err);
        if (isMounted) setStats(defaults);
      }
    };

    loadStats();

    return () => {
      isMounted = false;
    };
  }, [partner?.id, partner?.rating, partner?.reviewCount, partner?.responseRate, partner?.responseTime, partner?.matchingRate]);

  // 상대방이 나를 숨겼는지 확인 (Talk Request 버튼 숨김용)
  useEffect(() => {
    const checkHiddenStatus = async () => {
      if (user?.id && partner?.id && user.id !== partner.id) {
        const hidden = await BlockService.isHiddenBy(partner.id, user.id);
        setIsHiddenByPartner(hidden);
      } else {
        setIsHiddenByPartner(false);
      }
    };
    checkHiddenStatus();
  }, [user?.id, partner?.id]);

  const handleTabChange = (newValue: number) => {
    setTabValue(newValue);
  };

  // 대화 요청 버튼 표시 조건: 로그인한 사용자이고 본인이 아니며, 상대방이 나를 숨기지 않은 경우
  const showTalkRequestButton = user && partner && user.id !== partner.id && !isHiddenByPartner;

  const handleTalkRequestClick = () => {
    if (isBrandApprovalRestricted) {
      setShowApprovalOverlay(true);
      return;
    }
    // 브랜드인 경우 파트너십 문의 페이지로 이동
    if (partner?.role === 'brand' && partner?.id) {
      const targetUrl = `/partnership-inquiry/${partner.id}`;
      // 모달인 경우 history 정리 후 navigate (popstate 충돌 방지)
      if (isModal && historyPushedRef.current) {
        historyPushedRef.current = false;
        window.history.back();
        // history.back() 후 navigate 실행
        setTimeout(() => {
          navigate(targetUrl);
        }, 50);
      } else {
        navigate(targetUrl);
      }
      return;
    }
    setTalkRequestModalOpen(true);
  };

  const handleTalkRequestSubmit = async (templateMessage: string, additionalMessage?: string) => {
    if (!partner?.id) return;
    try {
      await createTalkRequest({
        receiverId: partner.id,
        templateMessage,
        additionalMessage,
      });
      setTalkRequestModalOpen(false);
      setResultModalOpen(true);
    } catch (error) {
      console.error('[PartnerDetailContent] Failed to create talk request:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('대화 요청 전송에 실패했어요');
      }
      throw error;
    }
  };

  const displayRating = stats.rating ?? partner?.rating;
  const displayReviewCount = stats.reviewCount ?? partner?.reviewCount ?? 0;
  const displayMatchingRate = stats.matchingRate ?? partner?.matchingRate;
  const displayResponseRate = stats.responseRate ?? partner?.responseRate;
  const displayResponseTime = stats.responseTime ?? partner?.responseTime;

  if (loading) {
    return (
      <Box
        sx={{
          height: '70vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <LightningLoader />
      </Box>
    );
  }

  if (!partner) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.palette.background.paper,
          gap: 2,
        }}
      >
        <Typography
          sx={{
            fontFamily: 'Pretendard, sans-serif',
            fontSize: 16,
            color: theme.palette.text.secondary,
          }}
        >
          파트너를 찾을 수 없어요.
        </Typography>
        {onClose && (
          <IconButton onClick={onClose} size="large">
            <ArrowBackIcon />
          </IconButton>
        )}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: isModal ? '70vh' : '100vh',
        maxHeight: isModal ? '70vh' : '100vh',
        backgroundColor: theme.palette.background.paper,
        position: 'relative',
        overflow: 'hidden',
        maxWidth: '768px',
        margin: isModal ? 0 : '0 auto',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: isModal ? '16px' : 0,
        paddingTop: isModal ? 0 : 0,
      }}
    >
      <IconButton
        onClick={onClose}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          color: theme.palette.icon.default,
          zIndex: 1000,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(4px)',
        }}
      >
        {isModal ? <CloseIcon /> : <ArrowBackIcon />}
      </IconButton>
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          pb: showBottomNavigation ? `${BOTTOM_NAV_HEIGHT}px` : 0,
          borderRadius: isModal ? '16px' : 0,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        }}
      >
        <Box
          sx={{
            backgroundColor: theme.palette.background.paper,
            borderRadius: isModal ? '20px' : '0 0 24px 24px',
            // boxShadow: '0px 3px 5px rgba(0,0,0,0.04)',
            boxShadow: '0px 2px 5px 0px rgba(50, 50, 105, 0.15), 0px 1px 1px 0px rgba(0, 0, 0, 0.05)',
            p: 2,
            m: 1,
            position: 'relative',
          }}
        >

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Avatar
              src={partner.profileImageUrl || undefined}
              sx={{
                width: 80,
                height: 80,
                border: '3px solid #E5E7EB',
              }}
            />

            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  sx={{
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#111827',
                  }}
                >
                  {partner.name}
                </Typography>
                <OnlineStatusText userId={partner.id} size="small" showText={false} />
                {partnerRoleLabel && (
                  <Chip
                    label={partnerRoleLabel}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: 12,
                      fontFamily: 'Pretendard, sans-serif',
                      fontWeight: 600,
                      bgcolor: partner?.role === 'creative'
                        ? theme.palette.userTypeBg.creative
                        : partner?.role === 'artist'
                          ? theme.palette.userTypeBg.artist
                          : theme.palette.userTypeBg.brand ?? '#FEF3C7',
                      color: partner?.role === 'creative'
                        ? theme.palette.userTypeText.creative
                        : partner?.role === 'artist'
                          ? theme.palette.userTypeText.artist
                          : theme.palette.userTypeText.brand ?? '#D97706',
                      border: 'none',
                    }}
                  />
                )}
              </Box>

              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 14,
                  fontWeight: 500,
                  color: theme.palette.text.secondary,
                }}
              >
                {displayActivityField}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <StarIcon sx={{ fontSize: 16, color: '#FBBF24' }} />
                  <Typography
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#111827',
                    }}
                  >
                    {displayRating ?? '–'}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 13,
                      color: theme.palette.text.secondary,
                    }}
                  >
                    ({displayReviewCount})
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 14,
                    fontWeight: 600,
                    color: theme.palette.primary.main,
                  }}
                >
                  {displayMatchingRate !== null && displayMatchingRate !== undefined ? `${displayMatchingRate}% 매칭` : '매칭 정보 없음'}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 14,
              color: '#374151',
              lineHeight: 1.6,
              mb: 2,
            }}
          >
            {partner.bio}
          </Typography>

          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
            {displayTags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                sx={{
                  height: 28,
                  fontSize: 13,
                  fontFamily: 'Pretendard, sans-serif',
                  fontWeight: 500,
                  backgroundColor: theme.palette.bgColor.default,
                  color: theme.palette.subText.default,
                  border: 'none',
                }}
              />
            ))}
          </Box>

          {partner.role === 'creative' && mainSnsChannelUrl && (
            <Box
              sx={{
                p: 2,
                mb: 2,
                borderRadius: '12px',
                backgroundColor: theme.palette.bgColor.default,
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#111827',
                  mb: 0.5,
                }}
              >
                대표채널
              </Typography>
              <Typography
                component="a"
                href={mainSnsChannelUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 13,
                  color: theme.palette.primary.main,
                  textDecoration: 'none',
                  wordBreak: 'break-all',
                }}
              >
                {mainSnsChannelUrl}
              </Typography>
            </Box>
          )}

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-around',
              py: 2,
              backgroundColor: theme.palette.bgColor.default,
              borderRadius: '12px',
              mb: 2,
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 12,
                  color: theme.palette.text.secondary,
                  mb: 0.5,
                }}
              >
                경력
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#111827',
                }}
              >
                {partner.role === 'brand'
                  ? (brandData?.establishedAt
                    ? (() => {
                      const start = new Date(brandData.establishedAt);
                      const now = new Date();
                      let months = (now.getFullYear() - start.getFullYear()) * 12;
                      months -= start.getMonth();
                      months += now.getMonth();

                      const years = Math.floor(months / 12);
                      const remainingMonths = months % 12;

                      if (years > 0) return `${years}년 ${remainingMonths}개월`;
                      return `${remainingMonths}개월`;
                    })()
                    : '-')
                  : calculateTotalCareerPeriod(careerItems)
                }
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 12,
                  color: theme.palette.text.secondary,
                  mb: 0.5,
                }}
              >
                응답률
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#111827',
                }}
              >
                {displayResponseRate !== null && displayResponseRate !== undefined ? `${displayResponseRate}%` : '정보 없음'}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 12,
                  color: theme.palette.text.secondary,
                  mb: 0.5,
                }}
              >
                응답시간
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#111827',
                }}
              >
                {displayResponseTime ?? '정보 없음'}
              </Typography>
            </Box>
          </Box>

          {showTalkRequestButton && (
            <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <Button
                onClick={handleTalkRequestClick}
                sx={{
                  width: '50%',
                  height: 41,
                  fontSize: 14,
                  fontFamily: 'Pretendard, sans-serif',
                  fontWeight: 400,
                  color: '#fff',
                  backgroundColor: theme.palette.primary.main,
                  borderRadius: '24px',
                  textTransform: 'none',
                }}
              >
                {partner?.role === 'brand' ? '파트너십 문의' : '대화 요청'}
              </Button>
            </Box>
          )}
        </Box>

        <Box sx={{
          borderRadius: '16px', mx: 2, mb: 2, mt: 3,
        }}>
          <TabBar
            tabs={[
              { key: 0, label: '포트폴리오' },
              { key: 1, label: partner?.role === 'brand' ? '히스토리' : '경력' },
              { key: 2, label: '리뷰' },
            ]}
            activeTab={tabValue}
            onTabChange={handleTabChange}
          />

          <TabPanel value={tabValue} index={0}>
            {profileDetailLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <LightningLoader size={24} />
              </Box>
            ) : portfolioItems.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center', color: theme.palette.text.secondary, fontSize: 13 }}>
                등록된 작업물이 없어요.
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {portfolioItems.map((item, index) => (
                  <Paper
                    key={index}
                    elevation={0}
                    sx={{
                      p: 2,
                      boxShadow: '0px 2px 5px 0px rgba(50, 50, 105, 0.15), 0px 1px 1px 0px rgba(0, 0, 0, 0.05)',
                      borderRadius: '16px',
                      display: 'flex',
                      gap: 2,
                    }}
                  >
                    <Box
                      sx={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '8px',
                        bgcolor: '#F3F4F6',
                        backgroundImage: item.coverImage ? `url(${item.coverImage})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        flexShrink: 0,
                      }}
                    />

                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 16, mb: 0.5 }}>
                        {item.title}
                      </Typography>

                      <Typography sx={{ fontSize: 12, color: '#6B7280', mb: 0.5 }}>
                        {formatDate(item.performed_YM)}
                      </Typography>

                      <Typography sx={{ fontSize: 13, color: '#374151', mb: 1 }}>
                        {item.category}
                      </Typography>

                      <Box sx={{ mb: 1 }}>
                        <Typography
                          sx={{
                            fontSize: 13,
                            color: '#6B7280',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: expandedDescriptions.has(index) ? 'unset' : 2,
                            WebkitBoxOrient: 'vertical',
                            lineHeight: 1.5,
                          }}
                        >
                          {item.description}
                        </Typography>
                        {item.description && item.description.length > 100 && (
                          <Button
                            onClick={() => {
                              const newExpanded = new Set(expandedDescriptions);
                              if (newExpanded.has(index)) {
                                newExpanded.delete(index);
                              } else {
                                newExpanded.add(index);
                              }
                              setExpandedDescriptions(newExpanded);
                            }}
                            sx={{
                              fontSize: 12,
                              fontWeight: 500,
                              color: '#3B82F6',
                              textTransform: 'none',
                              minWidth: 'auto',
                              p: 0,
                              mt: 0.5,
                              '&:hover': {
                                backgroundColor: 'transparent',
                                textDecoration: 'underline',
                              },
                            }}
                          >
                            {expandedDescriptions.has(index) ? '접기' : '더 보기'}
                          </Button>
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(item.skills || []).map((skill, idx) => (
                          <Chip
                            key={idx}
                            label={skill}
                            size="small"
                            sx={{ bgcolor: '#F3F4F6', color: '#4B5563', fontSize: 11, height: 20 }}
                          />
                        ))}
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {profileDetailLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <LightningLoader size={24} />
              </Box>
            ) : careerItems.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center', color: theme.palette.text.secondary, fontSize: 13 }}>
                등록된 경력이 없어요.
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {careerItems.map((item, index) => (
                  <Paper
                    key={index}
                    elevation={0}
                    sx={{
                      p: 2,
                      boxShadow: '0px 2px 5px 0px rgba(50, 50, 105, 0.15), 0px 1px 1px 0px rgba(0, 0, 0, 0.05)',
                      borderRadius: '16px',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
                        {item.companyName}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: '#6B7280' }}>
                        {formatPeriodToKorean(item.period)}
                      </Typography>
                    </Box>

                    <Typography sx={{ fontSize: 14, color: '#374151', mb: 1, fontWeight: 500 }}>
                      {item.position}
                    </Typography>

                    <Box sx={{ mb: 1.5 }}>
                      <Typography
                        sx={{
                          fontSize: 13,
                          color: '#6B7280',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: expandedCareerDescriptions.has(index) ? 'unset' : 2,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: 1.5,
                        }}
                      >
                        {item.description}
                      </Typography>
                      {item.description && item.description.length > 100 && (
                        <Button
                          onClick={() => {
                            const newExpanded = new Set(expandedCareerDescriptions);
                            if (newExpanded.has(index)) {
                              newExpanded.delete(index);
                            } else {
                              newExpanded.add(index);
                            }
                            setExpandedCareerDescriptions(newExpanded);
                          }}
                          sx={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: '#3B82F6',
                            textTransform: 'none',
                            minWidth: 'auto',
                            p: 0,
                            mt: 0.5,
                            '&:hover': {
                              backgroundColor: 'transparent',
                              textDecoration: 'underline',
                            },
                          }}
                        >
                          {expandedCareerDescriptions.has(index) ? '접기' : '더 보기'}
                        </Button>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(item.skills || []).map((skill, idx) => (
                        <Chip
                          key={idx}
                          label={skill}
                          size="small"
                          sx={{ bgcolor: '#F3F4F6', color: '#4B5563', fontSize: 11, height: 20 }}
                        />
                      ))}
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </TabPanel>

          {/* 리뷰 탭 */}
          <TabPanel value={tabValue} index={2}>
            {partner && <PartnerReviewTabContent partnerId={partner.id} />}
          </TabPanel>
        </Box>
      </Box>

      {showBottomNavigation && <BottomNavigationBar />}

      {showApprovalOverlay && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: `${BOTTOM_NAV_HEIGHT}px`,
            backgroundColor: '#fff',
            zIndex: 2000,
          }}
        >
          <IconButton
            onClick={() => setShowApprovalOverlay(false)}
            sx={{ position: 'absolute', top: 12, left: 12, zIndex: 2001 }}
            aria-label="뒤로가기"
          >
            <ArrowBackIosNewRoundedIcon />
          </IconButton>
          <PendingApprovalNotice status="pending" />
        </Box>
      )}

      {/* 대화 요청 모달 */}
      <TalkRequestModal
        open={talkRequestModalOpen}
        onClose={() => setTalkRequestModalOpen(false)}
        onSubmit={handleTalkRequestSubmit}
        partnerName={partner?.name || ''}
      />

      {/* 대화 요청 완료 결과 모달 */}
      <ActionSuccessModal
        open={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        message="파트너에게 연결요청을 보냈어요."
      />
    </Box>
  );
}



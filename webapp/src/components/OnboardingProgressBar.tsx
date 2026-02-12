import { useLocation, useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';

// 프로필 타입별 단계 정의
const PROFILE_STEPS: Record<string, string[]> = {
  brand: ['name', 'details', 'images', 'collaboration', 'businessInfo', 'complete', 'recommendation'],
  fan: ['image', 'interests', 'persona', 'specificInterests', 'preferredRegions', 'complete'],
  creative: ['image', 'addChannels', 'acquisition_source', 'complete'],
  artist: ['name', 'additionalInfo', 'complete'],
};

const STEP_ROUTES: Record<string, Record<string, string>> = {
  brand: {
    name: '/onboarding/brand/name',
    details: '/onboarding/brand/details',
    images: '/onboarding/brand/images',
    collaboration: '/onboarding/brand/collaboration',
    businessInfo: '/onboarding/brand/business-info',
    complete: '/onboarding/brand/complete',
    recommendation: '/onboarding/brand/recommendation',
  },
  fan: {
    image: '/onboarding/fan/image',
    interests: '/onboarding/fan/interests',
    persona: '/onboarding/fan/persona',
    specificInterests: '/onboarding/fan/specificInterests',
    preferredRegions: '/onboarding/fan/preferredRegions',
    complete: '/onboarding/fan/complete',
  },
  creative: {
    image: '/onboarding/creative/image',
    addChannels: '/onboarding/creative/addChannels',
    acquisition_source: '/onboarding/creative/acquisitionSource',
    complete: '/onboarding/creative/complete',
  },
  artist: {
    name: '/onboarding/artist/name',
    additionalInfo: '/onboarding/artist/additionalInfo',
    complete: '/onboarding/artist/complete',
  },
};

// 진행바 컨테이너
const ProgressBarContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '4px', // 간격을 10px로 고정
  padding: theme.spacing(0, 1),
  paddingTop: theme.spacing(2.5),
  paddingBottom: theme.spacing(2.5),
  width: '100%',
  minHeight: '32px', // 최소 높이 증가
  boxSizing: 'border-box',
  [theme.breakpoints.up('sm')]: {
    gap: '4px', // PC에서도 10px 유지
    padding: theme.spacing(2, 3),
    paddingTop: theme.spacing(3),
    paddingBottom: theme.spacing(3),
    minHeight: '40px',
  },
}));

// 진행바 세그먼트
const ProgressSegment = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'iscompleted' && prop !== 'iscurrent',
})<{
  iscompleted: boolean;
  iscurrent: boolean;
}>(({ theme, iscompleted, iscurrent }) => {
  let backgroundColor = theme.palette.status.default; // 기본 회색 (미완료)
  if (iscompleted) {
    backgroundColor = theme.palette.primary.main; // 진한 파란색 (완료)
  } else if (iscurrent) {
    backgroundColor = theme.palette.transparent.blue; // 연한 파란색 (현재)
  }

  return {
    width: '100%', // 부모(Wrapper)의 너비에 맞춰 가득 채움
    height: '6px', // 높이 증가
    borderRadius: '4px',
    backgroundColor,
    transition: 'background-color 0.3s ease, transform 0.2s ease',
    [theme.breakpoints.up('sm')]: {
      height: '14px',
      borderRadius: '7px',
    },
  };
});

const SegmentWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'clickable',
})<{ clickable: boolean }>(({ clickable, theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'stretch',
  flex: 1, // 화면 너비에 따라 자동으로 늘어나고 줄어듬
  // minWidth: '24px', // 최소 너비 보장 (너무 작아지면 제거 가능)
  cursor: clickable ? 'pointer' : 'default',
  transition: 'opacity 0.2s ease',
  padding: '2px',
  '&:focus-visible': {
    outline: clickable ? `2px solid ${theme.palette.primary.main}` : 'none',
    borderRadius: '6px',
    outlineOffset: '2px',
  },
}));

interface OnboardingProgressBarProps {
  onNavigateFallback?: () => void;
}

export default function OnboardingProgressBar({ onNavigateFallback }: OnboardingProgressBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  // 현재 경로에서 프로필 타입과 단계 추출
  const getCurrentStep = () => {
    // 정규식으로 경로에서 프로필 타입과 단계 추출
    const match = pathname.match(/\/onboarding\/(brand|fan|creative|artist)\/(.+)/);
    if (!match) {
      return null;
    }

    const [, profileType] = match;
    const routes = STEP_ROUTES[profileType];
    const steps = PROFILE_STEPS[profileType];

    if (!routes || !steps) {
      return null;
    }

    // 경로에서 stepKey 찾기 (역 매핑)
    let matchedStepKey: string | null = null;
    for (const [stepKey, routePath] of Object.entries(routes)) {
      if (pathname === routePath) {
        matchedStepKey = stepKey;
        break;
      }
    }

    if (!matchedStepKey) {
      return null;
    }

    const currentIndex = steps.indexOf(matchedStepKey);
    if (currentIndex === -1) {
      return null;
    }

    return {
      profileType,
      currentIndex,
      totalsteps: steps.length,
      steps,
    };
  };

  const stepInfo = getCurrentStep();

  // 온보딩 단계가 아니면 진행바를 표시하지 않음
  if (!stepInfo) {
    return null;
  }

  const { currentIndex, totalsteps, steps, profileType } = stepInfo;

  return (
    <ProgressBarContainer>
      {Array.from({ length: totalsteps }).map((_, index) => {
        const iscompleted = index < currentIndex;
        const iscurrent = index === currentIndex;
        const stepKey = steps[index];
        const targetRoute = STEP_ROUTES[profileType]?.[stepKey];
        const canNavigate = !!targetRoute && index <= currentIndex;

        return (
          <SegmentWrapper
            key={index}
            clickable={canNavigate}
            role={canNavigate ? 'button' : undefined}
            tabIndex={canNavigate ? 0 : -1}
            aria-current={iscurrent ? 'step' : undefined}
            onClick={() => {
              if (canNavigate && targetRoute) {
                navigate(targetRoute);
              } else if (!targetRoute && onNavigateFallback && iscompleted) {
                onNavigateFallback();
              }
            }}
            onKeyDown={(event) => {
              if (!canNavigate || !targetRoute) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigate(targetRoute);
              }
            }}
          >
            <ProgressSegment
              iscompleted={iscompleted}
              iscurrent={iscurrent}
            />
          </SegmentWrapper>
        );
      })}
    </ProgressBarContainer>
  );
}

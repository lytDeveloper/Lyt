import { type ReactNode, useEffect } from 'react';
import { type SxProps, type Theme } from '@mui/material';
import OnboardingProgressBar from '../OnboardingProgressBar';
import {
  PageContainer,
  ContentContainer,
  ScrollableForm
} from '../../styles/onboarding/common.styles';
import { useTheme } from '@mui/material/styles';

export interface OnboardingLayoutProps {
  /** Content to render inside the layout */
  children: ReactNode;

  /** Callback when close button is clicked (defaults to window.history.back()) */
  onClose?: () => void;

  /** Whether to show the progress bar (defaults to true) */
  showProgressBar?: boolean;

  /** Whether the content should be scrollable (defaults to false) */
  scrollable?: boolean;

  /** Custom content container styles */
  contentSx?: SxProps<Theme>;

  /** Custom page container styles */
  containerSx?: SxProps<Theme>;
}

/**
 * Shared layout wrapper for onboarding pages
 * Provides consistent structure with progress bar and close button
 *
 * @example
 * ```tsx
 * <OnboardingLayout>
 *   <TitleSection>
 *     <PageTitle>브랜드의 이름을 알려주세요.</PageTitle>
 *     <PageSubtitle>브랜드 이름은 사용자에게 보여질 대표 이름이에요.</PageSubtitle>
 *   </TitleSection>
 *
 *   <InputWrapper>
 *     <StyledTextField
 *       value={brandName}
 *       onChange={(e) => setBrandName(e.target.value)}
 *       placeholder="브랜드 이름 입력"
 *     />
 *   </InputWrapper>
 *
 *   <OnboardingButton
 *     disabled={!brandName}
 *     onClick={() => handleSubmit({ brandName })}
 *   >
 *     확인
 *   </OnboardingButton>
 * </OnboardingLayout>
 * ```
 */
export default function OnboardingLayout({
  children,
  onClose,
  showProgressBar = true,
  scrollable = false,
  contentSx,
  containerSx
}: OnboardingLayoutProps) {
  const theme = useTheme();

  // 컴포넌트 마운트 시 스크롤 위치를 맨 위로 (페이지 전환 시 헤더 컷오프 방지)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <PageContainer
      sx={{
        backgroundColor: theme.palette.background.default,
        px: { xs: 3, sm: 4, md: 5 },
        paddingTop: { xs: 3, sm: 4 },
        paddingBottom: { xs: 'calc(24px + env(safe-area-inset-bottom))', sm: 'calc(32px + env(safe-area-inset-bottom))' },

        ...containerSx
      }}
    >
      {/* Progress Bar */}
      {showProgressBar && <OnboardingProgressBar onNavigateFallback={onClose} />}

      {/* Content */}
      {scrollable ? (
        <ScrollableForm sx={contentSx} my={3}>
          {children}
        </ScrollableForm>
      ) : (
        <ContentContainer
          sx={{
            justifyContent: 'flex-start',
            gap: 1,
            ...contentSx
          }}
        >
          {children}
        </ContentContainer>
      )}
    </PageContainer>
  );
}

import { type ReactNode } from 'react';
import { type SxProps, type Theme } from '@mui/material';
import {
  ButtonContainer,
  ButtonWrapper,
  ConfirmButton
} from '../../styles/onboarding/common.styles';
import { LightningLoader } from '../common';

export interface OnboardingButtonProps {
  /** Button text or content */
  children: ReactNode;

  /** Whether the button is disabled */
  disabled?: boolean;

  /** Whether to show loading state */
  loading?: boolean;

  /** Click handler */
  onClick: () => void;

  /** Button variant (defaults to 'contained') */
  variant?: 'contained' | 'outlined' | 'text';

  /** Full width button (defaults to true) */
  fullWidth?: boolean;

  /** Custom button styles */
  sx?: SxProps<Theme>;

  /** Loading text (shown when loading is true) */
  loadingText?: string;
}

/**
 * Standardized button component for onboarding pages
 * Provides consistent styling and loading states
 *
 * @example
 * ```tsx
 * <OnboardingButton
 *   disabled={!isFormValid}
 *   loading={isSubmitting}
 *   onClick={handleSubmit}
 * >
 *   확인
 * </OnboardingButton>
 * ```
 */
export default function OnboardingButton({
  children,
  disabled = false,
  loading = false,
  onClick,
  variant = 'contained',
  fullWidth = true,
  sx,
  loadingText = '처리 중...'
}: OnboardingButtonProps) {
  return (
    <ButtonContainer>
      <ButtonWrapper>
        <ConfirmButton
          fullWidth={fullWidth}
          variant={variant}
          disabled={disabled || loading}
          onClick={onClick}
          sx={sx}
        >
          {loading ? (
            <>
              <LightningLoader
                size={20}
                color="white"
              />
              {loadingText}
            </>
          ) : (
            children
          )}
        </ConfirmButton>
      </ButtonWrapper>
    </ButtonContainer>
  );
}

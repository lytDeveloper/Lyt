import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface UseOnboardingStepOptions {
  /** Next route to navigate to on successful submission */
  nextRoute: string;

  /** Previous route to navigate to on back (if specified, uses navigate instead of history.back()) */
  prevRoute?: string;

  /** Validation function - can return boolean or ValidationResult object */
  validate?: () => boolean | ValidationResult;

  /** Callback to execute before navigation (e.g., save to store) */
  onSubmit?: () => void;

  /** Callback to execute on validation failure - receives error message if available */
  onValidationError?: (errorMessage?: string) => void;
}

export interface UseOnboardingStepReturn {
  /** Navigate function from react-router-dom */
  navigate: ReturnType<typeof useNavigate>;

  /** Handle form submission with validation and navigation */
  handleSubmit: () => void;

  /** Navigate to previous page */
  handleGoBack: () => void;

  /** Navigate to next route without validation */
  handleSkip: () => void;
}

/**
 * Custom hook for managing onboarding step navigation and validation
 * Provides consistent navigation patterns across all onboarding steps
 *
 * @example
 * ```tsx
 * const { handleSubmit, handleGoBack } = useOnboardingStep({
 *   nextRoute: '/onboarding/brand/details',
 *   validate: () => {
 *     if (!name) return { isValid: false, error: '이름을 입력해주세요' };
 *     return { isValid: true };
 *   },
 *   onValidationError: (error) => alert(error),
 *   onSubmit: () => setBrandName(name)
 * });
 * ```
 */
export function useOnboardingStep(
  options: UseOnboardingStepOptions
): UseOnboardingStepReturn {
  const {
    nextRoute,
    prevRoute,
    validate,
    onSubmit,
    onValidationError
  } = options;

  const navigate = useNavigate();

  const handleSubmit = useCallback(() => {
    // Run validation if provided
    if (validate) {
      const result = validate();

      // Handle both boolean and ValidationResult return types
      if (typeof result === 'boolean') {
        if (!result) {
          onValidationError?.();
          return;
        }
      } else {
        if (!result.isValid) {
          if (onValidationError) {
            onValidationError(result.error);
          }
          return;
        }
      }
    }

    // Execute onSubmit callback (e.g., save to store)
    onSubmit?.();

    // Navigate to next step
    navigate(nextRoute);
  }, [validate, onSubmit, navigate, nextRoute, onValidationError]);

  const handleGoBack = useCallback(() => {
    if (prevRoute) {
      navigate(prevRoute);
    } else {
      window.history.back();
    }
  }, [prevRoute, navigate]);

  const handleSkip = useCallback(() => {
    navigate(nextRoute);
  }, [navigate, nextRoute]);

  return {
    navigate,
    handleSubmit,
    handleGoBack,
    handleSkip
  };
}

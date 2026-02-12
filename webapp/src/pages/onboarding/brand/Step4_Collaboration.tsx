import { useState, useEffect } from 'react';
import { MenuItem } from '@mui/material';
import { useBrandOnboardingStore } from '../../../stores/onboarding/useBrandOnboardingStore';
import { useOnboardingStep } from '../../../hooks/useOnboardingStep';
import { useMultiSelect } from '../../../hooks/useMultiSelect';
import OnboardingLayout from '../../../components/onboarding/OnboardingLayout';
import OnboardingButton from '../../../components/onboarding/OnboardingButton';
import ChipSelector from '../../../components/common/ChipSelector';
import { PageTitle, SubLabel } from '../../../styles/onboarding/common.styles';
import { FormSection, InfoText } from '../../../styles/onboarding/form.styles';
import { StyledSelect, ScrollableForm } from './Step4_Collaboration.styles';

// 협업 방식 옵션
const collaborationTypes = ['공동구매', '유료광고', '이벤트', '굿즈제작', '제품협찬', '프로젝트'];

// 예산 규모 옵션
const budgetRanges = ['100만원 이하', '100-500만원', '500-1,000만원', '1,000만원 이상'];

export default function Step4_Collaboration() {
  const { collaborationTypes: storedTypes, monthlyBudget, setCollaboration } = useBrandOnboardingStore();

  const collaborations = useMultiSelect({
    initial: storedTypes,
    min: 1,
  });

  const [budget, setBudget] = useState(monthlyBudget);

  // Sync local state when store value changes
  useEffect(() => {
    setBudget(monthlyBudget);
  }, [monthlyBudget]);

  const { handleSubmit, handleGoBack } = useOnboardingStep({
    nextRoute: '/onboarding/brand/business-info',
    validate: () => {
      if (!collaborations.isValid) {
        return { isValid: false, error: '협업 방식을 최소 1개 선택해 주세요.' };
      }
      if (!budget) {
        return { isValid: false, error: '월 마케팅 예산 규모를 선택해 주세요.' };
      }
      return { isValid: true };
    },
    onValidationError: (error) => {
      if (error) alert(error);
    },
    onSubmit: () => {
      setCollaboration(collaborations.selected, budget);
    },
  });

  const isFormValid = collaborations.isValid && budget;

  return (
    <OnboardingLayout onClose={handleGoBack} showProgressBar scrollable>
      <ScrollableForm>
        <PageTitle>원하시는 협업 방식을 알려주세요.</PageTitle>
        <SubLabel style={{ marginBottom: '24px' }}>
          선호 협업 유형을 선택해 주세요. (복수 선택 가능)
        </SubLabel>

        {/* 협업 방식 선택 */}
        <FormSection>
          <ChipSelector
            options={collaborationTypes}
            selected={collaborations.selected}
            onToggle={collaborations.toggle}
          />
        </FormSection>

        {/* 예산 규모 선택 */}
        <FormSection>
          <SubLabel style={{ marginBottom: '16px' }}>
            월 마케팅 예산 규모를 알려주세요.
            <br />
            정확하지 않아도 괜찮아요. 대략적으로 알려주세요!
          </SubLabel>
          <StyledSelect
            value={budget}
            onChange={(e) => setBudget(e.target.value as string)}
            displayEmpty
            renderValue={(selected) => {
              if (!selected) {
                return <span style={{ color: '#949196' }}>선택해 주세요.</span>;
              }
              return selected as string;
            }}
          >
            <MenuItem value="" disabled>
              선택해 주세요.
            </MenuItem>
            {budgetRanges.map((range) => (
              <MenuItem key={range} value={range}>
                {range}
              </MenuItem>
            ))}
          </StyledSelect>
        </FormSection>

        {/* 안내문 */}
        <InfoText>
          가입 이후 언제든 변경 가능하니 너무 고민하지 마세요!
        </InfoText>
      </ScrollableForm>

      {/* 하단 버튼 */}
      <OnboardingButton
        disabled={!isFormValid}
        onClick={handleSubmit}
      >
        확인
      </OnboardingButton>
    </OnboardingLayout>
  );
}


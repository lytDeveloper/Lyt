import { useState, useEffect, useMemo } from 'react';
import { MenuItem } from '@mui/material';
import { useBrandOnboardingStore } from '../../../stores/onboarding/useBrandOnboardingStore';
import { useCommonOnboardingStore } from '../../../stores/onboarding/useCommonOnboardingStore';
import { useOnboardingStep } from '../../../hooks/useOnboardingStep';
import { useMultiSelect } from '../../../hooks/useMultiSelect';
import ChipSelector from '../../../components/common/ChipSelector';
import ActivityFieldKeywordPicker from '../../../components/onboarding/ActivityFieldKeywordPicker';
import OnboardingLayout from '../../../components/onboarding/OnboardingLayout';
import OnboardingButton from '../../../components/onboarding/OnboardingButton';
import { ScrollableForm } from '../../../styles/onboarding/common.styles';
import { getCreatorTypesByActivityField } from '../../../constants/brandCreatorTypes';
import {
  PageTitle,
  PageSubtitle,
  FormSection,
  SectionLabel,
  SubLabel,
  StyledSelect,
  ChipGroup,
  StyledChip,
} from './Step2_Details.styles';

// 활동 분야 옵션
const activityFields = ['음악', '패션', '뷰티', '콘텐츠', '마켓', '재테크', '라이브쇼핑', '이벤트', '문화', '디지털', '라이프', '힐링'];
const generations = ['10대', '20대', '30대', '40대 이상'];

export default function Step2_Details() {
  const setDetails = useBrandOnboardingStore((state) => state.setDetails);
  const storedActivityField = useBrandOnboardingStore((state) => state.activityField);
  const storedTargetAudiences = useBrandOnboardingStore((state) => state.targetAudiences);
  const storedPreferredCreatorTypes = useBrandOnboardingStore((state) => state.preferredCreatorTypes);

  const [activityField, setActivityField] = useState(storedActivityField);

  const {
    selected: selectedGenerations,
    toggle: toggleGeneration,
    isValid: isGenerationsValid,
  } = useMultiSelect({
    initial: storedTargetAudiences,
    min: 1,
  });

  const [selectedCreators, setSelectedCreators] = useState<string[]>(storedPreferredCreatorTypes);
  const selectedKeywords = useCommonOnboardingStore((state) => state.selectedKeywords);

  // activityField에 따른 동적 크리에이터 타입 목록
  const availableCreatorTypes = useMemo(() => {
    return getCreatorTypesByActivityField(activityField);
  }, [activityField]);

  // Sync local state when store values change
  useEffect(() => {
    setActivityField(storedActivityField);
  }, [storedActivityField]);

  useEffect(() => {
    setSelectedCreators(storedPreferredCreatorTypes);
  }, [storedPreferredCreatorTypes]);

  // activityField 변경 시 선택된 크리에이터 타입 필터링 (새 목록에 없는 항목 제거)
  useEffect(() => {
    if (activityField && availableCreatorTypes.length > 0) {
      setSelectedCreators((prev) =>
        prev.filter((creator) => availableCreatorTypes.includes(creator))
      );
    }
  }, [activityField, availableCreatorTypes]);

  const handleCreatorToggle = (creator: string) => {
    setSelectedCreators((prev) =>
      prev.includes(creator)
        ? prev.filter((c) => c !== creator)
        : [...prev, creator]
    );
  };

  const validate = () => {
    return !!activityField && isGenerationsValid && selectedCreators.length > 0 && selectedKeywords.length > 0;
  };

  const { handleSubmit } = useOnboardingStep({
    nextRoute: '/onboarding/brand/images',
    validate,
    onSubmit: () => {
      setDetails(activityField, selectedGenerations, selectedCreators);
    },
  });

  return (
    <OnboardingLayout scrollable>
      <ScrollableForm >
        {/* 타이틀 */}
        <PageTitle >어떤 분야에서 활동하시나요?</PageTitle>
        <PageSubtitle >
          정확한 타겟 설정은 성공적인 협업으로 이어져요!
        </PageSubtitle>

        {/* 카테고리 선택 */}
        <FormSection >
          <StyledSelect
            value={activityField}
            onChange={(e) => setActivityField(e.target.value as string)}
            displayEmpty
            renderValue={(selected) => {
              if (!selected) {
                return <span style={{ color: '#949196' }}>선택해 주세요</span>;
              }
              return selected as string;
            }}
          >
            <MenuItem value="" disabled>
              선택해 주세요.
            </MenuItem>
            {activityFields.map((field) => (
              <MenuItem key={field} value={field}>
                {field}
              </MenuItem>
            ))}
          </StyledSelect>

          {activityField ? (
            <ActivityFieldKeywordPicker activityField={activityField} />
          ) : null}
        </FormSection>

        {/* 세대 선택 */}
        <FormSection >
          <SectionLabel>누구와 함께하고 싶으신가요?</SectionLabel>
          <SubLabel >주요 타겟 고객 (복수 선택 가능)</SubLabel>
          <ChipSelector
            options={generations}
            selected={selectedGenerations}
            onToggle={toggleGeneration}
          />
        </FormSection>

        {/* 크리에이터 타입 선택 */}
        <FormSection >
          <SubLabel >선호 크리에이터 분야 (복수 선택 가능)</SubLabel>
          <StyledSelect
            value=""
            onChange={(e) => {
              const value = e.target.value as string;
              if (value && !selectedCreators.includes(value)) {
                setSelectedCreators([...selectedCreators, value]);
              }
            }}
            displayEmpty
            renderValue={() => <span style={{ color: '#949196' }}>선택해 주세요</span>}
            disabled={!activityField || availableCreatorTypes.length === 0}
          >
            <MenuItem value="" disabled>
              {activityField ? '선택해 주세요.' : '먼저 활동 분야를 선택해 주세요.'}
            </MenuItem>
            {availableCreatorTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </StyledSelect>

          {/* 선택된 크리에이터 칩 표시 */}
          {selectedCreators.length > 0 && (
            <ChipGroup>
              {selectedCreators.map((creator) => (
                <StyledChip
                  key={creator}
                  label={creator}
                  selected={true}
                  onDelete={() => handleCreatorToggle(creator)}
                />
              ))}
            </ChipGroup>
          )}
        </FormSection>
      </ScrollableForm>

      {/* 하단 버튼 */}
      <OnboardingButton
        disabled={!validate()}
        onClick={handleSubmit}
      >
        확인
      </OnboardingButton>
    </OnboardingLayout>
  );
}

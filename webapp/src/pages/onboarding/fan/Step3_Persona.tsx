import { useState, useEffect, useMemo } from 'react';
import { useCommonOnboardingStore } from '../../../stores/onboarding/useCommonOnboardingStore';
import { useFanOnboardingStore } from '../../../stores/onboarding/useFanOnboardingStore';
import { useOnboardingStep } from '../../../hooks/useOnboardingStep';
import OnboardingLayout from '../../../components/onboarding/OnboardingLayout';
import OnboardingButton from '../../../components/onboarding/OnboardingButton';
import { PageTitle, PageSubtitle } from '../../../styles/onboarding/common.styles';
import {
  OptionList,
  RadioOptionItem,
  RadioButton,
  OptionLabel,
  OptionDescription,
  InfoText,
  InfoTextBold,
} from './Step3_Persona.styles';
import { USER_TYPE_OPTIONS, type UserTypeOption } from '../../../constants/userTypeOptions';

/**
 * Fisher-Yates shuffle algorithm
 * 배열을 무작위로 섞음
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 선택된 관심사에 따라 랜덤 옵션 생성
 * - 1개 선택: 해당 카테고리에서 6개 랜덤
 * - 2개 선택: 각 카테고리에서 3개씩 (총 6개)
 * - 3개 선택: 각 카테고리에서 2개씩 (총 6개)
 */
function selectRandomOptions(interests: string[]): UserTypeOption[] {
  if (!interests || interests.length === 0) {
    return [];
  }

  const categories = interests;

  if (categories.length === 0) {
    return [];
  }

  const selectedOptions: UserTypeOption[] = [];

  if (categories.length === 1) {
    // 1개 선택: 해당 카테고리 10개 중 6개 랜덤
    const categoryOptions = USER_TYPE_OPTIONS.filter(opt => opt.category === categories[0]);
    const shuffled = shuffleArray(categoryOptions);
    selectedOptions.push(...shuffled.slice(0, 6));
  } else if (categories.length === 2) {
    // 2개 선택: 각 3개씩 (총 6개)
    categories.forEach(category => {
      const categoryOptions = USER_TYPE_OPTIONS.filter(opt => opt.category === category);
      const shuffled = shuffleArray(categoryOptions);
      selectedOptions.push(...shuffled.slice(0, 3));
    });
  } else if (categories.length === 3) {
    // 3개 선택: 각 2개씩 (총 6개)
    categories.forEach(category => {
      const categoryOptions = USER_TYPE_OPTIONS.filter(opt => opt.category === category);
      const shuffled = shuffleArray(categoryOptions);
      selectedOptions.push(...shuffled.slice(0, 2));
    });
  } else {
    // 4개 이상 선택된 경우: 처음 3개 카테고리에서 각 2개씩
    const firstThreeCategories = categories.slice(0, 3);
    firstThreeCategories.forEach(category => {
      const categoryOptions = USER_TYPE_OPTIONS.filter(opt => opt.category === category);
      const shuffled = shuffleArray(categoryOptions);
      selectedOptions.push(...shuffled.slice(0, 2));
    });
  }

  return selectedOptions;
}

export default function Step3_Persona() {
  const nickname = useCommonOnboardingStore((state) => state.nickname);
  const interests = useFanOnboardingStore((state) => state.interests);
  const persona = useFanOnboardingStore((state) => state.persona);
  const setPersona = useFanOnboardingStore((state) => state.setPersona);

  const [selectedPersona, setSelectedPersona] = useState<string>(persona || '');

  // interests 기반 동적 옵션 생성 (useMemo로 최적화)
  const displayedOptions = useMemo(() => {
    return selectRandomOptions(interests || []);
  }, [interests]);

  // Sync local state when store value changes
  useEffect(() => {
    setSelectedPersona(persona || '');
  }, [persona]);

  const handleSelect = (id: string) => {
    setSelectedPersona(id);
  };

  const validate = () => !!selectedPersona;

  const onSubmit = () => {
    setPersona(selectedPersona);
  };

  const { handleSubmit } = useOnboardingStep({
    nextRoute: '/onboarding/fan/specificInterests',
    validate,
    onSubmit,
  });

  return (
    <OnboardingLayout scrollable>
      <PageTitle>{nickname}님은 어떤 사람인가요!?</PageTitle>
      <PageSubtitle>
        가장 잘 맞는 역할을 선택해보세요.
        <br />
        맞춤형 콘텐츠를 추천해드릴게요!
      </PageSubtitle>

      {/* 옵션 리스트 */}
      <OptionList>
        {displayedOptions.map((option) => {
          const isSelected = selectedPersona === option.id;
          return (
            <RadioOptionItem
              key={option.id}
              selected={isSelected}
              onClick={() => handleSelect(option.id)}
            >
              <RadioButton checked={isSelected} />
              <div>
                <OptionLabel selected={isSelected}>{option.label}</OptionLabel>
                {option.description && (
                  <OptionDescription selected={isSelected}>
                    {option.description}
                  </OptionDescription>
                )}
              </div>
            </RadioOptionItem>
          );
        })}
      </OptionList>

      {/* 하단 안내 문구 */}
      <InfoText>
        <InfoTextBold>지금의 역할이 전부는 아니에요.<br />
          라잇에서는 원하는 순간,<br /> 원하는 역할로 도전할 수 있어요.</InfoTextBold>
      </InfoText>

      {/* 하단 버튼 */}
      <OnboardingButton
        disabled={!selectedPersona}
        onClick={handleSubmit}
      >
        다음
      </OnboardingButton>
    </OnboardingLayout>
  );
}


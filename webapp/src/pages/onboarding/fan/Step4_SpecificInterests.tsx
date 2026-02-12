import { useState, useEffect, useMemo } from 'react';
import { useFanOnboardingStore } from '../../../stores/onboarding/useFanOnboardingStore';
import { useOnboardingStep } from '../../../hooks/useOnboardingStep';
import OnboardingLayout from '../../../components/onboarding/OnboardingLayout';
import OnboardingButton from '../../../components/onboarding/OnboardingButton';
import ActivityFieldKeywordPicker from '../../../components/onboarding/ActivityFieldKeywordPicker';
import { PageTitle, PageSubtitle } from '../../../styles/onboarding/common.styles';
import { CATEGORY_LABELS } from '../../../constants/projectConstants';
import type { ProjectCategory } from '../../../types/exploreTypes';
import {
  InfoText,
  InfoTextBold,
} from './Step4_SpecificInterests.styles';

export default function Step4_SpecificInterests() {
  const interests = useFanOnboardingStore((state) => state.interests);
  const specificInterests = useFanOnboardingStore((state) => state.specificInterests);
  const setSpecificInterests = useFanOnboardingStore((state) => state.setSpecificInterests);

  const [selectedSpecificInterests, setSelectedSpecificInterests] = useState<string[]>(specificInterests || []);

  // Store의 specificInterests가 변경되면 로컬 상태 업데이트
  useEffect(() => {
    setSelectedSpecificInterests(specificInterests || []);
  }, [specificInterests]);

  // interests를 한국어 라벨로 변환 (activity_field_keywords 테이블은 한국어를 사용)
  const koreanInterests = useMemo(() => {
    if (!interests || interests.length === 0) return [];
    return interests.map(interest => {
      // interest가 이미 한국어인지 확인
      if (CATEGORY_LABELS[interest as ProjectCategory]) {
        return CATEGORY_LABELS[interest as ProjectCategory];
      }
      // interest가 영어 카테고리 값인 경우 한국어로 변환
      return CATEGORY_LABELS[interest as ProjectCategory] || interest;
    }).filter(Boolean);
  }, [interests]);

  const validate = () => selectedSpecificInterests.length > 0;

  const onSubmit = () => {
    setSpecificInterests(selectedSpecificInterests);
  };

  const { handleSubmit } = useOnboardingStep({
    nextRoute: '/onboarding/fan/preferredRegions',
    validate,
    onSubmit,
  });

  return (
    <OnboardingLayout scrollable>
      <PageTitle>더 자세한 취향을 알려주세요!</PageTitle>
      <PageSubtitle>
        관심 키워드를 선택하면 더 정확한 추천을 받을 수 있어요.
      </PageSubtitle>

      {/* ActivityFieldKeywordPicker 사용 */}
      {koreanInterests && koreanInterests.length > 0 ? (
        <ActivityFieldKeywordPicker
          interests={koreanInterests}
          maxSelection={10}
          externalSelectedKeywords={selectedSpecificInterests}
          onKeywordAdd={(keyword) => setSelectedSpecificInterests(prev => [...prev, keyword])}
          onKeywordRemove={(keyword) => setSelectedSpecificInterests(prev => prev.filter(k => k !== keyword))}
        />
      ) : (
        <PageSubtitle sx={{ color: 'text.secondary', mt: 2 }}>
          먼저 관심사를 선택해주세요.
        </PageSubtitle>
      )}

      {/* 하단 안내 문구 */}
      <InfoText>
        <InfoTextBold>선택은 얼마든지 할 수 있어요.<br />
          관심 있는 키워드를 가득 담아보세요.</InfoTextBold>
      </InfoText>

      {/* 하단 버튼 */}
      <OnboardingButton
        disabled={selectedSpecificInterests.length === 0}
        onClick={handleSubmit}
      >
        다음
      </OnboardingButton>
    </OnboardingLayout>
  );
}


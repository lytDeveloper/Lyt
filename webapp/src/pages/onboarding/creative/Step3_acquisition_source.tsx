import { useState, useEffect } from 'react';
import { Typography } from '@mui/material';
import { useCommonOnboardingStore } from '../../../stores/onboarding/useCommonOnboardingStore';
import { useCreativeOnboardingStore } from '../../../stores/onboarding/useCreativeOnboardingStore';
import { useOnboardingStep } from '../../../hooks/useOnboardingStep';
import { ProfileService } from '../../../services/profileService';
import { badgeAutoGrantService } from '../../../services/badgeAutoGrantService';
import { supabase } from '../../../lib/supabase';
import OnboardingLayout from '../../../components/onboarding/OnboardingLayout';
import OnboardingButton from '../../../components/onboarding/OnboardingButton';
import { PageTitle } from '../../../styles/onboarding/common.styles';
import {
  OptionList,
  RadioOptionItem,
  RadioButton,
  OptionLabel,
  OtherInputContainer,
  OtherInput,
} from './Step3_acquisition_source.styles';
import { LocationGrid, LocationButton, FormSection } from '../brand/Step5_BusinessInfo.styles';

// 유입 경로 옵션 정의
const ACQUISITION_OPTIONS = [
  { value: 'DM 제안', label: 'DM 제안' },
  { value: '인스타 광고', label: '인스타 광고' },
  { value: '지인 추천', label: '지인 추천' },
  { value: '인터넷 검색', label: '인터넷 검색' },
  { value: '기타', label: '기타' },
];

// 지역 옵션
const REGION_OPTIONS = [
  '전체',
  '서울',
  '경기',
  '인천',
  '광주',
  '부산',
  '대구',
  '대전',
  '세종',
  '강원',
  '울산',
  '충북',
  '충남',
  '전북',
  '전남',
  '경남',
  '경북',
  '제주',
];

export default function Step3_AcquisitionSource() {
  const nickname = useCommonOnboardingStore((state) => state.nickname);
  const logoFile = useCommonOnboardingStore((state) => state.logoFile);
  const { activityField, tags, bio, snsChannels, acquisitionSource, region: storedRegion, setAcquisitionSource, setRegion } = useCreativeOnboardingStore();

  const [isLoading, setIsLoading] = useState(false);

  const [selectedOption, setSelectedOption] = useState<string>(
    acquisitionSource && ACQUISITION_OPTIONS.some(opt => opt.value === acquisitionSource)
      ? acquisitionSource
      : acquisitionSource && !ACQUISITION_OPTIONS.some(opt => opt.value === acquisitionSource)
        ? '기타'
        : ''
  );
  const [otherText, setOtherText] = useState<string>(
    acquisitionSource && !ACQUISITION_OPTIONS.some(opt => opt.value === acquisitionSource)
      ? acquisitionSource
      : ''
  );
  const [otherTextError, setOtherTextError] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(storedRegion || null);
  const MAX_OTHER_LEN = 20;

  // Sync local state when store value changes
  useEffect(() => {
    if (acquisitionSource) {
      const isInOptions = ACQUISITION_OPTIONS.some(opt => opt.value === acquisitionSource);
      if (isInOptions) {
        setSelectedOption(acquisitionSource);
        setOtherText('');
      } else {
        setSelectedOption('기타');
        setOtherText(acquisitionSource);
      }
    } else {
      setSelectedOption('');
      setOtherText('');
    }
  }, [acquisitionSource]);

  useEffect(() => {
    setSelectedRegion(storedRegion || null);
  }, [storedRegion]);

  // 옵션 선택 핸들러
  const handleOptionSelect = (value: string) => {
    setSelectedOption(value);
    if (value !== '기타') {
      setOtherText('');
    }
    if (value === '기타' && otherText.length > MAX_OTHER_LEN) {
      setOtherTextError(`기타 경로는 ${MAX_OTHER_LEN}자 이내로 입력해 주세요.`);
      return;
    }
    setOtherTextError('');
  };

  // 입력 길이 제한 및 에러 갱신
  const handleOtherTextChange = (value: string) => {
    const trimmed = value.slice(0, MAX_OTHER_LEN);
    setOtherText(trimmed);
    if (selectedOption === '기타' && trimmed.length === 0) {
      setOtherTextError('기타 경로를 입력해 주세요.');
    } else if (value.length > MAX_OTHER_LEN) {
      setOtherTextError(`최대 ${MAX_OTHER_LEN}자까지 입력 가능합니다.`);
    } else {
      setOtherTextError('');
    }
  };

  const validate = () => {
    if (otherTextError) return false;
    if (!logoFile) return false;
    const finalSource = selectedOption === '기타' ? otherText : selectedOption;
    if (!finalSource || (selectedOption === '기타' && otherText.trim().length === 0)) {
      return false;
    }
    return true;
  };

  const onSubmit = async () => {
    const finalSource = selectedOption === '기타' ? otherText : selectedOption;
    setAcquisitionSource(finalSource);
    setRegion(selectedRegion === '전체' ? 'all' : selectedRegion);
    setIsLoading(true);

    try {
      // Convert snsChannels to the format expected by the service
      const formattedChannels = snsChannels?.map(ch => ({
        platform: ch.type,
        url: ch.url,
        is_main: ch.is_main,
      })) || [];

      await ProfileService.createCreativeProfile({
        creatorName: nickname,
        activityField: activityField,
        tags: tags,
        bio: bio,
        snsChannels: formattedChannels,
        acquisitionSource: finalSource,
        region: selectedRegion,
        coverFile: new File([], ''), // Creative flow doesn't have cover image
        logoFile: logoFile!,
      });

      // 프로필 완성 배지 부여 (비동기, 에러 무시)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        badgeAutoGrantService.checkProfileCompleteBadge(user.id).catch((err) => {
          console.warn('Creative onboarding: failed to check profile complete badge:', err);
        });
      }
    } catch (error) {
      console.error('크리에이티브 가입 신청 실패:', error);
      alert(`크리에이티브 가입 신청에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const { handleSubmit } = useOnboardingStep({
    nextRoute: '/onboarding/creative/complete',
    validate,
    onSubmit,
  });

  // 폼 유효성 검증
  const isFormValid = selectedOption !== '' && (selectedOption !== '기타' || otherText.trim() !== '');

  return (
    <OnboardingLayout scrollable>
      <PageTitle>라잇을 알게된 경로를 선택해 주세요.</PageTitle>

      {/* 옵션 리스트 */}
      <OptionList>
        {ACQUISITION_OPTIONS.map((option) => (
          <div key={option.value}>
            <RadioOptionItem
              selected={selectedOption === option.value}
              onClick={() => handleOptionSelect(option.value)}
            >
              <RadioButton checked={selectedOption === option.value} />
              <OptionLabel>{option.label}</OptionLabel>
            </RadioOptionItem>

            {/* 기타 선택시 입력 필드 표시 */}
            {option.value === '기타' && selectedOption === '기타' && (
              <OtherInputContainer>
                <OtherInput
                  type="text"
                  value={otherText}
                  onChange={(e) => handleOtherTextChange(e.target.value)}
                  maxLength={MAX_OTHER_LEN}
                  placeholder="기타 경로를 20자 이내로 입력해 주세요"
                  onClick={(e) => e.stopPropagation()}
                />
                {otherTextError ? (
                  <div style={{ marginTop: 6, fontSize: 12, color: '#d32f2f' }}>{otherTextError}</div>
                ) : (
                  <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>{otherText.length}/{MAX_OTHER_LEN}</div>
                )}
              </OtherInputContainer>
            )}
          </div>
        ))}
      </OptionList>

      {/* 주요 활동 지역 선택 */}
      <FormSection sx={{ mt: 4 }}>
        <Typography sx={{ mb: 2 }}>주요 활동 지역</Typography>
        <LocationGrid>
          {REGION_OPTIONS.map((region) => (
            <LocationButton
              key={region}
              selected={selectedRegion === region}
              onClick={() => setSelectedRegion(region)}
            >
              {region}
            </LocationButton>
          ))}
        </LocationGrid>
      </FormSection>

      {/* 하단 버튼 */}
      <OnboardingButton
        disabled={!isFormValid || isLoading}
        onClick={handleSubmit}
        loading={isLoading}
        loadingText="처리 중..."
      >
        완료
      </OnboardingButton>
    </OnboardingLayout>
  );
}


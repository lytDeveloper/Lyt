import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useFanOnboardingStore } from '../../../stores/onboarding/useFanOnboardingStore';
import { useCommonOnboardingStore } from '../../../stores/onboarding/useCommonOnboardingStore';
import { useOnboardingStep } from '../../../hooks/useOnboardingStep';
import { profileService } from '../../../services/profileService';
import { preloadProfiles } from '../../../services/profilePreloadService';
import { badgeAutoGrantService } from '../../../services/badgeAutoGrantService';
import { useProfileStore } from '../../../stores/profileStore';
import OnboardingLayout from '../../../components/onboarding/OnboardingLayout';
import OnboardingButton from '../../../components/onboarding/OnboardingButton';
import { PageTitle, PageSubtitle } from '../../../styles/onboarding/common.styles';
import {
  SectionLabel,
  LocationGrid,
  LocationButton,
} from './Step5_PreferredRegions.styles.ts';

// 지역 옵션
const LOCATION_OPTIONS = [
  '전체',
  '서울',
  '경기',
  '인천',
  '부산',
  '대구',
  '대전',
  '세종',
  '강원',
  '울산',
  '충북',
  '중남',
  '전북',
  '전남',
  '경남',
  '경북',
  '광주',
  '제주',
];

// 추천 알림 옵션
// const RECOMMEND_OPTIONS = [
//   { id: '공연 티켓 오픈', label: '공연 티켓 오픈' },
//   { id: '할인쿠폰', label: '할인쿠폰' },
//   { id: '인기 전시', label: '인기 전시' },
// ];

export default function Step5_PreferredRegions() {
  const interests = useFanOnboardingStore((state) => state.interests);
  const persona = useFanOnboardingStore((state) => state.persona);
  const specificInterests = useFanOnboardingStore((state) => state.specificInterests);
  const preferredRegions = useFanOnboardingStore((state) => state.preferredRegions);
  const notificationPreferences = useFanOnboardingStore((state) => state.notificationPreferences);
  const setPreferredRegions = useFanOnboardingStore((state) => state.setPreferredRegions);
  const setNotificationPreferences = useFanOnboardingStore((state) => state.setNotificationPreferences);

  // Get logoFile from common store
  const nickname = useCommonOnboardingStore((state) => state.nickname);
  const logoFile = useCommonOnboardingStore((state) => state.logoFile);

  const queryClient = useQueryClient();
  const { setActiveProfile } = useProfileStore();
  const [selectedPreferredRegions, setSelectedPreferredRegions] = useState<string[]>(preferredRegions || []);
  const [selectedRecommends, setSelectedRecommends] = useState<string[]>(notificationPreferences || []);
  const [isLoading, setIsLoading] = useState(false);

  // Sync local state when store values change
  useEffect(() => {
    setSelectedPreferredRegions(preferredRegions || []);
  }, [preferredRegions]);

  useEffect(() => {
    setSelectedRecommends(notificationPreferences || []);
  }, [notificationPreferences]);

  const handleLocationSelect = (location: string) => {
    if (location === '전체') {
      setSelectedPreferredRegions((prev) =>
        prev.includes('전체') ? [] : ['전체']
      );
    } else {
      setSelectedPreferredRegions((prev) => {
        // '전체'가 이미 선택되어 있다면 제거하고 나머지 지역 추가
        let newRegions = prev.includes('전체')
          ? [location]
          : prev.includes(location)
            ? prev.filter((item) => item !== location)
            : [...prev, location];

        // '전체'와 다른 지역이 동시에 선택되지 않도록 보장
        if (newRegions.includes('전체') && newRegions.length > 1) {
          newRegions = newRegions.filter((item) => item !== '전체');
        }
        return newRegions;
      });
    }
  };

  // const handleRecommendToggle = (id: string) => {
  //   setSelectedRecommends((prev) =>
  //     prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
  //   );
  // };

  const validate = () => selectedPreferredRegions.length > 0;

  const onSubmit = async () => {
    // Validate logoFile
    if (!logoFile) {
      alert('프로필 이미지를 선택해 주세요.');
      return;
    }

    setPreferredRegions(selectedPreferredRegions);
    setNotificationPreferences(selectedRecommends);
    setIsLoading(true);

    try {
      // 팬 프로필 생성
      await profileService.createFanProfile({
        interests,
        persona,
        specificInterests,
        preferredRegions: selectedPreferredRegions,
        logoFile,
        notificationPreferences: selectedRecommends,
        nickname,
      });

      // 프로필 생성 후 즉시 프로필 스토어 업데이트
      const { data: { user } } = await supabase.auth.getUser();

      // 프로필 완성 배지 부여 (비동기, 에러 무시)
      if (user) {
        badgeAutoGrantService.checkProfileCompleteBadge(user.id).catch((err) => {
          console.warn('Fan onboarding: failed to check profile complete badge:', err);
        });
      }
      if (user) {
        // 프로필 재로드하여 스토어 업데이트
        await preloadProfiles(user.id);

        // React Query 캐시 무효화 (헤더 프로필 이미지 등)
        queryClient.invalidateQueries({
          queryKey: ['headerProfileImage']
        });

        // 활성 프로필이 설정되지 않았으면 팬 프로필로 설정
        const { fanProfile, type } = useProfileStore.getState();
        if (fanProfile && !type) {
          setActiveProfile({ type: 'fan', profileId: fanProfile.profile_id });
        }
      }
    } catch (error) {
      console.error('Fan 프로필 생성 실패:', error);
      alert(`Fan 프로필 생성에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const { handleSubmit } = useOnboardingStep({
    nextRoute: '/onboarding/fan/complete',
    validate,
    onSubmit,
  });

  return (
    <OnboardingLayout scrollable>
      <PageTitle>거의 다 왔어요!</PageTitle>
      <PageSubtitle>마지막으로 선호지역을 선택해 주세요.</PageSubtitle>

      {/* 선호하는 지역 */}
      <SectionLabel>선호하는 지역</SectionLabel>
      <LocationGrid>
        {LOCATION_OPTIONS.map((location) => (
          <LocationButton
            key={location}
            selected={selectedPreferredRegions.includes(location)}
            onClick={() => handleLocationSelect(location)}
          >
            {location}
          </LocationButton>
        ))}
      </LocationGrid>

      {/* 받고 싶은 알림 */}
      {/* <SectionLabel style={{ marginTop: 32 }}>받고 싶은 알림 </SectionLabel>
      <RecommendSection>
        {RECOMMEND_OPTIONS.map((option) => (
          <RecommendItem
            key={option.id}
            selected={selectedRecommends.includes(option.id)}
            onClick={() => handleRecommendToggle(option.id)}
          >
            <CheckboxWrapper selected={selectedRecommends.includes(option.id)} />
            <RecommendLabel>{option.label}</RecommendLabel>
          </RecommendItem>
        ))}
      </RecommendSection> */}

      {/* 하단 안내 문구 */}
      {/* <InfoText>
        <InfoTextBold>알림설정은 꼭 필수로 해두세요.</InfoTextBold>
        <br />
        Bridge는 귀찮은 알림을 보내지 않아요.
        <br />꼭 필요한 혜택과 정보만 드리고 있죠.
      </InfoText> */}

      {/* 하단 버튼 */}
      <OnboardingButton
        disabled={selectedPreferredRegions.length === 0 || isLoading}
        onClick={handleSubmit}
        loading={isLoading}
        loadingText="프로필 생성 중..."
      >
        프로필 완성하기
      </OnboardingButton>
    </OnboardingLayout>
  );
}


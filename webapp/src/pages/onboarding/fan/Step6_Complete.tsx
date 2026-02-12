import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { preloadProfiles } from '../../../services/profilePreloadService';
import { useProfileStore } from '../../../stores/profileStore';
import OnboardingLayout from '../../../components/onboarding/OnboardingLayout';
import OnboardingButton from '../../../components/onboarding/OnboardingButton';
import { ContentContainer } from '../../../styles/onboarding/common.styles';
import { PageTitle, PageSubtitle } from '../../../styles/onboarding/common.styles';
import {
  CheckIconContainer,
  CheckIcon,
  CompleteMessage,
} from '../creative/Step4_Complete.styles';

export default function Step6_fanComplete() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setActiveProfile } = useProfileStore();

  // 완료 페이지 진입 시 프로필 재로드 (팬 프로필 생성 직후일 수 있음)
  useEffect(() => {
    const refreshProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await preloadProfiles(user.id);
          queryClient.invalidateQueries({ queryKey: ['headerProfileImage'] });
          
          // 팬 프로필이 있고 활성 프로필이 없으면 설정
          const { fanProfile, type } = useProfileStore.getState();
          if (fanProfile && !type) {
            setActiveProfile({ type: 'fan', profileId: fanProfile.profile_id });
          }
        }
      } catch (error) {
        console.error('[Step6_fanComplete] 프로필 재로드 실패:', error);
      }
    };
    refreshProfile();
  }, [queryClient, setActiveProfile]);

  const handleInstagramLink = () => {
    // 인스타그램 링크로 이동
    window.open('https://www.instagram.com/lyt_app/', '_blank');
    navigate('/home', { replace: true });
  };

  return (
    <OnboardingLayout onClose={() => navigate('/home', { replace: true })} scrollable>
      {/* 중앙 콘텐츠 */}
      <ContentContainer sx={{ justifyContent: 'center', gap: 3 }}>
        {/* 체크 아이콘 */}
        <CheckIconContainer>
          <CheckIcon>✓</CheckIcon>
        </CheckIconContainer>

        {/* 완료 메시지 */}
        <CompleteMessage>
          라잇ON!
          <br />
          라잇에서 즐거운 시간 보내세요 💝
        </CompleteMessage>
      </ContentContainer>

      <PageTitle sx={{ marginBottom: '1', textAlign: 'center' }}>
        📣알람 설정은 꼭 해 주세요!
      </PageTitle>
      <PageSubtitle sx={{ marginBottom: '15px', textAlign: 'center' }}>
        알람 설정이 OFF일 경우,
        <br />
        각종 혜택 및 프로모션 시 불편할 수 있어요!
      </PageSubtitle>

      {/* 하단 버튼 */}
      <OnboardingButton onClick={handleInstagramLink}>
        라잇 공식 계정 보러가기
      </OnboardingButton>
    </OnboardingLayout>
  );
}

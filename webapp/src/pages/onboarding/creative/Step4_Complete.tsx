import { useNavigate } from 'react-router-dom';
import OnboardingLayout from '../../../components/onboarding/OnboardingLayout';
import OnboardingButton from '../../../components/onboarding/OnboardingButton';
import { ContentContainer, PageSubtitle } from '../../../styles/onboarding/common.styles';
import {
  CheckIconContainer,
  CheckIcon,
  CompleteMessage,
} from './Step4_Complete.styles';

export default function Step4_Complete() {
  const navigate = useNavigate();

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
          <CheckIcon />
        </CheckIconContainer>

        {/* 완료 메시지 */}
        <CompleteMessage>
          라잇 ON! <br /> 라잇에서 즐거운 시간 보내세요 💝
        </CompleteMessage>
      </ContentContainer>

      <PageSubtitle sx={{ marginBottom: '15px', textAlign: 'center' }}>
        아래 버튼을 눌러 라잇 공식 계정을 확인해보세요!
      </PageSubtitle>

      {/* 하단 버튼 */}
      <OnboardingButton onClick={handleInstagramLink}>
        라잇 공식 계정 보러가기
      </OnboardingButton>
    </OnboardingLayout>
  );
}


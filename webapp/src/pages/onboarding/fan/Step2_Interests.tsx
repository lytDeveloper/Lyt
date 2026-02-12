import { useState } from 'react';
import { useFanOnboardingStore } from '../../../stores/onboarding/useFanOnboardingStore';
import { useOnboardingStep } from '../../../hooks/useOnboardingStep';
import { useMultiSelect } from '../../../hooks/useMultiSelect';
import OnboardingLayout from '../../../components/onboarding/OnboardingLayout';
import OnboardingButton from '../../../components/onboarding/OnboardingButton';
import {
  InfoText,
  InfoTextBold,
} from './Step2_Interests.styles';
import { PageTitle, PageSubtitle } from '../../../styles/onboarding/common.styles';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { EXTENDED_CATEGORIES, CATEGORY_ICONS, CATEGORY_LABELS } from '../../../constants/projectConstants';

export default function Step2_Interests() {
  const theme = useTheme();
  const interests = useFanOnboardingStore((state) => state.interests);
  const setInterests = useFanOnboardingStore((state) => state.setInterests);

  const {
    selected: selectedInterests,
    toggle: handleToggle,
    isMaxReached,
    isValid
  } = useMultiSelect({
    initial: interests || [],
    min: 1,
    max: 3,
  });

  const [showInterestLimitError, setShowInterestLimitError] = useState(false);

  const handleToggleWithError = (id: string) => {
    if (isMaxReached && !selectedInterests.includes(id)) {
      setShowInterestLimitError(true);
    } else {
      setShowInterestLimitError(false);
      handleToggle(id);
    }
  };

  const validate = () => isValid;

  const onSubmit = () => {
    setInterests(selectedInterests);
  };

  const { handleSubmit } = useOnboardingStep({
    nextRoute: '/onboarding/fan/persona',
    validate,
    onSubmit,
  });

  return (
    <OnboardingLayout scrollable>
      <PageTitle>관심 있으신 분야가 있나요?</PageTitle>
      <PageSubtitle>추천 관심사 3가지를 선택해 주세요.</PageSubtitle>

      {/* 아이콘 그리드 */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '26px 12px',
          marginTop: '40px',
        }}
      >
        {EXTENDED_CATEGORIES.map((cat) => {
          const IconComponent = CATEGORY_ICONS[cat];
          const isSelected = selectedInterests.includes(cat);
          return (
            <Button
              key={cat}
              onClick={() => handleToggleWithError(cat)}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px',
                borderRadius: '20px',
                color: isSelected ? '#fff' : '#000',
                backgroundColor: isSelected ? theme.palette.status.blue : theme.palette.background.paper,
                width: 72,
                height: 72,
                minWidth: 'auto',
              }}
            >
              <Box sx={{ marginBottom: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {IconComponent && <IconComponent sx={{ fontSize: 26 }} />}
              </Box>
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontWeight: 500,
                  fontSize: 12,
                  color: isSelected ? '#fff' : '#000',
                }}
              >
                {CATEGORY_LABELS[cat]}
              </Typography>
            </Button>
          );
        })}
      </Box>

      {selectedInterests.length >= 3 && showInterestLimitError && (
        <div style={{ color: '#DC3A3A', fontSize: 12, marginTop: 4, marginLeft: 4 }}>
          추천 관심사는 3가지만 선택하실 수 있어요.
        </div>
      )}

      {/* 하단 안내 문구 */}
      <InfoText >
        <InfoTextBold>관심있는 분야가 바뀌어도 괜찮아요.
          <br />
          설정 이후 프로필에서 언제든 변경 가능하니까요!
        </InfoTextBold>

      </InfoText>

      {/* 하단 버튼 */}
      <OnboardingButton
        disabled={selectedInterests.length === 0}
        onClick={handleSubmit}
      >
        다음
      </OnboardingButton>
    </OnboardingLayout>
  );
}


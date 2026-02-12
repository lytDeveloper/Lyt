import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageContainer,
  CloseButton,
  ContentContainer,
  ButtonContainer,
  ButtonWrapper,
  ConfirmButton,
} from '../../styles/onboarding/common.styles';
import {
  TitleSection,
  MainTitle,
  SubTitle,
  CardGrid,
  RoleCard,
  CardLabel,
  InfoText,
} from './ProfileSelect.styles';
import { supabase } from '../../lib/supabase';
import { useProfileStore } from '../../stores/profileStore';
import { profileQueryService } from '../../services/profileQueryService';
import { resetAllOnboardingStores } from '../../stores/onboarding/resetOnboardingStores';
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import { useTheme } from '@mui/material';

type RoleKey = 'brand' | 'artist' | 'creative' | 'fan';

const roles: Array<{ key: RoleKey; label: string }> = [
  { key: 'brand', label: '브랜드' },
  { key: 'artist', label: '아티스트' },
  { key: 'creative', label: '크리에이티브' },
  { key: 'fan', label: '일반유저' },
];

export default function ProfileSelect() {
  const theme = useTheme();
  const [selected, setSelected] = useState<RoleKey | null>(null);
  const navigate = useNavigate();
  const { switchNonFanType } = useProfileStore();
  const [currentNonFan, setCurrentNonFan] = useState<RoleKey | null>(null);
  const [activeRoles, setActiveRoles] = useState<RoleKey[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id;
      if (!uid) return;

      // Use profileQueryService to get profile with roles
      const profileData = await profileQueryService.getProfileWithRoles(uid);

      if (profileData?.roles && Array.isArray(profileData.roles)) {
        const fetchedRoles = (profileData.roles as string[]).filter(
          (role): role is RoleKey => roles.some(({ key }) => key === role),
        );
        setActiveRoles(fetchedRoles);
        // 비팬 프로필 중 활성화된 것 찾기 (우선순위: brand > artist > creative)
        if (fetchedRoles.includes('brand')) {
          setCurrentNonFan('brand');
        } else if (fetchedRoles.includes('artist')) {
          setCurrentNonFan('artist');
        } else if (fetchedRoles.includes('creative')) {
          setCurrentNonFan('creative');
        } else {
          setCurrentNonFan(null);
        }
      } else {
        setActiveRoles([]);
        setCurrentNonFan(null);
      }
    })();
  }, []);

  const handleConfirm = async () => {
    switch (selected) {
      case 'brand':
        if (currentNonFan && currentNonFan !== 'brand') {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && window.confirm('기존 비팬 프로필을 비활성화하고 브랜드로 전환하시겠어요?')) {
            await switchNonFanType(user.id, 'brand');
          } else { return; }
        }
        resetAllOnboardingStores();
        navigate('/onboarding/brand/name');
        break;
      case 'artist':
        if (currentNonFan && currentNonFan !== 'artist') {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && window.confirm('기존 비팬 프로필을 비활성화하고 아티스트로 전환하시겠어요?')) {
            await switchNonFanType(user.id, 'artist');
          } else { return; }
        }
        resetAllOnboardingStores();
        navigate('/onboarding/artist/name');
        break;
      case 'creative':
        if (currentNonFan && currentNonFan !== 'creative') {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && window.confirm('기존 비팬 프로필을 비활성화하고 크리에이티브로 전환하시겠어요?')) {
            await switchNonFanType(user.id, 'creative');
          } else { return; }
        }
        resetAllOnboardingStores();
        navigate('/onboarding/creative/image');
        break;
      case 'fan':
        resetAllOnboardingStores();
        navigate('/onboarding/fan/image');
        break;
    }
  };

  return (
    <PageContainer sx={{
      px: { xs: 3, sm: 4, md: 5 },
      pt: { xs: 3, sm: 4 },
      pb: { xs: 3, sm: 4 },
      backgroundColor: theme.palette.background.default
    }}>
      {/* 닫기 버튼 */}
      <CloseButton
        role="button"
        aria-label="닫기"
        onClick={() => window.history.back()}
      >
        <ArrowBackIosNewRoundedIcon sx={{ fontSize: 24, color: theme.palette.icon.default }} />
      </CloseButton>

      {/* 타이틀 - 상단 고정 */}
      <TitleSection sx={{ mb: 0, px: 2 }}>
        <MainTitle>
          어떤 유형의 프로필을 만드시겠어요?
        </MainTitle>
        <SubTitle>
          가입 유형에 맞는 카테고리를 선택해 주세요.
        </SubTitle>
      </TitleSection>

      {/* 카드 그리드를 중앙에 배치 */}
      <ContentContainer sx={{ justifyContent: 'center', flex: 1, marginTop: 'auto', marginBottom: 'auto' }}>
        <CardGrid>
          {roles.map((r) => {
            const isActive = selected === r.key;
            return (
              <RoleCard
                key={r.key}
                elevation={0}
                isActive={isActive}
                onClick={() => setSelected(r.key)}
              >
                <CardLabel isActive={isActive}>
                  {r.label}{activeRoles.includes(r.key) ? ' (보유)' : ''}
                </CardLabel>
              </RoleCard>
            );
          })}
        </CardGrid>
      </ContentContainer>

      {/* 카드와 버튼 사이 안내문 */}
      <InfoText sx={{ marginTop: 0, marginBottom: 3, fontSize: 18 }}>
        가입 이후 언제든 변경 가능하니 <br />너무 고민하지 마세요!
      </InfoText>

      {/* 하단 버튼 */}
      <ButtonContainer sx={{ marginTop: 0 }}>
        <ButtonWrapper>
          <ConfirmButton
            fullWidth
            variant="contained"
            disabled={!selected}
            onClick={handleConfirm}
          >
            확인
          </ConfirmButton>
        </ButtonWrapper>
      </ButtonContainer>
    </PageContainer>
  );
}


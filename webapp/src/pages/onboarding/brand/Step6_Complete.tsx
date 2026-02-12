import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBrandOnboardingStore } from '../../../stores/onboarding/useBrandOnboardingStore';
import { useCommonOnboardingStore } from '../../../stores/onboarding/useCommonOnboardingStore';
import { ProfileService, type BrandProfileData } from '../../../services/profileService';
import { badgeAutoGrantService } from '../../../services/badgeAutoGrantService';
import { supabase } from '../../../lib/supabase';
import OnboardingLayout from '../../../components/onboarding/OnboardingLayout';
import OnboardingButton from '../../../components/onboarding/OnboardingButton';
import {
  WelcomeMessage,
  CoverPreview,
  LogoImage,
} from './Step6_Complete.styles';
import { SmallEm, CanvasWrapper, Canvas, UploadBadge } from '../../../styles/onboarding/common.styles';
import { Box, Typography } from '@mui/material';
import { Tag, TagsRow } from '../../../styles/onboarding/profile.styles';

export default function Step6_Complete() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Get all data from stores
  const {
    brandName,
    description,
    activityField,
    targetAudiences,
    preferredCreatorTypes,
    collaborationTypes,
    monthlyBudget,
    websiteUrl,
    snsChannel,
    contactInfo,
    region,
    businessRegistrationNumber,
    establishedAt,
  } = useBrandOnboardingStore();

  const {
    coverFile,
    logoFile,
    selectedKeywords,
  } = useCommonOnboardingStore();

  // Create image preview URLs
  const coverUrl = useMemo(
    () => (coverFile ? URL.createObjectURL(coverFile) : ''),
    [coverFile]
  );
  const logoUrl = useMemo(
    () => (logoFile ? URL.createObjectURL(logoFile) : ''),
    [logoFile]
  );

  const handleComplete = async () => {
    if (!coverFile || !logoFile) {
      alert('이미지 파일이 누락되었어요.');
      return;
    }

    setIsLoading(true);

    try {
      const profileData: BrandProfileData = {
        brandName,
        description,
        activityField,
        targetAudiences,
        preferredCreatorTypes,
        tags: selectedKeywords,
        collaborationTypes,
        monthlyBudget,
        websiteUrl: websiteUrl || '',
        snsChannel: snsChannel || '',
        contactInfo: contactInfo || '',
        region: region || '',
        businessRegistrationNumber: businessRegistrationNumber || '',
        establishedAt: establishedAt || '',
        coverFile,
        logoFile,
      };

      await ProfileService.createBrandProfile(profileData);

      // 프로필 완성 배지 부여 (비동기, 에러 무시)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        badgeAutoGrantService.checkProfileCompleteBadge(user.id).catch((err) => {
          console.warn('Brand onboarding: failed to check profile complete badge:', err);
        });
      }

      // Navigate to recommendation page
      navigate('/onboarding/brand/recommendation');
    } catch (error) {
      console.error('브랜드 등록 실패:', error);
      alert(`브랜드 등록에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <OnboardingLayout onClose={handleGoBack} showProgressBar scrollable>
      {/* 환영 메시지 */}
      <WelcomeMessage>
        {brandName || 'OO'} 브랜드의 입점을 환영해요.
        <br />
        라잇에서 다양한 협업을 통해
        <br />
        브랜드 인지도를 높여보세요!
      </WelcomeMessage>

      {/* 프로필 카드 */}
      <Box sx={{ width: '100%', maxWidth: 340, margin: '0 auto' }}>
        <CanvasWrapper>
          {/* 커버 이미지 */}
          <Canvas>
            {coverUrl ? <CoverPreview src={coverUrl} alt="cover" /> : null}
          </Canvas>

          {/* 로고 배지 */}
          <UploadBadge>
            {logoUrl ? (
              <LogoImage src={logoUrl} alt="logo" />
            ) : (
              <span style={{ fontSize: '12px', color: '#949196' }}>image</span>
            )}
          </UploadBadge>
        </CanvasWrapper>

        {/* 브랜드 정보 (캔버스 바로 아래) */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          marginTop: 0,
          paddingLeft: '104px'
        }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.25 }}>
            <Typography sx={{ fontFamily: 'Pretendard, sans-serif', fontSize: 16, fontWeight: 500 }}>
              {brandName}
            </Typography>
            <SmallEm>{activityField}</SmallEm>
          </Box>
        </Box>
      </Box>

      {/* 태그 영역 */}
      <TagsRow sx={{ marginTop: 2, justifyContent: 'center' }}>
        {activityField && <Tag key={activityField}>#{activityField}</Tag>}
        {targetAudiences && targetAudiences.length > 0 &&
          targetAudiences.map((gen: string) => (
            <Tag key={gen}>#{gen}</Tag>
          ))
        }
        {selectedKeywords && selectedKeywords.length > 0 &&
          selectedKeywords.map((keyword: string) => (
            <Tag key={keyword}>#{keyword}</Tag>
          ))
        }
      </TagsRow>

      {/* 하단 버튼 */}
      <OnboardingButton
        onClick={handleComplete}
        disabled={isLoading}
        loading={isLoading}
        loadingText="등록 중..."
      >
        완료
      </OnboardingButton>
    </OnboardingLayout>
  );
}


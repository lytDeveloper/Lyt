import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArtistOnboardingStore } from '../../../stores/onboarding/useArtistOnboardingStore';
import { useCommonOnboardingStore } from '../../../stores/onboarding/useCommonOnboardingStore';
import { ProfileService, type ArtistProfileData } from '../../../services/profileService';
import { badgeAutoGrantService } from '../../../services/badgeAutoGrantService';
import { supabase } from '../../../lib/supabase';
import OnboardingLayout from '../../../components/onboarding/OnboardingLayout';
import OnboardingButton from '../../../components/onboarding/OnboardingButton';
import {
  WelcomeMessage,
  CoverPreview,
  LogoImage,
} from '../brand/Step6_Complete.styles';
import { LabelRow, SmallLabel, SmallEm, CanvasWrapper, Canvas, UploadBadge } from '../../../styles/onboarding/common.styles';
import { Tag, TagsRow } from '../../../styles/onboarding/profile.styles';
import { toast } from 'react-toastify';

export default function Step3_Complete() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const hasCreatedProfile = useRef(false);

  const {
    artistName,
    activityField,
    tags,
    highlightKeywords,
    bio,
    portfolioUrl,
    region,
  } = useArtistOnboardingStore();

  const {
    coverFile,
    logoFile,
  } = useCommonOnboardingStore();

  const coverUrl = useMemo(
    () => (coverFile ? URL.createObjectURL(coverFile) : ''),
    [coverFile]
  );
  const logoUrl = useMemo(
    () => (logoFile ? URL.createObjectURL(logoFile) : ''),
    [logoFile]
  );

  // 페이지 진입 시 자동으로 프로필 생성
  useEffect(() => {
    const createProfile = async () => {
      if (hasCreatedProfile.current) return;
      if (!coverFile || !logoFile) {
        toast.error('이미지 파일이 누락되었어요.');
        return;
      }

      hasCreatedProfile.current = true;
      setIsLoading(true);

      try {
        const profileData: ArtistProfileData = {
          artistName,
          activityField,
          tags,
          highlightKeywords,
          bio,
          portfolioUrl: portfolioUrl || null,
          region: region || null,
          coverFile,
          logoFile,
        };

        await ProfileService.createArtistProfile(profileData);
        toast.success('아티스트 프로필이 성공적으로 등록되었습니다!');

        // 프로필 완성 배지 부여 (비동기, 에러 무시)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          badgeAutoGrantService.checkProfileCompleteBadge(user.id).catch((err) => {
            console.warn('Artist onboarding: failed to check profile complete badge:', err);
          });
        }
      } catch (error) {
        console.error('❌ 아티스트 등록 실패:', error);
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        toast.error(`아티스트 등록에 실패했습니다: ${errorMessage}`);
        hasCreatedProfile.current = false; // 실패 시 재시도 가능하도록
      } finally {
        setIsLoading(false);
      }
    };

    createProfile();
  }, [coverFile, logoFile, artistName, activityField, tags, highlightKeywords, bio, portfolioUrl, region]);

  const handleNavigateToHome = () => {
    navigate('/home', { replace: true });
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <OnboardingLayout onClose={handleGoBack} showProgressBar scrollable>
      {/* 환영 메시지 */}
      <WelcomeMessage>
        {artistName || 'OO'} 아티스트님!
        <br />
        라잇에서 아티스트님만의 멋진✨
        <br />
        프로필이 완성되었어요!
        <br />
        <br />
        활발한 활동 기대할게요!🎉
      </WelcomeMessage>

      {/* 프로필 카드 */}
      <CanvasWrapper sx={{ marginBottom: 5 }}>
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

        {/* 브랜드 정보 - 로고 오른쪽에 고정 위치 */}
        <LabelRow
          sx={{
            position: 'absolute',
            left: '110px', // 로고(left: 16) + 로고 너비(80) + 여백(14) - 조금 더 오른쪽
            bottom: '-50px', // 로고 중앙 위치: UploadBadge bottom(-32px) - 로고 높이/2(40px)
            marginLeft: 0, // 기존 marginLeft 제거
          }}
        >
          <SmallLabel>{artistName || '아티스트명'}</SmallLabel>
          <SmallEm>{activityField || '활동분야'}</SmallEm>
        </LabelRow>
      </CanvasWrapper>

      {/* 모든 키워드를 하나의 ChipGroup으로 표시 */}
      {(tags && tags.length > 0) || (highlightKeywords && highlightKeywords.length > 0) ? (
        <TagsRow>
          {[...(tags || []), ...(highlightKeywords || [])].map((keyword: string) => (
            <Tag key={keyword}>#{keyword}</Tag>
          ))}
        </TagsRow>
      ) : null}

      {/* 하단 버튼 */}
      <OnboardingButton
        onClick={handleNavigateToHome}
        disabled={isLoading}
        loading={isLoading}
        loadingText="등록 중..."
      >
        더 많은 아티스트 보러 가기
      </OnboardingButton>
    </OnboardingLayout>
  );
}

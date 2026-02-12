import { useState, useEffect } from 'react';
import { IconButton, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useArtistOnboardingStore } from '../../../stores/onboarding/useArtistOnboardingStore';
import { useCommonOnboardingStore } from '../../../stores/onboarding/useCommonOnboardingStore';
import { useImageUpload } from '../../../hooks/useImageUpload';
import { useOnboardingStep } from '../../../hooks/useOnboardingStep';
import OnboardingLayout from '../../../components/onboarding/OnboardingLayout';
import OnboardingButton from '../../../components/onboarding/OnboardingButton';
import TagInput from '../../../components/common/TagInput';
import { ScrollableForm, CanvasWrapper, Canvas, UploadBadge, PageTitle, LabelRow, SmallLabel, SmallEm } from '../../../styles/onboarding/common.styles';
import { FormSection, StyledTextField } from './Step1_ArtistName.styles';
import { Tag, TagsRow } from '../../../styles/onboarding/profile.styles';
import { LogoPreview, CoverPreview } from '../brand/Step3_Images.styles';
import { PageSubtitle } from './Step2_AdditionalInfo.styles';
import { LocationGrid, LocationButton } from '../brand/Step5_BusinessInfo.styles';
import { useTheme } from '@mui/material/styles';

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


export default function Step2_AdditionalInfo() {
  const {
    artistName,
    activityField,
    tags: storedTags,
    highlightKeywords: storedKeywords,
    bio: storedBio,
    portfolioUrl: storedPortfolioUrl,
    region: storedRegion,
    setAdditionalInfo,
  } = useArtistOnboardingStore();

  const { coverFile: storedCover, logoFile: storedLogo, setCoverFile, setLogoFile } = useCommonOnboardingStore();

  // Local state
  const [highlightKeywords, setHighlightKeywords] = useState<string[]>(storedKeywords || []);
  const [bio, setBio] = useState<string>(storedBio || '');
  const [portfolioUrl, setPortfolioUrl] = useState<string>(storedPortfolioUrl || '');
  const [showKeywordLimitError, setShowKeywordLimitError] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(storedRegion || null);

  const imageUpload = useImageUpload({
    initialCoverFile: storedCover,
    initialLogoFile: storedLogo,
  });

  // Sync local state when store values change
  useEffect(() => {
    setHighlightKeywords(storedKeywords || []);
  }, [storedKeywords]);

  useEffect(() => {
    setBio(storedBio || '');
  }, [storedBio]);

  useEffect(() => {
    setPortfolioUrl(storedPortfolioUrl || '');
  }, [storedPortfolioUrl]);

  useEffect(() => {
    setSelectedRegion(storedRegion || null);
  }, [storedRegion]);

  const { handleSubmit, handleGoBack } = useOnboardingStep({
    nextRoute: '/onboarding/artist/complete',
    validate: () => {
      if (highlightKeywords.length === 0) {
        return { isValid: false, error: '강조 포인트를 최소 1개 입력해 주세요.' };
      }
      if (!bio.trim()) {
        return { isValid: false, error: '한 줄 소개를 작성해 주세요.' };
      }
      return { isValid: true };
    },
    onValidationError: (error) => {
      if (error) alert(error);
    },
    onSubmit: () => {
      setAdditionalInfo(highlightKeywords, bio, portfolioUrl, selectedRegion === '전체' ? 'all' : selectedRegion);
      setCoverFile(imageUpload.coverFile);
      setLogoFile(imageUpload.logoFile);
    },
  });

  const isFormValid = bio.trim() && highlightKeywords.length >= 0;

  const theme = useTheme();

  return (
    <OnboardingLayout onClose={handleGoBack} showProgressBar scrollable>
      <ScrollableForm>
        {/* 프로필 미리보기 */}
        <CanvasWrapper sx={{ marginBottom: 5 }}>
          <Canvas
            onClick={imageUpload.handleSelectCover}
            role="button"
            aria-label="커버 이미지 업로드"
            tabIndex={0}
            sx={{
              borderRadius: '20px',
              height: '200px',
              justifyContent: 'center',
              alignItems: 'center',
              display: 'flex',
            }}
          >
            {imageUpload.coverUrl ? <CoverPreview src={imageUpload.coverUrl} alt="cover" /> : 'cover'}
          </Canvas>
          {imageUpload.coverUrl && (
            <IconButton
              size="small"
              aria-label="커버 이미지 삭제"
              onClick={(e) => {
                e.stopPropagation();
                imageUpload.resetCover();
              }}
              sx={{
                position: 'absolute',
                top: 12,
                right: 12,
                backgroundColor: theme.palette.transparent.black,
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: `0.1px solid ${theme.palette.transparent.black}`,
                '&:hover': { backgroundColor: theme.palette.transparent.black },
                color: theme.palette.primary.contrastText,
              }}
            >
              <CloseRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
          <UploadBadge
            onClick={imageUpload.handleSelectLogo}
            aria-label="로고 이미지 업로드"
          >
            {imageUpload.logoUrl ? <LogoPreview src={imageUpload.logoUrl} alt="logo" /> : 'image'}
          </UploadBadge>
          {imageUpload.logoUrl && (
            <IconButton
              size="small"
              aria-label="로고 이미지 삭제"
              onClick={(e) => {
                e.stopPropagation();
                imageUpload.resetLogo();
              }}
              sx={{
                position: 'absolute',
                bottom: '30px',
                left: '76px',
                backgroundColor: theme.palette.transparent.black,
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: `0.1px solid ${theme.palette.transparent.black}`,
                '&:hover': { backgroundColor: theme.palette.transparent.black },
                color: theme.palette.primary.contrastText,
                zIndex: 10,
              }}
            >
              <CloseRoundedIcon sx={{ fontSize: 10 }} />
            </IconButton>
          )}
          {/* 이름/분야 표시 - 로고 오른쪽에 고정 위치 */}
          <LabelRow
            sx={{
              position: 'absolute',
              left: '104px', // 로고(left: 16) + 로고 너비(80) + 여백(8)
              bottom: '-50px', // 로고 중앙 위치: UploadBadge bottom(-32px) - 로고 높이/2(40px)
              marginLeft: 0, // 기존 marginLeft 제거
            }}
          >
            <SmallLabel>{artistName || '아티스트명'}</SmallLabel>
            <SmallEm>{activityField || '활동분야'}</SmallEm>
          </LabelRow>
          <input
            ref={imageUpload.coverInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={imageUpload.handleCoverChange}
          />
          <input
            ref={imageUpload.logoInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={imageUpload.handleLogoChange}
          />
        </CanvasWrapper>

        {/* 태그 표시 */}
        <TagsRow>
          {storedTags && storedTags.map((tag) => (
            <Tag key={tag}>#{tag}</Tag>
          ))}
        </TagsRow>


        <PageTitle sx={{ wordBreak: 'keep-all' }}>마지막으로 아티스트님을 자유롭게 어필해 주세요!</PageTitle>
        <PageSubtitle sx={{ wordBreak: 'keep-all' }}>{artistName}님, 주 분야에서 강조하고 싶은 포인트가 있나요?</PageSubtitle>
        {/* 입력 폼 */}
        <FormSection>
          <TagInput
            tags={highlightKeywords}
            onTagsChange={setHighlightKeywords}
            placeholder="키워드를 입력하고 쉼표(,)로 추가"
            maxTags={5}
            showLimitError={showKeywordLimitError}
            onLimitError={setShowKeywordLimitError}
          />
        </FormSection>

        <PageSubtitle>간단한 소개와 이력으로 {artistName}님을 알려주세요!</PageSubtitle>
        <FormSection>
          <StyledTextField sx={{ marginBottom: 1 }}
            placeholder="나를 가장 잘 나타내는 한 줄 소개를 작성해 주세요"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            autoComplete="off"
          />
          <StyledTextField
            placeholder="포트폴리오 링크 (선택)"
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
            autoComplete="off"
          />
        </FormSection>

        {/* 주요 활동 지역 선택 */}
        <FormSection>
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
      </ScrollableForm>

      {/* 하단 버튼 */}
      <OnboardingButton
        disabled={!isFormValid}
        onClick={handleSubmit}
      >
        다음
      </OnboardingButton>
    </OnboardingLayout >
  );
}

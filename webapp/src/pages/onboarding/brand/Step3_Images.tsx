import { useBrandOnboardingStore } from '../../../stores/onboarding/useBrandOnboardingStore';
import { useCommonOnboardingStore } from '../../../stores/onboarding/useCommonOnboardingStore';
import { useImageUpload } from '../../../hooks/useImageUpload';
import { useOnboardingStep } from '../../../hooks/useOnboardingStep';
import { useDefaultImages } from '../../../hooks/useDefaultImages';
import OnboardingLayout from '../../../components/onboarding/OnboardingLayout';
import OnboardingButton from '../../../components/onboarding/OnboardingButton';
import { TitleSection } from '../../../styles/onboarding/common.styles';
import {
  PageTitle,
  PageSubtitle,
  CanvasWrapper,
  Canvas,
  CoverPreview,
  UploadBadge,
  LogoPreview,
  SmallEm,
  Footnote,
} from './Step3_Images.styles';
import { Box, IconButton, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useTheme } from '@mui/material/styles';

export default function Step3_Images() {
  const brandName = useBrandOnboardingStore((state) => state.brandName);
  const activityField = useBrandOnboardingStore((state) => state.activityField);
  const storedCoverFile = useCommonOnboardingStore((state) => state.coverFile);
  const storedLogoFile = useCommonOnboardingStore((state) => state.logoFile);
  const setImages = useCommonOnboardingStore((state) => state.setImages);

  const {
    coverFile,
    logoFile,
    coverUrl,
    logoUrl,
    coverInputRef,
    logoInputRef,
    handleSelectCover,
    handleSelectLogo,
    handleCoverChange,
    handleLogoChange,
    setCoverFile,
    setLogoFile,
  } = useImageUpload({
    initialCoverFile: storedCoverFile,
    initialLogoFile: storedLogoFile,
  });

  const { handleSubmitWithDefaults, ConfirmDialog } = useDefaultImages({
    storedCoverFile,
    storedLogoFile,
    coverFile,
    logoFile,
    setCoverFile,
    setLogoFile,
    useCover: true,
    useLogo: true,
  });

  const validate = () => {
    // 이미지가 선택되었는지만 확인 (confirm은 여기서 호출하지 않음)
    return true; // 항상 true 반환하여 버튼 활성화
  };

  const { handleSubmit: baseHandleSubmit } = useOnboardingStep({
    nextRoute: '/onboarding/brand/collaboration',
    validate,
    onSubmit: () => {
      // onSubmit은 커스텀 handleSubmit에서 처리
    },
  });

  const handleSubmit = async () => {
    await handleSubmitWithDefaults((finalFiles) => {
      setImages(finalFiles.coverFile || storedCoverFile!, finalFiles.logoFile || storedLogoFile!);
      baseHandleSubmit();
    });
  };

  const theme = useTheme();

  return (
    <OnboardingLayout scrollable>


      <TitleSection>
        <PageTitle>브랜드의 첫인상을 만들어 주세요.</PageTitle>
        <PageSubtitle>로고와 커버 이미지는 브랜드를 각인시키는 중요한 요소예요!</PageSubtitle>
      </TitleSection>

      <Box sx={{ width: '100%', maxWidth: 340, margin: '40px auto' }}>
        <CanvasWrapper sx={{ position: 'relative', overflow: 'visible' }}>
          <Canvas
            onClick={handleSelectCover}
            role="button"
            aria-label="커버 이미지 업로드"
            tabIndex={0}
          >
            {coverUrl ? <CoverPreview src={coverUrl} alt="cover" /> : null}
          </Canvas>
          {coverUrl && (
            <IconButton
              size="small"
              aria-label="커버 이미지 삭제"
              onClick={(e) => {
                e.stopPropagation();
                setCoverFile(null);
              }}
              sx={{
                position: 'absolute',
                top: 12,
                right: 12,
                backgroundColor: theme.palette.transparent.black,
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: `0.1px solid ${theme.palette.transparent.black}`,
                color: theme.palette.primary.contrastText,
              }}
            >
              <CloseRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
          <UploadBadge
            onClick={handleSelectLogo}
            aria-label="로고 이미지 업로드"
          >
            {logoUrl ? <LogoPreview src={logoUrl} alt="logo" /> : 'image'}
          </UploadBadge>
          {logoUrl && (
            <IconButton
              size="small"
              aria-label="로고 이미지 삭제"
              onClick={(e) => {
                e.stopPropagation();
                setLogoFile(null);
              }}
              sx={{
                position: 'absolute',
                bottom: '30px', // -32px (UploadBadge bottom) + 80px (height) - 8px (offset)
                left: '76px', // 16px (UploadBadge left) + 80px (width) - 8px (offset)
                backgroundColor: theme.palette.transparent.black,
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: `0.1px solid ${theme.palette.transparent.black}`,
                color: theme.palette.primary.contrastText,
                zIndex: 10,
              }}
            >
              <CloseRoundedIcon sx={{ fontSize: 10 }} />
            </IconButton>
          )}

          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleCoverChange}
          />
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleLogoChange}
          />
        </CanvasWrapper>

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

      <Box sx={{ marginTop: 'auto', width: '100%' }}>
        <Footnote>라잇에서 노출되는 실제 브랜드 프로필이에요.</Footnote>

        <OnboardingButton
          onClick={handleSubmit}
        >
          확인
        </OnboardingButton>
      </Box>
      {ConfirmDialog}
    </OnboardingLayout >
  );
}

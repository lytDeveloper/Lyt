import { useState, useEffect } from 'react';
import { IconButton, MenuItem } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useCommonOnboardingStore } from '../../../stores/onboarding/useCommonOnboardingStore';
import { useCreativeOnboardingStore } from '../../../stores/onboarding/useCreativeOnboardingStore';
import { useImageUpload } from '../../../hooks/useImageUpload';
import { useOnboardingStep } from '../../../hooks/useOnboardingStep';
import { useDefaultImages } from '../../../hooks/useDefaultImages';
import { validateNickname } from '../../../utils/validation';
import { profileQueryService } from '../../../services/profileQueryService';
import OnboardingLayout from '../../../components/onboarding/OnboardingLayout';
import OnboardingButton from '../../../components/onboarding/OnboardingButton';
import ActivityFieldKeywordPicker from '../../../components/onboarding/ActivityFieldKeywordPicker';
import { ScrollableForm, PageTitle, CanvasWrapper, Canvas, UploadBadge } from '../../../styles/onboarding/common.styles';
import {
  FormSection,
  StyledTextField,
  StyledSelect,
  ProfilePreview,
} from '../artist/Step1_ArtistName.styles';
import {
  HelperText,
} from './Step1_CreativeImage.styles';
import { LogoPreview, CoverPreview } from '../brand/Step3_Images.styles';
import { useTheme } from '@mui/material/styles';

// 활동 분야 옵션
const activityFields = ['음악', '패션', '뷰티', '콘텐츠', '마켓', '재테크', '라이브쇼핑', '이벤트', '문화', '디지털', '라이프', '힐링'];

export default function Step1_CreativeImage() {
  // Common store
  const nickname = useCommonOnboardingStore((state) => state.nickname);
  const setNickname = useCommonOnboardingStore((state) => state.setNickname);
  const logoFile = useCommonOnboardingStore((state) => state.logoFile);
  const setLogoFile = useCommonOnboardingStore((state) => state.setLogoFile);
  const coverFile = useCommonOnboardingStore((state) => state.coverFile);
  const setCoverFile = useCommonOnboardingStore((state) => state.setCoverFile);
  const selectedKeywords = useCommonOnboardingStore((state) => state.selectedKeywords);
  const setSelectedKeywords = useCommonOnboardingStore((state) => state.setSelectedKeywords);

  // Creative store
  const {
    activityField: storedActivityField,
    tags: storedTags,
    bio: storedBio,
    setBasicInfo,
  } = useCreativeOnboardingStore();

  // Local state
  const [nicknameInput, setNicknameInput] = useState(nickname || '');
  const [nicknameError, setNicknameError] = useState('');
  const [activityField, setActivityField] = useState(storedActivityField || '');
  const [bio, setBio] = useState<string>(storedBio || '');
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  const imageUpload = useImageUpload({
    initialCoverFile: coverFile,
    initialLogoFile: logoFile,
  });

  const { handleSubmitWithDefaults, ConfirmDialog } = useDefaultImages({
    storedCoverFile: coverFile,
    storedLogoFile: logoFile,
    coverFile: imageUpload.coverFile,
    logoFile: imageUpload.logoFile,
    setCoverFile: imageUpload.setCoverFile,
    setLogoFile: imageUpload.setLogoFile,
    useCover: true,
    useLogo: true,
  });

  // Sync local state when store value changes
  useEffect(() => {
    setNicknameInput(nickname || '');
  }, [nickname]);

  useEffect(() => {
    setActivityField(storedActivityField || '');
  }, [storedActivityField]);

  useEffect(() => {
    setSelectedKeywords(storedTags || []);
  }, [storedTags, setSelectedKeywords]);

  useEffect(() => {
    setBio(storedBio || '');
  }, [storedBio]);

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNicknameInput(value);

    const validation = validateNickname(value);
    setNicknameError(validation || '');
  };

  const validate = () => {
    if (!nicknameInput.trim()) {
      return { isValid: false, error: '닉네임을 입력해 주세요.' };
    }
    if (nicknameError) {
      return { isValid: false, error: nicknameError };
    }
    // 이미지 필수 체크 제거 (ArtistName과 동일하게)
    if (!activityField) {
      return { isValid: false, error: '주 활동 분야를 선택해 주세요.' };
    }
    if (!selectedKeywords.length) {
      return { isValid: false, error: '태그를 최소 1개 이상 선택해 주세요.' };
    }
    if (!bio.trim()) {
      return { isValid: false, error: '한 줄 소개를 작성해 주세요.' };
    }
    return { isValid: true };
  };

  const { handleSubmit: baseHandleSubmit, handleGoBack } = useOnboardingStep({
    nextRoute: '/onboarding/creative/addChannels',
    prevRoute: '/onboarding/profile',
    validate,
    onValidationError: (error) => {
      if (error) alert(error);
    },
    onSubmit: () => {
      // onSubmit은 커스텀 handleSubmit에서 처리
    },
  });

  const handleSubmit = async () => {
    const trimmedNickname = nicknameInput.trim();

    // 중복 체크
    setIsCheckingDuplicate(true);
    try {
      const isDuplicate = await profileQueryService.checkCreativeNicknameDuplicate(trimmedNickname);
      if (isDuplicate) {
        setNicknameError('이미 사용 중인 닉네임이에요.');
        setIsCheckingDuplicate(false);
        return;
      }
    } catch (error) {
      console.error('닉네임 중복 확인 오류:', error);
      setNicknameError('중복 확인 중 오류가 발생했어요.');
      setIsCheckingDuplicate(false);
      return;
    }
    setIsCheckingDuplicate(false);

    await handleSubmitWithDefaults((finalFiles) => {
      setNickname(trimmedNickname);
      setCoverFile(finalFiles.coverFile || coverFile!);
      setLogoFile(finalFiles.logoFile || logoFile!);
      setBasicInfo(activityField, selectedKeywords, bio);
      baseHandleSubmit();
    });
  };

  const isFormValid =
    nicknameInput.trim() &&
    !nicknameError &&
    activityField &&
    selectedKeywords.length > 0 &&
    bio.trim() &&
    !isCheckingDuplicate;

  const theme = useTheme();

  return (
    <OnboardingLayout onClose={handleGoBack} scrollable>
      <ScrollableForm>
        <PageTitle>브랜드에게 보여줄 프로필 정보에요.</PageTitle>

        {/* 프로필 미리보기 및 이미지 업로드 */}
        <ProfilePreview>
          <CanvasWrapper sx={{ marginBottom: 5, position: 'relative', overflow: 'visible' }}>
            <Canvas
              onClick={imageUpload.handleSelectCover}
              role="button"
              aria-label="커버 이미지 업로드"
              tabIndex={0}
            >
              {imageUpload.coverUrl ? <CoverPreview src={imageUpload.coverUrl} alt="cover" /> : null}
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
                  color: theme.palette.primary.contrastText,
                }}
              >
                <CloseRoundedIcon fontSize="small" />
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
        </ProfilePreview>

        {/* 닉네임 입력 */}
        <FormSection>
          <StyledTextField
            placeholder="사용할 닉네임을 20자 이내로 입력해 주세요"
            value={nicknameInput}
            onChange={handleNicknameChange}
            autoComplete="off"
            error={!!nicknameError}
          />
          {nicknameError ? (
            <HelperText error>
              {nicknameError}
            </HelperText>
          ) : (
            <>
              <HelperText>
                한글, 영문, 숫자만 입력해주세요. (특수문자는 .,-,&만 사용 가능)
              </HelperText>
            </>
          )}
        </FormSection>

        {/* 활동 분야 선택 */}
        <FormSection>
          <StyledSelect
            value={activityField}
            onChange={(e) => setActivityField(e.target.value as string)}
            displayEmpty
            renderValue={(selected) => {
              if (!selected) {
                return <span style={{ color: '#949196' }}>주 활동 분야를 선택해 주세요.</span>;
              }
              return selected as string;
            }}
          >
            <MenuItem value="" disabled>
              주 활동 분야를 선택해 주세요.
            </MenuItem>
            {activityFields.map((field) => (
              <MenuItem key={field} value={field}>
                {field}
              </MenuItem>
            ))}
          </StyledSelect>

          {activityField ? (
            <ActivityFieldKeywordPicker activityField={activityField} />
          ) : null}
        </FormSection>

        {/* 한 줄 소개 */}
        <FormSection>
          <StyledTextField
            placeholder="나를 가장 잘 나타내는 한 줄 소개를 작성해 주세요"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            autoComplete="off"
          />
        </FormSection>
      </ScrollableForm>

      {/* 하단 버튼 */}
      <OnboardingButton
        disabled={!isFormValid}
        onClick={handleSubmit}
      >
        다음
      </OnboardingButton>
      {ConfirmDialog}
    </OnboardingLayout>
  );
}

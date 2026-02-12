import { useState, useEffect } from 'react';
import { IconButton } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useCommonOnboardingStore } from '../../../stores/onboarding/useCommonOnboardingStore';
import { useImageUpload } from '../../../hooks/useImageUpload';
import { useOnboardingStep } from '../../../hooks/useOnboardingStep';
import { useDefaultImages } from '../../../hooks/useDefaultImages';
import { validateNickname } from '../../../utils/validation';
import { profileQueryService } from '../../../services/profileQueryService';
import OnboardingLayout from '../../../components/onboarding/OnboardingLayout';
import OnboardingButton from '../../../components/onboarding/OnboardingButton';
import { ScrollableForm, PageTitle } from '../../../styles/onboarding/common.styles';
import { useTheme } from '@mui/material/styles';
import {
  FormSection,
  StyledTextField,
} from '../artist/Step1_ArtistName.styles';
import {
  ImageUploadSection,
  ImagePlaceholder,
  HelperText,
} from './Step1_FanImage.styles';


export default function Step1_FanImage() {
  const theme = useTheme();
  // Common store
  const nickname = useCommonOnboardingStore((state) => state.nickname);
  const setNickname = useCommonOnboardingStore((state) => state.setNickname);
  const logoFile = useCommonOnboardingStore((state) => state.logoFile);
  const setLogoFile = useCommonOnboardingStore((state) => state.setLogoFile);

  // Local state
  const [nicknameInput, setNicknameInput] = useState(nickname || '');
  const [nicknameError, setNicknameError] = useState('');
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  const { logoFile: profileImage, logoUrl: imageUrl, logoInputRef: imageInputRef, handleSelectLogo, handleLogoChange, setLogoFile: setProfileImageFile } = useImageUpload({ initialLogoFile: logoFile });

  const { handleSubmitWithDefaults, ConfirmDialog } = useDefaultImages({
    storedLogoFile: logoFile,
    logoFile: profileImage,
    setLogoFile: setProfileImageFile,
    useCover: false,
    useLogo: true,
  });

  // Sync local state when store value changes
  useEffect(() => {
    setNicknameInput(nickname || '');
  }, [nickname]);


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
    if (!profileImage) {
      return { isValid: false, error: '프로필 이미지를 선택해 주세요.' };
    }
    return { isValid: true };
  };

  const { handleSubmit: baseHandleSubmit, handleGoBack } = useOnboardingStep({
    nextRoute: '/onboarding/fan/interests',
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
      const isDuplicate = await profileQueryService.checkNicknameDuplicate(trimmedNickname);
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
      setLogoFile(finalFiles.logoFile || logoFile!);
      baseHandleSubmit();
    });
  };

  const isFormValid =
    nicknameInput.trim() &&
    !nicknameError &&
    profileImage &&
    !isCheckingDuplicate;

  return (
    <OnboardingLayout onClose={handleGoBack} scrollable>
      <ScrollableForm>
        <PageTitle>프로필 이미지를 선택해 주세요.</PageTitle>

        {/* 이미지 업로드 섹션 */}
        <ImageUploadSection sx={{ mt: 5 }}>
          <ImagePlaceholder
            onClick={handleSelectLogo}
            role="button"
            aria-label="프로필 이미지 업로드"
            tabIndex={0}
            sx={{ position: 'relative' }}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="profile"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
            ) : (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19ZM8.5 13.5L11 16.51L14.5 12L19 18H5L8.5 13.5Z" fill="#949196" />
              </svg>
            )}
            {imageUrl && (
              <IconButton
                size="small"
                aria-label="프로필 이미지 삭제"
                onClick={(e) => {
                  e.stopPropagation();
                  setProfileImageFile(null);
                }}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: theme.palette.transparent.black,
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: `0.1px solid ${theme.palette.transparent.black}`,
                  color: theme.palette.primary.contrastText,
                }}
              >
                <CloseRoundedIcon sx={{ fontSize: 14 }} />
              </IconButton>
            )}
          </ImagePlaceholder>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleLogoChange}
          />
        </ImageUploadSection>

        {/* 닉네임 입력 */}
        <FormSection sx={{ mt: 5 }}>
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

import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { IconButton, MenuItem } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useArtistOnboardingStore } from '../../../stores/onboarding/useArtistOnboardingStore';
import { useCommonOnboardingStore } from '../../../stores/onboarding/useCommonOnboardingStore';
import { useImageUpload } from '../../../hooks/useImageUpload';
import { useOnboardingStep } from '../../../hooks/useOnboardingStep';
import { useDefaultImages } from '../../../hooks/useDefaultImages';
import { validateNickname } from '../../../utils/validation';
import { profileQueryService } from '../../../services/profileQueryService';
import OnboardingLayout from '../../../components/onboarding/OnboardingLayout';
import OnboardingButton from '../../../components/onboarding/OnboardingButton';
import ActivityFieldKeywordPicker from '../../../components/onboarding/ActivityFieldKeywordPicker';
import { ScrollableForm, CanvasWrapper, Canvas, UploadBadge } from '../../../styles/onboarding/common.styles';
import {
  FormSection,
  StyledTextField,
  StyledSelect,
  ProfilePreview,
} from './Step1_ArtistName.styles';
import { HelperText } from '../../../styles/onboarding/form.styles';
import { LogoPreview, CoverPreview } from '../brand/Step3_Images.styles';
import { useTheme } from '@mui/material/styles';

// 활동 분야 옵션
const activityFields = ['음악', '패션', '뷰티', '콘텐츠', '마켓', '재테크', '라이브쇼핑', '이벤트', '문화', '디지털', '라이프', '힐링'];

export default function Step1_ArtistName() {
  const { artistName: storedName, activityField: storedField, tags: storedTags, setBasicInfo } = useArtistOnboardingStore();
  const {
    coverFile: storedCover,
    logoFile: storedLogo,
    setCoverFile,
    setLogoFile,
    selectedKeywords,
    setSelectedKeywords,
  } = useCommonOnboardingStore();

  const [artistName, setArtistName] = useState(storedName || '');
  const [activityField, setActivityField] = useState(storedField || '');
  const [artistNameError, setArtistNameError] = useState('');
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  const normalizeArtistNameError = (message: string | null) => {
    if (message === '닉네임을 입력해주세요.') {
      return '활동명을 입력해 주세요.';
    }
    if (message === '닉네임은 공백으로 끝날 수 없어요.') {
      return '활동명은 공백으로 끝날 수 없어요.';
    }
    return message;
  };

  const imageUpload = useImageUpload({
    initialCoverFile: storedCover,
    initialLogoFile: storedLogo,
  });

  const { handleSubmitWithDefaults, ConfirmDialog } = useDefaultImages({
    storedCoverFile: storedCover,
    storedLogoFile: storedLogo,
    coverFile: imageUpload.coverFile,
    logoFile: imageUpload.logoFile,
    setCoverFile: imageUpload.setCoverFile,
    setLogoFile: imageUpload.setLogoFile,
    useCover: true,
    useLogo: true,
  });

  // Sync local state when store values change
  useEffect(() => {
    setArtistName(storedName || '');
    if (storedName) {
      setArtistNameError(normalizeArtistNameError(validateNickname(storedName, { maxLength: 20 })) || '');
    } else {
      setArtistNameError('');
    }
  }, [storedName]);

  useEffect(() => {
    setActivityField(storedField || '');
  }, [storedField]);

  // tags(아티스트 스토어) -> 전역 selectedKeywords 동기화 (뒤로가기/재진입 대비)
  useEffect(() => {
    setSelectedKeywords(storedTags || []);
  }, [storedTags, setSelectedKeywords]);

  const { handleSubmit: baseHandleSubmit, handleGoBack } = useOnboardingStep({
    nextRoute: '/onboarding/artist/additionalInfo',
    prevRoute: '/onboarding/profile',
    validate: () => {
      const nameValidation = normalizeArtistNameError(validateNickname(artistName, { maxLength: 20 }));
      setArtistNameError(nameValidation || '');
      if (nameValidation) {
        return { isValid: false, error: nameValidation };
      }
      if (!activityField) {
        return { isValid: false, error: '주 활동 분야를 선택해 주세요.' };
      }
      if (!selectedKeywords.length) {
        return { isValid: false, error: '태그를 최소 1개 이상 선택해 주세요.' };
      }
      return { isValid: true };
    },
    onValidationError: (error) => {
      if (error) alert(error);
    },
    onSubmit: () => {
      // onSubmit은 커스텀 handleSubmit에서 처리
    },
  });

  const handleSubmit = async () => {
    const trimmedName = artistName.trim();

    // 중복 체크
    setIsCheckingDuplicate(true);
    try {
      const isDuplicate = await profileQueryService.checkArtistNameDuplicate(trimmedName);
      if (isDuplicate) {
        setArtistNameError('이미 사용 중인 활동명이에요.');
        setIsCheckingDuplicate(false);
        return;
      }
    } catch (error) {
      console.error('활동명 중복 확인 오류:', error);
      setArtistNameError('중복 확인 중 오류가 발생했어요.');
      setIsCheckingDuplicate(false);
      return;
    }
    setIsCheckingDuplicate(false);

    await handleSubmitWithDefaults((finalFiles) => {
      setBasicInfo(trimmedName, activityField, selectedKeywords);
      setCoverFile(finalFiles.coverFile || storedCover!);
      setLogoFile(finalFiles.logoFile || storedLogo!);
      baseHandleSubmit();
    });
  };

  const handleArtistNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setArtistName(value);
    const validation = normalizeArtistNameError(validateNickname(value, { maxLength: 20 }));
    setArtistNameError(validation || '');
  };

  const isFormValid = artistName.trim() && !artistNameError && activityField && selectedKeywords.length > 0 && !isCheckingDuplicate;

  const theme = useTheme();

  return (
    <OnboardingLayout onClose={handleGoBack} showProgressBar scrollable>
      <ScrollableForm>
        {/* 프로필 미리보기 */}
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

        {/* 입력 폼 */}
        <FormSection>
          <StyledTextField
            placeholder="활동명을 입력해 주세요"
            value={artistName}
            onChange={handleArtistNameChange}
            autoFocus
            autoComplete="off"
            error={!!artistNameError}
          />
          {artistNameError ? (
            <HelperText error>
              {artistNameError}
            </HelperText>
          ) : (
            <>
              <HelperText>
                한글, 영문, 숫자만 입력해주세요. (특수문자는 .,-,&만 사용 가능)
              </HelperText>
            </>
          )}
        </FormSection>

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
            MenuProps={{
              anchorOrigin: {
                vertical: 'bottom',
                horizontal: 'left',
              },
              transformOrigin: {
                vertical: 'top',
                horizontal: 'left',
              },
              PaperProps: {
                sx: {
                  mt: 1,
                  maxHeight: '50vh',
                  overscrollBehavior: 'contain',
                },
              },
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


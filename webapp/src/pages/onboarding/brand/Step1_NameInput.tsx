import { useState, useEffect } from 'react';
import { Typography } from '@mui/material';
import { useBrandOnboardingStore } from '../../../stores/onboarding/useBrandOnboardingStore';
import { validateRequired, validateBusinessNumber, validateNickname } from '../../../utils/validation';
import { profileQueryService } from '../../../services/profileQueryService';
import OnboardingLayout from '../../../components/onboarding/OnboardingLayout';
import OnboardingButton from '../../../components/onboarding/OnboardingButton';
import { useOnboardingStep } from '../../../hooks/useOnboardingStep';
import { InputWrapper, StyledTextField } from '../../../styles/onboarding/common.styles';
import { Title } from './Step1_NameInput.styles';

export default function Step1_NameInput() {
  const storedBrandName = useBrandOnboardingStore((state) => state.brandName);
  const storedDescription = useBrandOnboardingStore((state) => state.description);
  const storedBusinessNumber = useBrandOnboardingStore((state) => state.businessRegistrationNumber);
  const setBrandName = useBrandOnboardingStore((state) => state.setBrandName);
  const setDescription = useBrandOnboardingStore((state) => state.setDescription);
  const setBusinessRegistrationNumber = useBrandOnboardingStore((state) => state.setBusinessRegistrationNumber);

  const [brandName, setLocalBrandName] = useState(storedBrandName);
  const [description, setLocalDescription] = useState(storedDescription);
  const [businessNumber, setLocalBusinessNumber] = useState(storedBusinessNumber);
  const [brandNameError, setBrandNameError] = useState<string | null>(null);
  const [businessNumberError, setBusinessNumberError] = useState<string | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  // 설립일 상태
  const [estYear, setEstYear] = useState('');
  const [estMonth, setEstMonth] = useState('');
  const [estDay, setEstDay] = useState('');
  const setEstablishedAt = useBrandOnboardingStore((state) => state.setEstablishedAt);
  const savedEstablishedAt = useBrandOnboardingStore((state) => state.establishedAt);

  useEffect(() => {
    if (savedEstablishedAt) {
      const parts = savedEstablishedAt.split('-');
      if (parts.length === 3) {
        setEstYear(parts[0]);
        setEstMonth(parts[1]);
        setEstDay(parts[2]);
      }
    }
  }, [savedEstablishedAt]);

  const handleDateChange = (type: 'year' | 'month' | 'day', val: string) => {
    // 숫자만 허용
    const numeric = val.replace(/[^0-9]/g, '');
    if (type === 'year') {
      if (numeric.length <= 4) setEstYear(numeric);
    } else if (type === 'month') {
      if (numeric.length <= 2) {
        if (numeric && (parseInt(numeric) < 1 || parseInt(numeric) > 12)) return;
        setEstMonth(numeric);
      }
    } else {
      if (numeric.length <= 2) {
        if (numeric && (parseInt(numeric) < 1 || parseInt(numeric) > 31)) return;
        setEstDay(numeric);
      }
    }
  };

  const getFormattedDate = () => {
    if (!estYear || !estMonth || !estDay) return '';
    const y = estYear.padStart(4, '0');
    const m = estMonth.padStart(2, '0');
    const d = estDay.padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Sync local state when store values change
  useEffect(() => {
    setLocalBrandName(storedBrandName);
  }, [storedBrandName]);

  useEffect(() => {
    setLocalDescription(storedDescription);
  }, [storedDescription]);

  useEffect(() => {
    setLocalBusinessNumber(storedBusinessNumber);
  }, [storedBusinessNumber]);

  // 브랜드명 에러 메시지 커스터마이징
  const normalizeBrandNameError = (message: string | null) => {
    if (message === '닉네임을 입력해주세요.') {
      return '브랜드명을 입력해 주세요.';
    }
    if (message === '닉네임은 공백으로 끝날 수 없어요.') {
      return '브랜드명은 공백으로 끝날 수 없어요.';
    }
    return message;
  };

  const handleBrandNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalBrandName(value);

    const validation = normalizeBrandNameError(validateNickname(value, { maxLength: 30 }));
    setBrandNameError(validation);
  };

  const validate = () => {
    const nameError = validateRequired(brandName, '브랜드명');
    const nicknameValidation = normalizeBrandNameError(validateNickname(brandName, { maxLength: 30 }));
    const businessNumError = validateBusinessNumber(businessNumber);

    // 날짜 유효성 검사
    const fullDate = getFormattedDate();
    let dateValid = false;
    if (fullDate.length === 10) {
      const dateObj = new Date(fullDate);
      const now = new Date();
      if (!isNaN(dateObj.getTime()) && dateObj <= now) {
        dateValid = true;
      }
    }

    return !nameError && !nicknameValidation && !businessNumError && !brandNameError && dateValid;
  };

  const { handleSubmit: baseHandleSubmit, handleGoBack } = useOnboardingStep({
    nextRoute: '/onboarding/brand/details',
    prevRoute: '/onboarding/profile',
    validate,
    onSubmit: () => {
      setBrandName(brandName.trim());
      setDescription(description.trim());
      setBusinessRegistrationNumber(businessNumber.trim());
      setEstablishedAt(getFormattedDate());
    },
  });

  const handleSubmitWithDuplicateCheck = async () => {
    if (!validate()) return;

    const trimmedBrandName = brandName.trim();

    // 중복 체크
    setIsCheckingDuplicate(true);
    try {
      const isDuplicate = await profileQueryService.checkBrandNameDuplicate(trimmedBrandName);
      if (isDuplicate) {
        setBrandNameError('이미 사용 중인 브랜드명이에요.');
        setIsCheckingDuplicate(false);
        return;
      }
    } catch (error) {
      console.error('브랜드명 중복 확인 오류:', error);
      setBrandNameError('중복 확인 중 오류가 발생했어요.');
      setIsCheckingDuplicate(false);
      return;
    }
    setIsCheckingDuplicate(false);

    baseHandleSubmit();
  };

  const handleBusinessNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // 숫자만 추출
    const numericValue = value.replace(/[^0-9]/g, '');

    // 10자리 제한
    const limitedValue = numericValue.slice(0, 10);

    setLocalBusinessNumber(limitedValue);

    // 에러 초기화
    setBusinessNumberError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && validate()) {
      handleSubmitWithDuplicateCheck();
    }
  };

  return (
    <OnboardingLayout onClose={handleGoBack} scrollable>
      {/* 타이틀 */}
      <Title >브랜드의 이름을 알려주세요!</Title>

      {/* 브랜드명 입력 필드 */}
      <InputWrapper >
        <StyledTextField
          placeholder="브랜드명 / 회사명"
          value={brandName}
          onChange={handleBrandNameChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          error={!!brandNameError}
        />
        {/* 브랜드명 에러 메시지 표시 */}
        {brandNameError && (
          <Typography variant="caption" color="error" sx={{ mt: 1, ml: 1 }}>
            {brandNameError}
          </Typography>
        )}
      </InputWrapper>

      {/* 브랜드 소개 입력 필드 */}
      <Title >브랜드를 간단하게 소개해주세요!</Title>
      <InputWrapper >
        <StyledTextField
          placeholder="라잇은 각자의 자리에서 역량과 영향력을 연결하고 단순한 광고나 협업을 넘어 새로운 비즈니스 모델과 창의적인 마케팅, 예술 콘텐츠가 결합된 지속 가능한 가치와 수익 구조를 만들어내는 플랫폼입니다"
          value={description}
          onChange={(e) => setLocalDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          multiline
          minRows={3}
          inputProps={{ maxLength: 120 }}
        />
      </InputWrapper>

      <Title >사업자 등록번호를 알려주세요!</Title>

      {/* 사업자 등록번호 입력 필드 */}
      <InputWrapper >
        <StyledTextField
          placeholder="사업자 등록번호 (숫자만 입력)"
          value={businessNumber}
          onChange={handleBusinessNumberChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          error={!!businessNumberError}
        />
        {/* 에러 메시지 표시 */}
        {businessNumberError && (
          <Typography variant="caption" color="error" sx={{ mt: 1, ml: 1 }}>
            {businessNumberError}
          </Typography>
        )}
      </InputWrapper>

      <Title>브랜드 설립일을 알려주세요!</Title>
      <InputWrapper>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <StyledTextField
            placeholder="YYYY"
            value={estYear}
            onChange={(e) => handleDateChange('year', e.target.value)}
            inputProps={{ maxLength: 4, style: { textAlign: 'center' } }}
            sx={{ flex: 1.2 }}
          />
          <Typography>년</Typography>
          <StyledTextField
            placeholder="MM"
            value={estMonth}
            onChange={(e) => handleDateChange('month', e.target.value)}
            inputProps={{ maxLength: 2, style: { textAlign: 'center' } }}
            sx={{ flex: 1 }}
          />
          <Typography>월</Typography>
          <StyledTextField
            placeholder="DD"
            value={estDay}
            onChange={(e) => handleDateChange('day', e.target.value)}
            inputProps={{ maxLength: 2, style: { textAlign: 'center' } }}
            sx={{ flex: 1 }}
          />
          <Typography>일</Typography>
        </div>
      </InputWrapper>

      {/* 하단 버튼 */}
      <OnboardingButton
        disabled={!validate() || isCheckingDuplicate}
        onClick={handleSubmitWithDuplicateCheck}
      >
        확인
      </OnboardingButton>
    </OnboardingLayout>
  );
}

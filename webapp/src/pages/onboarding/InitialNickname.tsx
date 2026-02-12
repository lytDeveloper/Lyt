import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthContext.tsx'; // AuthProvider import
import { profileQueryService } from '../../services/profileQueryService';
import { validateNickname as utilValidateNickname } from '../../utils/validation';

// MUI 컴포넌트 import
import {
  Typography,
} from '@mui/material';
import { LightningLoader } from '../../components/common';

// 기존 스타일 컴포넌트 import
import {
  PageContainer,
  ContentContainer,
  InputWrapper,
  ButtonContainer,
  ButtonWrapper,
  ConfirmButton,
} from '../../styles/onboarding/common.styles';
import {
  Title,
  StyledTextField,
} from '../../pages/onboarding/brand/Step1_NameInput.styles';
import { useCommonOnboardingStore } from '../../stores/onboarding/useCommonOnboardingStore';


// --- 닉네임 설정 페이지 컴포넌트 ---

export default function InitialNickname() {
  const navigate = useNavigate();
  const { user, refetchProfile } = useAuth(); // AuthProvider에서 user 및 refetch 함수 가져오기

  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 닉네임 유효성 검사 (길이)
  const validateNickname = (name: string) => {
    const validationError = utilValidateNickname(name);
    if (validationError) {
      setError(validationError);
      return false;
    }
    setError(null);
    return true;
  };

  // 1. '확인' 버튼 클릭 (중복 체크 → 바로 저장)
  const handleNicknameCheck = async () => {
    const trimmedNickname = nickname.trim();
    if (!validateNickname(trimmedNickname)) return;

    if (!user) {
      setError('사용자 정보가 없어요. 다시 로그인해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use profileQueryService to check nickname duplication
      const isDuplicate = await profileQueryService.checkNicknameDuplicate(trimmedNickname);

      if (isDuplicate) {
        // 중복된 닉네임이 존재함
        setError('이미 사용 중인 닉네임이에요.');
      } else {
        // 중복 없음 -> 바로 닉네임 저장 (role='customer' 설정)
        await profileQueryService.setInitialNickname(user.id, trimmedNickname);

        // 프로필을 즉시 갱신하여 라우팅 가드 조건을 만족시킴
        await refetchProfile();

        // 이번 세션에서 최초로 닉네임을 설정했음을 표시
        try {
          sessionStorage.setItem('justCreatedNickname', '1');
        } catch (e) { void e; }

        // 전역 스토어에 닉네임 저장
        useCommonOnboardingStore.getState().setNickname(trimmedNickname);

        // 성공 시 환영 페이지로 이동
        navigate('/onboarding/welcome');
      }
    } catch (err) {
      console.error('닉네임 설정 오류:', err);
      setError('프로필 저장에 실패했어요. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer sx={{ px: { xs: 3, sm: 4, md: 5 }, py: { xs: 3, sm: 4 } }}>
      {/* 중앙 콘텐츠 */}
      <ContentContainer sx={{ justifyContent: 'center' }}>
        <Title>사용할 닉네임을 입력해주세요.</Title>

        <InputWrapper>
          <StyledTextField
            placeholder="닉네임을 입력해주세요.(2자 이상, 20자 이내)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && nickname.trim()) {
                handleNicknameCheck();
              }
            }}
            autoFocus
            autoComplete="off"
            disabled={isLoading} // 로딩 중 비활성화
            error={!!error} // 에러가 있으면 true
          />
          {/* 에러 메시지 표시 */}
          {error && (
            <Typography variant="caption" color="error" sx={{ mt: 1, ml: 1 }}>
              {error}
            </Typography>
          )}
        </InputWrapper>
      </ContentContainer>

      {/* 하단 버튼 */}
      <ButtonContainer>
        <ButtonWrapper>
          <ConfirmButton
            fullWidth
            variant="contained"
            disabled={!nickname.trim() || isLoading}
            onClick={handleNicknameCheck}
          >
            {isLoading ? (
              <LightningLoader size={20} color="inherit" />
            ) : (
              '확인'
            )}
          </ConfirmButton>
        </ButtonWrapper>
      </ButtonContainer>
    </PageContainer>
  );
}

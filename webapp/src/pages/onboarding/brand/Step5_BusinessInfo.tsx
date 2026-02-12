import { useState, useEffect } from 'react';
import { useBrandOnboardingStore } from '../../../stores/onboarding/useBrandOnboardingStore';
import { useOnboardingStep } from '../../../hooks/useOnboardingStep';
import OnboardingLayout from '../../../components/onboarding/OnboardingLayout';
import OnboardingButton from '../../../components/onboarding/OnboardingButton';
import { PageTitle, SubLabel } from '../../../styles/onboarding/common.styles';
import { FormSection } from '../../../styles/onboarding/form.styles';
import { StyledTextField, ScrollableForm, StyledSelect, UrlPrefix, PrefixText, LocationGrid, LocationButton } from './Step5_BusinessInfo.styles';
import { FormControl, InputLabel, MenuItem, Typography, Box } from '@mui/material';
import {
  SiInstagram,
  SiYoutube,
  SiTiktok,
  SiThreads,
  SiNaver,
} from 'react-icons/si';

// SNS 채널 옵션 타입 정의
interface SnsChannelOption {
  type: string;
  name: string;
  domain: string;
  icon: React.ElementType;
}

// 사용 가능한 SNS 채널 정의
const AVAILABLE_CHANNELS: SnsChannelOption[] = [
  {
    type: 'instagram',
    name: 'Instagram',
    domain: 'http://www.instagram.com/',
    icon: SiInstagram,
  },
  {
    type: 'youtube',
    name: 'Youtube',
    domain: 'http://www.youtube.com/',
    icon: SiYoutube,
  },
  {
    type: 'naver',
    name: 'Naver',
    domain: 'http://blog.naver.com/',
    icon: SiNaver,
  },
  {
    type: 'tiktok',
    name: 'Tiktok',
    domain: 'http://www.tiktok.com/',
    icon: SiTiktok,
  },
  {
    type: 'threads',
    name: 'Threads',
    domain: 'http://www.threads.net/@',
    icon: SiThreads,
  },
];

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

export default function Step5_BusinessInfo() {
  const { websiteUrl: storedWebsiteUrl, snsChannel: storedSnsChannel, contactInfo: storedContactInfo, region: storedRegion, setBusinessInfo } = useBrandOnboardingStore();

  const [websiteUrl, setWebsiteUrl] = useState(storedWebsiteUrl || '');
  const [selectedChannelType, setSelectedChannelType] = useState<string>('');
  const [snsChannelSuffix, setSnsChannelSuffix] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(storedRegion || null);

  // URL 패턴 검증 (웹사이트 주소)
  const validateWebsiteUrl = (url: string): boolean => {
    if (!url) return true; // 빈 값은 허용 (선택 사항)
    const urlPattern = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    return urlPattern.test(url);
  };

  // 이메일 검증
  const validateEmail = (email: string): boolean => {
    if (!email) return true; // 빈 값은 허용 (선택 사항)
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  };

  // URL에서 suffix 추출
  const getUrlSuffix = (url: string, domain: string): string => {
    if (url && url.startsWith(domain)) {
      return url.substring(domain.length);
    }
    return url || '';
  };

  // Sync local state when store values change
  useEffect(() => {
    setWebsiteUrl(storedWebsiteUrl || '');
  }, [storedWebsiteUrl]);

  useEffect(() => {
    if (storedSnsChannel) {
      // 저장된 SNS 채널에서 타입과 suffix 추출
      const channelInfo = AVAILABLE_CHANNELS.find(ch => storedSnsChannel.startsWith(ch.domain));
      if (channelInfo) {
        setSelectedChannelType(channelInfo.type);
        setSnsChannelSuffix(getUrlSuffix(storedSnsChannel, channelInfo.domain));
      } else {
        setSelectedChannelType('');
        setSnsChannelSuffix('');
      }
    } else {
      setSelectedChannelType('');
      setSnsChannelSuffix('');
    }
  }, [storedSnsChannel]);

  useEffect(() => {
    if (storedContactInfo) {
      // 이메일 패턴이면 email에, 아니면 phone에 저장
      if (validateEmail(storedContactInfo)) {
        setEmail(storedContactInfo);
        setPhone('');
      } else {
        setPhone(storedContactInfo);
        setEmail('');
      }
    } else {
      setEmail('');
      setPhone('');
    }
  }, [storedContactInfo]);

  useEffect(() => {
    setSelectedRegion(storedRegion || null);
  }, [storedRegion]);

  // 선택된 채널 정보 가져오기
  const selectedChannel = AVAILABLE_CHANNELS.find(ch => ch.type === selectedChannelType);

  // SNS 채널 전체 URL 생성
  const getFullSnsChannelUrl = (): string | null => {
    if (!selectedChannelType || !snsChannelSuffix) return null;
    return selectedChannel ? selectedChannel.domain + snsChannelSuffix : null;
  };

  // 연락처 정보 합치기 (이메일 우선, 없으면 전화번호)
  const getContactInfo = (): string | null => {
    if (email) return email;
    if (phone) return phone;
    return null;
  };

  const { handleSubmit, handleGoBack } = useOnboardingStep({
    nextRoute: '/onboarding/brand/complete',
    onSubmit: () => {
      setBusinessInfo(
        websiteUrl || null,
        getFullSnsChannelUrl(),
        getContactInfo(),
        selectedRegion === '전체' ? 'all' : selectedRegion
      );
    },
  });

  return (
    <OnboardingLayout onClose={handleGoBack} showProgressBar scrollable>
      <ScrollableForm sx={{ flex: 1, width: '100%' }}>
        <PageTitle>마지막 단계예요.</PageTitle>
        <SubLabel style={{ marginBottom: '32px' }}>
          공식 채널과 비즈니스 정보는 브랜드의 신뢰를 높여줄 수 있어요.
        </SubLabel>

        {/* 웹사이트 주소 */}
        <FormSection>
          <StyledTextField
            placeholder="공식 웹사이트 주소(예: light.com)"
            value={websiteUrl}
            onChange={(e) => {
              const value = e.target.value;
              setWebsiteUrl(value);
            }}
            error={websiteUrl !== '' && !validateWebsiteUrl(websiteUrl)}
            helperText={websiteUrl !== '' && !validateWebsiteUrl(websiteUrl) ? '올바른 웹사이트 주소를 입력해 주세요. (예: light.com)' : ''}
            fullWidth
            autoComplete="off"
          />
        </FormSection>

        {/* SNS 채널 */}
        <FormSection>
          <FormControl fullWidth>
            <InputLabel id="sns-channel-select-label">
              SNS 채널 선택
            </InputLabel>
            <StyledSelect
              labelId="sns-channel-select-label"
              value={selectedChannelType}
              onChange={(e) => {
                setSelectedChannelType(e.target.value as string);
                setSnsChannelSuffix('');
              }}
              label="SNS 채널 선택"
            >
              <MenuItem value="">
                <em>선택 안함</em>
              </MenuItem>
              {AVAILABLE_CHANNELS.map((channel) => (
                <MenuItem key={channel.type} value={channel.type}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <channel.icon />
                    <span>{channel.name}</span>
                  </Box>
                </MenuItem>
              ))}
            </StyledSelect>
          </FormControl>

          {/* 선택된 채널의 URL 입력 */}
          {selectedChannel && (
            <UrlPrefix>
              <PrefixText>{selectedChannel.domain}</PrefixText>
              <StyledTextField
                placeholder={
                  selectedChannel.type === 'instagram' ? 'lyt_official' :
                    selectedChannel.type === 'youtube' ? '@lytofficial' :
                      selectedChannel.type === 'naver' ? 'lytofficial' :
                        selectedChannel.type === 'tiktok' ? 'lytofficial' :
                          'lytofficial'
                }
                value={snsChannelSuffix}
                onChange={(e) => setSnsChannelSuffix(e.target.value)}
                fullWidth
                autoComplete="off"
                sx={{
                  flex: 1,
                  '& .MuiOutlinedInput-input': {
                    paddingLeft: '12px', // placeholder와 텍스트를 더 왼쪽에서 시작
                  },
                }}
              />
            </UrlPrefix>
          )}
        </FormSection>

        {/* 담당자 이메일 */}
        <FormSection>
          <StyledTextField
            placeholder="담당자 이메일 (예: contact@example.com)"
            value={email}
            onChange={(e) => {
              const value = e.target.value;
              setEmail(value);
            }}
            type="email"
            error={email !== '' && !validateEmail(email)}
            helperText={email !== '' && !validateEmail(email) ? '올바른 이메일 주소를 입력해 주세요.' : ''}
            fullWidth
            autoComplete="email"
          />
        </FormSection>

        {/* 담당자 연락처 */}
        <FormSection>
          <StyledTextField
            placeholder="담당자 연락처 (예: 010-1234-5678)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            fullWidth
            autoComplete="tel"
          />
        </FormSection>

        {/* 브랜드 소재지 */}
        <FormSection>
          <Typography sx={{ mt: 2, mb: 3 }}>브랜드의 소재지를 선택해 주세요.</Typography>
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
      <OnboardingButton onClick={handleSubmit}>
        프로필 완성하기
      </OnboardingButton>
    </OnboardingLayout>
  );
}


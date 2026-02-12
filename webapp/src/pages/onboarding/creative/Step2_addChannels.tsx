import { useState } from 'react';
import { useCreativeOnboardingStore, type SnsChannel as StoreSnsChannel } from '../../../stores/onboarding/useCreativeOnboardingStore';
import { useOnboardingStep } from '../../../hooks/useOnboardingStep';
import OnboardingLayout from '../../../components/onboarding/OnboardingLayout';
import OnboardingButton from '../../../components/onboarding/OnboardingButton';
import { PageTitle, PageSubtitle } from '../../../styles/onboarding/common.styles';
import { TitleSection } from '../../../styles/onboarding/common.styles';
import {
  ChannelListContainer,
  AddChannelButton,
  DescriptionText,
  ModalTitle,
  ChannelOptionList,
  ChannelOptionItem,
  ChannelInfo,
  ChannelIcon,
  ChannelName,
  CheckIcon,
  SelectedChannelCard,
  ChannelHeader,
  DeleteButton,
  UrlPrefix,
  PrefixText,
  UrlSuffixInput,
  ExpandedSection,
  MainChannelCheckbox,
  Checkbox,
  CheckboxLabel,
} from './Step2_addChannels.styles';

// 1. react-icons에서 필요한 아이콘들을 import 합니다.
import {
  SiInstagram,
  SiYoutube,
  SiTiktok,
  SiThreads,
} from 'react-icons/si';

// Naver 아이콘은 react-icons/si에 'SiNaver'로 있습니다.
import { SiNaver } from 'react-icons/si';


// SNS 채널 옵션 타입 정의 (UI용)
interface SnsChannelOption {
  type: string;
  name: string;
  url: string;
  icon: React.ElementType;
  iconColor: string;
  color: string;
  domain: string;
  is_main: boolean;
}

// 사용 가능한 SNS 채널 정의
// 3. 사용 가능한 SNS 채널 정의 (icon 속성 수정)
const AVAILABLE_CHANNELS: SnsChannelOption[] = [
  {
    type: 'instagram',
    name: 'Instagram',
    icon: SiInstagram, // 텍스트 '📷' 대신 컴포넌트
    iconColor: '#E4405F', // 흰색 아이콘
    color: '',
    domain: 'http://www.instagram.com/',
    url: '',
    is_main: false,
  },
  {
    type: 'youtube',
    name: 'Youtube',
    icon: SiYoutube, // 텍스트 '▶' 대신 컴포넌트
    iconColor: '#FFFFFF', // 흰색 아이콘
    color: '#FF0000',
    domain: 'http://www.youtube.com/',
    url: '',
    is_main: false,
  },
  {
    type: 'naver',
    name: 'Naver',
    icon: SiNaver, // 텍스트 'N' 대신 컴포넌트
    iconColor: '#FFFFFF', // 흰색 아이콘
    color: '#03C75A',
    domain: 'http://blog.naver.com/',
    url: '',
    is_main: false,
  },
  {
    type: 'tiktok',
    name: 'Tiktok',
    icon: SiTiktok, // 텍스트 '🎵' 대신 컴포넌트
    iconColor: '#000000', // 검은색 아이콘
    color: '#FFFFFF', // TikTok은 배경이 흰색인 경우가 많음 (디자인 따라 수정)
    domain: 'http://www.tiktok.com/',
    url: '',
    is_main: false,
  },
  {
    type: 'threads',
    name: 'Threads',
    icon: SiThreads, // 텍스트 '@' 대신 컴포넌트
    iconColor: '#FFFFFF', // 흰색 아이콘
    color: '#000000',
    domain: 'http://www.threads.net/@',
    url: '',
    is_main: false,
  },
];
export default function Step2_addChannels() {
  const snsChannels = useCreativeOnboardingStore((state) => state.snsChannels);
  const setSnsChannels = useCreativeOnboardingStore((state) => state.setSnsChannels);

  // Convert store data to UI format
  const initializeChannels = (): SnsChannelOption[] => {
    if (!snsChannels) return [];
    return snsChannels.map(ch => {
      const channelInfo = AVAILABLE_CHANNELS.find(c => c.type === ch.type);
      return channelInfo ? { ...channelInfo, url: ch.url, is_main: ch.is_main } : null;
    }).filter((ch): ch is SnsChannelOption => ch !== null);
  };

  const [channels, setChannels] = useState<SnsChannelOption[]>(initializeChannels());
  const [showSelectionScreen, setShowSelectionScreen] = useState(false);
  const [tempChannels, setTempChannels] = useState<SnsChannelOption[]>([]);

  // 선택 화면에서 채널 타입 토글
  const handleChannelToggle = (type: string) => {

    setTempChannels((prev) => {
      const exists = prev.find((ch) => ch.type === type);
      if (exists) {
        // 이미 선택된 경우 제거
        return prev.filter((ch) => ch.type !== type);
      } else {
        // 새로 선택하는 경우 추가
        const channelInfo = AVAILABLE_CHANNELS.find((ch) => ch.type === type);
        if (!channelInfo) return prev;

        return [
          ...prev,
          {
            ...channelInfo,
            url: channelInfo.domain,
            is_main: prev.length === 0, // 첫 번째 채널은 자동으로 메인
          },
        ];
      }
    });
  };

  // 선택 화면에서 선택 완료
  const handleSelectionConfirm = () => {
    // tempChannels를 channels로 복사
    setChannels(tempChannels);
    setShowSelectionScreen(false);
  };

  // 선택 화면에서 URL 수정
  const handleTempUrlChange = (type: string, suffix: string) => {
    const channelInfo = AVAILABLE_CHANNELS.find((ch) => ch.type === type);
    const fullUrl = channelInfo ? channelInfo.domain + suffix : suffix;

    setTempChannels((prev) =>
      prev.map((ch) =>
        ch.type === type ? { ...ch, url: fullUrl } : ch
      )
    );
  };

  // 선택 화면에서 메인 채널 설정
  const handleTempMainChannelToggle = (type: string) => {
    setTempChannels((prev) =>
      prev.map((ch) => ({
        ...ch,
        is_main: ch.type === type,
      }))
    );
  };

  // 채널 삭제
  const handleDeleteChannel = (type: string) => {
    const updatedChannels = channels.filter((ch) => ch.type !== type);

    // 삭제된 채널이 메인이었다면, 첫 번째 채널을 메인으로 설정
    if (updatedChannels.length > 0) {
      const deletedChannel = channels.find((ch) => ch.type === type);
      if (deletedChannel?.is_main) {
        updatedChannels[0].is_main = true;
      }
    }

    setChannels(updatedChannels);
  };

  // URL 수정
  const handleUrlChange = (type: string, suffix: string) => {
    const channelInfo = AVAILABLE_CHANNELS.find((ch) => ch.type === type);
    const fullUrl = channelInfo ? channelInfo.domain + suffix : suffix;

    setChannels((prev) =>
      prev.map((ch) =>
        ch.type === type ? { ...ch, url: fullUrl } : ch
      )
    );
  };

  // 메인 채널 설정
  const handleMainChannelToggle = (type: string) => {
    setChannels((prev) =>
      prev.map((ch) => ({
        ...ch,
        is_main: ch.type === type,
      }))
    );
  };

  // URL에서 suffix 추출
  const getUrlSuffix = (url: string, type: string) => {
    const channelInfo = AVAILABLE_CHANNELS.find((ch) => ch.type === type);
    if (channelInfo && url.startsWith(channelInfo.domain)) {
      return url.substring(channelInfo.domain.length);
    }
    return url;
  };

  // URL 유효성 검증 (suffix가 입력되었는지)
  const isUrlValid = (url: string, type: string) => {
    const channelInfo = AVAILABLE_CHANNELS.find((ch) => ch.type === type);
    if (!channelInfo) return false;
    return url.length > channelInfo.domain.length;
  };

  const validate = () => {
    return channels.length > 0 && channels.every((ch) => isUrlValid(ch.url, ch.type));
  };

  const onSubmit = () => {
    // Convert UI format to store format (strip UI-only properties)
    const storeChannels: StoreSnsChannel[] = channels.map(ch => ({
      type: ch.type,
      url: ch.url,
      is_main: ch.is_main,
    }));
    setSnsChannels(storeChannels);
  };

  const { handleSubmit } = useOnboardingStep({
    nextRoute: '/onboarding/creative/acquisitionSource',
    validate,
    onSubmit,
  });

  // 선택 화면 열기
  const handleOpenSelectionScreen = () => {
    // 기존 채널 데이터를 tempChannels에 복사
    setTempChannels([...channels]);
    setShowSelectionScreen(true);
  };

  // 선택 화면 닫기
  const handleCloseSelectionScreen = () => {
    setShowSelectionScreen(false);
  };

  // 폼 유효성 검증
  const isFormValid = channels.length > 0 && channels.every((ch) => isUrlValid(ch.url, ch.type));

  // 선택 화면 렌더링
  if (showSelectionScreen) {
    return (
      <OnboardingLayout onClose={handleCloseSelectionScreen} scrollable>
        <ModalTitle>다중 선택이 가능해요!</ModalTitle>

        {/* 설명 텍스트 */}
        <DescriptionText>
          브랜드와의 협업, 유저들과의 원활한 소통을 위해 팔로워, 구독자가 많은 채널을 등록해 주세요.
        </DescriptionText>

        {/* 채널 옵션 리스트 */}
        <ChannelOptionList>
          {AVAILABLE_CHANNELS.map((channel) => {
            const isSelected = tempChannels.some((ch) => ch.type === channel.type);
            const channelData = tempChannels.find((ch) => ch.type === channel.type);
            const suffix = channelData ? getUrlSuffix(channelData.url, channel.type) : '';

            return (
              <div key={channel.type}>
                <ChannelOptionItem
                  selected={isSelected}
                  onClick={() => handleChannelToggle(channel.type)}
                >
                  <ChannelInfo>
                    <ChannelIcon $bgColor={channel.color}>
                      <channel.icon size={20} color={channel.iconColor} />
                    </ChannelIcon>
                    <ChannelName>{channel.name}</ChannelName>
                  </ChannelInfo>
                  <CheckIcon checked={isSelected} />
                </ChannelOptionItem>

                {/* 선택된 채널의 URL 입력 및 메인 채널 지정 */}
                {isSelected && channelData && (
                  <ExpandedSection>
                    {/* URL 입력 */}
                    <UrlPrefix>
                      <PrefixText>{channel.domain}</PrefixText>
                      <UrlSuffixInput
                        type="text"
                        value={suffix}
                        onChange={(e) => handleTempUrlChange(channel.type, e.target.value)}
                        placeholder={
                          channel.type === 'instagram' ? 'lyt_official' :
                            channel.type === 'youtube' ? '@lytofficial' :
                              channel.type === 'naver' ? 'lytofficial' :
                                channel.type === 'tiktok' ? 'lytofficial' :
                                  'lytofficial'
                        }

                        onClick={(e) => e.stopPropagation()}
                      />
                    </UrlPrefix>

                    {/* 메인 채널 체크박스 */}
                    <MainChannelCheckbox
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTempMainChannelToggle(channel.type);
                      }}
                    >
                      <Checkbox checked={channelData.is_main} />
                      <CheckboxLabel>메인 채널로 지정</CheckboxLabel>
                    </MainChannelCheckbox>
                  </ExpandedSection>
                )}
              </div>
            );
          })}
        </ChannelOptionList>

        {/* 하단 버튼 */}
        <OnboardingButton
          disabled={tempChannels.length === 0 || !tempChannels.every((ch) => isUrlValid(ch.url, ch.type))}
          onClick={handleSelectionConfirm}
        >
          다음
        </OnboardingButton>
      </OnboardingLayout>
    );
  }

  // 메인 화면 렌더링
  return (
    <OnboardingLayout scrollable>
      <PageTitle>SNS 채널 정보를 등록해 주세요.</PageTitle>

      {/* 선택된 채널 리스트 */}
      {channels.length > 0 && (
        <ChannelListContainer>
          {channels.map((channel) => {
            const channelInfo = AVAILABLE_CHANNELS.find((ch) => ch.type === channel.type);
            if (!channelInfo) return null;

            const suffix = getUrlSuffix(channel.url, channel.type);

            return (
              <SelectedChannelCard key={channel.type}>
                {/* 채널 헤더 */}
                <ChannelHeader>
                  <ChannelInfo>
                    <ChannelIcon $bgColor={channelInfo.color}>
                      <channelInfo.icon size={20} color={channelInfo.iconColor} />
                    </ChannelIcon>
                    <ChannelName>{channelInfo.name}</ChannelName>
                  </ChannelInfo>
                  <DeleteButton onClick={() => handleDeleteChannel(channel.type)}>
                    ×
                  </DeleteButton>
                </ChannelHeader>

                {/* URL 입력 */}
                <UrlPrefix>
                  <PrefixText>{channelInfo.domain}</PrefixText>
                  <UrlSuffixInput
                    type="text"
                    value={suffix}
                    onChange={(e) => handleUrlChange(channel.type, e.target.value)}
                    placeholder={
                      channel.type === 'instagram' ? 'lyt_official' :
                        channel.type === 'youtube' ? '@lytofficial' :
                          channel.type === 'naver' ? 'lytofficial' :
                            channel.type === 'tiktok' ? 'lytofficial' :
                              'lytofficial'
                    }
                  />
                </UrlPrefix>


                {/* 메인 채널 체크박스 */}
                <MainChannelCheckbox onClick={() => handleMainChannelToggle(channel.type)}>
                  <Checkbox checked={channel.is_main} />
                  <CheckboxLabel>메인 채널로 지정</CheckboxLabel>
                </MainChannelCheckbox>
              </SelectedChannelCard>
            );
          })}
        </ChannelListContainer>
      )}

      {/* 채널 추가 버튼 */}
      {channels.length < AVAILABLE_CHANNELS.length && (
        <AddChannelButton onClick={handleOpenSelectionScreen}>
          + 채널 추가
        </AddChannelButton>
      )}

      <TitleSection sx={{ marginBottom: '1' }}>
        메인 채널 지정은 꼭 하셔야 해요.
      </TitleSection>
      <PageSubtitle sx={{ marginBottom: '15px' }}>
        브랜드와의 협업, 유저들과의 원활한 소통을 위해<br />
        운영 중인 SNS 채널이 있다면 등록해 주세요.
      </PageSubtitle>

      {/* 하단 버튼 */}
      <OnboardingButton
        disabled={!isFormValid}
        onClick={handleSubmit}
      >
        선택 완료
      </OnboardingButton>
    </OnboardingLayout>
  );
}


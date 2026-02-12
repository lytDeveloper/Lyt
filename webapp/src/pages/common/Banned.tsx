import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Button,
} from '@mui/material';
import InquiryModal from '../../components/common/InquiryModal';
import { supabase } from '../../lib/supabase';
import { inquiryService } from '../../services/inquiryService';
import BottomNavigationBar, { BOTTOM_NAV_HEIGHT } from '../../components/navigation/BottomNavigationBar';
import { ContentContainer } from '../../styles/onboarding/common.styles';
import {
  CompleteMessage,
} from '../../pages/onboarding/creative/Step4_Complete.styles';

import warningIcon from '../../assets/icon/status/warning.png';

export default function Banned() {
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);

  //profiles 테이블에서 id와 일치하는 데이터의 banned_until 조회
  const { data: bannedUntil, isLoading } = useQuery({
    queryKey: ['bannedUntil'],
    queryFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('사용자 인증 실패:', userError);
        throw new Error('사용자 인증이 필요합니다.');
      }
      console.log('✓ 사용자 ID:', user.id);

      // Use inquiryService to get ban status
      const banStatus = await inquiryService.getBanStatus(user.id);

      if (!banStatus) {
        throw new Error('프로필 조회 실패');
      }

      return banStatus;
    }
  });

  return (
    <>
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: '#f2f2f2',
          maxWidth: '768px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          pb: `${BOTTOM_NAV_HEIGHT + 24}px`,
        }}
      >
        <ContentContainer sx={{ justifyContent: 'center', gap: 4, alignItems: 'center' }}>
          {/* 체크 아이콘 (X 표시용) */}

          <Box component="img" src={warningIcon} alt="warning" sx={{ width: 80, height: 80, objectFit: 'contain' }} />
          {/* <CheckIcon>✕</CheckIcon> */}


          {/* 제재 메시지 */}
          <CompleteMessage sx={{ textAlign: 'center', fontSize: '18px', fontWeight: 700 }}>
            현재 이용이 정지된 상태에요
            <br />
            {isLoading ? (
              '...'
            ) : bannedUntil?.banned_until ? (
              ` ( ~ ${new Date(bannedUntil.banned_until).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}까지 )`
            ) : (
              ''
            )}
          </CompleteMessage>

          {/* 문의하기 버튼 */}
          <Button
            variant="contained"
            onClick={() => setInquiryModalOpen(true)}
            sx={{
              mt: 5,
              px: 4,
              py: 1.5,
              fontSize: '16px',
              fontWeight: 600,
              width: '100%',
              borderRadius: '24px',
              height: '48px',
            }}
          >
            문의하기
          </Button>
        </ContentContainer>
      </Box>
      <BottomNavigationBar />

      <InquiryModal
        open={inquiryModalOpen}
        onClose={() => setInquiryModalOpen(false)}
        initialInquiryType="ban_appeal"
        initialValues={{
          subject: '',
          contents: '',
          email: ''
        }}
      />
    </>
  );
}

import { useMemo, useState } from 'react';

import {
  Box,
  Typography,
  Checkbox,
  Button,
  Modal,
  Fade,
  Paper,
  Alert,
  Snackbar,
  useTheme,
} from '@mui/material';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import CheckCircle from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../providers/AuthContext.tsx';
import { supabase } from '../../lib/supabase';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';

type ModalType = 'privacy' | 'terms' | 'marketing';

interface ConsentState {
  required1: boolean;
  required2: boolean;
  marketing: boolean;
  projectRecommendation: boolean;
  partnerMatching: boolean;
  events: boolean;
}

const modalCopy: Record<ModalType, { title: string; bodyBefore?: string; bodyAfter?: string; body?: string }> = {
  privacy: {
    title: '개인정보 수집 및 이용 동의 (필수)',
    bodyBefore: `콜에이전시(이하 "회사")는 「개인정보 보호법」 등 관련 법령에 따라 이용자의 개인정보를 보호하며, 라잇(L!) 서비스 제공을 위해 아래와 같이 개인정보를 수집·이용합니다.

1. 개인정보 수집·이용 목적
- 회원 가입 및 본인 확인
- 브랜드·아티스트·크리에이티브·유저 간 매칭 및 협업 서비스 제공
- 프로젝트 관리, 메시지 및 커뮤니케이션 기능 제공
- 콘텐츠 업로드 및 멤버십 서비스 제공
- 서비스 이용 기록 분석 및 맞춤형 콘텐츠·추천 제공
- 고객 문의 처리
- 서비스 품질 개선 및 통계·분석
- 법령 및 이용약관 위반 행위 방지

2. 수집하는 개인정보 항목
[필수]
- 이름(또는 닉네임), 이메일 주소, 비밀번호(암호화 저장)
- 휴대전화 번호, 회원 유형
- 기기 정보(OS, 앱 버전), 접속 로그, 이용 기록, 푸시 알림 토큰

[선택]
- 프로필 정보, 콘텐츠 업로드 정보, 관심사 및 활동 이력, 멤버십 이용 내역

3. 개인정보 보유 및 이용 기간
- 회원 탈퇴 시까지
- 법령에 따른 보관:`,
    bodyAfter: `
4. 제3자 제공 및 처리위탁
- 원칙적으로 외부 제공 없음
- 결제·정산, 클라우드 운영, 데이터 분석을 위한 위탁 가능

5. 동의 거부 시 불이익
- 필수 항목 미동의 시 회원가입 및 서비스 이용 제한`,
  },
  terms: {
    title: '서비스 이용약관 동의 (필수)',
    body: `본 약관은 라잇(Lyt) 서비스 이용과 관련하여 회사와 이용자 간의 권리·의무 및 책임사항을 규정합니다.

주요 내용
- 서비스 제공 범위 및 이용 조건
- 회원 유형별 권리와 의무
- 콘텐츠 업로드 및 커뮤니티 운영 정책
- 프로젝트·멤버십·유료 서비스 이용 기준
- 결제, 정산, 환불 정책
- 이용 제한 및 계약 해지 기준
- 분쟁 해결 및 준거법

본 약관에 동의하지 않을 경우 서비스 이용이 제한될 수 있습니다.`,
  },
  marketing: {
    title: '마케팅 정보 수신 동의 (선택)',
    body: `회사는 라잇 서비스와 관련된 이벤트, 혜택, 프로모션, 신규 기능 안내 등의 정보를 이메일, 문자, 푸시 알림 등을 통해 제공할 수 있습니다.

- 수집 항목: 이메일 주소, 휴대전화 번호, 푸시 토큰
- 이용 목적: 마케팅 및 홍보 정보 전달
- 보유 기간: 동의 철회 시 또는 회원 탈퇴 시까지

본 동의는 선택 사항이며, 동의하지 않아도 서비스 이용에는 제한이 없습니다.
동의 여부는 언제든지 앱 내 설정에서 변경할 수 있습니다.`,
  },
};

function ConsentDetailModal({
  type,
  onClose,
}: {
  type: ModalType;
  onClose: () => void;
}) {
  const theme = useTheme();
  const copy = modalCopy[type];

  return (
    <Modal
      open={true}
      onClose={onClose}
      closeAfterTransition
      sx={{
        display: 'flex',
        alignItems: { xs: 'flex-end', sm: 'center' },
        justifyContent: 'center',
      }}
    >
      <Fade in={true}>
        <Paper
          sx={{
            width: { xs: '100%', sm: '90%', md: '600px' },
            maxHeight: { xs: '90vh', sm: '80vh' },
            borderRadius: { xs: '24px 24px 0 0', sm: '24px' },
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            mx: { xs: 0, sm: 2 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>
              {copy.title}
            </Typography>
            <Button
              onClick={onClose}
              sx={{
                minWidth: 36,
                height: 36,
                borderRadius: '50%',
                bgcolor: theme.palette.grey[100],
                color: theme.palette.text.secondary,
              }}
            >
              <CloseIcon fontSize="small" />
            </Button>
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto', mb: 2 }}>
            {/* 요약 섹션 */}
            <Box
              sx={{
                position: 'sticky',
                top: 0,
                bgcolor: 'background.paper',
                pb: 2,
                mb: 2,
                borderBottom: `1px solid ${theme.palette.divider}`,
                zIndex: 1,
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: theme.palette.text.primary, mb: 1, display: 'block' }}>
                요약
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2, listStyle: 'none' }}>
                {type === 'privacy' && (
                  <>
                    <Typography component="li" variant="caption" sx={{ color: theme.palette.text.secondary, mb: 0.5 }}>
                      • 목적: 회원가입, 매칭·협업, 콘텐츠·멤버십 운영
                    </Typography>
                    <Typography component="li" variant="caption" sx={{ color: theme.palette.text.secondary, mb: 0.5 }}>
                      • 정보: 이메일, 닉네임, 기기 정보, 이용 기록
                    </Typography>
                    <Typography component="li" variant="caption" sx={{ color: theme.palette.text.secondary }}>
                      • 기간: 회원 탈퇴 시까지
                    </Typography>
                  </>
                )}
                {type === 'terms' && (
                  <>
                    <Typography component="li" variant="caption" sx={{ color: theme.palette.text.secondary, mb: 0.5 }}>
                      • 범위: 서비스 이용 조건 및 정책
                    </Typography>
                    <Typography component="li" variant="caption" sx={{ color: theme.palette.text.secondary, mb: 0.5 }}>
                      • 책임: 회원 유형별 권리·의무
                    </Typography>
                    <Typography component="li" variant="caption" sx={{ color: theme.palette.text.secondary }}>
                      • 기준: 결제·환불·분쟁
                    </Typography>
                  </>
                )}
                {type === 'marketing' && (
                  <>
                    <Typography component="li" variant="caption" sx={{ color: theme.palette.text.secondary, mb: 0.5 }}>
                      • 내용: 이벤트·혜택·프로모션
                    </Typography>
                    <Typography component="li" variant="caption" sx={{ color: theme.palette.text.secondary, mb: 0.5 }}>
                      • 수단: 이메일·문자·푸시
                    </Typography>
                    <Typography component="li" variant="caption" sx={{ color: theme.palette.text.secondary }}>
                      • 기간: 철회 또는 탈퇴 시까지
                    </Typography>
                  </>
                )}
              </Box>
            </Box>

            {/* 본문 */}
            <Box
              sx={{
                borderRadius: '16px',
                border: `1px solid ${theme.palette.divider}`,
                p: 2,
                maxHeight: '55vh',
                overflow: 'auto',
              }}
            >
              {/* privacy 타입인 경우 표를 중간에 삽입 */}
              {type === 'privacy' ? (
                <>
                  <Typography
                    variant="body2"
                    sx={{
                      color: theme.palette.text.secondary,
                      lineHeight: 1.7,
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {copy.bodyBefore}
                  </Typography>

                  {/* 개인정보 보유 기간 표 */}
                  <Box sx={{ mt: 1.5, mb: 1.5 }}>
                    <Box
                      sx={{
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: '8px',
                        overflow: 'hidden',
                      }}
                    >
                      {/* 헤더 */}
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 1fr',
                          bgcolor: theme.palette.grey[50],
                          borderBottom: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        <Box sx={{ p: 1.5, borderRight: `1px solid ${theme.palette.divider}` }}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>
                            보관 항목
                          </Typography>
                        </Box>
                        <Box sx={{ p: 1.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>
                            보관기간
                          </Typography>
                        </Box>
                      </Box>

                      {/* 데이터 행 1 */}
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 1fr',
                          borderBottom: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        <Box sx={{ p: 1.5, borderRight: `1px solid ${theme.palette.divider}` }}>
                          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                            소비자 불만 및 분쟁 처리 기록
                          </Typography>
                        </Box>
                        <Box sx={{ p: 1.5 }}>
                          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                            3년
                          </Typography>
                        </Box>
                      </Box>

                      {/* 데이터 행 2 */}
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 1fr',
                        }}
                      >
                        <Box sx={{ p: 1.5, borderRight: `1px solid ${theme.palette.divider}` }}>
                          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                            접속 로그
                          </Typography>
                        </Box>
                        <Box sx={{ p: 1.5 }}>
                          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                            3개월
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>

                  <Typography
                    variant="body2"
                    sx={{
                      color: theme.palette.text.secondary,
                      lineHeight: 1.7,
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {copy.bodyAfter}
                  </Typography>
                </>
              ) : (
                <Typography
                  variant="body2"
                  sx={{
                    color: theme.palette.text.secondary,
                    lineHeight: 1.7,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {copy.body}
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={onClose}
              sx={{
                py: 1.5,
                borderRadius: '12px',
                bgcolor: theme.palette.grey[100],
                color: theme.palette.text.secondary,
                fontWeight: 'bold',
              }}
            >
              닫기
            </Button>
            <Button
              fullWidth
              variant="contained"
              onClick={onClose}
              sx={{
                py: 1.5,
                borderRadius: '12px',
                fontWeight: 'bold',
              }}
            >
              확인
            </Button>
          </Box>
        </Paper>
      </Fade>
    </Modal>
  );
}

export default function ConsentPage() {

  const theme = useTheme();
  const { user } = useAuth();

  const [consents, setConsents] = useState<ConsentState>({
    required1: false,
    required2: false,
    marketing: false,
    projectRecommendation: false,
    partnerMatching: false,
    events: false,
  });

  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState<ModalType>('privacy');
  const [showError, setShowError] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const allChecked = useMemo(
    () => Object.values(consents).every((v) => v),
    [consents]
  );
  const requiredChecked = consents.required1 && consents.required2;

  const handleAllConsent = (checked: boolean) => {
    setConsents({
      required1: checked,
      required2: checked,
      marketing: checked,
      projectRecommendation: checked,
      partnerMatching: checked,
      events: checked,
    });
    setShowError(false);
  };

  const handleSingleConsent = (key: keyof ConsentState, checked: boolean) => {
    setConsents((prev) => ({ ...prev, [key]: checked }));
    setShowError(false);
  };

  const handleShowDetail = (type: ModalType) => {
    setModalContent(type);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!consents.required1 || !consents.required2) {
      setShowError(true);
      setToast('필수 항목에 동의해야 진행할 수 있어요.');
      return;
    }

    if (!user) {
      setToast('사용자 정보가 없습니다. 다시 로그인해주세요.');
      return;
    }

    setIsLoading(true);

    try {
      // 동의 정보를 프로필에 저장 (UPSERT: 레코드가 없으면 생성, 있으면 업데이트)
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          nickname: null, // 닉네임은 다음 단계에서 설정
          roles: ['customer'], // 기본 역할
          privacy_agreed_at: consents.required1 ? new Date().toISOString() : null,
          terms_agreed_at: consents.required2 ? new Date().toISOString() : null,
          marketing_agreed_at: consents.marketing ? new Date().toISOString() : null,
          project_recommendation_agreed_at: consents.projectRecommendation ? new Date().toISOString() : null,
          partner_matching_agreed_at: consents.partnerMatching ? new Date().toISOString() : null,
          events_agreed_at: consents.events ? new Date().toISOString() : null,
        }, {
          onConflict: 'id'
        });

      if (error) throw error;

      // 동의 완료 후 닉네임 설정 페이지로 이동
      // window.location.href 사용: AuthProvider가 프로필을 새로 fetch하도록 강제 새로고침
      window.location.href = '/onboarding/nickname';
    } catch (err) {
      console.error('동의 저장 오류:', err);
      setToast('동의 저장에 실패했습니다. 다시 시도해주세요.');
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        pb: 3,
      }}
    >
      {/* Header */}
      <Box sx={{ px: 3, pt: 6, pb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', fontSize: 26, color: theme.palette.text.primary, mb: 1 }}>
          서비스 이용을 위한
          <br />
          약관 동의가 필요해요
        </Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
          원활한 서비스 이용을 위해 아래 약관에 동의해주세요
        </Typography>
      </Box>

      {/* Content */}
      <Box sx={{ px: 3 }}>
        {/* All Consent */}
        <Box
          sx={{
            bgcolor: theme.palette.grey[50],
            borderRadius: '16px',
            p: 1.2,
            mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleAllConsent(!allChecked)}>
            <Checkbox
              checked={allChecked}
              onChange={(e) => handleAllConsent(e.target.checked)}
              icon={<CheckCircleOutline sx={{ fontSize: 20 }} />}
              checkedIcon={<CheckCircle sx={{ fontSize: 20 }} />}
            />
            <Typography variant="body1" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>
              전체 동의
            </Typography>
          </Box>
        </Box>

        {/* Required Consents */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: theme.palette.text.primary, mt: 3, mb: 2 }}>
            필수 동의 항목
          </Typography>

          {/* Privacy Policy */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, cursor: 'pointer' }} onClick={() => handleSingleConsent('required1', !consents.required1)}>
              <Checkbox
                checked={consents.required1}
                onChange={(e) => handleSingleConsent('required1', e.target.checked)}
                icon={<CheckCircleOutline sx={{ fontSize: 20 }} />}
                checkedIcon={<CheckCircle sx={{ fontSize: 20 }} />}
              />
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>
                개인정보 수집 및 이용 동의{' '}
                <Typography component="span" sx={{ fontWeight: 'bold', color: theme.palette.text.primary, fontSize: 14 }}>
                  (필수)
                </Typography>
              </Typography>
            </Box>
            <Button
              onClick={() => handleShowDetail('privacy')}
              sx={{
                minWidth: 'auto',
                px: 1,
                py: 0.5,
                fontSize: '0.75rem',
                color: theme.palette.text.secondary,
                textDecoration: 'underline',
              }}
            >
              자세히
            </Button>
          </Box>

          {/* Terms of Service */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, cursor: 'pointer' }} onClick={() => handleSingleConsent('required2', !consents.required2)}>
              <Checkbox
                checked={consents.required2}
                onChange={(e) => handleSingleConsent('required2', e.target.checked)}
                icon={<CheckCircleOutline sx={{ fontSize: 20 }} />}
                checkedIcon={<CheckCircle sx={{ fontSize: 20 }} />}
              />
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>
                서비스 이용약관 동의{' '}
                <Typography component="span" sx={{ fontWeight: 'bold', fontSize: 14, color: theme.palette.text.primary }}>
                  (필수)
                </Typography>
              </Typography>
            </Box>
            <Button
              onClick={() => handleShowDetail('terms')}
              sx={{
                minWidth: 'auto',
                px: 1,
                py: 0.5,
                fontSize: '0.75rem',
                color: theme.palette.text.secondary,
                textDecoration: 'underline',
              }}
            >
              자세히
            </Button>
          </Box>

          {showError && (
            <Alert severity="error" sx={{ mt: 2, fontSize: '0.75rem' }}>
              필수 항목에 모두 동의해야 서비스를 이용할 수 있어요
            </Alert>
          )}
        </Box>

        {/* Optional Consents */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: theme.palette.text.primary, mt: 3, mb: 2 }}>
            선택 동의 항목
          </Typography>

          {/* Marketing */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, cursor: 'pointer' }} onClick={() => handleSingleConsent('marketing', !consents.marketing)}>
              <Checkbox
                checked={consents.marketing}
                onChange={(e) => handleSingleConsent('marketing', e.target.checked)}
                icon={<CheckCircleOutline sx={{ fontSize: 20 }} />}
                checkedIcon={<CheckCircle sx={{ fontSize: 20 }} />}
              />
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                마케팅 정보 수신 동의 <Typography component="span" sx={{ color: theme.palette.text.secondary, fontSize: 14 }}>(선택)</Typography>
              </Typography>
            </Box>
            <Button
              onClick={() => handleShowDetail('marketing')}
              sx={{
                minWidth: 'auto',
                px: 1,
                py: 0.5,
                fontSize: '0.75rem',
                color: theme.palette.text.secondary,
                textDecoration: 'underline',
              }}
            >
              자세히
            </Button>
          </Box>

          {/* Project Recommendation */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, cursor: 'pointer' }} onClick={() => handleSingleConsent('projectRecommendation', !consents.projectRecommendation)}>
            <Checkbox
              checked={consents.projectRecommendation}
              onChange={(e) => handleSingleConsent('projectRecommendation', e.target.checked)}
              icon={<CheckCircleOutline sx={{ fontSize: 20 }} />}
              checkedIcon={<CheckCircle sx={{ fontSize: 20 }} />}
            />
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              맞춤 프로젝트 추천 알림 <Typography component="span" sx={{ color: theme.palette.text.secondary, fontSize: 14 }}>(선택)</Typography>
            </Typography>
          </Box>

          {/* Partner Matching */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, cursor: 'pointer' }} onClick={() => handleSingleConsent('partnerMatching', !consents.partnerMatching)}>
            <Checkbox
              checked={consents.partnerMatching}
              onChange={(e) => handleSingleConsent('partnerMatching', e.target.checked)}
              icon={<CheckCircleOutline sx={{ fontSize: 20 }} />}
              checkedIcon={<CheckCircle sx={{ fontSize: 20 }} />}
            />
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              파트너 매칭 소식 알림 <Typography component="span" sx={{ color: theme.palette.text.secondary, fontSize: 14 }}>(선택)</Typography>
            </Typography>
          </Box>

          {/* Events */}
          <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSingleConsent('events', !consents.events)}>
            <Checkbox
              checked={consents.events}
              onChange={(e) => handleSingleConsent('events', e.target.checked)}
              icon={<CheckCircleOutline sx={{ fontSize: 20 }} />}
              checkedIcon={<CheckCircle sx={{ fontSize: 20 }} />}
            />
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              이벤트 및 혜택 안내 <Typography component="span" sx={{ color: theme.palette.text.secondary, fontSize: 14 }}>(선택)</Typography>
            </Typography>
          </Box>

          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, mt: 2, display: 'block', lineHeight: 1.6, wordBreak: 'keep-all' }}>
            선택 항목은 동의하지 않아도 서비스를 이용할 수 있어요. 언제든지 설정에서 변경할 수 있습니다.
          </Typography>
        </Box>

        {/* Notice */}
        <Box
          sx={{
            bgcolor: theme.palette.grey[50],
            borderRadius: '12px',
            p: 2,
            mb: 3,
            display: 'flex',
          }}
        >
          <Typography component="span" sx={{ color: theme.palette.primary.main, mr: 0.5 }}>
            <ErrorOutlineRoundedIcon sx={{ fontSize: 16 }} />
          </Typography>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, lineHeight: 1.6, wordBreak: 'keep-all' }}>
            필수 항목에 동의하지 않으면 서비스 이용이 제한될 수 있습니다. 수집된 개인정보는 서비스 제공 목적으로만 사용되며,
            관련 법령에 따라 안전하게 보호됩니다.
          </Typography>
        </Box>

        {/* Submit Button */}
        <Button
          fullWidth
          variant="contained"
          onClick={handleSubmit}
          disabled={!requiredChecked || isLoading}
          sx={{
            height: 48,
            borderRadius: '22px',
            fontSize: '1rem',
            fontWeight: 'bold',
            bgcolor: requiredChecked ? theme.palette.primary.main : theme.palette.grey[200],
            color: requiredChecked ? 'white' : theme.palette.text.secondary,
            '&:disabled': {
              bgcolor: theme.palette.grey[200],
              color: theme.palette.text.secondary,
            },
          }}
        >
          {isLoading ? '처리 중...' : '동의하고 시작하기'}
        </Button>
      </Box>

      {/* Detail Modal */}
      {showModal && <ConsentDetailModal type={modalContent} onClose={() => setShowModal(false)} />}

      {/* Toast */}
      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setToast(null)} severity="error" sx={{ width: '100%' }}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}

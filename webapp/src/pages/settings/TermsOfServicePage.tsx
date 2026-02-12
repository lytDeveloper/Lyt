import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, useTheme } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ArrowDropDownRoundedIcon from '@mui/icons-material/ArrowDropDownRounded';

export default function TermsOfServicePage() {
    const navigate = useNavigate();
    const theme = useTheme();

    return (
        <Box sx={{
            minHeight: '100vh',
            bgcolor: '#ffffff',
            maxWidth: '768px',
            margin: '0 auto',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header */}
            <Box sx={{
                position: 'sticky',
                top: 0,
                zIndex: 1100,
                px: 2,
                height: '56px',
                pt: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
            }}>
                <IconButton edge="start" onClick={() => navigate(-1)} sx={{ color: '#111827' }}>
                    <ChevronLeftIcon />
                </IconButton>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                    이용 약관
                </Typography>
            </Box>

            {/* Content */}
            <Box sx={{ p: 3, pb: 10 }}>
                <Box sx={{
                    bgcolor: theme.palette.grey[50],
                    borderRadius: '12px',
                    p: 1.3,
                    mb: 3,
                    width: 'fit-content',
                    border: `1px solid ${theme.palette.divider}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.2
                }}>
                    <Typography sx={{ fontSize: 12, color: theme.palette.subText.default, lineHeight: 1 }}>
                        2025.12.31
                    </Typography>
                    <ArrowDropDownRoundedIcon sx={{ fontSize: 16, color: theme.palette.icon.default }} />
                </Box>

                <Typography component="div" sx={{ fontSize: 14, lineHeight: 1.7, color: '#374151', whiteSpace: 'pre-line' }}>
                    콜에이전시(이하 "회사")는 「개인정보 보호법」 등 관련 법령에 따라 이용자의 개인정보를 보호하며, 아래와 같이 개인정보를 수집·이용합니다.
                    본 개인정보동의서는 라잇(L!) 서비스 이용을 위한 필수 사항을 포함합니다.

                    <br /><br />
                    <strong>1. 개인정보 수집·이용 목적</strong><br />
                    회사는 다음의 목적을 위해 개인정보를 수집·이용합니다.
                    <br />
                    - 회원 가입 및 본인 확인<br />
                    - 브랜드·아티스트·크리에이티브·유저 간 매칭 및 협업 서비스 제공<br />
                    - 프로젝트 관리, 메시지 및 커뮤니티 기능 제공<br />
                    - 콘텐츠 업로드 및 멤버십 서비스 제공<br />
                    - 서비스 이용 기록 분석 및 맞춤형 콘텐츠·추천 제공<br />
                    - 고객 문의 처리<br />
                    - 서비스 품질 개선 및 통계·분석<br />
                    - 법령 및 이용약관 위반 행위 방지

                    <br /><br />
                    <strong>2. 수집하는 개인정보 항목</strong><br />
                    ① 필수 수집 항목<br />
                    - 이름(또는 닉네임)<br />
                    - 이메일 주소<br />
                    - 비밀번호(암호화 저장)<br />
                    - 휴대전화 번호<br />
                    - 회원 유형(브랜드 / 아티스트 / 크리에이티브 / 일반 이용자)<br />
                    - 기기 정보(OS, 앱 버전)<br />
                    - 접속 로그, 이용 기록<br />
                    - 푸시 알림 토큰
                    <br /><br />
                    ② 선택 수집 항목<br />
                    - 프로필 정보(사진, 소개글, 포트폴리오, 브랜드 정보 등)<br />
                    - 콘텐츠 업로드 정보(이미지, 영상, 텍스트)<br />
                    - 관심사 및 활동 이력<br />
                    - 멤버십 이용 내역<br />
                    ※ 선택 항목은 입력하지 않아도 서비스 이용이 가능하나, 일부 맞춤형 기능 이용이 제한될 수 있습니다.

                    <br /><br />
                    <strong>3. 개인정보 보유 및 이용 기간</strong><br />
                    - 회원 탈퇴 시까지 보관 및 이용<br />
                    ※ 단, 관련 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관
                    <br /><br />
                    <Box sx={{ border: '1px solid #E5E7EB', borderRadius: 2, overflow: 'hidden', my: 1 }}>
                        <Box sx={{ display: 'flex', borderBottom: '1px solid #E5E7EB', bgcolor: '#F9FAFB' }}>
                            <Box sx={{ flex: 1, p: 1.5, borderRight: '1px solid #E5E7EB', textAlign: 'center', fontSize: 12, fontWeight: 700 }}>보관 항목</Box>
                            <Box sx={{ flex: 1, p: 1.5, textAlign: 'center', fontSize: 12, fontWeight: 700 }}>보관 기간</Box>
                        </Box>
                        <Box sx={{ display: 'flex' }}>
                            <Box sx={{ flex: 1, p: 1.5, borderRight: '1px solid #E5E7EB', textAlign: 'center', fontSize: 12, color: '#6B7280' }}>소비자 불만 및 분쟁 처리</Box>
                            <Box sx={{ flex: 1, p: 1.5, textAlign: 'center', fontSize: 12, color: '#6B7280' }}>3년</Box>
                        </Box>
                        <Box sx={{ display: 'flex', borderTop: '1px solid #E5E7EB' }}>
                            <Box sx={{ flex: 1, p: 1.5, borderRight: '1px solid #E5E7EB', textAlign: 'center', fontSize: 12, color: '#6B7280' }}>접속 로그</Box>
                            <Box sx={{ flex: 1, p: 1.5, textAlign: 'center', fontSize: 12, color: '#6B7280' }}>3개월</Box>
                        </Box>
                    </Box>

                    <br />
                    <strong>4. 개인정보의 제3자 제공</strong><br />
                    <strong>회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.</strong><br />
                    ※ 다만, 아래의 경우에는 예외로 제공될 수 있습니다.<br />
                    - 이용자가 사전에 동의한 경우<br />
                    - 법령에 따라 제공이 요구되는 경우<br />
                    - 통계작성, 학술연구 등을 위하여 필요한 경우(특정 개인을 알아볼 수 없는 형태로 제공)

                    <br /><br />
                    <strong>5. 개인정보 처리의 위탁</strong><br />
                    <strong>회사는 원활한 서비스 제공을 위해 일부 업무를 외부 전문업체에 위탁할 수 있습니다.</strong><br />
                    - 클라우드 서버 운영<br />
                    - 결제 처리<br />
                    - 데이터 분석 및 서비스 운영 지원<br />
                    ※ 위탁 시 개인정보 보호 관련 법령을 준수하며, 위탁업체와 개인정보 보호 계약을 체결합니다.

                    <br /><br />
                    <strong>6. 이용자의 권리 및 행사 방법</strong><br />
                    <strong>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</strong><br />
                    ※ 다만, 아래의 경우에 한하여 제공될 수 있습니다.<br />
                    - 개인정보 열람, 정정, 삭제 요청<br />
                    - 개인정보 처리 정지 요청<br />
                    - 회원 탈퇴 요청<br />
                    ※ 요청은 앱 내 설정 또는 고객센터를 통해 가능합니다.

                    <br /><br />
                    <strong>7. 개인정보 수집·이용 동의 거부 시 불이익</strong><br />
                    - 필수 항목에 대한 동의를 거부할 경우 회원가입 및 서비스 이용이 제한될 수 있습니다.<br />
                    - 선택 항목에 대한 동의를 거부하더라도 기본 서비스 이용은 가능합니다.

                    <br /><br />
                    <strong>8. 개인정보 보호 책임자</strong><br />
                    ※ 문의 사항은 아래의 경로로 연락해 주시기 바랍니다.<br />
                    - 개인정보 보호 책임자: 박운배<br />
                    - 이메일: andrew.pm@colagency.com<br />
                    - 문의처: 앱 내 고객센터

                    <br /><br />
                    <strong>부칙</strong><br />
                    <strong>본 개인정보 수집 및 이용 동의서는 서비스 개시일부터 적용됩니다. (2025년 12월 15일)</strong>

                    <br /><br /><br />
                    <strong>아동 보호 및 성착취물 방지 정책 (Child Safety Policy)</strong><br />
                    본 서비스는 아동의 안전을 최우선으로 고려하며,<br />
                    아동 성착취물(CSAM, Child Sexual Abuse Material)을 포함한<br />
                    모든 형태의 아동 학대 및 착취 콘텐츠를 엄격히 금지합니다.

                    <br /><br />
                    <strong>1. 금지 콘텐츠</strong><br />
                    다음과 같은 콘텐츠는 본 서비스에서 허용되지 않습니다.<br />
                    - 아동의 성적 이미지, 영상, 음성 또는 이에 준하는 표현<br />
                    - 아동의 성적 행위를 묘사하거나 암시하는 모든 콘텐츠<br />
                    - 실제 또는 합성된(딥페이크 포함) 아동 성착취물(CSAM)<br />
                    - 아동을 성적 대상으로 대상화하거나 성적 대화를 유도하는 행위

                    <br /><br />
                    <strong>2. 예방 및 감지 조치</strong><br />
                    본 서비스는 다음과 같은 방식으로 아동 보호를 위한 조치를 시행합니다.<br />
                    - 사용자 신고 기능을 통한 콘텐츠 신고 접수<br />
                    - 운영팀의 검토를 통한 부적절 콘텐츠 식별 및 조치<br />
                    - 정책 위반 계정에 대한 접근 제한 또는 계정 정지

                    <br /><br />
                    <strong>3. 신고 및 대응</strong><br />
                    CSAM이 의심되는 콘텐츠가 발견되거나 신고될 경우,<br />
                    해당 콘텐츠는 즉시 검토 및 차단되며,<br />
                    관련 법령에 따라 필요한 경우 사법 당국에 신고될 수 있습니다.

                    <br /><br />
                    <strong>4. 문의</strong><br />
                    아동 보호 및 안전과 관련된 문의 또는 신고는<br />
                    아래 연락처로 접수할 수 있습니다.<br />
                    - 이메일: lyt@colagency.com
                </Typography>
            </Box>
        </Box>
    );
}

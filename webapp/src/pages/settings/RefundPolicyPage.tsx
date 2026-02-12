import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, useTheme } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ArrowDropDownRoundedIcon from '@mui/icons-material/ArrowDropDownRounded';

export default function RefundPolicyPage() {
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
                    환불 정책
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
                        2026.02.02
                    </Typography>
                    <ArrowDropDownRoundedIcon sx={{ fontSize: 16, color: theme.palette.icon.default }} />
                </Box>

                <Typography component="div" sx={{ fontSize: 14, lineHeight: 1.7, color: '#374151', whiteSpace: 'pre-line' }}>
                    본 환불 정책은 라잇 플랫폼을 통해 이루어지는 모든 결제에 적용됩니다. <br />
                    라잇은 거래의 중개자이며 프로젝트의 실제 이행 및 결과에 대한 책임은 프로젝트 주체에게 있습니다.

                    <br /><br />
                    <strong>1. 기본 원칙</strong><br />
                    회사는 다음의 목적을 위해 개인정보를 수집·이용합니다.
                    <br />
                    라잇은 플랫폼 중개 서비스 제공자이며 결제 금액은 프로젝트 수행을 위한 대가입니다.<br />
                    - 환불 가능 여부 및 금액은 프로젝트 진행 상태에 따라 달라집니다.<br />
                    - 결제 수단은 외부 PG(토스 페이먼츠)를 사용하며 환불은 동일한 결제 수단으로 진행됩니다.<br />


                    <br /><br />
                    <strong>2. 결제 단계별 환불 기준</strong><br />
                    ① 결제 완료 후 · 프로젝트 시작 전<br />
                    (프로젝트 주체가 아직 작업을 시작하지 않은 상태)<br />
                    - 전액 환불 가능<br />
                    - 단, 결제일로부터 7일 이내에 환불 요청해야 함<br />
                    - PG 수수료가 발생한 경우, 해당 수수료는 차감될 수 있음<br /> <br />

                    예: 프로젝트 결제 → 아직 착수 전 → 사용자 단순 변심<br /><br />

                    ② 프로젝트 진행 중<br />
                    (기획, 커뮤니케이션, 일부 작업이 이미 진행된 경우)<br />
                    - 부분 환불 원칙<br />
                    - 환불 금액은 아래 기준을 종합해 산정:<br />
                    • 프로젝트 진행률<br />
                    • 이미 제공된 산출물 또는 서비스<br />
                    • 프로젝트 주체의 작업 착수 여부<br />
                    - 진행률 산정 및 환불 비율은 라잇 운영 기준에 따름<br />
                    예:<br />
                    전체 금액 100만 원<br />
                    기획 및 초안 완료 → 진행률 30%<br />
                    → 최대 70% 환불 가능<br /> <br />

                    ③ 프로젝트 결과물 전달 이후 (혹은 프로젝트 완료)<br />
                    (최종 결과물이 제공된 상태)<br />
                    - 환불 불가<br />
                    -  단, 아래 사유에 해당하는 경우 예외 처리 가능:<br />
                    결과물이 계약 내용과 현저히 상이한 경우<br />
                    프로젝트 주체의 귀책 사유로 서비스 제공이 불가능한 경우<br />


                    <br /> <br />
                    <strong>3. 프로젝트 취소에 따른 환불</strong><br />
                    프로젝트 주체 귀책 사유<br />
                    - 프로젝트 주체의 일방적인 취소<br />
                    - 연락 두절, 수행 불가 상태<br />
                    • 결제 금액 전액 환불<br />
                    • 사용자 귀책 사유<br />
                    - 사용자의 단순 변심<br />
                    - 커뮤니케이션 중단<br />
                    - 계약 내용과 무관한 요구<br />
                    •  프로젝트 진행 상태에 따라 부분 환불 또는 환불 불가<br />

                    <br /><br />
                    <strong>4. 환불 절차</strong><br />
                    라잇 고객센터 또는 프로젝트 관리 페이지에서 환불 요청내부 검토 (최대 3영업일) <br />
                    환불 승인 시, PG를 통해 환불 처리<br />
                    ① 결제 수단에 따라 영업일 기준 3~7일 내 환불 완료<br />

                    <br /><br />
                    <strong>5. 수수료 및 환불 금액 관련 유의사항</strong><br />
                    - 결제 시 발생한 PG 수수료 및 플랫폼 이용 수수료는 환불 시 차감될 수 있습니다.<br />
                    - 부분 환불의 경우, 이미 제공된 서비스에 대한 대가는 환불 대상에서 제외됩니다.<br />
                    - 환불 금액 산정과 관련하여 분쟁이 발생할 경우, 라잇의 운영 정책이 우선 적용됩니다.<br />

                    <br /><br />
                    <strong>6. 분쟁 조정</strong><br />
                    - 사용자와 프로젝트 주체 간 분쟁 발생 시, 라잇은 중재자 역할을 수행할 수 있습니다.<br />
                    - 단, 법적 분쟁의 최종 책임은 거래 당사자에게 있습니다.
                </Typography>
            </Box>
        </Box>
    );
}

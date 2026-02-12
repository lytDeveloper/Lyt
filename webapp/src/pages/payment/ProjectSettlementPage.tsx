import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, IconButton, CircularProgress, Alert } from '@mui/material';
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useTheme } from '@mui/material/styles';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { projectService, type Project } from '../../services/projectService';
import { paymentService } from '../../services/paymentService';
import { validateConfirmedBudget, formatCurrency, parseCurrency, getBudgetValidationError } from '../../utils/budgetUtils';
import { useAuth } from '../../providers/AuthContext';

export default function ProjectSettlementPage() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const theme = useTheme();
    const { user } = useAuth();

    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [budget, setBudget] = useState('');
    const [budgetError, setBudgetError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [agreements, setAgreements] = useState({
        projectTerms: false,
        paymentTerms: false,
        refundPolicy: false,
    });

    useEffect(() => {
        const loadProject = async () => {
            if (!id) {
                setError('프로젝트 ID가 유효하지 않습니다.');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const projectData = await projectService.getProjectById(id);

                if (!projectData) {
                    setError('프로젝트를 찾을 수 없습니다.');
                    return;
                }

                // Check if settlement is already paid
                if (projectData.settlementStatus === 'paid') {
                    setError('이미 정산이 완료된 프로젝트입니다.');
                    return;
                }

                setProject(projectData);
            } catch (err) {
                console.error('Failed to load project:', err);
                setError('프로젝트를 불러오는 중 오류가 발생했습니다.');
            } finally {
                setLoading(false);
            }
        };

        loadProject();
    }, [id]);

    const handleAgreementChange = (key: keyof typeof agreements) => {
        setAgreements(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const formatted = formatCurrency(parseCurrency(value));
        setBudget(formatted);

        // Clear error when user types
        if (budgetError) {
            setBudgetError(null);
        }
    };

    const validateBudget = (): boolean => {
        const amount = parseCurrency(budget);

        if (amount <= 0) {
            setBudgetError('유효한 금액을 입력해주세요.');
            return false;
        }

        if (project?.budget && !validateConfirmedBudget(amount, project.budget)) {
            setBudgetError(getBudgetValidationError(amount, project.budget));
            return false;
        }

        return true;
    };

    const isFormValid =
        budget.length > 0 &&
        parseCurrency(budget) > 0 &&
        agreements.projectTerms &&
        agreements.paymentTerms &&
        agreements.refundPolicy &&
        !budgetError;

    const handlePayment = async () => {
        if (!isFormValid || !project || !id || !user) return;

        // Validate budget before submission
        if (!validateBudget()) return;

        const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY;
        if (!clientKey) {
            setError('결제 설정이 올바르지 않습니다.');
            return;
        }

        const amount = parseCurrency(budget);
        let createdOrderId: string | null = null;

        try {
            setSubmitting(true);

            // Calculate fee (if any)
            const feeRate = project.settlementFeeRate || 0;
            const totalAmount = Math.round(amount * (1 + feeRate / 100));

            // 1. Create order for project settlement
            console.log('[ProjectSettlementPage] Creating order...');
            const order = await paymentService.createOrder({
                userId: user.id,
                amount: totalAmount,
                orderName: `${project.title} - 프로젝트 정산`,
                orderType: 'project_fee',
                relatedId: id,
                relatedType: 'project_settlement',
                metadata: {
                    confirmedBudget: amount,
                    feeRate,
                },
            });

            createdOrderId = order.id;
            console.log('[ProjectSettlementPage] Order created:', order.id, order.tossOrderId);

            // 2. Initialize Toss Payments SDK v2
            const tossPayments = await loadTossPayments(clientKey);

            // 3. Create payment instance
            const payment = tossPayments.payment({
                customerKey: user.id,
            });

            const origin = window.location.origin;

            // 4. Launch payment widget
            console.log('[ProjectSettlementPage] Launching payment widget...');
            await payment.requestPayment({
                method: 'CARD',
                amount: {
                    currency: 'KRW',
                    value: totalAmount,
                },
                orderId: order.tossOrderId,
                orderName: `${project.title} - 프로젝트 정산`,
                successUrl: `${origin}/payment/callback?status=success`,
                failUrl: `${origin}/payment/callback?status=fail`,
                customerEmail: user.email ?? undefined,
                customerName: user.user_metadata?.name ?? user.user_metadata?.full_name ?? '고객',
                card: {
                    useEscrow: false,
                    flowMode: 'DEFAULT',
                    useCardPoint: false,
                    useAppCardOnly: false,
                },
            });
        } catch (err) {
            console.error('[ProjectSettlementPage] Payment failed:', err);

            // Cancel order if it was created
            if (createdOrderId) {
                console.log('[ProjectSettlementPage] Cancelling order:', createdOrderId);
                await paymentService.cancelOrder(createdOrderId);
            }

            setError(err instanceof Error ? err.message : '결제 처리 중 오류가 발생했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#fff',
            }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error || !project) {
        return (
            <Box sx={{
                height: '100vh',
                backgroundColor: '#fff',
                display: 'flex',
                flexDirection: 'column',
                maxWidth: '768px',
                margin: '0 auto',
            }}>
                <Box sx={{
                    height: 56,
                    display: 'flex',
                    alignItems: 'center',
                    px: 2,
                }}>
                    <IconButton onClick={() => navigate(-1)} edge="start">
                        <ArrowBackIosNewRoundedIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                    <Typography sx={{
                        fontFamily: 'Pretendard',
                        fontSize: 16,
                        fontWeight: 600,
                        ml: 1
                    }}>
                        프로젝트 정산
                    </Typography>
                </Box>
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
                    <Alert severity="error">{error}</Alert>
                </Box>
            </Box>
        );
    }

    const feeRate = project.settlementFeeRate || 0;
    const confirmedAmount = parseCurrency(budget);
    const feeAmount = Math.round(confirmedAmount * (feeRate / 100));
    const totalAmount = confirmedAmount + feeAmount;

    return (
        <Box sx={{
            height: '100vh',
            backgroundColor: '#fff',
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '768px',
            margin: '0 auto',
            position: 'relative'
        }}>
            {/* Header */}
            <Box sx={{
                height: 56,
                display: 'flex',
                alignItems: 'center',
                px: 2,
            }}>
                <IconButton onClick={() => navigate(-1)} edge="start">
                    <ArrowBackIosNewRoundedIcon sx={{ fontSize: 20 }} />
                </IconButton>
                <Typography sx={{
                    fontFamily: 'Pretendard',
                    fontSize: 16,
                    fontWeight: 600,
                    ml: 1
                }}>
                    프로젝트 정산
                </Typography>
            </Box>

            {/* Content */}
            <Box sx={{
                flex: 1,
                overflowY: 'auto',
                p: 3,
                pb: 12
            }}>
                {/* Title Section */}
                <Typography sx={{
                    fontFamily: 'Pretendard',
                    fontSize: 20,
                    fontWeight: 700,
                    mb: 1
                }}>
                    프로젝트 정산하기
                </Typography>
                <Typography sx={{
                    fontFamily: 'Pretendard',
                    fontSize: 14,
                    color: theme.palette.text.secondary,
                    mb: 4
                }}>
                    프로젝트의 신뢰도를 높이기 위해 정산금 결제를 진행해주세요.
                </Typography>

                {/* Budget Input Section */}
                <Box sx={{
                    backgroundColor: '#F8F9FA',
                    borderRadius: '16px',
                    p: 3,
                    mb: 4
                }}>
                    {project.budget && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                            <Typography sx={{ fontFamily: 'Pretendard', fontSize: 14, color: theme.palette.text.secondary }}>
                                예정 프로젝트 예산:
                            </Typography>
                            <Typography sx={{ fontFamily: 'Pretendard', fontSize: 16, fontWeight: 700 }}>
                                {project.budget}
                            </Typography>
                        </Box>
                    )}

                    <Typography sx={{ fontFamily: 'Pretendard', fontSize: 14, color: theme.palette.text.secondary, mb: 1 }}>
                        확정 금액
                    </Typography>

                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: '#fff',
                        borderRadius: '8px',
                        border: `1px solid ${budgetError ? theme.palette.error.main : theme.palette.divider}`,
                        px: 2,
                        height: 48,
                        mb: 1
                    }}>
                        <input
                            type="text"
                            value={budget}
                            onChange={handleBudgetChange}
                            onBlur={validateBudget}
                            placeholder="정확한 프로젝트 예산을 입력해주세요"
                            style={{
                                border: 'none',
                                outline: 'none',
                                width: '100%',
                                fontSize: '15px',
                                fontFamily: 'Pretendard',
                            }}
                        />
                        <Typography sx={{ fontSize: 15, fontWeight: 600, ml: 1 }}>원</Typography>
                    </Box>

                    {budgetError && (
                        <Typography sx={{
                            fontFamily: 'Pretendard',
                            fontSize: 12,
                            color: theme.palette.error.main,
                            mb: 1
                        }}>
                            {budgetError}
                        </Typography>
                    )}

                    <Typography sx={{
                        fontFamily: 'Pretendard',
                        fontSize: 12,
                        color: '#FF4D4D',
                        lineHeight: 1.4,
                        mb: 3
                    }}>
                        ⓘ 입력한 예산은 확정 금액이며, 해당 금액으로 정산돼요.<br />
                        팀원에게 정산 기준이 되는 정확한 금액을 입력해 주세요.
                        {feeRate === 0 ? (
                            <><br />라잇 이벤트! 수수료 0%</>
                        ) : (
                            <><br />수수료 {feeRate}% 포함</>
                        )}
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                        {feeRate > 0 && (
                            <>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography sx={{ fontFamily: 'Pretendard', fontSize: 14, color: theme.palette.text.secondary }}>
                                        확정 금액:
                                    </Typography>
                                    <Typography sx={{ fontFamily: 'Pretendard', fontSize: 14, fontWeight: 600 }}>
                                        {budget || '0'}원
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography sx={{ fontFamily: 'Pretendard', fontSize: 14, color: theme.palette.text.secondary }}>
                                        수수료 ({feeRate}%):
                                    </Typography>
                                    <Typography sx={{ fontFamily: 'Pretendard', fontSize: 14, fontWeight: 600 }}>
                                        {formatCurrency(feeAmount)}원
                                    </Typography>
                                </Box>
                            </>
                        )}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                            <Typography sx={{ fontFamily: 'Pretendard', fontSize: 14 }}>
                                결제 금액:
                            </Typography>
                            <Typography sx={{
                                fontFamily: 'Pretendard',
                                fontSize: 18,
                                fontWeight: 700,
                                color: theme.palette.primary.main
                            }}>
                                {formatCurrency(totalAmount)}원
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                {/* Refund Policy */}
                <Box sx={{ mb: 4 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 2
                        }}
                    >
                        <Typography sx={{ fontFamily: 'Pretendard', fontSize: 16, fontWeight: 700 }}>
                            환불 정책
                        </Typography>
                        <Box
                            component="button"
                            onClick={() => navigate('/settings/refund-policy')}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                p: 0
                            }}
                        >
                            <Typography sx={{ fontSize: 13, color: theme.palette.text.secondary }}>
                                자세히 보기
                            </Typography>
                            <ChevronRightIcon sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <CheckCircleOutlineRoundedIcon color="primary" sx={{ fontSize: 18 }} />
                            <Typography sx={{ fontSize: 14, color: theme.palette.text.secondary }}>
                                30일 이내 파트너 미모집 시 100% 환불
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <CheckCircleOutlineRoundedIcon color="primary" sx={{ fontSize: 18 }} />
                            <Typography sx={{ fontSize: 14, color: theme.palette.text.secondary }}>
                                31-60일 이내 미모집 시 50% 환불
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <CheckCircleOutlineRoundedIcon color="primary" sx={{ fontSize: 18 }} />
                            <Typography sx={{ fontSize: 14, color: theme.palette.text.secondary }}>
                                60일 이후 환불 불가
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                {/* Agreements */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography sx={{ fontSize: 14, color: theme.palette.text.secondary, mb: 1 }}>
                        신용카드 무이자 할부 안내
                    </Typography>

                    <Box
                        onClick={() => handleAgreementChange('projectTerms')}
                        sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', justifyContent: 'space-between' }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            {agreements.projectTerms
                                ? <CheckCircleOutlineRoundedIcon color="primary" />
                                : <RadioButtonUncheckedRoundedIcon color="disabled" />
                            }
                            <Typography sx={{ fontSize: 14 }}>
                                [필수] 프로젝트 이용약관 및 결제 조건에 동의합니다
                            </Typography>
                        </Box>
                        <ArrowBackIosNewRoundedIcon sx={{ fontSize: 14, transform: 'rotate(180deg)', color: theme.palette.text.disabled }} />
                    </Box>

                    <Box
                        onClick={() => handleAgreementChange('paymentTerms')}
                        sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', justifyContent: 'space-between' }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            {agreements.paymentTerms
                                ? <CheckCircleOutlineRoundedIcon color="primary" />
                                : <RadioButtonUncheckedRoundedIcon color="disabled" />
                            }
                            <Typography sx={{ fontSize: 14 }}>
                                [필수] 결제 서비스 이용 약관, 개인정보 처리 동의
                            </Typography>
                        </Box>
                        <ArrowBackIosNewRoundedIcon sx={{ fontSize: 14, transform: 'rotate(180deg)', color: theme.palette.text.disabled }} />
                    </Box>

                    <Box
                        onClick={() => handleAgreementChange('refundPolicy')}
                        sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', justifyContent: 'space-between' }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            {agreements.refundPolicy
                                ? <CheckCircleOutlineRoundedIcon color="primary" />
                                : <RadioButtonUncheckedRoundedIcon color="disabled" />
                            }
                            <Typography sx={{ fontSize: 14 }}>
                                [필수] 결제 및 환불 규정을 확인하였으며 동의합니다.
                            </Typography>
                        </Box>
                        <ArrowBackIosNewRoundedIcon sx={{ fontSize: 14, transform: 'rotate(180deg)', color: theme.palette.text.disabled }} />
                    </Box>
                </Box>
            </Box>

            {/* Bottom Button */}
            <Box sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                p: 2,
                backgroundColor: '#fff',
                borderTop: `1px solid ${theme.palette.divider}`
            }}>
                <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={!isFormValid || submitting}
                    onClick={handlePayment}
                    sx={{
                        height: 52,
                        borderRadius: '12px',
                        fontFamily: 'Pretendard',
                        fontSize: 16,
                        fontWeight: 600,
                        backgroundColor: theme.palette.primary.main,
                        '&:disabled': {
                            backgroundColor: theme.palette.action.disabledBackground,
                            color: theme.palette.text.disabled
                        }
                    }}
                >
                    {submitting ? <CircularProgress size={24} /> : '결제하기'}
                </Button>
            </Box>
        </Box>
    );
}

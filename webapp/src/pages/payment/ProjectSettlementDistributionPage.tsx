import { Box, Typography, Stack, Button, Slider, Avatar, Paper } from '@mui/material';
import { Header } from '../../components/common';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { projectService } from '../../services/projectService';

// Mock data for partners (TODO: replace with project.team from API)
const MOCK_PARTNERS = [
    { id: 1, name: '이창한', role: 'Leader', avatar: '' },
    { id: 2, name: '김디자인', role: 'Designer', avatar: '' },
    { id: 3, name: '박개발', role: 'Developer', avatar: '' },
];

export default function ProjectSettlementDistributionPage() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [contributions, setContributions] = useState<{ [key: number]: number }>({
        1: 50,
        2: 30,
        3: 20
    });
    const [requestAlreadySubmitted, setRequestAlreadySubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const load = async () => {
            if (!id) return;
            try {
                const project = await projectService.getProjectById(id);
                const status = project?.distributionRequestStatus;
                if (status === 'submitted' || status === 'completed') {
                    setRequestAlreadySubmitted(true);
                }
            } catch {
                // ignore
            }
        };
        void load();
    }, [id]);

    const totalPercent = Object.values(contributions).reduce((sum, val) => sum + val, 0);
    const isValid = totalPercent === 100;

    const totalAmount = 1000000; // Mock total budget

    const handleSliderChange = (partnerId: number) => (_event: Event, newValue: number | number[]) => {
        setContributions(prev => ({
            ...prev,
            [partnerId]: newValue as number
        }));
    };

    const handleSubmitRequest = async () => {
        if (!id || !isValid || requestAlreadySubmitted) return;
        const contributionsRecord: Record<string, number> = Object.fromEntries(
            Object.entries(contributions).map(([k, v]) => [String(k), v])
        );
        try {
            setSubmitting(true);
            await projectService.submitDistributionRequest(id, contributionsRecord);
            toast.success('정산 요청이 제출되었습니다.');
            navigate('/profile/revenue/settlement', { replace: true });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : '정산 요청 제출에 실패했어요.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Box sx={{ pb: 12, bgcolor: '#F9FAFB', minHeight: '100vh', position: 'relative' }}>
            <Box sx={{ bgcolor: 'white' }}>
                <Header showBackButton title="프로젝트 정산" onBackClick={() => navigate(-1)} />
            </Box>

            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Intro Card */}
                <Paper elevation={0} sx={{ p: 3, borderRadius: '20px', bgcolor: 'white', boxShadow: '0px 4px 20px rgba(0,0,0,0.03)' }}>
                    <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
                        수익 분배 설정
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        프로젝트 참여자들의 기여도에 따라 수익을 분배해주세요.
                    </Typography>

                    <Box sx={{ p: 2, bgcolor: '#F3F4F6', borderRadius: '16px', textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>총 정산 금액</Typography>
                        <Typography variant="h5" fontWeight={800} color="primary.main">
                            {totalAmount.toLocaleString()}원
                        </Typography>
                    </Box>
                </Paper>

                {/* Distribution Card */}
                <Paper elevation={0} sx={{ p: 3, borderRadius: '20px', bgcolor: 'white', boxShadow: '0px 4px 20px rgba(0,0,0,0.03)' }}>
                    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle1" fontWeight={700}>총 배분율</Typography>
                        <Typography
                            variant="h6"
                            fontWeight={800}
                            color={isValid ? 'success.main' : 'error.main'}
                        >
                            {totalPercent}% {isValid ? '(완료)' : '(100% 미달)'}
                        </Typography>
                    </Box>

                    <Stack spacing={4}>
                        {MOCK_PARTNERS.map((partner) => {
                            const percent = contributions[partner.id] || 0;
                            const amount = Math.floor(totalAmount * (percent / 100));

                            return (
                                <Box key={partner.id}>
                                    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                                        <Avatar sx={{ width: 40, height: 40 }} />
                                        <Box flex={1}>
                                            <Typography variant="subtitle2" fontWeight={700}>{partner.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">{partner.role}</Typography>
                                        </Box>
                                        <Box textAlign="right">
                                            <Typography variant="subtitle2" fontWeight={800}>{amount.toLocaleString()}원</Typography>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600}>{percent}%</Typography>
                                        </Box>
                                    </Stack>
                                    <Slider
                                        value={percent}
                                        onChange={handleSliderChange(partner.id)}
                                        min={0}
                                        max={100}
                                        valueLabelDisplay="auto"
                                        sx={{
                                            color: 'primary.main',
                                            '& .MuiSlider-thumb': {
                                                boxShadow: '0 0 0 5px rgba(37, 99, 235, 0.16)'
                                            }
                                        }}
                                    />
                                </Box>
                            );
                        })}
                    </Stack>
                </Paper>
            </Box>

            {/* Bottom Action Bar */}
            <Box sx={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                p: 2,
                bgcolor: 'white',
                borderTop: '1px solid #eee',
                maxWidth: '600px', // Assuming mobile view constraint in desktop
                margin: '0 auto',
                boxShadow: '0 -4px 10px rgba(0,0,0,0.05)'
            }}>
                <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    sx={{
                        borderRadius: '50px',
                        py: 1.5,
                        fontWeight: 800,
                        fontSize: '16px',
                        boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.3)'
                    }}
                    onClick={handleSubmitRequest}
                    disabled={!isValid || requestAlreadySubmitted || submitting}
                >
                    {requestAlreadySubmitted
                        ? '이미 정산 요청이 제출되었습니다'
                        : submitting
                          ? '제출 중...'
                          : `정산 요청하기 (${totalPercent}%)`}
                </Button>
            </Box>
        </Box>
    );
}

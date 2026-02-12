import { useState } from 'react';
import { Box, Typography, Button, Paper, Stack, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../../components/common';
import TabBar from '../../../components/common/TabBar';
import type { TabItem } from '../../../components/common/TabBar';


// ——————————————————————————————————————————————————————————————————————————
// MOCK DATA
// ——————————————————————————————————————————————————————————————————————————
const MOCK_TRANSACTIONS = [
    { id: 1, title: '{프로젝트명} 정산', date: '2023.12.20', amount: -150000, type: 'expense', status: '출금 완료' }, // Negative for display logic test
    { id: 2, title: '웹사이트 디자인', date: '2024.01.10', amount: 200000, type: 'revenue', status: '입금 완료' },
    { id: 3, title: '모바일 앱 UI', date: '2024.01.05', amount: 180000, type: 'revenue', status: '입금 대기' },
];

const TABS: TabItem[] = [
    { key: 'history', label: '최근 수익·지출 내역' },
    { key: 'method', label: '결제 수단' },
];

// ——————————————————————————————————————————————————————————————————————————
// COMPONENT
// ——————————————————————————————————————————————————————————————————————————
export default function RevenueManagementPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<string>('history');

    // Custom Gauge Chart Logic
    const renderGaugeChart = () => {
        // 70% progress
        // Half circle = 180 degrees. 70% of 180 = 126 degrees.
        // We rotate from left (-90deg relative to top) to right.
        // SVG Path for background arc (180deg)
        // M 20 100 A 80 80 0 0 1 180 100
        // SVG Path for value arc (70% of 180deg = 126deg)

        return (
            <Box sx={{ position: 'relative', height: 160, display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                <svg width="220" height="110" viewBox="0 0 220 110">
                    {/* Defs for Gradient */}
                    <defs>
                        <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#93C5FD" />
                            <stop offset="100%" stopColor="#2563EB" />
                        </linearGradient>
                    </defs>
                    {/* Background Arc: Gray/LightBlue */}
                    <path
                        d="M 20 100 A 90 90 0 0 1 200 100" // M startX startY A rx ry x-axis-rotation large-arc-flag sweep-flag endX endY
                        fill="none"
                        stroke="#E0E7FF"
                        strokeWidth="16"
                        strokeLinecap="round"
                    />
                    {/* Progress Arc: 70% */}
                    {/* We need to calculate the end point for 70%. 180 * 0.7 = 126 deg.
                Start is 180 deg (left). End is 180 - 126 = 54 deg? No, cartesian.
                Let's simplify.
             */}
                    <path
                        d="M 20 100 A 90 90 0 0 1 185 55" // Approximate for 70-80% visual
                        fill="none"
                        stroke="url(#gaugeGradient)"
                        strokeWidth="16"
                        strokeLinecap="round"
                    />
                </svg>

                {/* Center Text Overlay */}
                <Box sx={{ position: 'absolute', bottom: 0, textAlign: 'center', pb: 1 }}>
                    <Typography variant="caption" color="primary.main" fontWeight={600} sx={{ display: 'block', mb: -0.5 }}>
                        목표대비달성
                    </Typography>
                    <Typography variant="h3" color="primary.main" fontWeight={800}>
                        +70%
                    </Typography>
                    {/* Icon Image Placeholder */}
                    <Typography fontSize={32} sx={{ mt: -1 }}>💸</Typography>
                </Box>
            </Box>
        );
    };

    return (
        <Box sx={{ pb: 6, bgcolor: '#F9FAFB', minHeight: '100vh' }}>
            {/* 1. Header: "수익관리" */}
            <Box sx={{ bgcolor: 'white' }}>
                <Header showBackButton={true} title="수익관리" onBackClick={() => navigate(-1)} />
            </Box>

            <Box sx={{ px: 2, pt: 2, display: 'flex', bgcolor: 'white', flexDirection: 'column', gap: 2 }}>

                {/* 2. Lyt Point Card */}
                <Paper elevation={0} sx={{ p: 3, borderRadius: '20px', bgcolor: 'white', boxShadow: '0px 4px 20px rgba(0,0,0,0.03)' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                            <Typography variant="h6" fontWeight={800}>라잇포인트</Typography>
                            <Typography variant="h6">🟡</Typography>
                        </Stack>
                        <Button
                            variant="outlined"
                            size="small"
                            sx={{
                                borderRadius: '20px',
                                color: 'text.secondary',
                                borderColor: '#E5E7EB',
                                fontSize: '11px',
                                py: 0.2
                            }}
                        >
                            라잇포인트 이용 내역
                        </Button>
                    </Stack>

                    <Typography variant="h4" fontWeight={800} sx={{ mb: 3 }}>
                        850,000원
                    </Typography>

                    <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        sx={{
                            borderRadius: '50px',
                            py: 1.5,
                            fontWeight: 700,
                            fontSize: '16px',
                            boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.3)'
                        }}
                    >
                        충전
                    </Button>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, textAlign: 'center' }}>
                        머니 결제할 때마다 0.5% 적립
                    </Typography>
                </Paper>

                {/* 3. Total Revenue Chart Card */}
                <Paper elevation={0} sx={{ p: 3, borderRadius: '20px', bgcolor: 'white', boxShadow: '0px 4px 20px rgba(0,0,0,0.03)' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Typography variant="subtitle1" fontWeight={600} color="text.secondary">총 수익</Typography>
                        <Typography variant="caption" color="primary" fontWeight={600}>이번 달 목표 수익 100만원!</Typography>
                    </Stack>

                    {/* Gauge Chart */}
                    <Box sx={{ mt: 2, mb: 1 }}>
                        {renderGaugeChart()}
                    </Box>

                    {/* Scale Labels */}
                    <Stack direction="row" justifyContent="space-between" sx={{ px: 2, mt: -2, mb: 3 }}>
                        <Typography variant="caption" color="text.disabled">0%</Typography>
                        <Typography variant="caption" color="text.disabled">100%</Typography>
                    </Stack>

                    {/* Bottom Stats */}
                    <Box sx={{ bgcolor: '#F9FAFB', borderRadius: '16px', p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>
                            2,450,000원
                        </Typography>
                        <Typography variant="body2" color="success.main" fontWeight={700}>
                            전월 대비 +55%
                        </Typography>
                    </Box>
                </Paper>

                {/* 4. Stats Grid */}
                <Stack spacing={2}>
                    {/* Item 1: This Month */}
                    <Box>
                        <Paper elevation={0} sx={{ p: 2.5, borderRadius: '20px', bgcolor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>이번 달 수익</Typography>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Typography variant="h6" fontWeight={800}>320,000원</Typography>
                                    <Typography variant="caption" color="success.main" fontWeight={700}>+5%</Typography>
                                </Stack>
                            </Box>
                            <Typography fontSize={24}>📒</Typography>
                        </Paper>
                    </Box>

                    {/* Item 2: Estimated Settlement */}
                    <Box>
                        <Paper elevation={0} sx={{ p: 2.5, borderRadius: '20px', bgcolor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>정산 예정 금액</Typography>
                                <Typography variant="h6" fontWeight={800}>180,000원</Typography>
                            </Box>
                            <Typography fontSize={24}>💰</Typography>
                        </Paper>
                    </Box>

                    {/* Item 3: Avg Yield */}
                    <Box>
                        <Paper elevation={0} sx={{ p: 2.5, borderRadius: '20px', bgcolor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>평균 수익률</Typography>
                                <Typography variant="h6" fontWeight={800}>15.2%</Typography>
                            </Box>
                            <Typography fontSize={24}>🔎</Typography>
                        </Paper>
                    </Box>

                    {/* Item 4: Completed Projects */}
                    <Box>
                        <Paper elevation={0} sx={{ p: 2.5, borderRadius: '20px', bgcolor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>완료 프로젝트</Typography>
                                <Typography variant="h6" fontWeight={800}>2 개</Typography>
                            </Box>
                            <Button
                                variant="contained"
                                color="inherit" // Grayish
                                size="small"
                                onClick={() => navigate('/profile/revenue/settlement')}
                                sx={{
                                    bgcolor: '#F3F4F6',
                                    color: '#374151',
                                    boxShadow: 'none',
                                    fontWeight: 700,
                                    borderRadius: '12px',
                                    px: 2,
                                    '&:hover': { bgcolor: '#E5E7EB' }
                                }}
                            >
                                프로젝트 정산하기
                            </Button>
                        </Paper>
                    </Box>
                </Stack>

                {/* 5. TabBar */}
                <Box sx={{ mt: 2 }}>
                    <TabBar
                        tabs={TABS}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                    />
                </Box>

                {/* 6. Recent Transactions List */}
                {activeTab === 'history' && (
                    <Box sx={{ pb: 4 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, px: 1 }}>
                            <Typography variant="subtitle1" fontWeight={700}>최근 수익·지출 내역</Typography>
                            <Typography
                                variant="caption"
                                color="primary"
                                sx={{ cursor: 'pointer', fontWeight: 600 }}
                                onClick={() => navigate('/profile/revenue/history')}
                            >
                                전체보기
                            </Typography>
                        </Stack>

                        <Stack spacing={2}>
                            {MOCK_TRANSACTIONS.map((item) => (
                                <Paper
                                    key={item.id}
                                    elevation={0}
                                    sx={{
                                        p: 2.5,
                                        borderRadius: '20px',
                                        bgcolor: 'white',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                                            {item.title}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {item.date}
                                        </Typography>
                                    </Box>

                                    <Box sx={{ textAlign: 'right' }}>
                                        {/* Badge if needed */}
                                        {item.status && (
                                            <Box sx={{ mb: 0.5, display: 'flex', justifyContent: 'flex-end' }}>
                                                <Chip
                                                    label={item.status}
                                                    size="small"
                                                    sx={{
                                                        height: 20,
                                                        fontSize: '10px',
                                                        fontWeight: 700,
                                                        bgcolor: item.status === '입금 완료' ? '#2563EB' : '#EFF6FF',
                                                        color: item.status === '입금 완료' ? 'white' : '#2563EB'
                                                    }}
                                                />
                                            </Box>
                                        )}
                                        <Typography variant="subtitle1" fontWeight={800}>
                                            {item.amount > 0 ? '' : '-'}
                                            {Math.abs(item.amount).toLocaleString()}원
                                        </Typography>
                                    </Box>
                                </Paper>
                            ))}
                        </Stack>
                    </Box>
                )}
            </Box>
        </Box>
    );
}

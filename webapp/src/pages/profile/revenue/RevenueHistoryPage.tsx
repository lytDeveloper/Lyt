import { Box, Typography, Stack, Paper, Chip } from '@mui/material';
import { Header } from '../../../components/common';
import { useNavigate } from 'react-router-dom';
import FilterListIcon from '@mui/icons-material/FilterList';

const MOCK_HISTORY = [
    { id: 1, date: '2024.03.15', title: '프로젝트 A 정산', amount: 350000, type: 'revenue', status: '입금 완료' },
    { id: 2, date: '2024.03.10', title: '프로젝트 B 정산', amount: 120000, type: 'revenue', status: '입금 완료' },
    { id: 3, date: '2024.02.28', title: '수익금 출금', amount: -500000, type: 'expense', status: '출금 완료' },
    { id: 4, date: '2024.02.15', title: '프로젝트 C 정산', amount: 200000, type: 'revenue', status: '입금 대기' },
];

export default function RevenueHistoryPage() {
    const navigate = useNavigate();

    return (
        <Box sx={{ pb: 6, bgcolor: '#F9FAFB', minHeight: '100vh' }}>
            <Box sx={{ bgcolor: 'white' }}>
                <Header showBackButton={true} onBackClick={() => navigate(-1)} />
                <Box sx={{ px: 2, pb: 2 }}>
                    <Typography variant="h5" fontWeight={800} sx={{ mt: 1 }}>수익 내역</Typography>
                </Box>
            </Box>

            {/* Filter Header */}
            <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ p: 2 }}
            >
                <Typography variant="subtitle2" fontWeight={700}>전체 기간</Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ cursor: 'pointer' }}>
                    <Typography variant="caption" color="text.secondary">전체</Typography>
                    <FilterListIcon fontSize="small" color="action" />
                </Stack>
            </Stack>

            {/* List */}
            <Box sx={{ px: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {MOCK_HISTORY.map((item) => (
                    <Paper
                        key={item.id}
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: '20px',
                            bgcolor: 'white',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            boxShadow: '0px 2px 8px rgba(0,0,0,0.02)'
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
                            <Box sx={{ mb: 0.5, display: 'flex', justifyContent: 'flex-end' }}>
                                <Chip
                                    label={item.status}
                                    size="small"
                                    sx={{
                                        height: 20,
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        bgcolor: item.type === 'revenue'
                                            ? (item.status === '입금 완료' ? '#2563EB' : '#EFF6FF')
                                            : '#F3F4F6',
                                        color: item.type === 'revenue'
                                            ? (item.status === '입금 완료' ? 'white' : '#2563EB')
                                            : '#4B5563'
                                    }}
                                />
                            </Box>
                            <Typography variant="subtitle1" fontWeight={800} color={item.type === 'expense' ? 'text.primary' : 'inherit'}>
                                {item.amount > 0 ? '' : ''}
                                {item.amount.toLocaleString()}원
                            </Typography>
                        </Box>
                    </Paper>
                ))}
            </Box>
        </Box>
    );
}

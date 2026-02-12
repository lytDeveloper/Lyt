import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    IconButton,
    Button,
    Checkbox,
    FormControlLabel,
    Select,
    MenuItem,
    TextField,
    Paper,
    FormControl,
    CircularProgress,
    Stack,
    Dialog
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { toast } from 'react-toastify';

import { useAuth } from '../../providers/AuthContext';
import { projectService } from '../../services/projectService';
import { collaborationService } from '../../services/collaborationService';
import { deleteUserAccount } from '../../services/accountDeletionService';

// Define specific types if not available from service exports directly
interface CountState {
    projects: number;
    collaborations: number;
    loading: boolean;
}

const WITHDRAWAL_REASONS = [
    '사용 빈도가 낮아요',
    '이용이 불편해요',
    '다른 서비스를 사용하게 되었어요',
    '콘텐츠가 부족해요',
    '개인정보 보호가 우려돼요',
    '기타'
];

export default function AccountWithdrawalPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [counts, setCounts] = useState<CountState>({
        projects: 0,
        collaborations: 0,
        loading: true
    });

    const [reason, setReason] = useState<string>('');
    const [customReason, setCustomReason] = useState<string>('');
    const [agreed, setAgreed] = useState<boolean>(false);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState<boolean>(false);

    useEffect(() => {
        const fetchCounts = async () => {
            if (!user) return;
            try {
                // Fetch active project and collaboration counts directly using optimized queries
                const [projectCount, collaborationCount] = await Promise.all([
                    projectService.getMyActiveProjectsCount(),
                    collaborationService.getMyActiveCollaborationsCount()
                ]);

                setCounts({
                    projects: projectCount,
                    collaborations: collaborationCount,
                    loading: false
                });
            } catch (error) {
                console.error('Failed to fetch activity counts:', error);
                setCounts(prev => ({ ...prev, loading: false }));
            }
        };

        fetchCounts();
    }, [user]);

    const handleWithdrawalClick = () => {
        if (!reason) {
            toast.error('탈퇴 사유를 선택해주세요.');
            return;
        }
        if (reason === '기타' && !customReason.trim()) {
            toast.error('기타 사유를 입력해주세요.');
            return;
        }
        if (!agreed) {
            toast.error('안내사항에 동의해주세요.');
            return;
        }

        // Open confirm dialog
        setConfirmDialogOpen(true);
    };

    const handleWithdrawal = async () => {
        if (!user) {
            toast.error('로그인이 필요합니다.');
            return;
        }

        setSubmitting(true);
        try {
            const finalReason = reason === '기타' ? customReason : reason;

            // Call delete account service
            const result = await deleteUserAccount(user.id, undefined, finalReason);

            if (!result.success) {
                throw new Error(result.error || '계정 삭제에 실패했습니다.');
            }

            toast.success('계정이 성공적으로 삭제되었습니다. 그동안 이용해주셔서 감사합니다.');

            // Wait a bit before navigating
            setTimeout(() => {
                // Force logout and redirect to home
                window.location.href = '/login';
            }, 2000);
        } catch (error) {
            console.error('계정 삭제 실패:', error);
            toast.error('탈퇴 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
            setConfirmDialogOpen(false);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            bgcolor: '#ffffff',
            maxWidth: '768px',
            margin: '0 auto',
            position: 'relative',
            pb: 4
        }}>
            {/* Header */}
            <Box sx={{
                position: 'sticky',
                top: 0,
                zIndex: 1100,
                px: 2,
                height: 56,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: '#ffffff',
            }}>
                <IconButton edge="start" onClick={() => navigate(-1)} sx={{ color: '#111827' }}>
                    <ChevronLeftIcon />
                </IconButton>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                    회원탈퇴
                </Typography>
            </Box>

            <Box sx={{ px: 3, pt: 2 }}>
                {/* Active Counts */}
                <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
                    <Paper elevation={0} sx={{
                        flex: 1,
                        p: 2.5,
                        borderRadius: 4,
                        textAlign: 'center',
                        border: '1px solid #F3F4F6',
                        bgcolor: '#FAFAFA' // Light gray background
                    }}>
                        <Typography sx={{ fontSize: 13, color: '#6B7280', mb: 0.5 }}>
                            진행중인 프로젝트
                        </Typography>
                        <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
                            {counts.loading ? '-' : `${counts.projects}건`}
                        </Typography>
                    </Paper>
                    <Paper elevation={0} sx={{
                        flex: 1,
                        p: 2.5,
                        borderRadius: 4,
                        textAlign: 'center',
                        border: '1px solid #F3F4F6',
                        bgcolor: '#FAFAFA'
                    }}>
                        <Typography sx={{ fontSize: 13, color: '#6B7280', mb: 0.5 }}>
                            진행중인 협업
                        </Typography>
                        <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
                            {counts.loading ? '-' : `${counts.collaborations}건`}
                        </Typography>
                    </Paper>
                </Stack>

                {/* Warning Icon & Text */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Box sx={{
                        display: 'inline-flex',
                        p: 1.5,
                        bgcolor: '#FEF2F2',
                        borderRadius: '50%',
                        mb: 2
                    }}>
                        <WarningAmberRoundedIcon sx={{ fontSize: 40, color: '#EF4444' }} /> {/* Red warning icon */}
                    </Box>
                    <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#111827', mb: 1 }}>
                        회원 탈퇴 시
                    </Typography>
                    <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#111827', mb: 1 }}>
                        회원님의 모든 정보가 소멸되며
                    </Typography>
                    <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
                        이전으로 <Box component="span" sx={{ color: '#EF4444' }}>복구 불가능</Box>합니다.
                    </Typography>
                </Box>

                {/* Notice List */}
                <Box component="ul" sx={{
                    pl: 2.5,
                    mb: 4,
                    '& li': {
                        fontSize: 13,
                        color: '#6B7280',
                        lineHeight: 1.6,
                        mb: 0.5
                    }
                }}>
                    <li>탈퇴 이후 동일 계정으로 재가입하더라도 기존 데이터는 복구되지 않습니다.</li>
                    <li>진행 중인 프로젝트나 협업이 있다면 먼저 종료 또는 취소해주세요.</li>
                </Box>

                {/* Reason Select */}
                <Box sx={{ mb: 6 }}>
                    <FormControl fullWidth size="medium">
                        <Select
                            displayEmpty
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            renderValue={(selected) => {
                                if (!selected) {
                                    return <Typography sx={{ color: '#9CA3AF' }}>탈퇴 사유를 선택해주세요.</Typography>;
                                }
                                return selected;
                            }}
                            sx={{
                                borderRadius: 2,
                                bgcolor: '#F3F4F6',
                                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                                fontSize: 14,
                                fontWeight: 500
                            }}
                        >
                            <MenuItem disabled value="">
                                <em>탈퇴 사유를 선택해주세요.</em>
                            </MenuItem>
                            {WITHDRAWAL_REASONS.map((r) => (
                                <MenuItem key={r} value={r} sx={{ fontSize: 14 }}>
                                    {r}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {reason === '기타' && (
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            placeholder="탈퇴 사유를 입력해주세요."
                            value={customReason}
                            onChange={(e) => setCustomReason(e.target.value)}
                            sx={{
                                mt: 2,
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    bgcolor: '#F3F4F6',
                                    '& fieldset': { border: 'none' }
                                },
                                '& .MuiInputBase-input': {
                                    fontSize: 14,
                                }
                            }}
                        />
                    )}
                </Box>

                {/* Agreement Checkbox */}
                <Box sx={{ mb: 2 }}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={agreed}
                                onChange={(e) => setAgreed(e.target.checked)}
                                sx={{
                                    color: '#D1D5DB',
                                    '&.Mui-checked': { color: '#EF4444' } // Red check when active? Or primary blue? Design shows empty circle. Let's use default styles or customize.
                                    // Screenshot shows a simple circle. Standard Checkbox is fine.
                                }}
                            />
                        }
                        label={
                            <Typography sx={{ fontSize: 14, color: '#4B5563' }}>
                                안내사항을 모두 확인했으며 동의합니다.
                            </Typography>
                        }
                    />
                </Box>

                {/* Actions */}
                <Stack direction="row" spacing={1.5}>
                    <Button
                        variant="contained"
                        onClick={handleWithdrawalClick}
                        disabled={submitting}
                        sx={{
                            flex: 1,
                            bgcolor: '#F3F4F6',
                            color: '#374151',
                            fontWeight: 600,
                            borderRadius: 3,
                            py: 1.5,
                            boxShadow: 'none',
                            '&:hover': { bgcolor: '#E5E7EB' }
                        }}
                    >
                        회원탈퇴
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => navigate(-1)}
                        disabled={submitting}
                        sx={{
                            flex: 2,
                            bgcolor: '#2563EB',
                            color: '#ffffff',
                            fontWeight: 600,
                            borderRadius: 3,
                            py: 1.5,
                            boxShadow: 'none',
                            '&:hover': { bgcolor: '#1D4ED8' }
                        }}
                    >
                        취소하기
                    </Button>
                </Stack>
            </Box>

            {/* Confirm Dialog */}
            <Dialog
                open={confirmDialogOpen}
                onClose={() => !submitting && setConfirmDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <Box sx={{ p: 3 }}>
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <WarningAmberRoundedIcon sx={{ fontSize: 48, color: '#EF4444', mb: 2 }} />
                        <Typography sx={{ fontSize: 20, fontWeight: 700, color: '#111827', mb: 1 }}>
                            정말 탈퇴하시겠습니까?
                        </Typography>
                        <Typography sx={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
                            계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
                        </Typography>
                    </Box>

                    <Box sx={{
                        bgcolor: '#FEF2F2',
                        borderRadius: 2,
                        p: 2,
                        mb: 3
                    }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#DC2626', mb: 1 }}>
                            삭제될 데이터:
                        </Typography>
                        <Box component="ul" sx={{ pl: 2.5, m: 0 }}>
                            <Typography component="li" sx={{ fontSize: 13, color: '#991B1B', mb: 0.5 }}>
                                프로필 및 프로필 이미지
                            </Typography>
                            <Typography component="li" sx={{ fontSize: 13, color: '#991B1B', mb: 0.5 }}>
                                작성한 프로젝트 및 협업 ({counts.projects + counts.collaborations}건)
                            </Typography>
                            <Typography component="li" sx={{ fontSize: 13, color: '#991B1B', mb: 0.5 }}>
                                메시지 및 댓글
                            </Typography>
                            <Typography component="li" sx={{ fontSize: 13, color: '#991B1B' }}>
                                알림 및 활동 내역
                            </Typography>
                        </Box>
                    </Box>

                    <Stack direction="row" spacing={1.5}>
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => setConfirmDialogOpen(false)}
                            disabled={submitting}
                            sx={{
                                borderColor: '#D1D5DB',
                                color: '#374151',
                                fontWeight: 600,
                                py: 1.5,
                                '&:hover': {
                                    borderColor: '#9CA3AF',
                                    bgcolor: '#F9FAFB'
                                }
                            }}
                        >
                            취소
                        </Button>
                        <Button
                            fullWidth
                            variant="contained"
                            onClick={handleWithdrawal}
                            disabled={submitting}
                            sx={{
                                bgcolor: '#EF4444',
                                color: '#ffffff',
                                fontWeight: 600,
                                py: 1.5,
                                '&:hover': {
                                    bgcolor: '#DC2626'
                                }
                            }}
                        >
                            {submitting ? <CircularProgress size={24} color="inherit" /> : '탈퇴하기'}
                        </Button>
                    </Stack>
                </Box>
            </Dialog>
        </Box>
    );
}

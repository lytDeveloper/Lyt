import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, useTheme, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { useAuth } from '../../providers/AuthContext';
import { authService } from '../../services/authService';
import { toast } from 'react-toastify';

export default function AccountDeletionPage() {
    const navigate = useNavigate();
    const theme = useTheme();
    const { user } = useAuth();
    const [openDialog, setOpenDialog] = useState(false);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleDeleteRequest = async () => {
        if (!user) {
            toast.error('로그인이 필요합니다.');
            return;
        }

        setLoading(true);
        try {
            // Check if user already has pending deletion request
            const hasPending = await authService.hasPendingDeletionRequest(user.id);
            if (hasPending) {
                toast.info('이미 계정 삭제 요청이 진행 중이에요.');
                setOpenDialog(false);
                setLoading(false);
                return;
            }

            // Submit deletion request
            await authService.requestAccountDeletion(user.id, reason);
            toast.success('계정 삭제 요청이 접수되었어요. 관리자 검토 후 처리할게요.');
            setOpenDialog(false);
            setReason('');

            // Navigate back after short delay
            setTimeout(() => {
                navigate('/profile');
            }, 2000);
        } catch (error) {
            console.error('계정 삭제 요청 실패:', error);
            toast.error('계정 삭제 요청에 실패했어요. 다시 시도해주세요.');
        } finally {
            setLoading(false);
        }
    };

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
                height: 56,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                borderBottom: `1px solid ${theme.palette.divider}`
            }}>
                <IconButton edge="start" onClick={() => navigate(-1)} sx={{ color: '#111827' }}>
                    <ChevronLeftIcon />
                </IconButton>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                    계정 삭제 안내
                </Typography>
            </Box>

            {/* Content */}
            <Box sx={{ p: 3, pb: 10 }}>
                {/* App Info */}
                <Box sx={{ mb: 4 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#111827', mb: 1 }}>
                        앱 정보
                    </Typography>
                    <Typography sx={{ fontSize: 14, color: theme.palette.text.secondary, mb: 0.5 }}>
                        앱 이름: <strong>라잇-가능성이 켜진 순간</strong>
                    </Typography>
                    <Typography sx={{ fontSize: 14, color: theme.palette.text.secondary }}>
                        개발자: <strong>콜에이전시(Colagency)</strong>
                    </Typography>
                </Box>

                {/* Deletion Steps */}
                <Box sx={{ mb: 4 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#111827', mb: 2 }}>
                        계정 삭제 절차
                    </Typography>
                    <Box component="ol" sx={{ pl: 2.5, m: 0 }}>
                        <Typography component="li" sx={{ fontSize: 14, lineHeight: 1.8, color: '#374151', mb: 1 }}>
                            하단의 <strong>"계정 삭제 요청"</strong> 버튼을 클릭할게요.
                        </Typography>
                        <Typography component="li" sx={{ fontSize: 14, lineHeight: 1.8, color: '#374151', mb: 1 }}>
                            삭제 사유를 입력하고 요청을 제출할게요. (선택사항)
                        </Typography>
                        <Typography component="li" sx={{ fontSize: 14, lineHeight: 1.8, color: '#374151', mb: 1 }}>
                            관리자가 요청을 검토할게요. (영업일 기준 3~5일 소요)
                        </Typography>
                        <Typography component="li" sx={{ fontSize: 14, lineHeight: 1.8, color: '#374151', mb: 1 }}>
                            승인 시 계정 및 관련 데이터가 삭제될게요.
                        </Typography>
                        <Typography component="li" sx={{ fontSize: 14, lineHeight: 1.8, color: '#374151' }}>
                            삭제 완료 후 이메일로 알림을 받을게요.
                        </Typography>
                    </Box>
                </Box>

                {/* Data Deletion Info */}
                <Box sx={{ mb: 4 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#111827', mb: 2 }}>
                        삭제 및 보관 데이터
                    </Typography>

                    <Typography sx={{ fontSize: 15, fontWeight: 600, color: '#111827', mb: 1 }}>
                        즉시 삭제되는 데이터:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2.5, mt: 1, mb: 2 }}>
                        <Typography component="li" sx={{ fontSize: 14, lineHeight: 1.8, color: '#374151' }}>
                            프로필 정보 (닉네임, 사진, 소개글 등)
                        </Typography>
                        <Typography component="li" sx={{ fontSize: 14, lineHeight: 1.8, color: '#374151' }}>
                            업로드한 콘텐츠 (이미지, 포트폴리오 등)
                        </Typography>
                        <Typography component="li" sx={{ fontSize: 14, lineHeight: 1.8, color: '#374151' }}>
                            커뮤니티 활동 내역 (댓글, 좋아요 등)
                        </Typography>
                        <Typography component="li" sx={{ fontSize: 14, lineHeight: 1.8, color: '#374151' }}>
                            메시지 내역
                        </Typography>
                        <Typography component="li" sx={{ fontSize: 14, lineHeight: 1.8, color: '#374151' }}>
                            푸시 알림 토큰
                        </Typography>
                    </Box>

                    <Typography sx={{ fontSize: 15, fontWeight: 600, color: '#111827', mb: 1 }}>
                        일정 기간 보관되는 데이터:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2.5, mt: 1, mb: 2 }}>
                        <Typography component="li" sx={{ fontSize: 14, lineHeight: 1.8, color: '#374151' }}>
                            <strong>거래 내역 및 결제 정보</strong>: 전자상거래법에 따라 5년간 보관
                        </Typography>
                        <Typography component="li" sx={{ fontSize: 14, lineHeight: 1.8, color: '#374151' }}>
                            <strong>부정 이용 방지 정보</strong>: 서비스 보안을 위해 6개월간 보관
                        </Typography>
                        <Typography component="li" sx={{ fontSize: 14, lineHeight: 1.8, color: '#374151' }}>
                            <strong>접속 로그</strong>: 통신비밀보호법에 따라 3개월간 보관
                        </Typography>
                    </Box>

                    <Box sx={{
                        bgcolor: theme.palette.bgColor.orange,
                        borderRadius: '8px',
                        p: 2,
                        border: `1px solid ${theme.palette.status.orange}`
                    }}>
                        <Typography sx={{ fontSize: 13, color: '#111827', lineHeight: 1.6 }}>
                            <strong>⚠️ 주의사항</strong><br />
                            계정 삭제 후에는 동일한 계정으로 재가입이 불가능하며, 삭제된 데이터는 복구할 수 없어요.
                            진행 중인 프로젝트나 협업이 있는 경우, 삭제 전에 반드시 관련자에게 알려주세요.
                        </Typography>
                    </Box>
                </Box>

                {/* Delete Button */}
                <Button
                    fullWidth
                    variant="contained"
                    onClick={() => setOpenDialog(true)}
                    sx={{
                        bgcolor: theme.palette.error.main,
                        color: '#ffffff',
                        fontWeight: 600,
                        fontSize: 15,
                        py: 1.5,
                        borderRadius: '8px',
                        textTransform: 'none',
                        '&:hover': {
                            bgcolor: theme.palette.error.dark,
                        }
                    }}
                >
                    계정 삭제 요청
                </Button>
            </Box>

            {/* Confirmation Dialog */}
            <Dialog
                open={openDialog}
                onClose={() => !loading && setOpenDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 700, fontSize: 18 }}>
                    계정 삭제 요청
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontSize: 14, color: '#374151', mb: 2 }}>
                        정말로 계정을 삭제하시겠어요? 이 작업은 되돌릴 수 없어요.
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="삭제 사유 (선택사항)"
                        placeholder="계정 삭제 사유를 입력해주세요."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        disabled={loading}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button
                        onClick={() => setOpenDialog(false)}
                        disabled={loading}
                        sx={{ color: theme.palette.text.secondary }}
                    >
                        취소
                    </Button>
                    <Button
                        onClick={handleDeleteRequest}
                        disabled={loading}
                        variant="contained"
                        color="error"
                        sx={{
                            minWidth: 100,
                            position: 'relative'
                        }}
                    >
                        {loading ? (
                            <CircularProgress size={20} color="inherit" />
                        ) : (
                            '삭제 요청'
                        )}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

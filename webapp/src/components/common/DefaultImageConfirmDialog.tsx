import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    useTheme,
} from '@mui/material';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';

interface DefaultImageConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

/**
 * 기본 이미지 사용 확인 다이얼로그
 * - 앱 기조에 맞춘 스타일 (둥근 모서리, 커스텀 버튼)
 * - StatusChangeConfirmDialog 스타일 참고
 */
export default function DefaultImageConfirmDialog({
    open,
    onClose,
    onConfirm,
}: DefaultImageConfirmDialogProps) {
    const theme = useTheme();

    return (
        <Dialog
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    borderRadius: '16px',
                    maxWidth: 340,
                    width: '100%',
                    m: 2,
                },
            }}
        >
            <DialogTitle sx={{ pb: 1, pt: 3, px: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                    {/* 이미지 아이콘 */}
                    <Box
                        sx={{
                            width: 56,
                            height: 56,
                            borderRadius: '50%',
                            backgroundColor: '#EFF6FF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <ImageOutlinedIcon sx={{ fontSize: 28, color: '#2563EB' }} />
                    </Box>
                    <Typography
                        sx={{
                            fontSize: 16,
                            fontWeight: 600,
                            color: theme.palette.text.primary,
                            textAlign: 'center',
                        }}
                    >
                        기본 이미지 사용
                    </Typography>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ px: 3, pt: 1, pb: 2 }}>
                <Typography
                    sx={{
                        fontSize: 14,
                        color: theme.palette.text.secondary,
                        textAlign: 'center',
                        lineHeight: 1.6,
                    }}
                >
                    기본 이미지를 사용하시겠어요?<br />
                    나중에 프로필 설정에서 언제든 변경할 수 있어요.
                </Typography>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1 }}>
                <Button
                    fullWidth
                    onClick={onClose}
                    sx={{
                        borderRadius: '10px',
                        height: 44,
                        fontSize: 14,
                        fontWeight: 500,
                        color: theme.palette.text.secondary,
                        backgroundColor: theme.palette.grey[100],
                        '&:hover': {
                            backgroundColor: theme.palette.grey[200],
                        },
                    }}
                >
                    취소
                </Button>
                <Button
                    fullWidth
                    variant="contained"
                    onClick={onConfirm}
                    sx={{
                        borderRadius: '10px',
                        height: 44,
                        fontSize: 14,
                        fontWeight: 600,
                        backgroundColor: theme.palette.primary.main,
                        boxShadow: 'none',
                        '&:hover': {
                            backgroundColor: theme.palette.primary.dark,
                            boxShadow: 'none',
                        },
                    }}
                >
                    확인
                </Button>
            </DialogActions>
        </Dialog>
    );
}

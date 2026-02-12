import { useState } from 'react';
import {
    Dialog,
    Box,
    Typography,
    Button,
    TextField,
    IconButton,
    CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';

type ActionType = 'accepted' | 'rejected' | 'on_hold';

interface PartnershipResponseModalProps {
    open: boolean;
    onClose: () => void;
    action: ActionType;
    companyName: string;
    projectType: string;
    onConfirm: (message: string) => Promise<void>;
}

const ACTION_CONFIG: Record<ActionType, {
    title: string;
    label: string;
    placeholder: string;
    buttonText: string;
}> = {
    accepted: {
        title: '문의 수락',
        label: '수락 메시지 (선택사항)',
        placeholder: '파트너에게 전할 메시지를 작성해 주세요',
        buttonText: '수락하기',
    },
    rejected: {
        title: '문의 거절',
        label: '거절 메시지 (선택사항)',
        placeholder: '정중한 거절 사유를 작성해 주세요',
        buttonText: '거절하기',
    },
    on_hold: {
        title: '문의 보류',
        label: '보류 메시지 (선택사항)',
        placeholder: '보류 사유를 작성해 주세요',
        buttonText: '보류하기',
    },
};

const MAX_MESSAGE_LENGTH = 200;

export default function PartnershipResponseModal({
    open,
    onClose,
    action,
    companyName,
    projectType,
    onConfirm,
}: PartnershipResponseModalProps) {
    const theme = useTheme();
    const [message, setMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const config = ACTION_CONFIG[action];

    const handleConfirm = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            await onConfirm(message);
            setMessage('');
            onClose();
        } catch (error) {
            console.error('Failed to process action:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClose = () => {
        if (!isProcessing) {
            setMessage('');
            onClose();
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            PaperProps={{
                sx: {
                    borderRadius: '16px',
                    width: '90%',
                    maxWidth: 400,
                    p: 0,
                },
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2.5,
                    pb: 2,
                }}
            >
                <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
                    {config.title}
                </Typography>
                <IconButton onClick={handleClose} size="small" disabled={isProcessing}>
                    <CloseIcon />
                </IconButton>
            </Box>

            {/* Content */}
            <Box sx={{ px: 2.5, pb: 2 }}>
                {/* Company Info */}
                <Box
                    sx={{
                        backgroundColor: '#F8F9FA',
                        borderRadius: '8px',
                        p: 2,
                        mb: 3,
                    }}
                >
                    <Typography sx={{ fontSize: 15, fontWeight: 600, mb: 0.5 }}>
                        {companyName}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: theme.palette.text.secondary }}>
                        {projectType}
                    </Typography>
                </Box>

                {/* Message Input */}
                <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1.5 }}>
                    {config.label}
                </Typography>
                <TextField
                    multiline
                    rows={4}
                    fullWidth
                    placeholder={config.placeholder}
                    value={message}
                    onChange={(e) => {
                        if (e.target.value.length <= MAX_MESSAGE_LENGTH) {
                            setMessage(e.target.value);
                        }
                    }}
                    disabled={isProcessing}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '8px',
                            backgroundColor: '#F8F9FA',
                            '& fieldset': {
                                borderColor: 'transparent',
                            },
                            '&:hover fieldset': {
                                borderColor: theme.palette.divider,
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: theme.palette.primary.main,
                            },
                        },
                        '& .MuiInputBase-input': {
                            fontSize: 14,
                        },
                    }}
                />
                <Typography
                    sx={{
                        fontSize: 12,
                        color: theme.palette.text.secondary,
                        textAlign: 'right',
                        mt: 0.5,
                    }}
                >
                    {message.length}/{MAX_MESSAGE_LENGTH}
                </Typography>
            </Box>

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 1.5, p: 2.5, pt: 1 }}>
                <Button
                    variant="outlined"
                    fullWidth
                    onClick={handleClose}
                    disabled={isProcessing}
                    sx={{
                        borderColor: theme.palette.divider,
                        color: theme.palette.text.primary,
                        fontWeight: 600,
                        borderRadius: '24px',
                        py: 1.5,
                        '&:hover': {
                            borderColor: theme.palette.divider,
                            backgroundColor: theme.palette.action.hover,
                        },
                    }}
                >
                    취소
                </Button>
                <Button
                    variant="contained"
                    fullWidth
                    onClick={handleConfirm}
                    disabled={isProcessing}
                    sx={{
                        backgroundColor: theme.palette.primary.main,
                        fontWeight: 600,
                        borderRadius: '24px',
                        py: 1.5,
                        boxShadow: 'none',
                        '&:hover': {
                            boxShadow: 'none',
                        },
                    }}
                >
                    {isProcessing ? <CircularProgress size={20} color="inherit" /> : config.buttonText}
                </Button>
            </Box>
        </Dialog>
    );
}

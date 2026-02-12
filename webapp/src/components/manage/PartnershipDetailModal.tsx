import { useState } from 'react';
import {
    Box,
    Typography,
    Modal,
    IconButton,
    Button,
    Chip,
    Divider,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import type { PartnershipData } from './PartnershipCard';

interface PartnershipDetailModalProps {
    open: boolean;
    onClose: () => void;
    data: PartnershipData | null;
    mode: 'sent' | 'received';
    onAccept?: (id: string) => Promise<string | undefined>;
    onReject?: (id: string, reason?: string) => Promise<void>;
    onNavigateToChat?: (chatRoomId: string) => void;
}

export default function PartnershipDetailModal({
    open,
    onClose,
    data,
    mode,
    onAccept,
    onReject,
    onNavigateToChat,
}: PartnershipDetailModalProps) {
    const theme = useTheme();
    const [isProcessing, setIsProcessing] = useState(false);
    const [downloadConfirmOpen, setDownloadConfirmOpen] = useState(false);
    const [pendingDownloadFile, setPendingDownloadFile] = useState<{ name: string; url: string } | null>(null);

    const handleFileClick = (file: { name: string; url: string }) => {
        setPendingDownloadFile(file);
        setDownloadConfirmOpen(true);
    };

    const handleConfirmDownload = () => {
        if (pendingDownloadFile) {
            // 직접 다운로드 (a 태그 + download 속성)
            const link = document.createElement('a');
            link.href = pendingDownloadFile.url;
            link.download = pendingDownloadFile.name;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        setDownloadConfirmOpen(false);
        setPendingDownloadFile(null);
    };

    const handleCancelDownload = () => {
        setDownloadConfirmOpen(false);
        setPendingDownloadFile(null);
    };

    if (!data) return null;

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return { label: '대기', color: theme.palette.status.green, bg: theme.palette.bgColor.green };
            case 'accepted': return { label: '수락', color: theme.palette.status.blue, bg: theme.palette.bgColor.blue };
            case 'rejected': return { label: '거절', color: theme.palette.status.red, bg: theme.palette.bgColor.red };
            case 'on_hold': return { label: '보류', color: theme.palette.status.orange, bg: theme.palette.bgColor.orange };
            default: return { label: status, color: theme.palette.subText.default, bg: theme.palette.grey[100] };
        }
    };

    const statusInfo = getStatusLabel(data.status);
    const formattedDate = new Date(data.created_at).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const handleAccept = async () => {
        if (!onAccept || isProcessing) return;
        setIsProcessing(true);
        try {
            const chatRoomId = await onAccept(data.id);
            if (chatRoomId && onNavigateToChat) {
                onNavigateToChat(chatRoomId);
            }
            onClose();
        } catch (error) {
            console.error('Failed to accept partnership:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!onReject || isProcessing) return;
        setIsProcessing(true);
        try {
            await onReject(data.id);
            onClose();
        } catch (error) {
            console.error('Failed to reject partnership:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSendMessage = () => {
        if (data.created_chat_room_id && onNavigateToChat) {
            onNavigateToChat(data.created_chat_room_id);
            onClose();
        }
    };

    const getFileIcon = (type?: string) => {
        if (type?.includes('pdf')) {
            return <DescriptionOutlinedIcon sx={{ fontSize: 20, color: '#E53935' }} />;
        }
        return <InsertDriveFileOutlinedIcon sx={{ fontSize: 20, color: '#757575' }} />;
    };

    // Section style
    const sectionTitleSx = { fontSize: 14, fontWeight: 700, mb: 1.5, color: theme.palette.text.primary };
    const labelSx = { fontSize: 13, color: theme.palette.text.secondary, minWidth: 80 };
    const valueSx = { fontSize: 13, color: theme.palette.text.primary, fontWeight: 500, textAlign: 'right' as const, flex: 1 };
    const infoBoxSx = {
        backgroundColor: '#F8F9FA',
        borderRadius: '8px',
        p: 1.5,
        mb: 1.5,
    };

    return (
        <>
            <Modal open={open} onClose={onClose}>
                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '90%',
                        maxWidth: 420,
                        maxHeight: '90vh',
                        bgcolor: 'background.paper',
                        borderRadius: '16px',
                        boxShadow: 24,
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    {/* Header */}
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            p: 2,

                        }}
                    >
                        <Typography sx={{ fontSize: 18, fontWeight: 700 }}>파트너십 문의 상세</Typography>
                        <IconButton onClick={onClose} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    {/* Content - Scrollable */}
                    <Box
                        sx={{
                            flex: 1,
                            overflowY: 'auto',
                            p: 2,
                        }}
                    >
                        {/* Status & Date */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                            <Chip
                                label={statusInfo.label}
                                size="small"
                                sx={{
                                    backgroundColor: statusInfo.bg,
                                    color: statusInfo.color,
                                    fontWeight: 600,
                                    fontSize: 12,
                                    height: 24,
                                    borderRadius: '4px',
                                }}
                            />
                            <Typography sx={{ fontSize: 13, color: theme.palette.text.secondary }}>
                                {formattedDate}
                            </Typography>
                        </Box>

                        {/* 기본 정보 */}
                        <Typography sx={sectionTitleSx}>기본 정보</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={labelSx}>회사명</Typography>
                                <Typography sx={valueSx}>{data.company_name}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={labelSx}>담당자</Typography>
                                <Typography sx={valueSx}>{data.contact_name}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={labelSx}>이메일</Typography>
                                <Typography sx={valueSx}>{data.email || '-'}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={labelSx}>연락처</Typography>
                                <Typography sx={valueSx}>{data.phone || '-'}</Typography>
                            </Box>
                        </Box>

                        <Divider sx={{ mb: 3 }} />

                        {/* 프로젝트 정보 */}
                        <Typography sx={sectionTitleSx}>프로젝트 정보</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={labelSx}>프로젝트 유형</Typography>
                                <Typography sx={valueSx}>{data.project_type}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={labelSx}>예산 규모</Typography>
                                <Typography sx={valueSx}>{data.budget_range}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={labelSx}>프로젝트 기간</Typography>
                                <Typography sx={valueSx}>{data.duration}</Typography>
                            </Box>
                        </Box>

                        <Divider sx={{ mb: 3 }} />

                        {/* 프로젝트 설명 */}
                        <Typography sx={sectionTitleSx}>프로젝트 설명</Typography>
                        <Box sx={infoBoxSx}>
                            <Typography sx={{ fontSize: 13, color: theme.palette.text.secondary, lineHeight: 1.6 }}>
                                {data.description}
                            </Typography>
                        </Box>

                        {/* 프로젝트 목표 */}
                        <Typography sx={sectionTitleSx}>프로젝트 목표</Typography>
                        <Box sx={infoBoxSx}>
                            <Typography sx={{ fontSize: 13, color: theme.palette.text.secondary, lineHeight: 1.6 }}>
                                {data.goals}
                            </Typography>
                        </Box>

                        {/* 협업 경험 */}
                        {data.experience && (
                            <>
                                <Typography sx={sectionTitleSx}>협업 경험</Typography>
                                <Box sx={infoBoxSx}>
                                    <Typography sx={{ fontSize: 13, color: theme.palette.text.secondary, lineHeight: 1.6 }}>
                                        {data.experience}
                                    </Typography>
                                </Box>
                            </>
                        )}

                        {/* 첨부 파일 */}
                        {data.attachments && data.attachments.length > 0 && (
                            <>
                                <Typography sx={sectionTitleSx}>첨부 파일 ({data.attachments.length}개)</Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                                    {data.attachments.map((file, idx) => (
                                        <Box
                                            key={idx}
                                            onClick={() => handleFileClick(file)}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1.5,
                                                p: 1.5,
                                                border: `1px solid ${theme.palette.divider}`,
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                '&:hover': {
                                                    backgroundColor: theme.palette.action.hover,
                                                },
                                            }}
                                        >
                                            {getFileIcon(file.type)}
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography
                                                    sx={{
                                                        fontSize: 13,
                                                        fontWeight: 500,
                                                        color: theme.palette.text.primary,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {file.name}
                                                </Typography>
                                            </Box>
                                            <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>
                                                {file.size ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : ''}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>
                            </>
                        )}
                    </Box>

                    {/* Footer - Action Buttons */}
                    <Box
                        sx={{
                            p: 2,
                            borderTop: `1px solid ${theme.palette.divider}`,
                            display: 'flex',
                            gap: 1.5,
                            justifyContent: 'center',
                        }}
                    >
                        {mode === 'received' && data.status === 'pending' && (
                            <>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    onClick={handleReject}
                                    disabled={isProcessing}
                                    sx={{
                                        borderColor: theme.palette.divider,
                                        color: theme.palette.text.primary,
                                        fontWeight: 600,
                                        borderRadius: '24px',
                                        width: '50%',
                                        '&:hover': {
                                            borderColor: theme.palette.divider,
                                            backgroundColor: theme.palette.action.hover,
                                        },
                                    }}
                                >
                                    {isProcessing ? <CircularProgress size={20} /> : '거절하기'}
                                </Button>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    onClick={handleAccept}
                                    disabled={isProcessing}
                                    sx={{
                                        backgroundColor: theme.palette.primary.main,
                                        fontWeight: 600,
                                        borderRadius: '24px',
                                        width: '50%',
                                        boxShadow: 'none',
                                        '&:hover': {
                                            boxShadow: 'none',
                                        },
                                    }}
                                >
                                    {isProcessing ? <CircularProgress size={20} color="inherit" /> : '수락하기'}
                                </Button>
                            </>
                        )}

                        {data.status === 'accepted' && data.created_chat_room_id && (
                            <Button
                                variant="contained"
                                onClick={handleSendMessage}
                                sx={{
                                    backgroundColor: theme.palette.primary.main,
                                    fontWeight: 600,
                                    borderRadius: '24px',
                                    width: '50%',
                                    boxShadow: 'none',
                                    '&:hover': {
                                        boxShadow: 'none',
                                    },
                                }}
                            >
                                메시지 보내기
                            </Button>
                        )}

                        {/* For rejected/hold status or sent mode, just show close */}
                        {(data.status === 'rejected' || data.status === 'on_hold' || (mode === 'sent' && data.status !== 'accepted')) && (
                            <Button
                                variant="outlined"
                                fullWidth
                                onClick={onClose}
                                sx={{
                                    borderColor: theme.palette.divider,
                                    color: theme.palette.text.primary,
                                    fontWeight: 600,
                                    borderRadius: '24px',
                                    width: '50%',
                                }}
                            >
                                닫기
                            </Button>
                        )}

                        {/* Sent mode with accepted status */}
                        {mode === 'sent' && data.status === 'accepted' && data.created_chat_room_id && (
                            <Button
                                variant="contained"
                                fullWidth
                                onClick={handleSendMessage}
                                sx={{
                                    backgroundColor: theme.palette.primary.main,
                                    fontWeight: 600,
                                    borderRadius: '24px',
                                    width: '50%',
                                    boxShadow: 'none',
                                }}
                            >
                                메시지 보내기
                            </Button>
                        )}
                    </Box>
                </Box>
            </Modal>

            {/* 다운로드 확인 다이얼로그 */}
            <Dialog
                open={downloadConfirmOpen}
                onClose={handleCancelDownload}
                PaperProps={{
                    sx: {
                        borderRadius: '16px',
                        maxWidth: 320,
                    },
                }}
            >
                <DialogTitle sx={{ fontSize: 16, fontWeight: 700, pb: 1 }}>
                    파일 다운로드
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontSize: 14, color: theme.palette.text.secondary }}>
                        <strong>{pendingDownloadFile?.name}</strong> 파일을 다운로드하시겠어요?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 1 }}>
                    <Button
                        onClick={handleCancelDownload}
                        sx={{
                            color: theme.palette.text.secondary,
                            fontWeight: 500,
                        }}
                    >
                        취소
                    </Button>
                    <Button
                        onClick={handleConfirmDownload}
                        variant="contained"
                        sx={{
                            backgroundColor: theme.palette.primary.main,
                            fontWeight: 600,
                            borderRadius: '8px',
                            boxShadow: 'none',
                        }}
                    >
                        다운로드
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

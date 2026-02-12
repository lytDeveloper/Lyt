
import { useState } from 'react';
import { Box, Typography, Button, Chip, Collapse, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import BusinessIcon from '@mui/icons-material/Business';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import MoneyOutlinedIcon from '@mui/icons-material/MoneyOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
export interface PartnershipData {
    id: string;
    sender_id: string;
    receiver_id?: string;
    company_name: string;
    contact_name: string;
    email?: string;
    phone?: string;
    project_type: string;
    budget_range: string;
    duration: string;
    description: string;
    goals: string;
    experience?: string;
    response_message?: string;
    status: string; // 'pending' | 'accepted' | 'rejected' | 'on_hold'
    created_at: string;
    attachments?: { name: string; url: string; size: number; type?: string }[];
    created_chat_room_id?: string;
    // For partner view (joined from profile_brands)
    receiver_brand_name?: string;
    receiver_activity_field?: string;
    receiver_is_verified?: boolean;
    // For UI:
    sender_profile_image?: string;
}

interface PartnershipCardProps {
    data: PartnershipData;
    mode: 'sent' | 'received'; // 'sent'(Partner view), 'received'(Brand view)
    onStatusChange?: (id: string, newStatus: string) => void;
    onViewDetail?: (id: string) => void;
    isHidden?: boolean;
    onToggleHidden?: () => void;
}

export default function PartnershipCard({ data, mode, onStatusChange, onViewDetail, isHidden, onToggleHidden }: PartnershipCardProps) {
    const theme = useTheme();
    const [expanded, setExpanded] = useState(false);

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
    const isReceived = mode === 'received';
    const isSent = mode === 'sent';

    // 다운로드 확인 다이얼로그 상태
    const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
    const [pendingFile, setPendingFile] = useState<{ name: string; url: string } | null>(null);

    const handleFileClick = (file: { name: string; url: string }) => {
        setPendingFile(file);
        setDownloadDialogOpen(true);
    };

    const handleDownload = () => {
        if (pendingFile) {
            // 직접 다운로드 (a 태그 + download 속성)
            const link = document.createElement('a');
            link.href = pendingFile.url;
            link.download = pendingFile.name;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        setDownloadDialogOpen(false);
        setPendingFile(null);
    };

    // Partner view (sent mode): Simplified expandable card
    if (isSent) {
        return (
            <Box
                sx={{
                    borderRadius: '12px',
                    boxShadow: '0px 2px 5px 0px rgba(50, 50, 105, 0.15), 0px 1px 1px 0px rgba(0, 0, 0, 0.05)',
                    backgroundColor: '#fff',
                    overflow: 'hidden',
                }}
            >
                {/* Clickable Header */}
                <Box
                    onClick={() => setExpanded(!expanded)}
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 2,
                        cursor: 'pointer',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {/* Brand name with verified badge */}
                        <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
                            {data.receiver_brand_name || data.company_name}
                        </Typography>
                        {data.receiver_is_verified && (
                            <WorkspacePremiumIcon sx={{ fontSize: 18, color: '#2962FF' }} />
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                            label={statusInfo.label}
                            size="small"
                            sx={{
                                backgroundColor: statusInfo.bg,
                                color: statusInfo.color,
                                fontWeight: 600,
                                fontSize: 12,
                                height: 24,
                                borderRadius: '20px',
                            }}
                        />
                        {onToggleHidden && (
                            <Tooltip title={isHidden ? '항목 표시하기' : '항목 숨기기'}>
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleHidden();
                                    }}
                                    sx={{ p: 0.5 }}
                                >
                                    {isHidden ? (
                                        <VisibilityOutlinedIcon sx={{ fontSize: 18, color: theme.palette.text.disabled }} />
                                    ) : (
                                        <VisibilityOffOutlinedIcon sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
                                    )}
                                </IconButton>
                            </Tooltip>
                        )}
                        <IconButton size="small" sx={{ ml: -0.5 }}>
                            {expanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                        </IconButton>
                    </Box>
                </Box>

                {/* Category tags */}
                <Box sx={{ display: 'flex', gap: 1.5, px: 2, pb: expanded ? 0 : 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <BusinessIcon sx={{ fontSize: 14, color: theme.palette.text.secondary }} />
                        <Typography sx={{ fontSize: 13, color: theme.palette.text.secondary }}>
                            브랜드
                        </Typography>
                    </Box>
                    {data.receiver_activity_field && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <FolderOpenOutlinedIcon sx={{ fontSize: 14, color: theme.palette.text.secondary }} />
                            <Typography sx={{ fontSize: 13, color: theme.palette.text.secondary }}>
                                {data.receiver_activity_field}
                            </Typography>
                        </Box>
                    )}
                </Box>

                {/* Expandable content */}
                <Collapse in={expanded}>
                    <Box sx={{ px: 2, pb: 2, pt: 2 }}>
                        {/* Partner Comment (description) */}
                        <Box
                            sx={{
                                backgroundColor: '#F8F9FA',
                                borderRadius: '8px',
                                p: 1.5,
                                mb: 1.5,
                            }}
                        >
                            <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.5, color: '#555' }}>
                                파트너 코멘트
                            </Typography>
                            <Typography
                                sx={{
                                    fontSize: 13,
                                    color: theme.palette.text.secondary,
                                    lineHeight: 1.5,
                                }}
                            >
                                {data.description}
                            </Typography>
                        </Box>

                        {/* Brand Comment (response_message) */}
                        {data.response_message && (
                            <Box
                                sx={{
                                    backgroundColor: '#F8F9FA',
                                    borderRadius: '8px',
                                    p: 1.5,
                                }}
                            >
                                <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.5, color: '#555' }}>
                                    브랜드 코멘트
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: 13,
                                        color: theme.palette.text.secondary,
                                        lineHeight: 1.5,
                                    }}
                                >
                                    {data.response_message}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Collapse>
            </Box>
        );
    }

    // Brand view (received mode): Full card with all details
    return (
        <>
            <Box
                sx={{
                    borderRadius: '12px',
                    boxShadow: '0px 2px 5px 0px rgba(50, 50, 105, 0.15), 0px 1px 1px 0px rgba(0, 0, 0, 0.05)',
                    p: 2,
                    backgroundColor: '#fff',
                }}
            >
                {/* Header: Title & Status */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box>
                        <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 0.5 }}>
                            {data.company_name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontSize: 13, color: theme.palette.text.secondary }}>
                                {data.project_type}
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                            label={statusInfo.label}
                            size="small"
                            sx={{
                                backgroundColor: statusInfo.bg,
                                color: statusInfo.color,
                                fontWeight: 600,
                                fontSize: 12,
                                height: 24,
                                borderRadius: '20px',
                            }}
                        />
                        {onToggleHidden && (
                            <Tooltip title={isHidden ? '항목 표시하기' : '항목 숨기기'}>
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleHidden();
                                    }}
                                    sx={{ p: 0.5 }}
                                >
                                    {isHidden ? (
                                        <VisibilityOutlinedIcon sx={{ fontSize: 18, color: theme.palette.text.disabled }} />
                                    ) : (
                                        <VisibilityOffOutlinedIcon sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
                                    )}
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                </Box>

                {/* Meta Info */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <MoneyOutlinedIcon sx={{ fontSize: 14, color: theme.palette.icon.default }} />
                        <Typography sx={{ fontSize: 13, color: theme.palette.text.secondary }}>
                            {data.budget_range}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarMonthOutlinedIcon sx={{ fontSize: 14, color: theme.palette.icon.default }} />
                        <Typography sx={{ fontSize: 13, color: theme.palette.text.secondary }}>
                            {data.duration}
                        </Typography>
                    </Box>
                </Box>

                {/* Date */}
                <Typography sx={{ fontSize: 12, color: '#999', mb: 2 }}>
                    {isReceived ? '받은 날짜: ' : '보낸 날짜: '}
                    {new Date(data.created_at).toLocaleDateString()}
                </Typography>

                {/* Comment Box */}
                <Box
                    sx={{
                        backgroundColor: '#F8F9FA',
                        borderRadius: '8px',
                        p: 1.5,
                        mb: 2,
                    }}
                >
                    <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.5, color: '#555' }}>
                        파트너 코멘트
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: 13,
                            color: theme.palette.text.secondary,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        }}
                    >
                        {data.description}
                    </Typography>
                </Box>

                {/* Attachments */}
                {data.attachments && data.attachments.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 400, mb: 1 }}>첨부 파일 ({data.attachments.length}개)</Typography>
                        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5 }}>
                            {data.attachments.map((file, idx) => (
                                <Box
                                    key={idx}
                                    onClick={() => handleFileClick(file)}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        p: 1,
                                        border: '1px solid #eee',
                                        borderRadius: '8px',
                                        minWidth: '200px',
                                        cursor: 'pointer',
                                        '&:hover': { backgroundColor: '#f5f5f5' },
                                    }}
                                >
                                    <InsertDriveFileOutlinedIcon sx={{ fontSize: 20, color: '#999' }} />
                                    <Box sx={{ overflow: 'hidden' }}>
                                        <Typography sx={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</Typography>
                                        <Typography sx={{ fontSize: 11, color: '#aaa' }}>{file.size ? (file.size / 1024 / 1024).toFixed(1) + 'MB' : ''}</Typography>
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                )}

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <Button
                        variant="contained"

                        size="medium"
                        onClick={() => onViewDetail && onViewDetail(data.id)}
                        sx={{
                            backgroundColor: '#2962FF',
                            fontWeight: 400,
                            fontSize: 14,
                            borderRadius: '24px',
                            textTransform: 'none',
                            boxShadow: 'none',
                            width: '70%',
                        }}
                    >
                        상세보기
                    </Button>
                    {data.status === 'pending' && (
                        <>
                            <Button
                                variant="outlined"
                                size="medium"
                                onClick={() => onStatusChange && onStatusChange(data.id, 'on_hold')}
                                sx={{
                                    flex: 1,
                                    borderColor: theme.palette.grey[100],
                                    backgroundColor: theme.palette.grey[100],
                                    color: theme.palette.text.primary,
                                    fontWeight: 400,
                                    borderRadius: '24px',
                                    '&:hover': { borderColor: theme.palette.grey[100], backgroundColor: theme.palette.grey[100] }
                                }}
                            >
                                보류
                            </Button>
                            <Button
                                variant="outlined"
                                size="medium"
                                onClick={() => onStatusChange && onStatusChange(data.id, 'rejected')}
                                sx={{
                                    flex: 1,
                                    borderColor: theme.palette.divider,
                                    backgroundColor: theme.palette.background.paper,
                                    color: theme.palette.text.primary,
                                    fontWeight: 400,
                                    borderRadius: '24px',
                                    '&:hover': { borderColor: theme.palette.divider, backgroundColor: theme.palette.background.paper }
                                }}
                            >
                                거절
                            </Button>
                            <Button
                                variant="contained"
                                size="medium"
                                onClick={() => onStatusChange && onStatusChange(data.id, 'accepted')}
                                sx={{
                                    flex: 1,
                                    backgroundColor: theme.palette.primary.main,
                                    fontWeight: 400,
                                    borderRadius: '24px',
                                    boxShadow: 'none',
                                }}
                            >
                                수락
                            </Button>
                        </>
                    )}
                </Box>
            </Box>

            {/* 다운로드 확인 다이얼로그 */}
            <Dialog
                open={downloadDialogOpen}
                onClose={() => setDownloadDialogOpen(false)}
                PaperProps={{ sx: { borderRadius: '16px', maxWidth: 320 } }}
            >
                <DialogTitle sx={{ fontSize: 16, fontWeight: 700, pb: 1 }}>
                    파일 다운로드
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontSize: 14, color: theme.palette.text.secondary }}>
                        <strong>{pendingFile?.name}</strong> 파일을 다운로드하시겠습니까?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 1 }}>
                    <Button onClick={() => setDownloadDialogOpen(false)} sx={{ color: theme.palette.text.secondary }}>
                        취소
                    </Button>
                    <Button onClick={handleDownload} variant="contained" sx={{ backgroundColor: theme.palette.primary.main, fontWeight: 600, borderRadius: '8px', boxShadow: 'none' }}>
                        다운로드
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

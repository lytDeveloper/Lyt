import { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    IconButton,
    Skeleton,
    Button,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import BottomNavigationBar, { BOTTOM_NAV_HEIGHT } from '../../components/navigation/BottomNavigationBar';
import { serverNotificationService } from '../../services/serverNotificationService';
import type { ServerNotification } from '../../services/serverNotificationService';

const ITEMS_PER_PAGE = 9;

export default function ServiceAnnouncementListPage() {
    const theme = useTheme();
    const navigate = useNavigate();
    const [announcements, setAnnouncements] = useState<ServerNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            setLoading(true);
            try {
                const data = await serverNotificationService.getAnnouncementsForUser();
                setAnnouncements(data);
            } catch (error) {
                console.error('공지 목록 로드 실패:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnnouncements();
    }, []);

    // Pagination
    const totalPages = Math.ceil(announcements.length / ITEMS_PER_PAGE);
    const paginatedAnnouncements = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return announcements.slice(start, start + ITEMS_PER_PAGE);
    }, [announcements, currentPage]);

    // Format date helper
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '');
    };

    // Generate page numbers for pagination
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible + 2) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= Math.min(maxVisible, totalPages); i++) {
                    pages.push(i);
                }
                if (totalPages > maxVisible) {
                    pages.push('...');
                    pages.push(totalPages);
                }
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    return (
        <Box sx={{
            pb: `${BOTTOM_NAV_HEIGHT}px`,
            minHeight: '100vh',
            bgcolor: '#ffffff',
            maxWidth: '768px',
            margin: '0 auto',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
        }}>
            {/* Header */}
            <Box sx={{
                position: 'sticky',
                top: 0,
                zIndex: 1100,
                px: 2,
                height: 'auto',
                minHeight: '56px',
                paddingTop: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                backgroundColor: 'transparent',
                backdropFilter: 'blur(3px) saturate(180%)',
                WebkitBackdropFilter: 'blur(3px) saturate(180%)',
            }}>
                <IconButton edge="start" onClick={() => navigate(-1)} sx={{ color: '#111827' }}>
                    <ChevronLeftIcon />
                </IconButton>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                    서비스 공지
                </Typography>
            </Box>

            {/* Section Title */}
            <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
                <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
                    서버 점검 및 업데이트 안내
                </Typography>
            </Box>

            {/* Content */}
            <Box sx={{ flex: 1, px: 2 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} variant="rounded" height={48} sx={{ borderRadius: 2 }} />
                        ))}
                    </Box>
                ) : announcements.length === 0 ? (
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                        <Typography sx={{ fontSize: 14, color: '#9CA3AF' }}>
                            등록된 공지가 없습니다.
                        </Typography>
                    </Box>
                ) : (
                    <Box>
                        {paginatedAnnouncements.map((announcement) => (
                            <Box
                                key={announcement.id}
                                onClick={() => navigate(`/settings/announcements/${announcement.id}`)}
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    py: 2,
                                    borderBottom: `1px solid ${theme.palette.grey[100]}`,
                                    cursor: 'pointer',
                                    '&:active': {
                                        bgcolor: theme.palette.grey[50],
                                    },
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontSize: 14,
                                        fontWeight: 500,
                                        color: '#1F2937',
                                        flex: 1,
                                        pr: 2,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {announcement.title}
                                </Typography>
                                <Typography sx={{ fontSize: 13, color: '#9CA3AF', flexShrink: 0 }}>
                                    {formatDate(announcement.created_at)}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>

            {/* Pagination */}
            {totalPages > 1 && (
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 0.5,
                    py: 3,
                }}>
                    {/* First Page */}
                    <IconButton
                        size="small"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(1)}
                        sx={{ color: theme.palette.grey[500] }}
                    >
                        <KeyboardDoubleArrowLeftIcon fontSize="small" />
                    </IconButton>

                    {/* Previous Page */}
                    <IconButton
                        size="small"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        sx={{ color: theme.palette.grey[500] }}
                    >
                        <ChevronLeftIcon fontSize="small" />
                    </IconButton>

                    {/* Page Numbers */}
                    {getPageNumbers().map((page, idx) => (
                        page === '...' ? (
                            <Typography key={`ellipsis-${idx}`} sx={{ px: 1, color: '#9CA3AF' }}>
                                ...
                            </Typography>
                        ) : (
                            <Button
                                key={page}
                                variant={currentPage === page ? 'contained' : 'text'}
                                size="small"
                                onClick={() => setCurrentPage(page as number)}
                                sx={{
                                    minWidth: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    fontSize: 13,
                                    fontWeight: currentPage === page ? 600 : 400,
                                    color: currentPage === page ? '#fff' : '#374151',
                                    bgcolor: currentPage === page ? theme.palette.primary.main : 'transparent',
                                    '&:hover': {
                                        bgcolor: currentPage === page ? theme.palette.primary.dark : theme.palette.grey[100],
                                    },
                                }}
                            >
                                {page}
                            </Button>
                        )
                    ))}

                    {/* Next Page */}
                    <IconButton
                        size="small"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        sx={{ color: theme.palette.grey[500] }}
                    >
                        <ChevronRightIcon fontSize="small" />
                    </IconButton>

                    {/* Last Page */}
                    <IconButton
                        size="small"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        sx={{ color: theme.palette.grey[500] }}
                    >
                        <KeyboardDoubleArrowRightIcon fontSize="small" />
                    </IconButton>
                </Box>
            )}

            <BottomNavigationBar />
        </Box>
    );
}

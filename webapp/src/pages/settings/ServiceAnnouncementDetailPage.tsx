import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    IconButton,
    Skeleton,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate, useParams } from 'react-router-dom';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import BottomNavigationBar, { BOTTOM_NAV_HEIGHT } from '../../components/navigation/BottomNavigationBar';
import { serverNotificationService } from '../../services/serverNotificationService';
import type { ServerNotification } from '../../services/serverNotificationService';

export default function ServiceAnnouncementDetailPage() {
    const theme = useTheme();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [announcement, setAnnouncement] = useState<ServerNotification | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAnnouncement = async () => {
            if (!id) {
                setError('공지 ID가 없습니다.');
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const data = await serverNotificationService.getAnnouncementById(id);
                if (data) {
                    setAnnouncement(data);
                } else {
                    setError('공지를 찾을 수 없습니다.');
                }
            } catch (err) {
                console.error('공지 상세 로드 실패:', err);
                setError('공지를 불러오는 중 오류가 발생했습니다.');
            } finally {
                setLoading(false);
            }
        };
        fetchAnnouncement();
    }, [id]);

    // Format date helper
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '');
    };

    return (
        <Box sx={{
            pb: `${BOTTOM_NAV_HEIGHT}px`,
            minHeight: '100vh',
            bgcolor: '#ffffff',
            maxWidth: '768px',
            margin: '0 auto',
            position: 'relative',
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

            {/* Content */}
            <Box sx={{ px: 2, pt: 2 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Skeleton variant="text" width="80%" height={32} />
                        <Skeleton variant="text" width="30%" height={20} />
                        <Skeleton variant="rounded" height={200} sx={{ borderRadius: 2 }} />
                    </Box>
                ) : error ? (
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                        <Typography sx={{ fontSize: 14, color: theme.palette.error.main }}>
                            {error}
                        </Typography>
                    </Box>
                ) : announcement && (
                    <>
                        {/* Title */}
                        <Typography sx={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: '#111827',
                            lineHeight: 1.4,
                            mb: 1.5,
                        }}>
                            {announcement.title}
                        </Typography>

                        {/* Divider */}
                        <Box sx={{ borderBottom: `1px solid ${theme.palette.grey[200]}`, mb: 1.5 }} />

                        {/* Date */}
                        <Typography sx={{
                            fontSize: 13,
                            color: '#6B7280',
                            mb: 3,
                        }}>
                            {formatDate(announcement.created_at)}
                        </Typography>

                        {/* Body */}
                        <Typography sx={{
                            fontSize: 14,
                            color: '#374151',
                            lineHeight: 1.8,
                            whiteSpace: 'pre-wrap',
                        }}>
                            {announcement.content}
                        </Typography>
                    </>
                )}
            </Box>

            <BottomNavigationBar />
        </Box>
    );
}

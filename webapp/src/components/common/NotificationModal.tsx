import React, { useMemo, useState, useEffect } from 'react';
import { Box, Typography, Modal, IconButton, List, ListItem, ListItemAvatar, ListItemText, Avatar, Button, ListItemButton, Dialog, DialogTitle, DialogContent, Switch, FormControlLabel, useTheme, Menu, MenuItem, Chip } from '@mui/material';
import { LightningLoader } from './index';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../providers/AuthContext';
import type { UserNotification, UserNotificationType } from '../../types/userNotification';
import { useNavigate } from 'react-router-dom';
import { useNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead, useNotificationSettings, useUpdateNotificationSetting } from '../../hooks/useNotifications';
import { formatRelativeTime } from '../../utils/dateHelper';
import PartnerDetailContent from '../explore/PartnerDetailContent';
import { getPartnerById, type Partner } from '../../services/partnerService';
import { serverNotificationService, type ServerNotification } from '../../services/serverNotificationService';
import { getProfileDisplayMap } from '../../services/profileDisplayService';
import type { ProfileDisplayInfo } from '../../types/profileDisplay.types';
import { buildNotificationDescription } from '../../utils/notificationHelper';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import TextsmsOutlinedIcon from '@mui/icons-material/TextsmsOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined';
import FolderSharedOutlinedIcon from '@mui/icons-material/FolderSharedOutlined';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';

interface NotificationModalProps {
    open: boolean;
    onClose: () => void;
}

// Settings Component
const NotificationSettings: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
    const { user } = useAuth();
    const { data: settingsData, isLoading: loading } = useNotificationSettings(user?.id, open && !!user);
    const updateSetting = useUpdateNotificationSetting();

    // Default all true if not present
    const settings = useMemo(() => {
        const defaultSettings = {
            invitation: true,
            message: true,
            application: true,
            deadline: true,
            ...settingsData
        };
        return defaultSettings;
    }, [settingsData]);

    const handleToggle = (type: string) => {
        if (!user) return;
        const newValue = !(settings[type as keyof typeof settings] ?? true);
        updateSetting.mutate({
            userId: user.id,
            type,
            isEnabled: newValue,
        });
    };

    const getLabel = (type: string) => {
        switch (type) {
            case 'invitation': return '초대 알림';
            case 'message': return '채팅 메시지 알림';
            case 'application': return '지원자 알림';
            case 'deadline': return '마감 임박 알림';
            default: return '기타 알림';
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>알림 설정</DialogTitle>
            <DialogContent>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                        <LightningLoader size={24} />
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {['invitation', 'message', 'application'].map(type => (
                            <FormControlLabel
                                key={type}
                                control={
                                    <Switch
                                        checked={settings[type as keyof typeof settings] ?? true}
                                        onChange={() => handleToggle(type)}
                                        color="primary"
                                    />
                                }
                                label={getLabel(type)}
                                sx={{ justifyContent: 'space-between', ml: 0, width: '100%', flexDirection: 'row-reverse' }}
                            />
                        ))}
                    </Box>
                )}
            </DialogContent>
            <Box sx={{ p: 2, textAlign: 'right' }}>
                <Button onClick={onClose}>닫기</Button>
            </Box>
        </Dialog>
    );
};

type FilterOptionValue = 'all' | 'activity' | 'announcement' | UserNotificationType;
type DisplayNotification = UserNotification & { unreadCount?: number; isAggregated?: boolean };

const NotificationModal: React.FC<NotificationModalProps> = ({ open, onClose }) => {
    const theme = useTheme();

    const getIcon = (type: UserNotificationType) => {
        switch (type) {
            case 'message': return <TextsmsOutlinedIcon sx={{ color: theme.palette.icon.default, fontSize: 20 }} />;
            case 'invitation': return <VolunteerActivismOutlinedIcon sx={{ color: theme.palette.icon.default, fontSize: 20 }} />;
            case 'deadline': return <InfoOutlinedIcon sx={{ color: theme.palette.icon.default, fontSize: 20 }} />;
            case 'application': return <FolderSharedOutlinedIcon sx={{ color: theme.palette.icon.default, fontSize: 20 }} />;
            case 'withdrawal': return <InfoOutlinedIcon sx={{ color: theme.palette.icon.default, fontSize: 20 }} />;
            case 'follow': return <PersonAddAltOutlinedIcon sx={{ color: theme.palette.icon.default, fontSize: 20 }} />;
            case 'like': return <FavoriteBorderOutlinedIcon sx={{ color: theme.palette.icon.default, fontSize: 20 }} />;
            case 'question': return <InfoOutlinedIcon sx={{ color: theme.palette.icon.default, fontSize: 20 }} />;
            case 'answer': return <InfoOutlinedIcon sx={{ color: theme.palette.icon.default, fontSize: 20 }} />;
            case 'talk_request': return <TextsmsOutlinedIcon sx={{ color: theme.palette.icon.default, fontSize: 20 }} />;
            case 'talk_request_accepted': return <TextsmsOutlinedIcon sx={{ color: theme.palette.icon.default, fontSize: 20 }} />;
            case 'talk_request_rejected': return <TextsmsOutlinedIcon sx={{ color: theme.palette.icon.default, fontSize: 20 }} />;
            case 'member_left': return <PersonAddAltOutlinedIcon sx={{ color: theme.palette.icon.default, fontSize: 20 }} />;
            case 'member_removed': return <PersonAddAltOutlinedIcon sx={{ color: theme.palette.icon.default, fontSize: 20 }} />;
            case 'partnership_inquiry': return <VolunteerActivismOutlinedIcon sx={{ color: theme.palette.icon.default, fontSize: 20 }} />;
            default: return <InfoOutlinedIcon sx={{ color: theme.palette.icon.default, fontSize: 20 }} />;
        }
    };

    const getIconBg = (type: UserNotificationType) => {
        switch (type) {
            case 'message': return theme.palette.bgColor.default;
            case 'invitation': return theme.palette.bgColor.default;
            case 'deadline': return theme.palette.bgColor.default;
            case 'application': return theme.palette.bgColor.default;
            case 'withdrawal': return theme.palette.bgColor.default;
            case 'follow': return theme.palette.bgColor.default;
            case 'like': return theme.palette.bgColor.default;
            default: return theme.palette.bgColor.default;
        }
    };
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
    const [showPartnerModal, setShowPartnerModal] = useState(false);
    const [isLoadingPartner, setIsLoadingPartner] = useState(false);
    const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null);
    const [selectedType, setSelectedType] = useState<FilterOptionValue>('all');
    const [serverAnnouncements, setServerAnnouncements] = useState<ServerNotification[]>([]);
    const [serverLoading, setServerLoading] = useState(false);
    const [senderDisplayMap, setSenderDisplayMap] = useState<Map<string, ProfileDisplayInfo>>(new Map());

    // React Query hooks
    const { data: notifications = [], isLoading: loading, refetch } = useNotifications(
        user?.id,
        undefined,
        open && !!user
    );
    const markAsRead = useMarkNotificationAsRead();
    const markAllAsRead = useMarkAllNotificationsAsRead();

    // Note: 실시간 구독은 전역 InAppNotificationProvider에서 처리됩니다.
    // 모달은 전역 구독이 React Query 캐시를 업데이트하므로 목록이 실시간으로 갱신됩니다.

    // 모달이 열릴 때 캐시를 즉시 갱신하여 최신 데이터 표시
    useEffect(() => {
        if (open && user) {
            // 캐시 무효화 및 즉시 refetch
            queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
            refetch();
        }
    }, [open, user, queryClient, refetch]);

    const handleMarkAllRead = () => {
        if (!user) return;
        markAllAsRead.mutate(user.id);
    };

    const handleItemClick = async (notification: UserNotification) => {
        if (!notification.isRead) {
            markAsRead.mutate(notification.id);
        }

        // Handle follow/like notifications - open partner modal if applicable
        if (notification.type === 'follow' || notification.type === 'like') {
            if (notification.relatedId) {
                setIsLoadingPartner(true);
                try {
                    const partner = await getPartnerById(notification.relatedId);
                    if (partner) {
                        // Only open modal for artists/creatives (partners)
                        setSelectedPartner(partner);
                        setShowPartnerModal(true);
                        onClose();
                    }
                    // If partner is null, it's a fan/brand - do nothing
                } catch (error) {
                    console.error('Failed to load partner:', error);
                } finally {
                    setIsLoadingPartner(false);
                }
            }
            return;
        }

        // Navigate logic - 통합 관리 페이지(/manage)로 라우팅
        if (notification.type === 'invitation') {
            // 초대 클릭 시 통합 관리 페이지의 초대 탭으로 이동
            const invitationId = notification.metadata?.invitation_id || notification.relatedId;
            if (invitationId) {
                navigate(`/manage?tab=invitations&invitationId=${invitationId}`);
            } else {
                navigate('/manage?tab=invitations');
            }
        } else if (notification.type === 'question' || notification.type === 'answer') {
            // 질문/답변 알림 - 해당 초대 상세 페이지로 이동
            const invitationId = notification.metadata?.invitation_id || notification.relatedId;
            const mode = notification.metadata?.mode || 'received';
            if (invitationId) {
                navigate(`/manage?tab=invitations&mode=${mode}&invitationId=${invitationId}`);
            } else {
                navigate(`/manage?tab=invitations&mode=${mode}`);
            }
        } else if (notification.type === 'message') {
            console.log('Navigate to chat', notification.activityId);
            if (notification.activityId) navigate(`/messages/${notification.activityId}`);
        } else if (notification.type === 'application') {
            // 지원 알림 - applicationId로 모달 자동 열기
            const applicationId = notification.metadata?.application_id || notification.relatedId;
            const mode = notification.metadata?.mode || 'received'; // metadata에 mode가 있으면 사용, 없으면 기본값
            if (applicationId) {
                navigate(`/manage?tab=invitations&mode=${mode}&applicationId=${applicationId}`);
            } else {
                navigate(`/manage?tab=invitations&mode=${mode}`);
            }
        } else if (notification.type === 'talk_request') {
            // 새 대화 요청 알림 - receiver가 받음 → mode='received'
            const talkRequestId = notification.metadata?.talk_request_id || notification.relatedId;
            if (talkRequestId) {
                navigate(`/manage?tab=invitations&mode=received&talkRequestId=${talkRequestId}`);
            } else {
                navigate('/manage?tab=invitations&mode=received');
            }
        } else if (notification.type === 'withdrawal') {
            // 철회 알림은 통합 관리 페이지의 초대·지원 탭으로 이동 (모달 열 필요 없음)
            navigate('/manage?tab=invitations');
        } else if (notification.type === 'deadline') {
            // deadline 알림의 경우 activityType에 따라 이동
            if (notification.activityType === 'collaboration') {
                if (notification.activityId) navigate(`/explore/collaboration/${notification.activityId}`);
            } else {
                // default to project
                if (notification.activityId) navigate(`/explore/project/${notification.activityId}`);
            }
        } else if (notification.type === 'talk_request_accepted') {
            // 대화 요청 수락 알림 - 채팅방이 있으면 채팅방으로, 없으면 관리 페이지로
            const chatRoomId = notification.metadata?.chat_room_id;
            if (chatRoomId) {
                navigate(`/messages/${chatRoomId}`);
            } else {
                navigate('/manage?tab=invitations');
            }
        } else if (notification.type === 'talk_request_rejected') {
            // 대화 요청 거절 알림 - sender가 받음 → mode='sent'
            const talkRequestId = notification.metadata?.talk_request_id || notification.relatedId;
            if (talkRequestId) {
                navigate(`/manage?tab=invitations&mode=sent&talkRequestId=${talkRequestId}`);
            } else {
                navigate('/manage?tab=invitations&mode=sent');
            }
        } else if (notification.type === 'member_left' || notification.type === 'member_removed') {
            // 멤버 퇴장/강제 퇴장 알림 - 해당 프로젝트/협업 상세 페이지 팀 탭으로
            const relatedType = notification.metadata?.related_type || notification.activityType;
            const entityId = notification.relatedId || notification.metadata?.project_id || notification.metadata?.collaboration_id;

            if (relatedType === 'project' && entityId) {
                navigate(`/explore/project/${entityId}?tab=team`);
            } else if (relatedType === 'collaboration' && entityId) {
                navigate(`/explore/collaboration/${entityId}?tab=members`);
            }
        } else if (notification.type === 'partnership_inquiry') {
            // 파트너십 문의 알림 - 관리 페이지의 프로젝트 탭 > 파트너십 하위 탭으로 이동
            navigate('/manage?tab=projects&subTab=partnership');
        }

        onClose();
    };

    const unreadCount = useMemo(() => {
        return notifications.filter(n => !n.isRead).length;
    }, [notifications]);

    const markAllDisabled = loading || notifications.length === 0 || unreadCount === 0 || markAllAsRead.isPending;

    const messageAggregated = useMemo<DisplayNotification[]>(() => {
        const messages = notifications.filter(n => n.type === 'message');
        const groups = messages.reduce<Map<string, UserNotification[]>>((acc, cur) => {
            const key = cur.activityId || cur.relatedId || cur.id;
            const arr = acc.get(key) || [];
            arr.push(cur);
            acc.set(key, arr);
            return acc;
        }, new Map());

        const aggregated: DisplayNotification[] = [];
        groups.forEach((items) => {
            const sorted = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            const unread = sorted.filter(item => !item.isRead);
            if (unread.length === 0) return;
            const latestUnread = unread[0];
            aggregated.push({
                ...latestUnread,
                unreadCount: unread.length,
                isAggregated: true,
            });
        });

        return aggregated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [notifications]);

    const filterOptions: { value: FilterOptionValue; label: string }[] = [
        { value: 'all', label: '전체' },
        { value: 'message', label: '메시지' },
        { value: 'invitation', label: '초대' },
        { value: 'activity', label: '활동' },
        { value: 'application', label: '협업/지원' },
        { value: 'deadline', label: '마감 임박' },
        { value: 'announcement', label: '공지' },
    ];

    const displayNotifications = useMemo<DisplayNotification[]>(() => {
        const nonMessage = notifications.filter(n => n.type !== 'message');
        const combined = [...nonMessage, ...messageAggregated];

        if (selectedType === 'all') {
            return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        if (selectedType === 'message') {
            return messageAggregated;
        }

        if (selectedType === 'activity') {
            return combined
                .filter(n => n.type === 'follow' || n.type === 'like')
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        if (selectedType === 'announcement') {
            return [];
        }

        return combined
            .filter(n => n.type === selectedType)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [notifications, messageAggregated, selectedType]);

    // 초대/지원 알림의 발신자 ID 수집 (의존성 안정화를 위해 useMemo 사용)
    const senderIdsToFetch = useMemo(() => {
        const ids: string[] = [];
        displayNotifications.forEach(n => {
            const isNewInvitationOrApplication =
                (n.type === 'invitation' && n.metadata?.action !== 'accepted' && n.metadata?.action !== 'rejected') ||
                n.type === 'application';
            if (isNewInvitationOrApplication) {
                const senderId = (n.metadata?.sender_id as string) || n.senderId;
                if (senderId && !ids.includes(senderId)) ids.push(senderId);
            }
        });
        return ids;
    }, [displayNotifications]);

    // 발신자 ID 목록의 키 (의존성 안정화)
    const senderIdsKey = senderIdsToFetch.join(',');

    // 초대/지원 알림의 발신자 정보 배치 조회 (활성 프로필에서 정확한 이름 가져오기)
    useEffect(() => {
        if (!open || senderIdsToFetch.length === 0) {
            setSenderDisplayMap(new Map());
            return;
        }

        const fetchSenderInfo = async () => {
            try {
                const map = await getProfileDisplayMap(senderIdsToFetch);
                setSenderDisplayMap(map);
            } catch (error) {
                console.error('[NotificationModal] Failed to fetch sender display info:', error);
            }
        };

        fetchSenderInfo();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, senderIdsKey]);

    const handleSelectFilter = (value: FilterOptionValue) => {
        setSelectedType(value);
        setFilterAnchor(null);
    };

    const loadServerAnnouncements = async () => {
        setServerLoading(true);
        try {
            const data = await serverNotificationService.getActiveNotifications(['all']);
            setServerAnnouncements(data || []);
        } finally {
            setServerLoading(false);
        }
    };

    useEffect(() => {
        if (open && selectedType === 'announcement') {
            loadServerAnnouncements();
        }
    }, [open, selectedType]);

    return (
        <>
            <Modal
                open={open}
                onClose={onClose}
                aria-labelledby="notification-modal-title"
            >
                <Box
                    sx={{
                        position: 'fixed',
                        inset: 0,
                        bgcolor: 'background.default',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    {/* Header */}
                    <Box sx={{ px: 2, pt: 1.5, pb: 1.5, display: 'flex', alignItems: 'center', gap: 1, borderBottom: `1px solid ${theme.palette.divider}` }}>
                        <IconButton onClick={onClose} size="small">
                            <ArrowBackIosNewRoundedIcon fontSize="small" />
                        </IconButton>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                                알림
                            </Typography>
                            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                                읽지 않은 알림 {unreadCount}개
                            </Typography>
                        </Box>
                        <IconButton onClick={() => setSettingsOpen(true)} size="small">
                            <SettingsOutlinedIcon />
                        </IconButton>
                    </Box>

                    {/* Filter row */}
                    <Box
                        sx={{
                            px: 2,
                            py: 1.5,
                            display: 'flex',
                            justifyContent: 'flex-start',
                            alignItems: 'center',
                            borderBottom: `1px solid ${theme.palette.divider}`,
                            cursor: 'pointer',
                            backgroundColor: theme.palette.background.paper,
                            gap: 1,
                        }}
                        onClick={(e) => setFilterAnchor(e.currentTarget)}
                    >
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                            {filterOptions.find(opt => opt.value === selectedType)?.label || '전체'}
                        </Typography>
                        <KeyboardArrowDownRoundedIcon fontSize="small" />
                    </Box>

                    <Menu
                        anchorEl={filterAnchor}
                        open={Boolean(filterAnchor)}
                        onClose={() => setFilterAnchor(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                    >
                        {filterOptions.map(option => (
                            <MenuItem
                                key={option.value}
                                selected={selectedType === option.value}
                                onClick={() => handleSelectFilter(option.value)}
                            >
                                {option.label}
                            </MenuItem>
                        ))}
                    </Menu>

                    {/* List */}
                    {selectedType === 'announcement' ? (
                        serverLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                                <LightningLoader size={30} />
                            </Box>
                        ) : serverAnnouncements.length === 0 ? (
                            <Box sx={{ p: 4, textAlign: 'center', color: theme.palette.text.secondary }}>
                                <Typography>활성화된 공지가 없어요.</Typography>
                            </Box>
                        ) : (
                            <List sx={{ overflowY: 'auto', flex: 1, p: 0 }}>
                                {serverAnnouncements.map((item) => (
                                    <ListItem
                                        key={item.id}
                                        disablePadding
                                        sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}
                                    >
                                        <ListItemButton
                                            sx={{
                                                bgcolor: theme.palette.background.paper,
                                                py: 2,
                                                alignItems: 'flex-start'
                                            }}
                                        >
                                            <ListItemAvatar>
                                                <Avatar
                                                    sx={{ bgcolor: theme.palette.bgColor.default, width: 40, height: 40 }}
                                                >
                                                    <CampaignOutlinedIcon sx={{ color: theme.palette.icon.default, fontSize: 20 }} />
                                                </Avatar>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primaryTypographyProps={{ component: 'div' }}
                                                secondaryTypographyProps={{ component: 'div' }}
                                                primary={
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, gap: 1 }}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {item.title}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, minWidth: 60, textAlign: 'right' }}>
                                                            {formatRelativeTime(item.created_at)}
                                                        </Typography>
                                                    </Box>
                                                }
                                                secondary={
                                                    <Box>
                                                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                            {item.content}
                                                        </Typography>
                                                    </Box>
                                                }
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                ))}
                            </List>
                        )
                    ) : loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                            <LightningLoader size={30} />
                        </Box>
                    ) : displayNotifications.length === 0 ? (
                        <Box sx={{ p: 4, textAlign: 'center', color: theme.palette.text.secondary }}>
                            <Typography>새로운 알림이 없어요.</Typography>
                        </Box>
                    ) : (
                        <List sx={{ overflowY: 'auto', flex: 1, p: 0 }}>
                            {displayNotifications.map((notification) => {
                                // 알림 타입별 이미지 소스 결정
                                let avatarSrc: string | undefined;
                                let coverImageSrc: string | undefined;

                                if (notification.type === 'talk_request') {
                                    // 대화 요청: 발신자 아바타
                                    avatarSrc = (notification.metadata?.sender_avatar as string) || notification.senderAvatar;
                                } else if (notification.type === 'talk_request_accepted' || notification.type === 'talk_request_rejected') {
                                    // 대화 요청 응답: 응답자 아바타
                                    avatarSrc = (notification.metadata?.receiver_avatar as string) || notification.senderAvatar;
                                } else if (notification.type === 'invitation') {
                                    // 초대 알림: 초대 응답(수락/거절)인지 새 초대인지 구분
                                    const action = notification.metadata?.action as string;
                                    coverImageSrc = notification.metadata?.cover_image_url as string;
                                    if (action === 'accepted' || action === 'rejected') {
                                        // 초대 응답 알림: 응답자 아바타
                                        avatarSrc = (notification.metadata?.receiver_avatar as string) || notification.senderAvatar;
                                    } else {
                                        // 새 초대 알림: 발신자 아바타
                                        avatarSrc = (notification.metadata?.sender_avatar as string) || notification.senderAvatar;
                                    }
                                } else if (notification.type === 'application' || notification.type === 'withdrawal') {
                                    // 지원/철회 알림: 발신자(지원자) 프로필 사진만 사용
                                    avatarSrc = (notification.metadata?.sender_avatar as string) || notification.senderAvatar;
                                } else if (notification.type === 'message') {
                                    avatarSrc = notification.senderAvatar;
                                }

                                // 표시할 이미지 결정: 커버 이미지 > 아바타 > 아이콘
                                // 단, application과 withdrawal 타입은 커버 이미지 사용 안 함
                                const displayImageSrc = (notification.type === 'application' || notification.type === 'withdrawal')
                                    ? avatarSrc
                                    : (coverImageSrc || avatarSrc);
                                const isSquareImage = !!coverImageSrc && notification.type !== 'application' && notification.type !== 'withdrawal';

                                // 초대/지원 알림의 description 동적 생성
                                let displayDescription = notification.description;
                                const isNewInvitationOrApplication =
                                    (notification.type === 'invitation' && notification.metadata?.action !== 'accepted' && notification.metadata?.action !== 'rejected') ||
                                    notification.type === 'application';
                                if (isNewInvitationOrApplication) {
                                    const senderId = (notification.metadata?.sender_id as string) || notification.senderId;
                                    const display = senderId ? senderDisplayMap.get(senderId) : undefined;

                                    if (display) {
                                        const action = notification.metadata?.action as string | undefined;
                                        // 협업 지원: collaboration_title, 프로젝트 지원: project_title, 초대: target_title
                                        const targetTitle =
                                            (notification.metadata?.collaboration_title as string | undefined) ||
                                            (notification.metadata?.project_title as string | undefined) ||
                                            (notification.metadata?.target_title as string | undefined);

                                        displayDescription = buildNotificationDescription(
                                            notification.type,
                                            action,
                                            display.name,
                                            targetTitle,
                                            notification.metadata
                                        );
                                    }
                                }

                                return (
                                    <ListItem
                                        key={notification.id}
                                        disablePadding
                                        sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}
                                    >
                                        <ListItemButton
                                            onClick={() => handleItemClick(notification)}
                                            sx={{
                                                bgcolor: notification.isRead ? theme.palette.background.paper : theme.palette.action.selected,
                                                py: 2,
                                                alignItems: 'flex-start'
                                            }}
                                        >
                                            <ListItemAvatar>
                                                <Avatar
                                                    src={displayImageSrc}
                                                    variant={isSquareImage ? 'rounded' : 'circular'}
                                                    sx={{
                                                        bgcolor: getIconBg(notification.type),
                                                        width: 40,
                                                        height: 40,
                                                        '& img': isSquareImage ? { objectFit: 'cover' } : {}
                                                    }}
                                                >
                                                    {!displayImageSrc && getIcon(notification.type)}
                                                </Avatar>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primaryTypographyProps={{ component: 'div' }}
                                                secondaryTypographyProps={{ component: 'div' }}
                                                primary={
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, gap: 1 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {notification.title}
                                                            </Typography>
                                                            {notification.unreadCount ? (
                                                                <Chip
                                                                    label={notification.unreadCount}
                                                                    size="small"
                                                                    color="primary"
                                                                    sx={{ height: 20 }}
                                                                />
                                                            ) : null}
                                                        </Box>
                                                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, minWidth: 60, textAlign: 'right' }}>
                                                            {formatRelativeTime(notification.createdAt)}
                                                        </Typography>
                                                    </Box>
                                                }
                                                secondary={
                                                    <Box>
                                                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                            {displayDescription}
                                                        </Typography>
                                                    </Box>
                                                }
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                );
                            })}
                        </List>
                    )}

                    {/* Footer */}
                    <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}`, textAlign: 'center', bgcolor: theme.palette.background.paper }}>
                        <Button
                            fullWidth
                            sx={{
                                color: markAllDisabled ? theme.palette.text.disabled : theme.palette.primary.main,
                                fontWeight: 600
                            }}
                            onClick={handleMarkAllRead}
                            disabled={markAllDisabled}
                        >
                            {markAllAsRead.isPending ? '처리 중...' : '모든 알림 읽음 처리'}
                        </Button>
                    </Box>
                </Box>
            </Modal>
            <NotificationSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />

            {/* Partner Detail Modal */}
            <Modal
                open={showPartnerModal}
                onClose={() => {
                    setShowPartnerModal(false);
                    setSelectedPartner(null);
                }}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Box
                    sx={{
                        width: '90%',
                        maxWidth: '600px',
                        maxHeight: '90vh',
                        outline: 'none',
                    }}
                >
                    <PartnerDetailContent
                        partner={selectedPartner}
                        loading={isLoadingPartner}
                        onClose={() => {
                            setShowPartnerModal(false);
                            setSelectedPartner(null);
                        }}
                        showBottomNavigation={false}
                        isModal
                    />
                </Box>
            </Modal>
        </>
    );
};

// Export Settings Component for external use
export { NotificationSettings };
export default NotificationModal;

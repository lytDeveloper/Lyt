import { useState, useEffect, useMemo, useRef } from 'react';
import { Box, Typography, List, Skeleton, Button, useTheme, Fab } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ScrollToTopProvider } from '../../contexts/ScrollToTopContext';
import { useQueryClient } from '@tanstack/react-query';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import SearchIcon from '@mui/icons-material/Search';
import TabBar from '../../components/common/TabBar';
import { messageService } from '../../services/messageService';
import type { ChatRoomInvitation } from '../../services/messageService';
import BottomNavigationBar, { BOTTOM_NAV_HEIGHT } from '../../components/navigation/BottomNavigationBar';
import Header, { HEADER_HEIGHT } from '../../components/common/Header';
import CreateChatRoomModal from '../../components/messages/CreateChatRoomModal';
import MessageRoomComponent from '../../components/messages/MessageRoom';
import { useProfileStore } from '../../stores/profileStore';
import { useMessageRooms } from '../../hooks/useMessageRooms';
import { useMessageRoomsRealtime } from '../../hooks/useMessageRealtime';
import { usePinRoom, useUnpinRoom, useToggleNotification } from '../../hooks/useMessageMutations';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { toast } from 'react-toastify';

// 대화방 스켈레톤 컴포넌트
const MessageRoomSkeleton = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderBottom: '1px solid theme.palette.grey[100]' }}>
        <Skeleton variant="circular" width={48} height={48} />
        <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Skeleton variant="text" width="40%" height={24} />
                <Skeleton variant="text" width={50} height={16} />
            </Box>
            <Skeleton variant="text" width="70%" height={18} />
        </Box>
    </Box>
);

const MessageList = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { type: activeProfileType, nonFanProfile, userId } = useProfileStore();
    const [activeTab, setActiveTab] = useState('all');
    // const [tabs, setTabs] = useState<TabItem[]>(messageService.getTabs()); // Removed state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [pendingInvitation, setPendingInvitation] = useState<ChatRoomInvitation | null>(null);
    const [invitationLoading, setInvitationLoading] = useState(false);

    // Scroll container ref for ScrollToTopButton
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // 메시지 기능은 비팬 프로필만 이용 가능
    const isFanProfile = activeProfileType === 'fan' || (!activeProfileType && !nonFanProfile);

    // React Query hooks - userId를 전달하여 getUser() 호출 절감
    // React Query hooks - 항상 'all'로 조회하여 클라이언트 사이드 필터링 및 탭 배지 계산
    const { data: allRooms = [], isLoading } = useMessageRooms('all', userId || undefined);

    // Filter rooms based on activeTab
    const filteredRooms = useMemo(() => allRooms.filter(room => {
        if (activeTab === 'all') return true;
        if (activeTab === 'project_collaboration') return ['project', 'collaboration'].includes(room.type);
        if (activeTab === 'team') return room.type === 'team';
        return room.type === activeTab;
    }), [allRooms, activeTab]);

    // Mutation hooks - userId 전달
    const pinRoomMutation = usePinRoom(userId || undefined);
    const unpinRoomMutation = useUnpinRoom(userId || undefined);
    const toggleNotificationMutation = useToggleNotification(userId || undefined);

    // Realtime subscription for room list updates (전체 감지)
    useMessageRoomsRealtime('all', !isFanProfile);

    // 탭 설정 및 배지 업데이트 (Memoized)
    const tabs = useMemo(() => {
        const baseTabs = messageService.getTabs();

        return baseTabs.map(tab => {
            const count = allRooms
                .filter(r => {
                    if (tab.key === 'all') return true;
                    if (tab.key === 'project_collaboration') return ['project', 'collaboration'].includes(r.type);
                    if (tab.key === 'team') return r.type === 'team';
                    return r.type === tab.key;
                })
                .reduce((sum, r) => sum + (r.unreadCount || 0), 0);

            return {
                ...tab,
                badge: count
            };
        });
    }, [allRooms]);

    const loadReceivedInvitations = async () => {
        if (!userId || isFanProfile) return;
        try {
            const invitations = await messageService.getReceivedInvitations(userId);
            setPendingInvitation(invitations[0] || null);
        } catch (error) {
            console.error('Failed to load invitations:', error);
        }
    };

    useEffect(() => {
        void loadReceivedInvitations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, isFanProfile]);

    const handleRoomClick = (id: string) => {
        navigate(`/messages/${id}`);
    };



    const handleRoomCreated = (roomId: string) => {
        // Invalidate queries to refresh room list
        queryClient.invalidateQueries({ queryKey: ['messageRooms'] });
        navigate(`/messages/${roomId}`);
    };

    const handlePinRoom = (id: string) => {
        pinRoomMutation.mutate(id);
    };

    const handleUnpinRoom = (id: string) => {
        unpinRoomMutation.mutate(id);
    };

    const handleToggleNotification = (id: string, enabled: boolean) => {
        toggleNotificationMutation.mutate({ roomId: id, enabled });
    };

    const handleLeaveRoom = async (id: string) => {
        try {
            await messageService.leaveRoom(id, userId || undefined);
            toast.success('채팅방에서 나갔습니다');
            queryClient.invalidateQueries({ queryKey: ['messageRooms'] });
        } catch (error) {
            console.error('Error leaving room:', error);
            toast.error('채팅방 나가기에 실패했습니다');
        }
    };

    const handleDeleteRoom = async (id: string) => {
        try {
            await messageService.deleteRoom(id, userId || undefined);
            toast.success('채팅방을 삭제했습니다');
            queryClient.invalidateQueries({ queryKey: ['messageRooms'] });
        } catch (error) {
            console.error('Error deleting room:', error);
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error('채팅방 삭제에 실패했어요.');
            }
        }
    };

    const handleAcceptInvitation = async () => {
        if (!pendingInvitation || !userId) return;
        setInvitationLoading(true);
        try {
            const roomId = await messageService.acceptInvitation(pendingInvitation.id, userId);
            toast.success('채팅방에 참여했어요.');
            await loadReceivedInvitations();
            queryClient.invalidateQueries({ queryKey: ['messageRooms'] });
            navigate(`/messages/${roomId}`);
        } catch (error) {
            console.error('Error accepting invitation:', error);
            toast.error(error instanceof Error ? error.message : '초대 수락에 실패했어요.');
        } finally {
            setInvitationLoading(false);
        }
    };

    const handleRejectInvitation = async () => {
        if (!pendingInvitation || !userId) return;
        setInvitationLoading(true);
        try {
            await messageService.rejectInvitation(pendingInvitation.id, userId);
            toast.info('초대를 거절했어요.');
            await loadReceivedInvitations();
        } catch (error) {
            console.error('Error declining invitation:', error);
            toast.error(error instanceof Error ? error.message : '초대 거절에 실패했어요.');
        } finally {
            setInvitationLoading(false);
        }
    };

    // 팬 프로필인 경우 접근 제한 메시지 표시
    if (isFanProfile) {
        return (
            <ScrollToTopProvider>
                <Box sx={{ pb: `${BOTTOM_NAV_HEIGHT}px`, minHeight: '100vh', bgcolor: '#fff', position: 'relative' }}>
                    {/* Header - Fixed */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            backgroundColor: '#fff',
                            borderBottom: '1px solid theme.palette.grey[100]',
                            zIndex: 1000,
                        }}
                    >
                        <Header />
                    </Box>
                    {/* 접근 제한 메시지 */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: `${HEADER_HEIGHT}px`,
                            left: 0,
                            right: 0,
                            bottom: `${BOTTOM_NAV_HEIGHT}px`,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            px: 4,
                        }}
                    >
                        <LockOutlinedIcon sx={{ fontSize: 64, color: theme.palette.divider, mb: 2 }} />
                        <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 1, textAlign: 'center' }}>
                            비팬 프로필로 전환해주세요
                        </Typography>
                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 3, textAlign: 'center' }}>
                            메시지 기능은 브랜드, 아티스트, 크리에이티브<br />프로필에서만 이용할 수 있어요.
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={() => navigate('/onboarding/profile')}
                            sx={{
                                bgcolor: theme.palette.primary.main,
                                borderRadius: 2,
                                px: 4,
                                py: 1.5,
                            }}
                        >
                            프로필 만들기
                        </Button>
                    </Box>
                    <BottomNavigationBar />
                </Box>
            </ScrollToTopProvider>
        );
    }

    return (
        <ScrollToTopProvider>
            <Box sx={{ pb: `${BOTTOM_NAV_HEIGHT}px`, minHeight: '100vh', bgcolor: '#fff', position: 'relative' }}>
                {/* Header - Fixed */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: 'transparent',
                        backdropFilter: 'blur(3px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(3px) saturate(180%)',
                        zIndex: 1000,
                    }}
                >
                    <Header />
                </Box>
                {/* Main Scrollable Content */}
                <Box
                    ref={scrollContainerRef}
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: `${BOTTOM_NAV_HEIGHT}px`,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        WebkitOverflowScrolling: 'touch',
                        '&::-webkit-scrollbar': {
                            display: 'none',
                        },
                    }}
                >
                    <Box sx={{ p: 2, pb: 0, pt: `${HEADER_HEIGHT}px` }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, textAlign: 'center' }}>
                            메시지
                        </Typography>
                        <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
                    </Box>

                    <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                        {isLoading ? (
                            // 로딩 중 스켈레톤 표시
                            <>
                                <MessageRoomSkeleton />
                                <MessageRoomSkeleton />
                                <MessageRoomSkeleton />
                                <MessageRoomSkeleton />
                            </>
                        ) : filteredRooms.length === 0 ? (
                            <Box sx={{ py: 8, textAlign: 'center', color: theme.palette.text.secondary }}>
                                대화방이 없어요.
                            </Box>
                        ) : (
                            filteredRooms.map((room) => (
                                <MessageRoomComponent
                                    key={room.id}
                                    room={room}
                                    currentUserId={userId || undefined}
                                    onClick={handleRoomClick}
                                    onPin={handlePinRoom}
                                    onUnpin={handleUnpinRoom}
                                    onToggleNotification={handleToggleNotification}
                                    onLeave={handleLeaveRoom}
                                    onDelete={handleDeleteRoom}
                                />
                            ))
                        )}
                    </List>
                </Box>

                <BottomNavigationBar />

                {/* FABs */}
                {/* FABs */}
                {/* FABs */}
                {activeTab === 'partner' && (
                    <Fab
                        color="primary"
                        aria-label="search"
                        onClick={() => navigate('/partner-search')}
                        sx={{
                            position: 'absolute',
                            bottom: `${BOTTOM_NAV_HEIGHT + 16}px`,
                            right: 16,
                            bgcolor: theme.palette.primary.main,
                        }}
                    >
                        <SearchIcon />
                    </Fab>
                )}

                {/* Create Room Modal */}
                <CreateChatRoomModal
                    open={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onRoomCreated={handleRoomCreated}
                />

                {/* 초대 수락/거절 모달 */}
                <ConfirmDialog
                    open={!!pendingInvitation}
                    onClose={handleRejectInvitation}
                    onConfirm={handleAcceptInvitation}
                    title="프로젝트 채팅방 초대"
                    message={
                        pendingInvitation
                            ? `${pendingInvitation.inviterName}님이 회원님을 ${pendingInvitation.roomTitle}에 초대했어요.`
                            : ''
                    }
                    confirmText="수락"
                    cancelText="거절"
                    loading={invitationLoading}
                    icon={<PersonAddAlt1Icon />}
                />
            </Box>
        </ScrollToTopProvider >
    );
};

export default MessageList;

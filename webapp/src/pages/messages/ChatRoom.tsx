import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Box, Typography, Avatar, IconButton, TextField, InputAdornment, Button, useTheme, Menu, MenuItem, Chip } from '@mui/material';
import { LightningLoader } from '../../components/common';
import MentionInput from '../../components/messages/MentionInput';
import { useNavigate, useParams } from 'react-router-dom';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ReplayIcon from '@mui/icons-material/Replay';
import CampaignIcon from '@mui/icons-material/Campaign';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
// removed
import { messageService } from '../../services/messageService';
import type { Attachment, ChatParticipantRole, NoticeMessage, ChatParticipant, MessageRoom } from '../../services/messageService';
import ChatRoomSettingsModal from '../../components/messages/ChatRoomSettingsModal';
import MediaViewerModal from '../../components/messages/MediaViewerModal';
import type { MediaType } from '../../components/messages/MediaViewerModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ActionResultModal from '../../components/common/ActionResultModal';
import { LoadingIndicator } from '../../routes/Guards';
import BottomNavigationBar, { BOTTOM_NAV_HEIGHT } from '../../components/navigation/BottomNavigationBar';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import PlayCircleFilledOutlinedIcon from '@mui/icons-material/PlayCircleFilledOutlined';
import RemoveCircleOutlineRoundedIcon from '@mui/icons-material/RemoveCircleOutlineRounded';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
// 로컬 첨부파일 타입 (업로드 상태 포함, video/audio 확장)
interface LocalAttachment extends Omit<Attachment, 'type'> {
    localId: string;       // 로컬 식별자 (blob URL을 실제 URL로 교체할 때 사용)
    type: 'image' | 'video' | 'audio' | 'file';  // 확장된 타입
    isUploading: boolean;  // 업로드 중인지 여부
    uploadError?: boolean; // 업로드 실패 여부
}
import { useProfileStore } from '../../stores/profileStore';
import { useMessageStore } from '../../stores/messageStore';
import { useAuth } from '../../providers/AuthContext';
import Header, { HEADER_HEIGHT } from '../../components/common/Header';
import { useQueryClient } from '@tanstack/react-query';
import { useMessages, useMessageRoom } from '../../hooks/useMessageRooms';
import { useMessageRealtimeForRoom } from '../../hooks/useMessageRealtime';
import { useSendMessage, useMarkAsRead } from '../../hooks/useMessageMutations';
import { useMarkRoomMessagesAsRead } from '../../hooks/useNotifications';
import type { ChatMessage } from '../../services/messageService';
import { supabase } from '../../lib/supabase';
import { checkAndMaskProfanity } from '../../utils/profanityFilter';
import { checkSpam } from '../../utils/spamDetector';
import { toast } from 'react-toastify';

const ChatRoom = () => {
    const theme = useTheme();
    const { id } = useParams();
    const navigate = useNavigate();
    const { profile, profileStatus } = useAuth();
    const { type: activeProfileType, nonFanProfile, userId } = useProfileStore();
    const [input, setInput] = useState('');
    const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
    // 지연 중인 메시지 추적 (10초 이상 경과, messageId -> { content, attachments })
    const [delayedMessages, setDelayedMessages] = useState<Map<string, { content: string; attachments?: Attachment[] }>>(new Map());

    // 공지 관련 상태
    const [notice, setNotice] = useState<NoticeMessage | null>(null);
    const [noticeExpanded, setNoticeExpanded] = useState(false);
    const [myRole, setMyRole] = useState<ChatParticipantRole>('member');
    const [participants, setParticipants] = useState<ChatParticipant[]>([]);

    // 메시지 액션 메뉴 상태
    const [messageMenuAnchor, setMessageMenuAnchor] = useState<{
        element: HTMLElement;
        messageId: string;
        senderId: string;
    } | null>(null);
    const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasRedirectedRef = useRef(false);

    // 설정 모달 상태
    const [settingsModalOpen, setSettingsModalOpen] = useState(false);

    // 미디어 뷰어 모달 상태
    const [mediaViewer, setMediaViewer] = useState<{
        open: boolean;
        type: MediaType;
        url: string;
        name?: string;
    }>({ open: false, type: 'image', url: '' });

    // 채팅방 이름 수정 상태


    // ConfirmDialog 상태
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        title: string;
        message: string;
        confirmText?: string;
        isDestructive?: boolean;
        onConfirm: () => void;
    }>({ open: false, title: '', message: '', onConfirm: () => { } });

    // ActionResultModal 상태
    const [resultModal, setResultModal] = useState<{
        open: boolean;
        title: string;
        description?: string;
        variant: 'success' | 'info' | 'warning';
    }>({ open: false, title: '', variant: 'success' });
    // 취소된 메시지 ID 추적 (나중에 서버에서 성공해도 삭제해야 함)
    const cancelledMessagesRef = useRef<Set<string>>(new Set());
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputAreaRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const isInitialMountRef = useRef(true);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    // 프로필 로딩 중인지 확인
    // 1. profileStatus가 완료 상태 ('success', 'not_found', 'error')
    // 2. 또는 profileStore에 userId가 설정됨 (preload 완료)
    // 3. 또는 profile 객체가 존재함 (AuthProvider의 React state이므로 재렌더링 보장)
    const isProfileLoadedByStatus = profileStatus === 'success' || profileStatus === 'not_found' || profileStatus === 'error';
    const isProfileLoadedByStore = !!userId;
    const isProfileLoadedByProfile = !!profile;
    const isProfileLoading = !isProfileLoadedByStatus && !isProfileLoadedByStore && !isProfileLoadedByProfile;

    // 메시지 기능은 비팬 프로필만 이용 가능
    // 프로필 로딩 완료 + profileStore preload 완료(userId 설정됨) 후에만 팬 프로필 체크
    // 이렇게 해야 "비팬 프로필로 전환해주세요" 화면이 깜빡이지 않음
    const isFanProfile = !isProfileLoading && !!userId && (
        activeProfileType === 'fan' || (!activeProfileType && !nonFanProfile)
    );

    // React Query hooks - userId를 전달하여 getUser() 호출 절감
    const queryClient = useQueryClient();
    const currentUserId = userId || undefined;
    const {
        data: room,
        error: roomError,
        isLoading: isRoomLoading,
        isFetching: isRoomFetching,
    } = useMessageRoom(id, !isFanProfile && !!id, currentUserId);
    const {
        data: messages = [],
        error: messagesError,
        isFetching: isMessagesFetching,
    } = useMessages(id, !isFanProfile && !!id, currentUserId);

    // 현재 열린 채팅방 ID 설정 (알림 억제용)
    const setCurrentRoomId = useMessageStore(state => state.setCurrentRoomId);

    // Mutation hooks - userId 전달
    const sendMessageMutation = useSendMessage(currentUserId);
    const markAsReadMutation = useMarkAsRead(currentUserId);
    // 채팅방 관련 알림 일괄 읽음 처리 훅
    const markRoomMessagesAsRead = useMarkRoomMessagesAsRead();

    // Realtime subscription for room messages
    useMessageRealtimeForRoom(id, !isFanProfile && !!id);

    // 채팅방 입장/퇴장 시 currentRoomId 설정 (알림 억제용)
    useEffect(() => {
        if (id && !isFanProfile) {
            setCurrentRoomId(id);
            // 채팅방 입장 시 메시지 캐시 무효화하여 최신 메시지 로드
            // (인앱 배너 클릭 후 입장 시 캐시된 이전 메시지만 보이는 문제 해결)
            queryClient.invalidateQueries({ queryKey: ['messages', id] });
        }
        return () => {
            setCurrentRoomId(null);
        };
    }, [id, isFanProfile, setCurrentRoomId, queryClient]);

    // Mark as read when room is opened
    useEffect(() => {
        if (id && !isFanProfile) {
            markAsReadMutation.mutate(id);
        }
        // 해당 채팅방 관련 모든 알림 일괄 읽음 처리
        if (id && !isFanProfile && currentUserId) {
            markRoomMessagesAsRead.mutate({ userId: currentUserId, roomId: id });
        }
    }, [id, isFanProfile, currentUserId]);

    const isUnauthorizedError = useCallback((error: unknown) => {
        if (!error) return false;
        const status = (error as any)?.status ?? (error as any)?.code;
        if (status === 401 || status === 403 || status === 404 || status === 406) return true;
        const message = (error as any)?.message?.toString().toLowerCase?.() || '';
        return message.includes('permission') || message.includes('authorized') || message.includes('allowed');
    }, []);

    // 내보내기(Revoke) 실시간 감지 → 알림 후 홈 이동
    useEffect(() => {
        if (!id || !currentUserId || isFanProfile) return;

        const channel = supabase
            .channel(`chat-participant-kick-${id}`)
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'chat_participants',
                    filter: `room_id=eq.${id}`,
                },
                (payload) => {
                    const removedUserId = (payload as any)?.old?.user_id;
                    if (removedUserId === currentUserId && !hasRedirectedRef.current) {
                        hasRedirectedRef.current = true;
                        alert('채팅방에서 내보내졌어요. 홈으로 이동할게요.');
                        navigate('/home', { replace: true });
                    }
                }
            );

        channel.subscribe();
        return () => {
            channel.unsubscribe();
        };
    }, [id, currentUserId, isFanProfile, navigate]);

    // 채팅방 접근 권한이 없거나 없는 방 ID인 경우 홈으로 이동
    useEffect(() => {
        if (isFanProfile || !id || hasRedirectedRef.current) return;

        const unauthorized = isUnauthorizedError(roomError) || isUnauthorizedError(messagesError);
        const roomMissing = !isRoomLoading && !isRoomFetching && !room;

        if (unauthorized || roomMissing) {
            hasRedirectedRef.current = true;
            navigate('/home', { replace: true });
        }
    }, [
        id,
        room,
        isRoomLoading,
        isRoomFetching,
        roomError,
        messagesError,
        isFanProfile,
        isUnauthorizedError,
        navigate,
    ]);

    // 공지, 내 역할, 참여자 목록 로드
    useEffect(() => {
        const loadRoomData = async () => {
            if (!id || !currentUserId) return;
            try {
                const [noticeData, roleData, participantsData] = await Promise.all([
                    messageService.getRoomNotice(id),
                    messageService.getMyRole(id, currentUserId),
                    messageService.getRoomParticipants(id, currentUserId)
                ]);
                setNotice(noticeData);
                setMyRole(roleData);
                setParticipants(participantsData);
            } catch (error) {
                console.error('Failed to load room data:', error);
            }
        };
        loadRoomData();
    }, [id, currentUserId]);

    // 모바일 키보드 높이 감지 및 처리
    useEffect(() => {
        if (typeof window === 'undefined' || !window.visualViewport) return;

        const handleViewportChange = () => {
            const viewport = window.visualViewport;
            if (!viewport) return;

            // 전체 뷰포트 높이와 실제 보이는 뷰포트 높이의 차이 = 키보드 높이
            const heightDiff = window.innerHeight - viewport.height;
            setKeyboardHeight(Math.max(0, heightDiff));

            // 키보드가 올라왔을 때 input 영역이 보이도록 스크롤 조정
            if (heightDiff > 0 && inputAreaRef.current) {
                setTimeout(() => {
                    inputAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }, 100);
            }
        };

        window.visualViewport.addEventListener('resize', handleViewportChange);
        window.visualViewport.addEventListener('scroll', handleViewportChange);

        return () => {
            window.visualViewport?.removeEventListener('resize', handleViewportChange);
            window.visualViewport?.removeEventListener('scroll', handleViewportChange);
        };
    }, []);

    const scrollToBottom = useCallback((instant: boolean = false) => {
        // messagesContainerRef를 직접 스크롤 (scrollIntoView 대신)
        if (messagesContainerRef.current) {
            const container = messagesContainerRef.current;
            if (instant) {
                container.scrollTop = container.scrollHeight;
            } else {
                container.scrollTo({
                    top: container.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }
    }, []);

    // Scroll to bottom when messages are loaded
    // 메시지 로딩 완료 후 확실하게 최하단으로 스크롤
    const hasScrolledToBottomRef = useRef(false);
    const prevFetchingRef = useRef(true);

    useEffect(() => {
        // 메시지가 없으면 스크롤하지 않음
        if (messages.length === 0) return;

        // 초기 진입 시: 로딩 완료 감지 (isFetching: true -> false)
        const isLoadingComplete = prevFetchingRef.current && !isMessagesFetching;
        prevFetchingRef.current = isMessagesFetching;

        if (isInitialMountRef.current && (isLoadingComplete || !hasScrolledToBottomRef.current)) {
            // 여러 번 스크롤 시도하여 확실히 최하단으로 이동
            const scrollAttempts = [0, 100, 300, 600, 1000]; // 더 늦은 타이밍까지 시도

            scrollAttempts.forEach((delay) => {
                setTimeout(() => {
                    if (messagesContainerRef.current) {
                        const container = messagesContainerRef.current;
                        // instant 스크롤로 확실히 최하단 이동
                        container.scrollTop = container.scrollHeight;
                    }
                }, delay);
            });

            // 마지막 시도 후 상태 업데이트
            setTimeout(() => {
                hasScrolledToBottomRef.current = true;
                isInitialMountRef.current = false;
            }, 1050);
        } else if (!isInitialMountRef.current && !isMessagesFetching) {
            // 새 메시지 추가 시 (실시간 등) - smooth 스크롤
            scrollToBottom(false);
        }
    }, [messages.length, isMessagesFetching, scrollToBottom]);

    // room 변경 시 초기 마운트 상태 리셋
    useEffect(() => {
        isInitialMountRef.current = true;
        hasScrolledToBottomRef.current = false;
    }, [id]);

    // Clean up delayed messages when they are successfully sent (realtime update replaces temp message)
    // Also handle cancelled messages - delete from server if they were sent
    useEffect(() => {
        // Check for cancelled messages that got sent - delete them from server
        const handleCancelledMessages = async () => {
            for (const msg of messages) {
                // 서버에서 온 실제 메시지 중 취소된 것이 있는지 확인
                if (!msg.id.startsWith('temp-') && msg.isMe) {
                    // content로 매칭하여 취소된 메시지인지 확인
                    const wasCancelled = Array.from(cancelledMessagesRef.current).some(cancelledContent =>
                        msg.content === cancelledContent
                    );
                    if (wasCancelled) {
                        try {
                            await messageService.deleteMessage(msg.id);
                            cancelledMessagesRef.current.delete(msg.content || '');
                            // 캐시에서도 제거
                            queryClient.setQueryData<ChatMessage[]>(['messages', id], (old = []) =>
                                old.filter(m => m.id !== msg.id)
                            );
                        } catch (error) {
                            console.error('Failed to delete cancelled message:', error);
                        }
                    }
                }
            }
        };

        handleCancelledMessages();

        // Clean up delayed messages when temp message is replaced by real message
        setDelayedMessages(prev => {
            const newMap = new Map(prev);
            let changed = false;

            newMap.forEach((_value, tempId) => {
                const stillExists = messages.some(msg => msg.id === tempId);
                if (!stillExists) {
                    newMap.delete(tempId);
                    changed = true;
                }
            });

            return changed ? newMap : prev;
        });
    }, [messages, id, queryClient]);

    // 10초 이상 전송 지연된 메시지를 "지연 중" 상태로 전환 (스피너 + 버튼 동시 표시)
    // 요청은 계속 진행됨 (abort 안 함)
    useEffect(() => {
        if (!messages || messages.length === 0) return;

        const TIMEOUT_MS = 10_000;

        const timer = setInterval(() => {
            const now = Date.now();

            messages.forEach((msg) => {
                if (!msg.isMe) return;
                if (!msg.id.startsWith('temp-')) return;
                if (delayedMessages.has(msg.id)) return; // 이미 지연 처리된 경우

                const parts = msg.id.split('-');
                if (parts.length < 3) return;

                const ts = Number(parts[1]);
                if (!Number.isFinite(ts)) return;

                // 생성 후 10초 이상 경과 && 아직 서버 메시지로 교체되지 않은 경우
                if (now - ts >= TIMEOUT_MS) {
                    // 지연 상태로 전환 (요청은 계속 진행)
                    setDelayedMessages(prev => {
                        if (prev.has(msg.id)) return prev;
                        const newMap = new Map(prev);
                        newMap.set(msg.id, {
                            content: msg.content || '',
                            attachments: msg.attachments,
                        });
                        return newMap;
                    });
                }
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [messages, delayedMessages]);

    const handleSend = () => {
        if ((!input.trim() && attachments.length === 0) || !id) return;

        // 업로드 중인 파일이 있으면 전송하지 않음
        const hasUploading = attachments.some(att => att.isUploading);
        if (hasUploading) return;

        let contentToSend = input;

        // 1. 스팸 검사 (반복 메시지, 의심 URL 등)
        if (currentUserId && contentToSend.trim()) {
            const spamResult = checkSpam(currentUserId, contentToSend);
            if (spamResult.isSpam) {
                toast.warning(spamResult.details || '스팸으로 감지되어 전송할 수 없어요.');
                return;
            }
            // 개인정보 경고 (차단하지는 않음)
            if (spamResult.reason === 'personal_info') {
                toast.info('개인정보가 포함된 것 같아요. 주의하세요.');
            }
        }

        // 2. 비속어 마스킹
        if (contentToSend.trim()) {
            const profanityResult = checkAndMaskProfanity(contentToSend);
            if (profanityResult.hasProfanity) {
                contentToSend = profanityResult.maskedText;
            }
        }

        // 업로드 완료된 파일만 전송 (에러 파일 제외), LocalAttachment -> Attachment 변환
        // video/audio는 서버에서 'file'로 처리됨
        const attachmentsToSend: Attachment[] = attachments
            .filter(att => !att.uploadError && !att.isUploading)
            .map(({ type, url, name, size }) => ({
                type: type === 'video' || type === 'audio' ? 'file' : type,
                url,
                name,
                size
            }));

        // 멘션된 사용자 추출 (owner/admin만)
        const mentionedUserIds = isAdmin ? extractMentions(contentToSend) : [];

        // 일반 전송 - AbortController 없이 (요청은 항상 완료되도록)
        sendMessageMutation.mutate({
            roomId: id,
            content: contentToSend,
            attachments: attachmentsToSend,
            userId: currentUserId,
            mentionedUserIds: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
        });

        setInput('');
        setAttachments([]);
        scrollToBottom();
    };

    const handleRetryMessage = (messageId: string) => {
        const delayedMsg = delayedMessages.get(messageId);
        if (!delayedMsg || !id) return;

        // 기존 temp 메시지는 그대로 두고 (원래 요청이 성공하면 realtime이 처리)
        // 지연 상태만 해제
        setDelayedMessages(prev => {
            const newMap = new Map(prev);
            newMap.delete(messageId);
            return newMap;
        });

        // 기존 메시지 제거하고 새로 전송
        queryClient.setQueryData<ChatMessage[]>(['messages', id], (old = []) =>
            old.filter(msg => msg.id !== messageId)
        );

        // 새 요청 전송
        sendMessageMutation.mutate({
            roomId: id,
            content: delayedMsg.content,
            attachments: delayedMsg.attachments,
            userId: currentUserId,
        });
    };

    const handleCancelMessage = (messageId: string) => {
        if (!id) return;

        const delayedMsg = delayedMessages.get(messageId);

        // 지연 상태에서 제거
        setDelayedMessages(prev => {
            const newMap = new Map(prev);
            newMap.delete(messageId);
            return newMap;
        });

        // UI에서 즉시 제거
        queryClient.setQueryData<ChatMessage[]>(['messages', id], (old = []) =>
            old.filter(msg => msg.id !== messageId)
        );

        // 취소된 메시지 content 기록 (나중에 서버에서 성공해도 삭제하기 위해)
        if (delayedMsg?.content) {
            cancelledMessagesRef.current.add(delayedMsg.content);
        }
    };

    // 공지 해제 핸들러
    const handleUnsetNotice = useCallback(() => {
        setConfirmDialog({
            open: true,
            title: '공지 해제',
            message: '공지를 해제하시겠습니까?',
            confirmText: '해제',
            isDestructive: false,
            onConfirm: async () => {
                if (!id || !currentUserId) return;
                setConfirmDialog(prev => ({ ...prev, open: false }));
                try {
                    await messageService.setRoomNotice(id, null, currentUserId);
                    setNotice(null);
                    setResultModal({
                        open: true,
                        title: '공지 해제 완료',
                        description: '공지가 해제되었어요.',
                        variant: 'success'
                    });
                } catch (error) {
                    setResultModal({
                        open: true,
                        title: '공지 해제 실패',
                        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
                        variant: 'warning'
                    });
                }
            }
        });
    }, [id, currentUserId]);

    // 메시지 롱프레스 시작 (모바일)
    const handleMessageTouchStart = useCallback((e: React.TouchEvent, messageId: string, senderId: string) => {
        longPressTimer.current = setTimeout(() => {
            const target = e.currentTarget as HTMLElement;
            setMessageMenuAnchor({ element: target, messageId, senderId });
        }, 500);
    }, []);

    // 메시지 롱프레스 종료
    const handleMessageTouchEnd = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);

    // 메시지 메뉴 아이콘 클릭 (데스크톱)
    const handleMessageMenuClick = useCallback((e: React.MouseEvent, messageId: string, senderId: string) => {
        e.stopPropagation();
        setMessageMenuAnchor({ element: e.currentTarget as HTMLElement, messageId, senderId });
    }, []);

    // 메시지 삭제 핸들러
    const handleDeleteMessage = useCallback(() => {
        if (!messageMenuAnchor) return;
        const { messageId } = messageMenuAnchor;
        setMessageMenuAnchor(null);

        setConfirmDialog({
            open: true,
            title: '메시지 삭제',
            message: '이 메시지를 삭제하시겠어요?',
            confirmText: '삭제',
            isDestructive: true,
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, open: false }));
                try {
                    await messageService.deleteMessage(messageId);
                    // 로컬 캐시에서 제거
                    queryClient.setQueryData<ChatMessage[]>(['messages', id], (old = []) =>
                        old.filter(msg => msg.id !== messageId)
                    );
                    setResultModal({
                        open: true,
                        title: '메시지 삭제 완료',
                        variant: 'success'
                    });
                } catch (error) {
                    setResultModal({
                        open: true,
                        title: '메시지 삭제 실패',
                        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
                        variant: 'warning'
                    });
                }
            }
        });
    }, [messageMenuAnchor, id, queryClient]);

    const handleReinvite = useCallback(async (inviteeId: string | null) => {
        if (!inviteeId || !id || !currentUserId) return;
        try {
            const result = await messageService.inviteParticipants(id, [inviteeId], currentUserId);
            if (result.sent > 0) {
                setResultModal({
                    open: true,
                    title: '초대 전송 완료',
                    description: `${result.sent}명에게 초대를 보냈어요.`,
                    variant: 'success',
                });
            } else {
                setResultModal({
                    open: true,
                    title: '초대 불가',
                    description: result.alreadyInRoom > 0
                        ? '이미 채팅방에 참여 중인 사용자에요.'
                        : '이미 초대한 사용자에요.',
                    variant: 'warning',
                });
            }
        } catch (error: unknown) {
            setResultModal({
                open: true,
                title: '초대 실패',
                description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
                variant: 'warning',
            });
        }
    }, [id, currentUserId]);

    // 공지로 설정 핸들러
    const handleSetAsNotice = useCallback(() => {
        if (!messageMenuAnchor || !id || !currentUserId) return;
        const { messageId } = messageMenuAnchor;
        // 메뉴를 즉시 닫지 않고 작업 완료 후 닫기

        const doSetNotice = async () => {
            try {
                await messageService.setRoomNotice(id, messageId, currentUserId);
                const newNotice = await messageService.getRoomNotice(id);
                setNotice(newNotice);
                // 작업 완료 후 메뉴 닫기
                setMessageMenuAnchor(null);
                setResultModal({
                    open: true,
                    title: '공지 설정 완료',
                    description: '메시지가 공지로 설정되었어요.',
                    variant: 'success'
                });
            } catch (error) {
                // 에러 발생 시에도 메뉴 닫기
                setMessageMenuAnchor(null);
                setResultModal({
                    open: true,
                    title: '공지 설정 실패',
                    description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
                    variant: 'warning'
                });
            }
        };

        // 기존 공지가 있으면 교체 확인
        if (notice) {
            setConfirmDialog({
                open: true,
                title: '공지 교체',
                message: '기존 공지를 새 공지로 교체하시겠어요?',
                confirmText: '교체',
                isDestructive: false,
                onConfirm: async () => {
                    setConfirmDialog(prev => ({ ...prev, open: false }));
                    await doSetNotice();
                }
            });
        } else {
            doSetNotice();
        }
    }, [messageMenuAnchor, id, currentUserId, notice]);

    // 권한 체크 헬퍼
    const isAdmin = myRole === 'owner' || myRole === 'admin';

    // 멘션 데이터 (react-mentions 형식)
    const mentionData = useMemo(() => {
        return participants
            .filter(p => p.userId !== currentUserId) // 본인 제외
            .map(p => ({
                id: p.userId,
                display: p.userName,
            }));
    }, [participants, currentUserId]);

    // 메시지에서 멘션된 사용자 ID 추출
    const extractMentions = useCallback((text: string): string[] => {
        // react-mentions 형식: @[이름](userId)
        const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
        const mentions: string[] = [];
        let match;
        while ((match = mentionRegex.exec(text)) !== null) {
            mentions.push(match[2]); // userId
        }
        return [...new Set(mentions)]; // 중복 제거
    }, []);

    // 멘션 텍스트를 강조해서 보여주는 함수 (태그/뱃지 스타일) + URL 링크 처리
    const renderMessageContent = useCallback((content: string, isMe: boolean) => {
        // URL 패턴 (http/https로 시작하거나 www.로 시작)
        const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
        // @[이름](userId) 패턴
        const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;

        // 먼저 멘션과 URL을 모두 찾아서 위치 기반으로 정렬
        const tokens: { type: 'text' | 'mention' | 'url'; start: number; end: number; content: string; extra?: string }[] = [];

        // URL 찾기
        let match;
        while ((match = urlRegex.exec(content)) !== null) {
            tokens.push({
                type: 'url',
                start: match.index,
                end: match.index + match[0].length,
                content: match[0],
            });
        }

        // 멘션 찾기
        while ((match = mentionRegex.exec(content)) !== null) {
            tokens.push({
                type: 'mention',
                start: match.index,
                end: match.index + match[0].length,
                content: match[1], // 이름
                extra: match[2], // userId
            });
        }

        // 시작 위치로 정렬
        tokens.sort((a, b) => a.start - b.start);

        // 겹치는 토큰 제거 (멘션이 URL보다 우선)
        const filteredTokens: typeof tokens = [];
        for (const token of tokens) {
            const overlaps = filteredTokens.some(t =>
                (token.start >= t.start && token.start < t.end) ||
                (token.end > t.start && token.end <= t.end)
            );
            if (!overlaps) {
                filteredTokens.push(token);
            }
        }

        // 파트 생성
        const parts: (string | React.ReactNode)[] = [];
        let lastIndex = 0;
        let keyIndex = 0;

        for (const token of filteredTokens) {
            // 토큰 전 텍스트
            if (token.start > lastIndex) {
                parts.push(content.slice(lastIndex, token.start));
            }

            if (token.type === 'mention') {
                // 멘션 부분 (태그/뱃지 스타일)
                parts.push(
                    <Chip
                        key={`mention-${keyIndex++}`}
                        label={`@${token.content}`}
                        size="small"
                        sx={{
                            height: 20,
                            fontSize: '11px',
                            fontWeight: 500,
                            bgcolor: isMe
                                ? 'rgba(255,255,255,0.25)'
                                : theme.palette.primary.main,
                            color: isMe
                                ? theme.palette.primary.contrastText
                                : '#fff',
                            '& .MuiChip-label': {
                                px: 0.75,
                            },
                        }}
                    />
                );
            } else if (token.type === 'url') {
                // URL 부분 (하이퍼링크)
                let href = token.content;
                if (!href.startsWith('http://') && !href.startsWith('https://')) {
                    href = 'https://' + href;
                }
                parts.push(
                    <Box
                        key={`url-${keyIndex++}`}
                        component="a"
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        sx={{
                            color: isMe ? 'rgba(255,255,255,0.9)' : theme.palette.primary.main,
                            textDecoration: 'underline',
                            wordBreak: 'break-all',
                            '&:visited': {
                                color: isMe ? 'rgba(255,255,255,0.9)' : theme.palette.primary.main,
                            },
                            '&:hover': {
                                opacity: 0.8,
                            },
                        }}
                    >
                        {token.content}
                    </Box>
                );
            }

            lastIndex = token.end;
        }

        // 나머지 텍스트
        if (lastIndex < content.length) {
            parts.push(content.slice(lastIndex));
        }

        return parts.length > 0 ? parts : content;
    }, [theme.palette.primary.main, theme.palette.primary.contrastText]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            // 다중 파일 처리
            const files = Array.from(e.target.files);

            for (const file of files) {
                const localId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                // 1. 즉시 blob URL로 트레이에 추가 (낙관적 업데이트)
                const blobUrl = URL.createObjectURL(file);
                const isImage = file.type.startsWith('image/');
                const isVideo = file.type.startsWith('video/');
                const isAudio = file.type.startsWith('audio/');

                // 파일 타입 결정
                let attachmentType: 'image' | 'video' | 'audio' | 'file' = 'file';
                if (isImage) attachmentType = 'image';
                else if (isVideo) attachmentType = 'video';
                else if (isAudio) attachmentType = 'audio';

                const tempAttachment: LocalAttachment = {
                    localId,
                    type: attachmentType,
                    url: blobUrl,
                    name: file.name,
                    size: file.size,
                    isUploading: true,
                };
                setAttachments(prev => [...prev, tempAttachment]);

                // 2. 백그라운드에서 업로드 진행
                try {
                    const uploadedAttachment = await messageService.uploadAttachment(file);

                    if (uploadedAttachment) {
                        // 3. 업로드 성공: 실제 URL로 교체
                        setAttachments(prev => prev.map(att =>
                            att.localId === localId
                                ? { ...att, url: uploadedAttachment.url, isUploading: false, uploadError: false }
                                : att
                        ));
                    } else {
                        // 업로드 실패
                        setAttachments(prev => prev.map(att =>
                            att.localId === localId
                                ? { ...att, isUploading: false, uploadError: true }
                                : att
                        ));
                    }
                } catch (error) {
                    console.error('File upload error:', error);
                    // 업로드 실패
                    setAttachments(prev => prev.map(att =>
                        att.localId === localId
                            ? { ...att, isUploading: false, uploadError: true }
                            : att
                    ));
                } finally {
                    // blob URL 해제 (메모리 누수 방지)
                    URL.revokeObjectURL(blobUrl);
                }
            }
        }
        // Reset input
        if (e.target) {
            e.target.value = '';
        }
    };

    const handleRemoveAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleInputFocus = () => {
        // 키보드가 올라올 때 input이 보이도록 약간의 지연 후 스크롤
        setTimeout(() => {
            if (inputAreaRef.current) {
                inputAreaRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
        }, 300);
    };

    // 시스템/이벤트 메시지 판별 (명시적 타입 우선, 없으면 키워드 기반)
    const isSystemMessage = useCallback((msg: ChatMessage) => {
        const explicitType = (msg as any)?.messageType ?? (msg as any)?.message_type ?? (msg as any)?.type;
        if (explicitType === 'system') return true;
        const content = msg.content || '';
        const systemKeywords = [
            '입장했습니다',
            '퇴장했습니다',
            '초대',
            '초대했습니다',
            '초대되었습니다',
            '초대하기',
            '권한',
            '부여되었습니다',
            '관리권한',
            '방장',
            '위임'
        ];
        return !msg.attachments?.length && systemKeywords.some((k) => content.includes(k));
    }, []);

    const parseSystemContent = (content: string | undefined) => {
        const token = '|invitee=';
        if (!content) return { text: '', inviteeId: null as string | null };
        const idx = content.indexOf(token);
        if (idx === -1) return { text: content, inviteeId: null as string | null };
        const text = content.slice(0, idx);
        const inviteeId = content.slice(idx + token.length).trim();
        return { text, inviteeId: inviteeId || null };
    };

    // 프로필 로딩 중이면 LoadingIndicator 표시
    if (isProfileLoading) {
        return <LoadingIndicator />;
    }

    // 팬 프로필인 경우 접근 제한
    if (isFanProfile) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    px: 4,
                    bgcolor: 'transparent',
                }}
            >
                <LockOutlinedIcon sx={{ fontSize: 64, color: theme.palette.divider, mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 1, textAlign: 'center' }}>
                    비팬 프로필로 전환해주세요.
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 3, textAlign: 'center' }}>
                    메시지 기능은 브랜드, 아티스트, 크리에이티브<br />프로필에서만 이용할 수 있어요.
                </Typography>
                <Button
                    variant="contained"
                    onClick={() => navigate('/messages')}
                    sx={{
                        bgcolor: theme.palette.primary.main,
                        borderRadius: 2,
                        px: 4,
                        py: 1.5,
                    }}
                >
                    돌아가기
                </Button>
            </Box>
        );
    }

    if (!room) return <LoadingIndicator />;

    return (
        <Box
            sx={{
                height: '100vh',
                backgroundColor: 'transparent',
                position: 'relative',
                overflow: 'hidden',
                maxWidth: '768px',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Global Header */}
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
                <Header showBackButton={true} onBackClick={() => navigate(-1)} />
            </Box>

            {/* Chat Content (scrollable) */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    WebkitOverflowScrolling: 'touch',
                    '&::-webkit-scrollbar': {
                        display: 'none',
                    },
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'transparent',
                }}
            >

                {/* Room Info */}
                <Box sx={{ px: 2, py: 1.5, pt: `${HEADER_HEIGHT}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', }}>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
                        <Avatar src={room.avatarUrl} sx={{ width: 40, height: 40, flexShrink: 0 }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '15px', lineHeight: 1.2 }}>
                                    {room.type === 'partner' && room.participants.length > 0 ? room.participants.join(', ') : room.title}
                                </Typography>
                            </Box>

                            {/* 파트너 룸이 아닐 때만 참여자 목록 표시 */}
                            {room.type !== 'partner' && (
                                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {room.participants.join(', ')}
                                </Typography>
                            )}
                        </Box>
                    </Box>
                    <IconButton onClick={() => setSettingsModalOpen(true)}>
                        <MoreHorizIcon />
                    </IconButton>
                </Box>

                {/* 공지 영역 */}
                {notice && (
                    <Box
                        sx={{
                            width: '90%',
                            margin: '10px auto',
                            py: 1.2, px: 3,
                            backgroundColor: 'theme.palette.background.paper',
                            borderRadius: 6,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            cursor: 'pointer',

                        }}
                        onClick={() => setNoticeExpanded(!noticeExpanded)}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CampaignIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                            <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.text.primary, flex: 1 }}>
                                공지
                            </Typography>
                            {noticeExpanded ? (
                                <ExpandLessIcon sx={{ color: theme.palette.text.secondary, fontSize: 20 }} />
                            ) : (
                                <ExpandMoreIcon sx={{ color: theme.palette.text.secondary, fontSize: 20 }} />
                            )}
                        </Box>
                        <Typography
                            variant="body2"
                            sx={{
                                color: theme.palette.text.secondary,
                                overflow: noticeExpanded ? 'visible' : 'hidden',
                                textOverflow: noticeExpanded ? 'clip' : 'ellipsis',
                                whiteSpace: noticeExpanded ? 'normal' : 'nowrap',
                                transition: 'all 0.3s ease-in-out',
                                mt: 0.5,
                            }}
                        >
                            {notice.content}
                        </Typography>
                        {noticeExpanded && isAdmin && (
                            <Box sx={{ mt: 1 }}>
                                <Button
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleUnsetNotice();
                                    }}
                                    sx={{ color: theme.palette.error.main, fontSize: 12, p: 0, minWidth: 'auto' }}
                                >
                                    공지 해제
                                </Button>
                            </Box>
                        )}
                    </Box>
                )}

                {/* Messages Area */}
                <Box
                    ref={messagesContainerRef}
                    sx={{
                        flex: 1,
                        overflowY: 'auto',
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        bgcolor: theme.palette.background.paper,
                        paddingBottom: keyboardHeight > 0 ? `${16 + keyboardHeight + (attachments.length > 0 ? 84 : 64)}px` : `${BOTTOM_NAV_HEIGHT + 16}px`,
                        transition: 'padding-bottom 0.2s ease-out'
                    }}
                >
                    {messages.map((msg) => {
                        const system = isSystemMessage(msg);
                        return (
                            <Box
                                key={msg.id}
                                sx={{
                                    display: 'flex',
                                    flexDirection: system ? 'row' : (msg.isMe ? 'row-reverse' : 'row'),
                                    alignItems: 'flex-start',
                                    gap: system ? 0 : 1,
                                    position: 'relative',
                                    justifyContent: system ? 'center' : 'flex-start',
                                }}
                                onTouchStart={(e) => !system && !msg.id.startsWith('temp-') && handleMessageTouchStart(e, msg.id, msg.senderId || '')}
                                onTouchEnd={handleMessageTouchEnd}
                                onTouchCancel={handleMessageTouchEnd}
                                onMouseEnter={() => !msg.id.startsWith('temp-') && setHoveredMessageId(msg.id)}
                                onMouseLeave={() => setHoveredMessageId(null)}
                            >
                                {!system && !msg.isMe && (
                                    <Avatar src={msg.senderAvatar} sx={{ width: 32, height: 32, mt: 0.5 }} />
                                )}

                                {system ? (() => {
                                    const { text, inviteeId } = parseSystemContent(msg.content);
                                    const showInvite = !!inviteeId;
                                    const content = msg.content || '';
                                    const isHighlightMessage = content.includes('정산이 완료') || content.includes('예산 범위가');
                                    return (
                                        <Box sx={{ maxWidth: '80%', display: 'flex', justifyContent: 'center' }}>
                                            <Box
                                                sx={{
                                                    px: 4,
                                                    py: 0.75,
                                                    borderRadius: 20,
                                                    bgcolor: isHighlightMessage ? theme.palette.bgColor.blue : theme.palette.grey[100],
                                                    color: isHighlightMessage ? theme.palette.text.secondary : theme.palette.text.secondary,
                                                    textAlign: 'center',
                                                    lineHeight: 1.4,
                                                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    wordBreak: 'keep-all',
                                                }}
                                            >
                                                <Typography variant="caption" sx={{ whiteSpace: 'pre-wrap', fontSize: 12, fontWeight: 500 }}>
                                                    {text}
                                                </Typography>
                                                {showInvite && (
                                                    <Button
                                                        variant="text"
                                                        size="small"
                                                        onClick={() => handleReinvite(inviteeId)}
                                                        sx={{
                                                            textDecoration: 'underline',
                                                            minWidth: 'auto',
                                                            px: 0,
                                                            color: theme.palette.text.secondary,
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        채팅방으로 초대하기
                                                    </Button>
                                                )}
                                            </Box>
                                        </Box>
                                    );
                                })() : (
                                    <Box sx={{ maxWidth: '70%', position: 'relative' }}>
                                        {!msg.isMe && (
                                            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: theme.palette.text.secondary }}>
                                                {msg.senderName}
                                            </Typography>
                                        )}
                                        {/* 이미지만 있는 경우 말풍선 없이 이미지만 표시 */}
                                        {msg.attachments && msg.attachments.length > 0 && msg.attachments.every(a => a.type === 'image') && !msg.content ? (
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                {msg.attachments.map((att, index) => (
                                                    <Box
                                                        key={index}
                                                        component="img"
                                                        src={att.url}
                                                        sx={{
                                                            width: '100%',
                                                            minWidth: 180,
                                                            maxWidth: 250,
                                                            borderRadius: '12px',
                                                            cursor: 'pointer',
                                                            maxHeight: 200,
                                                            objectFit: 'cover'
                                                        }}
                                                        onClick={() => setMediaViewer({ open: true, type: 'image', url: att.url, name: att.name })}
                                                    />
                                                ))}
                                            </Box>
                                        ) : msg.attachments && msg.attachments.length > 0 && !msg.content && msg.attachments.every(a => {
                                            const fileExt = a.url?.split('.').pop()?.toLowerCase() || '';
                                            return fileExt === 'mp4' || fileExt === 'mp3' || a.name?.toLowerCase().endsWith('.mp4') || a.name?.toLowerCase().endsWith('.mp3');
                                        }) ? (
                                            /* 영상/오디오만 있는 경우 말풍선 없이 표시 */
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                {msg.attachments.map((att, index) => {
                                                    const fileExt = att.url?.split('.').pop()?.toLowerCase() || '';
                                                    const isVideo = fileExt === 'mp4' || att.name?.toLowerCase().endsWith('.mp4');
                                                    const isAudio = fileExt === 'mp3' || att.name?.toLowerCase().endsWith('.mp3');

                                                    if (isVideo) {
                                                        return (
                                                            <Box
                                                                key={index}
                                                                sx={{
                                                                    position: 'relative',
                                                                    cursor: 'pointer',
                                                                    borderRadius: '12px',
                                                                    overflow: 'hidden',
                                                                    width: '100%',
                                                                    minWidth: 180,
                                                                    maxWidth: 250,
                                                                    maxHeight: 200,
                                                                }}
                                                                onClick={() => setMediaViewer({ open: true, type: 'video', url: att.url, name: att.name })}
                                                            >
                                                                <video
                                                                    src={att.url}
                                                                    style={{
                                                                        width: '100%',
                                                                        minWidth: 180,
                                                                        maxWidth: 250,
                                                                        maxHeight: 200,
                                                                        borderRadius: 12,
                                                                        objectFit: 'cover',
                                                                    }}
                                                                    muted
                                                                    playsInline
                                                                />
                                                                <Box sx={{
                                                                    position: 'absolute',
                                                                    top: '50%',
                                                                    left: '50%',
                                                                    transform: 'translate(-50%, -50%)',
                                                                    bgcolor: 'rgba(0,0,0,0.5)',
                                                                    borderRadius: '50%',
                                                                    p: 1,
                                                                }}>
                                                                    <PlayCircleFilledOutlinedIcon sx={{ fontSize: 32, color: '#fff' }} />
                                                                </Box>
                                                            </Box>
                                                        );
                                                    } else if (isAudio) {
                                                        return (
                                                            <Box
                                                                key={index}
                                                                sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 1,
                                                                    p: 1.5,
                                                                    bgcolor: theme.palette.grey[100],
                                                                    borderRadius: '12px',
                                                                    cursor: 'pointer',
                                                                }}
                                                                onClick={() => setMediaViewer({ open: true, type: 'audio', url: att.url, name: att.name })}
                                                            >
                                                                <MusicNoteIcon sx={{ color: theme.palette.primary.main }} />
                                                                <Typography variant="body2" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {att.name || '오디오 파일'}
                                                                </Typography>
                                                            </Box>
                                                        );
                                                    }
                                                    return null;
                                                })}
                                            </Box>
                                        ) : (
                                            <Box
                                                sx={{
                                                    bgcolor: msg.isMe ? theme.palette.primary.main : theme.palette.background.paper,
                                                    color: msg.isMe ? theme.palette.primary.contrastText : theme.palette.text.primary,
                                                    p: 1.5,
                                                    borderRadius: msg.isMe ? '16px 0 16px 16px' : '0 16px 16px 16px',
                                                    boxShadow: msg.isMe ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
                                                    border: msg.isMe ? 'none' : `1px solid ${theme.palette.divider}`,
                                                    position: 'relative',
                                                }}
                                            >
                                                {msg.content && (
                                                    <Typography component="div" variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                                        {renderMessageContent(msg.content, msg.isMe)}
                                                    </Typography>
                                                )}
                                                {msg.attachments && msg.attachments.length > 0 && (
                                                    <Box sx={{ mt: msg.content ? 1 : 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                        {msg.attachments.map((att, index) => {
                                                            // 파일 확장자로 미디어 타입 판단
                                                            const fileExt = att.url?.split('.').pop()?.toLowerCase() || '';
                                                            const isVideo = fileExt === 'mp4' || att.name?.toLowerCase().endsWith('.mp4');
                                                            const isAudio = fileExt === 'mp3' || att.name?.toLowerCase().endsWith('.mp3');

                                                            if (att.type === 'image') {
                                                                return (
                                                                    <Box
                                                                        key={index}
                                                                        component="img"
                                                                        src={att.url}
                                                                        sx={{
                                                                            width: '100%',
                                                                            minWidth: 180,
                                                                            maxWidth: 250,
                                                                            borderRadius: 1,
                                                                            cursor: 'pointer',
                                                                            maxHeight: 200,
                                                                            objectFit: 'cover'
                                                                        }}
                                                                        onClick={() => setMediaViewer({ open: true, type: 'image', url: att.url, name: att.name })}
                                                                    />
                                                                );
                                                            } else if (isVideo) {
                                                                // MP4 비디오 썸네일
                                                                return (
                                                                    <Box
                                                                        key={index}
                                                                        sx={{
                                                                            position: 'relative',
                                                                            cursor: 'pointer',
                                                                            borderRadius: 1,
                                                                            overflow: 'hidden',
                                                                            width: '100%',
                                                                            minWidth: 180,
                                                                            maxWidth: 250,
                                                                            maxHeight: 200,
                                                                        }}
                                                                        onClick={() => setMediaViewer({ open: true, type: 'video', url: att.url, name: att.name })}
                                                                    >
                                                                        <video
                                                                            src={att.url}
                                                                            style={{
                                                                                width: '100%',
                                                                                minWidth: 180,
                                                                                maxWidth: 250,
                                                                                maxHeight: 200,
                                                                                borderRadius: 4,
                                                                                objectFit: 'cover',
                                                                            }}
                                                                            muted
                                                                            playsInline
                                                                        />
                                                                        <Box sx={{
                                                                            position: 'absolute',
                                                                            top: '50%',
                                                                            left: '50%',
                                                                            transform: 'translate(-50%, -50%)',
                                                                            bgcolor: 'rgba(0,0,0,0.5)',
                                                                            borderRadius: '50%',
                                                                            p: 1,
                                                                        }}>
                                                                            <PlayCircleFilledOutlinedIcon sx={{ fontSize: 32, color: '#fff' }} />
                                                                        </Box>
                                                                    </Box>
                                                                );
                                                            } else if (isAudio) {
                                                                // MP3 오디오
                                                                return (
                                                                    <Box
                                                                        key={index}
                                                                        sx={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: 1,
                                                                            p: 1,
                                                                            bgcolor: msg.isMe ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
                                                                            borderRadius: 1,
                                                                            cursor: 'pointer',
                                                                        }}
                                                                        onClick={() => setMediaViewer({ open: true, type: 'audio', url: att.url, name: att.name })}
                                                                    >
                                                                        <MusicNoteIcon fontSize="small" />
                                                                        <Typography variant="caption" noWrap sx={{ maxWidth: 150 }}>{att.name}</Typography>
                                                                    </Box>
                                                                );
                                                            } else {
                                                                // 일반 파일
                                                                return (
                                                                    <Box
                                                                        key={index}
                                                                        component="a"
                                                                        href={att.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        sx={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: 1,
                                                                            p: 1,
                                                                            bgcolor: msg.isMe ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
                                                                            borderRadius: 1,
                                                                            textDecoration: 'none',
                                                                            color: 'inherit'
                                                                        }}
                                                                    >
                                                                        <InsertDriveFileIcon fontSize="small" />
                                                                        <Typography variant="caption" noWrap sx={{ maxWidth: 150 }}>{att.name}</Typography>
                                                                    </Box>
                                                                );
                                                            }
                                                        })}
                                                    </Box>
                                                )}

                                                {/* 전송 중/지연 상태 표시 */}
                                                {msg.isMe && msg.id.startsWith('temp-') && (
                                                    <Box
                                                        sx={{
                                                            position: 'absolute',
                                                            right: '100%',
                                                            top: '50%',
                                                            transform: 'translateY(-50%)',
                                                            display: 'flex',
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            gap: 0.5,
                                                            mr: 0.5,
                                                        }}
                                                    >
                                                        {/* 스피너 - 항상 표시 (요청 진행 중) */}
                                                        <LightningLoader size={14} color={delayedMessages.has(msg.id) ? '#F97316' : theme.palette.text.secondary} />

                                                        {/* 지연 시 재전송/취소 버튼 추가 표시 */}
                                                        {delayedMessages.has(msg.id) && (
                                                            <>
                                                                <IconButton
                                                                    size="small"
                                                                    sx={{
                                                                        bgcolor: '#F97316',
                                                                        color: '#fff',
                                                                        width: 24,
                                                                        height: 24,
                                                                    }}
                                                                    onClick={() => handleRetryMessage(msg.id)}
                                                                    title="재전송"
                                                                >
                                                                    <ReplayIcon sx={{ fontSize: 14 }} />
                                                                </IconButton>
                                                                <IconButton
                                                                    size="small"
                                                                    sx={{
                                                                        bgcolor: '#EF4444',
                                                                        color: '#fff',
                                                                        width: 24,
                                                                        height: 24,
                                                                    }}
                                                                    onClick={() => handleCancelMessage(msg.id)}
                                                                    title="취소"
                                                                >
                                                                    <CloseIcon sx={{ fontSize: 14 }} />
                                                                </IconButton>
                                                            </>
                                                        )}
                                                    </Box>
                                                )}
                                            </Box>
                                        )}
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: msg.isMe ? 'flex-end' : 'flex-start', gap: 0.5, mt: 0.5 }}>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: theme.palette.text.secondary,
                                                }}
                                            >
                                                {msg.timestamp}
                                            </Typography>
                                            {/* hover 시 메뉴 아이콘 (데스크톱) */}
                                            {(hoveredMessageId === msg.id || messageMenuAnchor?.messageId === msg.id) && !msg.id.startsWith('temp-') && (
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => handleMessageMenuClick(e, msg.id, msg.senderId || '')}
                                                    sx={{
                                                        p: 0.25,
                                                        color: theme.palette.text.secondary,
                                                    }}
                                                >
                                                    <MoreHorizIcon sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            )}
                                        </Box>
                                    </Box>
                                )
                                }
                            </Box>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </Box>

                {/* Input Container - 키보드 올라올 때 대응 (Attachments Preview + Input Area) */}
                <Box
                    ref={inputAreaRef}
                    sx={{
                        bgcolor: '#fff',
                        flexShrink: 0,
                        position: keyboardHeight > 0 ? 'fixed' : 'sticky',
                        bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : `${BOTTOM_NAV_HEIGHT}px`,
                        left: 0,
                        right: 0,
                        zIndex: 10,
                        transition: 'bottom 0.2s ease-out',
                        width: '100%',
                        boxSizing: 'border-box',
                    }}
                >
                    {/* Attachments Preview Area */}
                    {attachments.length > 0 && (
                        <Box sx={{
                            p: 2,
                            borderTop: '1px solid theme.palette.divider',
                            display: 'flex',
                            gap: 1,
                            overflowX: 'auto',
                        }}>
                            {attachments.map((att, index) => (
                                <Box key={att.localId} sx={{ position: 'relative', minWidth: 60, width: 60, height: 60 }}>
                                    {att.type === 'image' ? (
                                        <Box
                                            component="img"
                                            src={att.url}
                                            sx={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                borderRadius: 1,
                                                opacity: att.isUploading ? 0.5 : 1,
                                                filter: att.uploadError ? 'grayscale(100%)' : 'none',
                                            }}
                                        />
                                    ) : att.type === 'video' ? (
                                        <Box sx={{
                                            width: '100%',
                                            height: '100%',
                                            bgcolor: att.uploadError ? '#FEE2E2' : theme.palette.grey[100],
                                            borderRadius: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            opacity: att.isUploading ? 0.5 : 1,
                                        }}>
                                            <PlayCircleFilledOutlinedIcon sx={{ fontSize: 28, color: att.uploadError ? '#EF4444' : theme.palette.primary.main }} />
                                        </Box>
                                    ) : att.type === 'audio' ? (
                                        <Box sx={{
                                            width: '100%',
                                            height: '100%',
                                            bgcolor: att.uploadError ? '#FEE2E2' : theme.palette.grey[100],
                                            borderRadius: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            opacity: att.isUploading ? 0.5 : 1,
                                        }}>
                                            <MusicNoteIcon sx={{ fontSize: 28, color: att.uploadError ? '#EF4444' : theme.palette.primary.main }} />
                                        </Box>
                                    ) : (
                                        <Box sx={{
                                            width: '100%',
                                            height: '100%',
                                            bgcolor: att.uploadError ? '#FEE2E2' : theme.palette.grey[100],
                                            borderRadius: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            opacity: att.isUploading ? 0.5 : 1,
                                        }}>
                                            <InsertDriveFileIcon color={att.uploadError ? 'error' : 'action'} />
                                        </Box>
                                    )}
                                    {/* 업로드 중 스피너 */}
                                    {att.isUploading && (
                                        <Box sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            bgcolor: 'rgba(255,255,255,0.4)',
                                            borderRadius: 1,
                                        }}>
                                            <LightningLoader size={20} />
                                        </Box>
                                    )}
                                    {/* 업로드 에러 표시 */}
                                    {att.uploadError && (
                                        <Box sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            bgcolor: 'rgba(239,68,68,0.2)',
                                            borderRadius: 1,
                                        }}>
                                            <ReplayIcon
                                                sx={{ fontSize: 20, color: '#EF4444', cursor: 'pointer' }}
                                                onClick={() => {
                                                    // 에러 파일 제거 후 다시 선택하도록 유도
                                                    handleRemoveAttachment(index);
                                                }}
                                            />
                                        </Box>
                                    )}
                                    <IconButton
                                        size="small"
                                        onClick={() => handleRemoveAttachment(index)}
                                        sx={{
                                            position: 'absolute',
                                            top: -8,
                                            right: -8,
                                            bgcolor: '#fff',
                                            border: `1px solid ${theme.palette.divider}`,
                                            padding: '2px',
                                        }}
                                    >
                                        <CloseIcon sx={{ fontSize: 12 }} />
                                    </IconButton>
                                </Box>
                            ))}
                        </Box>
                    )}

                    {/* Input Area */}
                    <Box sx={{
                        p: 2,
                        borderTop: attachments.length > 0 ? 'none' : `1px solid ${theme.palette.divider}`,
                    }}>
                        <input
                            type="file"
                            hidden
                            multiple
                            accept="image/jpeg,image/png,audio/mpeg,video/mp4"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                            {/* owner/admin은 MentionsInput, member는 기존 TextField */}
                            {isAdmin ? (
                                <Box sx={{ flex: 1, position: 'relative' }}>
                                    <MentionInput
                                        value={input}
                                        onChange={setInput}
                                        onSend={handleSend}
                                        placeholder="메시지를 입력하세요"
                                        mentionData={mentionData.map(m => ({
                                            id: m.id,
                                            display: m.display,
                                            avatar: participants.find(p => p.userId === m.id)?.userAvatar,
                                        }))}
                                        onFocus={handleInputFocus}
                                    />
                                    {/* 파일 첨부 버튼 */}
                                    <IconButton
                                        size="small"
                                        onClick={() => fileInputRef.current?.click()}
                                        sx={{
                                            position: 'absolute',
                                            left: 8,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            zIndex: 1,
                                        }}
                                    >
                                        <AttachFileIcon sx={{ color: theme.palette.text.secondary, transform: 'rotate(45deg)' }} />
                                    </IconButton>
                                </Box>
                            ) : (
                                <TextField
                                    fullWidth
                                    placeholder="메시지를 입력하세요"
                                    variant="outlined"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onFocus={handleInputFocus}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '18px',
                                            bgcolor: theme.palette.grey[50],
                                            '& fieldset': { border: 'none' },
                                        },
                                        '& .MuiInputBase-input': { py: 1.5 }
                                    }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <IconButton size="small" onClick={() => fileInputRef.current?.click()}>
                                                    <AttachFileIcon sx={{ color: theme.palette.text.secondary, transform: 'rotate(45deg)' }} />
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            )}
                            <IconButton
                                size="large"
                                onClick={handleSend}
                                disabled={(!input.trim() && attachments.length === 0) || attachments.some(att => att.isUploading)}
                                sx={{
                                    bgcolor: (input.trim() || attachments.length > 0) && !attachments.some(att => att.isUploading)
                                        ? theme.palette.primary.main
                                        : theme.palette.divider,
                                    color: '#fff',
                                    width: 44,
                                    height: 44,
                                    borderRadius: '50%',
                                    boxShadow: (input.trim() || attachments.length > 0) && !attachments.some(att => att.isUploading)
                                        ? '0 6px 12px rgba(79,70,229,0.35)'
                                        : 'none',
                                    transition: 'background-color 0.2s, box-shadow 0.2s',
                                    flexShrink: 0,
                                }}
                            >
                                <SendIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* 메시지 액션 메뉴 */}
            <Menu
                open={Boolean(messageMenuAnchor)}
                anchorEl={messageMenuAnchor?.element}
                onClose={() => setMessageMenuAnchor(null)}
                keepMounted
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                sx={{
                    '& .MuiMenu-paper': {
                        borderRadius: '16px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        px: 2,
                    },
                }}
            >
                {/* 삭제 (본인 메시지 or admin 단, admin은 owner 메시지 삭제 불가) */}
                {messageMenuAnchor && (
                    messageMenuAnchor.senderId === currentUserId ||
                    (isAdmin && messageMenuAnchor.senderId !== room?.createdBy)
                ) && (
                        <MenuItem onClick={handleDeleteMessage}>
                            <RemoveCircleOutlineRoundedIcon sx={{ mr: 1, color: '#DC2626', fontSize: 18, fontWeight: 400 }} />
                            <Typography sx={{ color: '#DC2626' }}>메시지 삭제</Typography>
                        </MenuItem>
                    )}

                {/* 공지로 설정 (admin만) */}
                {isAdmin && (
                    <MenuItem onClick={handleSetAsNotice}>
                        <PushPinOutlinedIcon sx={{ mr: 1, fontSize: 18, fontWeight: 400 }} />
                        <Typography>공지로 설정</Typography>
                    </MenuItem>
                )}
            </Menu>

            {/* ConfirmDialog */}
            <ConfirmDialog
                open={confirmDialog.open}
                onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText={confirmDialog.confirmText}
                isDestructive={confirmDialog.isDestructive}
            />

            {/* ActionResultModal */}
            <ActionResultModal
                open={resultModal.open}
                onClose={() => setResultModal(prev => ({ ...prev, open: false }))}
                title={resultModal.title}
                description={resultModal.description}
                variant={resultModal.variant}
            />

            {/* ChatRoomSettingsModal */}
            <ChatRoomSettingsModal
                open={settingsModalOpen}
                onClose={() => setSettingsModalOpen(false)}
                roomId={id || ''}
                roomTitle={room?.title}
                roomAvatar={room?.avatarUrl}
                currentUserId={currentUserId || ''}
                myRole={myRole}
                roomType={(room?.type || 'collaboration') as 'project' | 'collaboration' | 'partner'}
                projectId={room?.projectId}
                collaborationId={room?.collaborationId}
                onTitleChange={(newTitle) => {
                    // 낙관적 UI: 쿼리 캐시 직접 업데이트
                    queryClient.setQueryData<MessageRoom | null>(['messageRoom', id], (old) => {
                        if (!old) return old;
                        return { ...old, title: newTitle };
                    });
                    // 방 목록도 업데이트
                    queryClient.setQueriesData<MessageRoom[]>({ queryKey: ['messageRooms'] }, (old = []) => {
                        return old.map((r) => (r.id === id ? { ...r, title: newTitle } : r));
                    });
                }}
            />

            {/* 미디어 뷰어 모달 */}
            <MediaViewerModal
                open={mediaViewer.open}
                onClose={() => setMediaViewer(prev => ({ ...prev, open: false }))}
                type={mediaViewer.type}
                url={mediaViewer.url}
                name={mediaViewer.name}
            />

            {/* Bottom Navigation Bar */}
            <BottomNavigationBar />
        </Box >
    );
};

export default ChatRoom;

/**
 * ChatRoomSettingsModal
 * 풀스크린 모달: 단일 스크롤 뷰 (탭 없음)
 * 구성: 헤더 → 미디어 섹션 → 참여자 섹션 → 하단 나가기 버튼 (고정)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Dialog,
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    Box,
    Chip,
    List,
    ListItem, ListItemButton,
    ListItemAvatar,
    ListItemText,
    Avatar,
    Badge,
    Button,
    Menu,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    // CircularProgress removed - using LightningLoader
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { LightningLoader } from '../common';
import { ReportModal, type ReportTargetType } from '../common';
import {
    MoreVert as MoreVertIcon,
    Close as CloseIcon,
    ChevronRight as ChevronRightIcon,
    ExitToApp as ExitToAppIcon,
    CheckCircle as CheckCircleIcon,
    PhotoCamera as PhotoCameraIcon,
    Edit as EditIcon,
    Check as CheckIcon,
    Close as CancelIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';

import { messageService } from '../../services/messageService';
import type { ChatParticipant, ChatParticipantRole, MediaItem } from '../../services/messageService';
import ConfirmDialog from '../common/ConfirmDialog';
import ActionResultModal from '../common/ActionResultModal';
import MultiSelectDialog from '../common/MultiSelectDialog';
import OnlineIndicator from '../common/OnlineIndicator';
import Header from '../common/Header';
import { useTheme } from '@mui/material/styles';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import PlayCircleFilledOutlinedIcon from '@mui/icons-material/PlayCircleFilledOutlined';
import AddReactionOutlinedIcon from '@mui/icons-material/AddReactionOutlined';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import MediaGalleryModal from './MediaGalleryModal';
import MediaViewerModal from './MediaViewerModal';
import type { MediaType } from './MediaViewerModal';
import PartnerDetailContent from '../explore/PartnerDetailContent';
import { getPartnerById, type Partner } from '../../services/partnerService';
import { supabase } from '../../lib/supabase';

interface ChatRoomSettingsModalProps {
    open: boolean;
    onClose: () => void;
    roomId: string;
    roomTitle?: string;
    roomAvatar?: string;
    currentUserId: string;
    myRole: ChatParticipantRole;
    roomType: 'project' | 'team' | 'partner' | 'collaboration';
    projectId?: string;
    collaborationId?: string;
    onRoleChange?: (newRole: ChatParticipantRole) => void;
    onTitleChange?: (newTitle: string) => void;
}

interface ActionResultState {
    open: boolean;
    title: string;
    description?: string;
    variant: 'success' | 'info' | 'warning';
}

interface ConfirmDialogState {
    open: boolean;
    title: string;
    message: ReactNode;
    confirmText: string;
    isDestructive: boolean;
    icon?: React.ReactNode;
    onConfirm: () => void;
}

export default function ChatRoomSettingsModal({
    open,
    onClose,
    roomId,
    roomTitle,
    roomAvatar,
    currentUserId,
    myRole,
    roomType,
    projectId,
    collaborationId,
    onRoleChange: _onRoleChange,
    onTitleChange
}: ChatRoomSettingsModalProps) {
    void _onRoleChange;
    const navigate = useNavigate();

    const ADMIN_PERMISSION_LABELS = [
        '멘션 호출 기능',
        '참여자 내보내기',
        '사용자 채팅방 초대',
        '채팅방 상단 공지 고정'
    ];

    const blurActiveElement = () => {
        const active = document.activeElement as HTMLElement | null;
        if (active && typeof active.blur === 'function') active.blur();
    };

    // Media state
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [mediaLoading, setMediaLoading] = useState(false);
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [mediaViewer, setMediaViewer] = useState<{
        open: boolean;
        type: MediaType;
        url: string;
        name?: string;
    }>({ open: false, type: 'image', url: '' });

    // Participants state
    const [participants, setParticipants] = useState<ChatParticipant[]>([]);
    const [participantsLoading, setParticipantsLoading] = useState(false);

    // Room image state
    const [roomImageUrl, setRoomImageUrl] = useState<string | undefined>(roomAvatar);
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Title edit state - 낙관적 UI를 위해 로컬 state로 관리
    const [displayTitle, setDisplayTitle] = useState(roomTitle || '');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState(roomTitle || '');
    const [isSavingTitle, setIsSavingTitle] = useState(false);

    // Leave state
    const [handoverTarget, setHandoverTarget] = useState<string>('');
    const [showHandoverSelect, setShowHandoverSelect] = useState(false);

    // Menu state
    const [participantMenuAnchor, setParticipantMenuAnchor] = useState<{
        element: HTMLElement;
        participant: ChatParticipant;
    } | null>(null);

    // Dialog states
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [inviteOptions, setInviteOptions] = useState<{ id: string; label: string; avatar?: string }[]>([]);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxUrl, setLightboxUrl] = useState('');

    // Action result modal
    const [actionResult, setActionResult] = useState<ActionResultState>({
        open: false,
        title: '',
        variant: 'success'
    });

    // Confirm dialog
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
        open: false,
        title: '',
        message: '',
        confirmText: '확인',
        isDestructive: false,
        onConfirm: () => { }
    });

    // Report modal state
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportTargetUser, setReportTargetUser] = useState<{ id: string; name: string } | null>(null);

    // Partner detail modal state
    const [partnerModalOpen, setPartnerModalOpen] = useState(false);
    const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
    const [partnerLoading, setPartnerLoading] = useState(false);

    // Check if there are other admins
    const hasOtherAdmins = participants.some(
        p => p.userId !== currentUserId && ['owner', 'admin'].includes(p.role)
    );

    // 미디어 로드 (미리보기용 - attachment 있는 최신 메시지 12개)
    const loadMedia = useCallback(async () => {
        setMediaLoading(true);
        try {
            // getRoomMedia는 이미 attachment가 있는 메시지만 필터링함
            // limit 12 = attachment 있는 메시지 12개 (각 메시지의 모든 attachment 포함)
            const result = await messageService.getRoomMedia(roomId, 'all', 12);
            setMediaItems(result.items);
        } catch (error) {
            console.error('Failed to load media:', error);
        } finally {
            setMediaLoading(false);
        }
    }, [roomId]);

    // 참여자 로드
    const loadParticipants = useCallback(async () => {
        setParticipantsLoading(true);
        try {
            const result = await messageService.getRoomParticipants(roomId, currentUserId);
            setParticipants(result);
        } catch (error) {
            console.error('Failed to load participants:', error);
            toast.error('참여자를 불러오는데 실패했어요.');
        } finally {
            setParticipantsLoading(false);
        }
    }, [roomId, currentUserId]);

    // 모달 열릴 때 데이터 로드
    useEffect(() => {
        if (open) {
            loadMedia();
            loadParticipants();
        }
    }, [open, loadMedia, loadParticipants]);





    // roomAvatar/Title prop 변경 시 state 업데이트
    useEffect(() => {
        setRoomImageUrl(roomAvatar);
    }, [roomAvatar]);

    useEffect(() => {
        setDisplayTitle(roomTitle || '');
        setEditedTitle(roomTitle || '');
    }, [roomTitle]);

    // 타이틀 저장 - 낙관적 UI
    const handleSaveTitle = async () => {
        if (!editedTitle.trim()) {
            toast.error('채팅방 이름을 입력해주세요.');
            return;
        }
        if (editedTitle === displayTitle) {
            setIsEditingTitle(false);
            return;
        }

        // 낙관적 UI: 즉시 UI 업데이트
        const previousTitle = displayTitle;
        setDisplayTitle(editedTitle);
        setIsEditingTitle(false);
        setIsSavingTitle(true);

        try {
            await messageService.updateRoomTitle(roomId, editedTitle, currentUserId);
            toast.success('채팅방 이름이 변경되었어요.');
            // 상위 컴포넌트에 변경사항 알림
            if (onTitleChange) {
                onTitleChange(editedTitle);
            }
        } catch (error) {
            console.error('Failed to update room title:', error);
            // 실패 시 이전 값으로 롤백
            setDisplayTitle(previousTitle);
            setEditedTitle(previousTitle);
            toast.error('채팅방 이름 변경에 실패했어요.');
        } finally {
            setIsSavingTitle(false);
        }
    };

    // 초대하기
    const handleInvite = async () => {
        if (!projectId && !collaborationId) {
            toast.error('프로젝트/협업 정보가 없어 초대할 수 없어요.');
            return;
        }

        try {
            const teamMembers = await messageService.getProjectTeamInfo(projectId, collaborationId);
            const existingIds = new Set(participants.map(p => p.userId));
            const availableMembers = teamMembers.filter(m => !existingIds.has(m.id));

            setInviteOptions(availableMembers.map(m => ({
                id: m.id,
                label: m.name,
                avatar: m.avatar
            })));
            setInviteDialogOpen(true);
        } catch (error) {
            console.error('Failed to get team info:', error);
            toast.error('팀 정보를 불러오는데 실패했어요.');
        }
    };

    const handleInviteConfirm = async (selectedIds: string[]) => {
        if (selectedIds.length === 0) return;

        setConfirmDialog({
            open: true,
            title: '초대 확인',
            message: `${selectedIds.length}명을 초대하시겠어요?\n상대방이 수락해야 채팅방에 참여되요.`,
            confirmText: '초대',
            isDestructive: false,
            icon: <GroupAddOutlinedIcon sx={{ fontSize: 48 }} />,
            onConfirm: async () => {
                try {
                    const result = await messageService.inviteParticipants(roomId, selectedIds, currentUserId);
                    if (result.sent > 0) {
                        setActionResult({
                            open: true,
                            title: '초대 전송 완료',
                            description: `${result.sent}명에게 초대를 보냈어요.`,
                            variant: 'success'
                        });
                    } else {
                        setActionResult({
                            open: true,
                            title: '초대 불가',
                            description: result.alreadyInRoom > 0
                                ? '이미 채팅방에 참여 중인 사용자에요.'
                                : '이미 초대한 사용자에요.',
                            variant: 'warning'
                        });
                    }
                } catch (error: unknown) {
                    setActionResult({
                        open: true,
                        title: '초대 실패',
                        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
                        variant: 'warning'
                    });
                }
            }
        });
    };

    // 참여자 메뉴 핸들러
    const handleParticipantMenu = (e: React.MouseEvent<HTMLElement>, participant: ChatParticipant) => {
        e.stopPropagation();
        setParticipantMenuAnchor({ element: e.currentTarget, participant });
    };

    const closeParticipantMenu = () => {
        setParticipantMenuAnchor(null);
    };

    const openConfirmAfterMenuClose = (config: Omit<ConfirmDialogState, 'open'>) => {
        closeParticipantMenu();
        window.setTimeout(() => {
            blurActiveElement();
            setConfirmDialog({ open: true, ...config });
        }, 0);
    };

    // 프로필 보기 - Explore 파트너 탭과 동일하게 PartnerDetailContent 모달로 표시
    const handleViewProfile = async () => {
        if (!participantMenuAnchor) return;

        const targetId = participantMenuAnchor.participant.userId;
        closeParticipantMenu();

        setPartnerModalOpen(true);
        setPartnerLoading(true);
        setSelectedPartner(null);

        try {
            // 1차: partners VIEW 기반 파트너 조회 (아티스트/크리에이티브/일부 파트너)
            let partner = await getPartnerById(targetId);

            // 2차: 브랜드 프로필 fallback
            if (!partner) {
                const { data: brand, error: brandError } = await supabase
                    .from('profile_brands')
                    .select('profile_id, brand_name, activity_field, logo_image_url, tags, description, established_at, region')
                    .eq('profile_id', targetId)
                    .maybeSingle();

                if (brandError) {
                    console.error('[ChatRoomSettingsModal] Failed to load brand profile:', brandError);
                }

                if (brand) {
                    partner = {
                        id: brand.profile_id,
                        name: brand.brand_name,
                        activityField: brand.activity_field || '',
                        role: 'brand',
                        specializedRoles: [],
                        tags: brand.tags || [],
                        bio: brand.description || '',
                        profileImageUrl: brand.logo_image_url || '',
                        coverImageUrl: '',
                        portfolioImages: [],
                        rating: 0,
                        reviewCount: 0,
                        completedProjects: 0,
                        region: brand.region || '',
                        matchingRate: 0,
                        responseRate: 0,
                        responseTime: '24시간 이내',
                        career: '',
                        isOnline: false,
                        isVerified: false,
                        careerHistory: [],
                        category: brand.activity_field || '',
                        // PartnerDetailContent에서 brand일 때 brandData를 다시 조회하므로 display는 최소 정보만 채움
                        display: {
                            displayName: brand.brand_name,
                            displayAvatar: brand.logo_image_url || '',
                            displayField: brand.activity_field || '',
                            displayCategory: 'brand',
                        } as any,
                        established_at: brand.established_at || undefined,
                    } as unknown as Partner;
                }
            }

            if (!partner) {
                toast.error('파트너 정보를 찾을 수 없어요.');
                setPartnerModalOpen(false);
                return;
            }

            setSelectedPartner(partner);
        } catch (error) {
            console.error('[ChatRoomSettingsModal] Failed to load partner profile:', error);
            toast.error('파트너 정보를 불러오는데 실패했어요.');
            setPartnerModalOpen(false);
        } finally {
            setPartnerLoading(false);
        }
    };

    // 권한 부여
    const handleGrantAdmin = () => {
        if (!participantMenuAnchor) return;
        const participant = participantMenuAnchor.participant;
        openConfirmAfterMenuClose({
            title: '채팅방 관리 권한 부여',
            message: (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', lineHeight: 1.6 }}>
                        {`${participant.userName}님에게 관리 권한을 부여해요.`}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {ADMIN_PERMISSION_LABELS.map(label => (
                            <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CheckCircleIcon sx={{ color: '#2563Ef', fontSize: 18 }} />
                                <Typography variant="body2" color="text.primary">
                                    {label}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>
            ),
            confirmText: '부여',
            isDestructive: false,
            onConfirm: async () => {
                try {
                    await messageService.updateParticipantRole(roomId, participant.userId, 'admin', currentUserId);
                    setParticipants(prev =>
                        prev.map(p => (p.userId === participant.userId ? { ...p, role: 'admin' as ChatParticipantRole } : p))
                    );
                    setActionResult({
                        open: true,
                        title: '권한 부여 완료',
                        variant: 'success'
                    });
                } catch (error: unknown) {
                    setActionResult({
                        open: true,
                        title: '권한 부여 실패',
                        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
                        variant: 'warning'
                    });
                }
            }
        });
    };

    // 권한 회수
    const handleRevokeAdmin = () => {
        if (!participantMenuAnchor) return;
        const participant = participantMenuAnchor.participant;
        openConfirmAfterMenuClose({
            title: '관리자 권한 회수',
            message: `${participant.userName}님의 관리자 권한을 회수하시겠어요?`,
            confirmText: '회수',
            isDestructive: false,
            onConfirm: async () => {
                try {
                    await messageService.updateParticipantRole(roomId, participant.userId, 'member', currentUserId);
                    setParticipants(prev =>
                        prev.map(p => (p.userId === participant.userId ? { ...p, role: 'member' as ChatParticipantRole } : p))
                    );
                    setActionResult({
                        open: true,
                        title: '권한 회수 완료',
                        variant: 'success'
                    });
                } catch (error: unknown) {
                    setActionResult({
                        open: true,
                        title: '권한 회수 실패',
                        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
                        variant: 'warning'
                    });
                }
            }
        });
    };

    // 내보내기
    const handleRemoveParticipant = () => {
        if (!participantMenuAnchor) return;
        const participant = participantMenuAnchor.participant;
        openConfirmAfterMenuClose({
            title: '참여자 내보내기',
            message: `${participant.userName}님을 채팅방에서 내보내시겠어요?`,
            confirmText: '내보내기',
            isDestructive: true,
            onConfirm: async () => {
                try {
                    await messageService.removeParticipant(roomId, participant.userId, currentUserId);
                    await loadParticipants();
                    setActionResult({
                        open: true,
                        title: '내보내기 완료',
                        variant: 'success'
                    });
                } catch (error: unknown) {
                    setActionResult({
                        open: true,
                        title: '내보내기 실패',
                        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
                        variant: 'warning'
                    });
                }
            }
        });
    };

    // 방 나가기
    const handleLeaveRoom = () => {
        // owner이고 admin이 없고 다른 참여자가 있으면 handover 선택 필요
        if (myRole === 'owner' && !hasOtherAdmins && participants.length > 1) {
            setShowHandoverSelect(true);
            return;
        }

        setConfirmDialog({
            open: true,
            title: '채팅방 나가기',
            message: myRole === 'owner'
                ? '방장 권한을 넘기고 채팅방을 나가시겠어요?'
                : '채팅방을 나가시겠어요?',
            confirmText: '나가기',
            isDestructive: true,
            icon: <ExitToAppIcon sx={{ fontSize: 48 }} />,
            onConfirm: async () => {
                try {
                    await messageService.leaveRoomWithHandover(
                        roomId,
                        currentUserId,
                        undefined
                    );
                    onClose();
                    navigate('/messages');
                    toast.success('채팅방에서 나갔어요.');
                } catch (error: unknown) {
                    setActionResult({
                        open: true,
                        title: '채팅방 나가기 실패',
                        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
                        variant: 'warning'
                    });
                }
            }
        });
    };

    // Handover 선택 후 나가기
    const handleLeaveWithHandover = () => {
        if (!handoverTarget) {
            toast.error('방장 권한을 넘겨받을 사람을 선택해주세요.');
            return;
        }

        const targetUser = participants.find(p => p.userId === handoverTarget);

        setConfirmDialog({
            open: true,
            title: '채팅방 나가기',
            message: `${targetUser?.userName || '선택한 사용자'}님에게 방장 권한을 넘기고 나가시겠어요?`,
            confirmText: '나가기',
            isDestructive: true,
            icon: <ExitToAppIcon sx={{ fontSize: 48 }} />,
            onConfirm: async () => {
                try {
                    await messageService.leaveRoomWithHandover(
                        roomId,
                        currentUserId,
                        handoverTarget
                    );
                    onClose();
                    navigate('/messages');
                    toast.success('채팅방에서 나갔어요.');
                } catch (error: unknown) {
                    setActionResult({
                        open: true,
                        title: '채팅방 나가기 실패',
                        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
                        variant: 'warning'
                    });
                }
            }
        });
    };

    // 이미지 선택 핸들러
    const handleImageSelect = () => {
        fileInputRef.current?.click();
    };

    // 파일 변경 핸들러
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 파일 검증
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            toast.error('이미지 크기는 5MB 이하여야 해요.');
            e.target.value = ''; // input 초기화
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('JPG, PNG, WebP 형식만 지원돼요.');
            e.target.value = ''; // input 초기화
            return;
        }

        // 업로드 시작
        setUploadingImage(true);
        try {
            const imageUrl = await messageService.uploadRoomImage(roomId, file, currentUserId);
            setRoomImageUrl(imageUrl);
            toast.success('채팅방 이미지가 업데이트되었어요.');

            // 모달 닫기
            onClose();

            // 페이지 새로고침하여 변경 사항 반영
            setTimeout(() => {
                window.location.reload();
            }, 300); // 모달 닫히는 애니메이션을 위한 짧은 딜레이
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : '이미지 업로드에 실패했어요.';
            toast.error(errorMessage);
            setUploadingImage(false);
            e.target.value = ''; // input 초기화
        }
    };

    // 이미지 라이트박스
    const handleImageClick = (url: string) => {
        setLightboxUrl(url);
        setLightboxOpen(true);
    };

    // 파일 다운로드
    const handleFileClick = (url: string) => {
        window.open(url, '_blank');
    };

    const renderParticipantMenuItems = () => {
        if (!participantMenuAnchor) return null;

        const participant = participantMenuAnchor.participant;
        const items: React.ReactNode[] = [
            <MenuItem key="profile" onClick={handleViewProfile}>프로필 보기</MenuItem>
        ];

        if (myRole === 'owner' && participant.role === 'member' && roomType !== 'partner') {
            items.push(<MenuItem key="grant" onClick={handleGrantAdmin}>권한 부여</MenuItem>);
        }
        if (myRole === 'owner' && participant.role === 'admin' && roomType !== 'partner') {
            items.push(<MenuItem key="revoke" onClick={handleRevokeAdmin}>관리자 권한 회수</MenuItem>);
        }
        if (['owner', 'admin'].includes(myRole) && participant.role && participant.role !== 'owner') {
            items.push(
                <MenuItem key="remove" onClick={handleRemoveParticipant} sx={{ color: '#DC2626' }}>
                    내보내기
                </MenuItem>
            );
        }
        // 신고하기 옵션 (자기 자신이 아닌 경우)
        if (participant.userId !== currentUserId) {
            items.push(
                <MenuItem
                    key="report"
                    onClick={() => {
                        closeParticipantMenu();
                        setReportTargetUser({ id: participant.userId, name: participant.userName });
                        setReportModalOpen(true);
                    }}
                    sx={{ color: theme.palette.status?.Error || '#DC2626' }}
                >
                    신고하기
                </MenuItem>
            );
        }

        return items;
    };

    // 참여자 이름 목록 문자열
    const participantNames = participants.map(p => p.userName).join(', ');
    const theme = useTheme();

    return (
        <>
            <Dialog
                fullScreen
                open={open}
                onClose={onClose}
                sx={{ '& .MuiDialog-paper': { backgroundColor: theme.palette.background.default } }}
            >
                {/* 헤더 */}
                <Header showBackButton onBackClick={onClose} />

                {/* 스크롤 영역 */}
                <Box sx={{ flex: 1, overflowY: 'auto', pb: 6 }}>
                    {/* 방 정보 헤더 */}
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        py: 3,
                        px: 2,
                        backgroundColor: theme.palette.background.default,
                    }}>
                        <Box sx={{ position: 'relative', mb: 2 }}>
                            <Avatar
                                src={roomImageUrl}
                                sx={{
                                    width: 80,
                                    height: 80,
                                    fontSize: 32
                                }}
                            >
                                {roomTitle?.[0] || '채'}
                            </Avatar>
                            {uploadingImage && (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                        borderRadius: '50%',
                                    }}
                                >
                                    <LightningLoader size={32} color="#fff" />
                                </Box>
                            )}
                            {['owner', 'admin'].includes(myRole) && !uploadingImage && (
                                <>
                                    <IconButton
                                        onClick={handleImageSelect}
                                        disableRipple
                                        sx={{
                                            position: 'absolute',
                                            bottom: 0,
                                            right: 0,
                                            width: 28,
                                            height: 28,
                                            backgroundColor: '#fff',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                            border: '2px solid',
                                            borderColor: theme.palette.background.default,
                                            '&:hover': {
                                                backgroundColor: '#f5f5f5',
                                            },
                                            '&:focus': { outline: 'none' },
                                            '&.Mui-focusVisible': { outline: 'none' },
                                            '&:active': { backgroundColor: '#f0f0f0' }, // 클릭 시 살짝 어둡게만 처리
                                        }}
                                    >
                                        <PhotoCameraIcon sx={{ fontSize: 16, color: '#555' }} />
                                    </IconButton>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={handleFileChange}
                                    />
                                </>
                            )}
                        </Box>


                        {/* Title Area */}
                        {isEditingTitle ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <FormControl size="small" variant="standard">
                                    <Select
                                        native
                                        value=""
                                        onChange={(e) => setEditedTitle(e.target.value as string)}
                                        inputProps={{
                                            style: { fontSize: '1.25rem', fontWeight: 600, textAlign: 'center' }
                                        }}
                                        sx={{ display: 'none' }} // Dummy to satisfy import if needed, but we use TextField actually
                                    />
                                    {/* Using standard HTML input or MUI TextField styled to look minimal */}
                                    <input
                                        value={editedTitle}
                                        onChange={(e) => setEditedTitle(e.target.value)}
                                        style={{
                                            fontSize: '1.25rem',
                                            fontWeight: 600,
                                            textAlign: 'center',
                                            border: 'none',
                                            borderBottom: `2px solid ${theme.palette.primary.main}`,
                                            outline: 'none',
                                            backgroundColor: 'transparent',
                                            width: '200px'
                                        }}
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveTitle();
                                            if (e.key === 'Escape') {
                                                setEditedTitle(displayTitle || '');
                                                setIsEditingTitle(false);
                                            }
                                        }}
                                    />
                                </FormControl>
                                <IconButton size="small" onClick={handleSaveTitle} disabled={isSavingTitle} sx={{ color: theme.palette.primary.main }}>
                                    <CheckIcon />
                                </IconButton>
                                <IconButton size="small" onClick={() => { setEditedTitle(displayTitle || ''); setIsEditingTitle(false); }}>
                                    <CancelIcon />
                                </IconButton>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    {displayTitle || '채팅방'}
                                </Typography>
                                {myRole === 'owner' && roomType !== 'partner' && (
                                    <IconButton size="small" onClick={() => setIsEditingTitle(true)} disabled={isSavingTitle}>
                                        <EditIcon sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
                                    </IconButton>
                                )}
                            </Box>
                        )}
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                                maxWidth: '80%',
                                textAlign: 'center',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {participantNames}
                        </Typography>
                    </Box>

                    {/* 미디어 섹션 */}
                    <Box sx={{ mt: 2, mx: 2, backgroundColor: theme.palette.grey[50], borderRadius: 4, overflow: 'hidden' }}>
                        <Box
                            onClick={() => setGalleryOpen(true)}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                px: 3, py: 2,
                                cursor: 'pointer',
                                '&:hover': {
                                    bgcolor: 'action.hover',
                                },
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <InsertDriveFileOutlinedIcon sx={{ color: theme.palette.icon.default, fontSize: 20 }} />
                                <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                                    미디어
                                </Typography>
                            </Box>
                            <IconButton size="small">
                                <ChevronRightIcon />
                            </IconButton>
                        </Box>

                        {/* 미디어 가로 스크롤 */}
                        <Box sx={{
                            display: 'flex',
                            gap: 1,
                            p: 2,
                            overflowX: 'auto',
                            '&::-webkit-scrollbar': { display: 'none' }
                        }}>
                            {mediaLoading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', py: 2 }}>
                                    <LightningLoader size={24} />
                                </Box>
                            ) : mediaItems.length === 0 ? (
                                <Typography variant="body2" color="text.secondary" sx={{ py: 2, width: '100%', textAlign: 'center' }}>
                                    미디어가 없어요.
                                </Typography>
                            ) : (
                                mediaItems.map((item, idx) => {
                                    // Determine file extension for icon selection
                                    const fileExt = item.url?.split('.').pop()?.toLowerCase() || '';
                                    const isAudio = fileExt === 'mp3';
                                    const isVideo = fileExt === 'mp4' || item.type === 'video';

                                    return (
                                        <Box
                                            key={`${item.messageId}-${idx}`}
                                            onClick={() => item.type === 'image' ? handleImageClick(item.url) : handleFileClick(item.url)}
                                            sx={{
                                                flexShrink: 0,
                                                width: 80,
                                                height: 80,
                                                borderRadius: 1,
                                                overflow: 'hidden',
                                                cursor: 'pointer',
                                                backgroundColor: item.type === 'image' ? 'transparent' : '#F3F4F6',
                                                backgroundImage: item.type === 'image' ? `url(${item.url})` : 'none',
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            {item.type !== 'image' && (
                                                isAudio ? (
                                                    <MusicNoteIcon sx={{ fontSize: 32, color: '#6B7280' }} />
                                                ) : isVideo ? (
                                                    <PlayCircleFilledOutlinedIcon sx={{ fontSize: 32, color: '#6B7280' }} />
                                                ) : (
                                                    <InsertDriveFileOutlinedIcon sx={{ fontSize: 32, color: '#6B7280' }} />
                                                )
                                            )}
                                        </Box>
                                    );
                                })
                            )}
                        </Box>
                    </Box>

                    {/* 참여자 섹션 */}
                    <Box sx={{ mt: 2, mx: 2, backgroundColor: theme.palette.grey[50], borderRadius: 4, overflow: 'hidden' }}>
                        <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AccountCircleOutlinedIcon sx={{ color: theme.palette.icon.default, fontSize: 20 }} />
                            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                                참여중인 유저
                            </Typography>
                        </Box>

                        {/* 초대하기 버튼 */}
                        {roomType !== 'partner' && (
                            <ListItem disablePadding>
                                <ListItemButton
                                    onClick={handleInvite}
                                    disableRipple
                                    sx={{
                                        px: 2,
                                        py: 1.5,
                                        borderBottom: `1px solid ${theme.palette.divider}`,
                                        '&:focus': { outline: 'none' },
                                        '&.Mui-focusVisible': { outline: 'none' },
                                        '&:hover': { backgroundColor: 'transparent' },
                                        '&:active': { backgroundColor: 'transparent' },
                                    }}
                                >
                                    <ListItemAvatar>
                                        <Avatar sx={{ bgcolor: theme.palette.grey[50], }}>
                                            <AddReactionOutlinedIcon sx={{ color: theme.palette.subText.default }} />
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={
                                            <Typography sx={{ color: theme.palette.subText.default, fontWeight: 600, fontSize: 14 }}>
                                                초대하기
                                            </Typography>
                                        }
                                    />
                                </ListItemButton>
                            </ListItem>
                        )}

                        {/* 참여자 리스트 */}
                        {participantsLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                <LightningLoader />
                            </Box>
                        ) : (
                            <List disablePadding>
                                {participants.map((participant, index) => (
                                    <ListItem
                                        key={participant.userId}
                                        secondaryAction={
                                            participant.userId !== currentUserId && (
                                                <IconButton
                                                    onClick={(e) => handleParticipantMenu(e, participant)}
                                                    size="small"
                                                >
                                                    <MoreVertIcon />
                                                </IconButton>
                                            )
                                        }
                                        sx={{
                                            borderBottom: index < participants.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                                        }}
                                    >
                                        <ListItemAvatar>
                                            <Badge
                                                overlap="circular"
                                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                                badgeContent={
                                                    <OnlineIndicator userId={participant.userId} size="medium" />
                                                }
                                            >
                                                <Avatar src={participant.userAvatar}>
                                                    {participant.userName[0]}
                                                </Avatar>
                                            </Badge>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                        {participant.userName}
                                                    </Typography>
                                                    {participant.role === 'owner' && (
                                                        <Chip
                                                            label="마스터 / 기획자"
                                                            size="small"
                                                            sx={{
                                                                height: 20,
                                                                fontSize: 11,
                                                                backgroundColor: '#F3F4F6',
                                                                color: '#6B7280'
                                                            }}
                                                        />
                                                    )}
                                                    {participant.role === 'admin' && (
                                                        <Chip
                                                            label="관리자"
                                                            size="small"
                                                            sx={{
                                                                height: 20,
                                                                fontSize: 11,
                                                                backgroundColor: '#DBEAFE',
                                                                color: '#1E40AF'
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                            }
                                            secondary={participant.role === 'member' ? (
                                                <Typography variant="caption" color="text.secondary">
                                                    {/* 직책/역할이 있으면 표시 */}
                                                </Typography>
                                            ) : undefined}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </Box>

                    {/* Handover 선택 UI (owner이고 admin 없을 때만) */}
                    {showHandoverSelect && (
                        <Box sx={{ mt: 2, mx: 2, backgroundColor: '#fff', borderRadius: 2, p: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                                방장 권한 넘기기
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                채팅방을 나가기 전에 방장 권한을 넘겨받을 사람을 선택해주세요.
                            </Typography>
                            <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel>방장 권한을 넘겨받을 사람</InputLabel>
                                <Select
                                    value={handoverTarget}
                                    label="방장 권한을 넘겨받을 사람"
                                    onChange={(e: SelectChangeEvent) => setHandoverTarget(e.target.value)}
                                >
                                    {participants
                                        .filter(p => p.userId !== currentUserId)
                                        .map(p => (
                                            <MenuItem key={p.userId} value={p.userId}>
                                                {p.userName}
                                            </MenuItem>
                                        ))}
                                </Select>
                            </FormControl>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                    variant="outlined"
                                    onClick={() => setShowHandoverSelect(false)}
                                    sx={{ flex: 1 }}
                                >
                                    취소
                                </Button>
                                <Button
                                    variant="contained"
                                    color="error"
                                    onClick={handleLeaveWithHandover}
                                    disabled={!handoverTarget}
                                    sx={{ flex: 1 }}
                                >
                                    나가기
                                </Button>
                            </Box>
                        </Box>
                    )}

                    {/* 채팅방 나가기 버튼 - 참여자 섹션 아래 중앙 정렬 */}
                    {!showHandoverSelect && (
                        <Box sx={{ mt: 3, pb: 4, display: 'flex', justifyContent: 'center' }}>
                            <Button
                                variant="contained"
                                onClick={handleLeaveRoom}
                                sx={{
                                    backgroundColor: theme.palette.bgColor.default,
                                    color: theme.palette.status.Error,
                                    borderRadius: 10,
                                    px: 4,
                                    py: 1,
                                    width: '60%',
                                    boxShadow: 'none',
                                    fontWeight: 500,
                                    mt: 2,
                                }}
                            >
                                채팅방 나가기
                            </Button>
                        </Box>
                    )}
                </Box>

                {/* 참여자 메뉴 */}
                <Menu
                    open={Boolean(participantMenuAnchor)}
                    anchorEl={participantMenuAnchor?.element}
                    onClose={closeParticipantMenu}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    PaperProps={{
                        sx: {

                            borderRadius: 2,
                            minWidth: 100,
                            backgroundColor: theme.palette.background.paper,
                            boxShadow: '0 10px 30px rgba(0,0,0,0.16)',
                            '& .MuiMenuItem-root': {
                                fontSize: 14,
                                fontWeight: 500,
                                borderRadius: 1,

                            },
                            '& .MuiMenuItem-root:hover': {
                                backgroundColor: theme.palette.action.hover,
                            },
                        }
                    }}
                >
                    {renderParticipantMenuItems()}
                </Menu>
            </Dialog >

            {/* 파트너 상세 모달 - Explore 파트너 탭과 동일한 스타일 */}
            <Dialog
                open={partnerModalOpen}
                onClose={() => {
                    setPartnerModalOpen(false);
                    setSelectedPartner(null);
                }}
                fullWidth
                maxWidth="md"
                scroll="paper"
                BackdropProps={{
                    sx: {
                        backdropFilter: 'blur(6px)',
                    },
                }}
                PaperProps={{
                    sx: {
                        borderRadius: '16px',
                        maxWidth: '768px',
                        width: 'calc(100% - 40px)',
                        m: { xs: '16px auto', sm: '48px auto' },
                        maxHeight: { xs: 'calc(100vh - 64px)', sm: 'calc(100vh - 128px)' },
                        overflow: 'hidden',
                        backgroundColor: theme.palette.background.paper,
                    },
                }}
            >
                <PartnerDetailContent
                    partner={selectedPartner}
                    loading={partnerLoading}
                    onClose={() => {
                        setPartnerModalOpen(false);
                        setSelectedPartner(null);
                    }}
                    showBottomNavigation={false}
                    isModal
                />
            </Dialog>

            {/* 이미지 라이트박스 */}
            < Dialog
                fullScreen
                open={lightboxOpen}
                onClose={() => setLightboxOpen(false)
                }
                sx={{ '& .MuiDialog-paper': { backgroundColor: '#000' } }}
            >
                <AppBar position="static" sx={{ backgroundColor: 'transparent', boxShadow: 'none' }}>
                    <Toolbar>
                        <IconButton edge="start" onClick={() => setLightboxOpen(false)} sx={{ color: '#fff' }}>
                            <CloseIcon />
                        </IconButton>
                    </Toolbar>
                </AppBar>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: 'calc(100vh - 64px)',
                        p: 2
                    }}
                >
                    <img
                        src={lightboxUrl}
                        alt="Preview"
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                </Box>
            </Dialog >

            {/* 초대 다이얼로그 */}
            < MultiSelectDialog
                open={inviteDialogOpen}
                onClose={() => setInviteDialogOpen(false)}
                onConfirm={handleInviteConfirm}
                title="참여자 초대"
                options={inviteOptions}
                confirmLabel="초대"
                emptyMessage="초대할 수 있는 팀원이 없어요."
            />

            {/* 확인 다이얼로그 */}
            < ConfirmDialog
                open={confirmDialog.open}
                onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
                onConfirm={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(prev => ({ ...prev, open: false }));
                }}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText={confirmDialog.confirmText}
                isDestructive={confirmDialog.isDestructive}
                icon={confirmDialog.icon}
            />

            {/* 액션 결과 모달 */}
            < ActionResultModal
                open={actionResult.open}
                onClose={() => setActionResult(prev => ({ ...prev, open: false }))}
                title={actionResult.title}
                description={actionResult.description}
                variant={actionResult.variant}
            />

            {/* 미디어 갤러리 모달 */}
            < MediaGalleryModal
                open={galleryOpen}
                onClose={() => setGalleryOpen(false)}
                roomId={roomId}
                onMediaClick={(item) => {
                    const fileExt = item.url?.split('.').pop()?.toLowerCase() || '';
                    let type: MediaType = 'image';
                    if (item.type === 'video' || fileExt === 'mp4') type = 'video';
                    else if (fileExt === 'mp3') type = 'audio';
                    setMediaViewer({ open: true, type, url: item.url, name: item.name });
                }}
                currentUserId={currentUserId}
                isOwner={myRole === 'owner'}
                isAdmin={myRole === 'admin'}
                onDeleteMedia={async (items: Array<{ messageId: string; url: string }>) => {
                    try {
                        await messageService.deleteMediaFiles(roomId, items, currentUserId);
                        // 미디어 목록 새로고침
                        await loadMedia();
                        toast.success(`${items.length}개의 미디어가 삭제되었어요.`);
                    } catch (error) {
                        console.error('Failed to delete media:', error);
                        toast.error('미디어 삭제에 실패했어요.');
                        throw error; // MediaGalleryModal에서 에러 처리
                    }
                }}
            />

            <MediaViewerModal
                open={mediaViewer.open}
                onClose={() => setMediaViewer(prev => ({ ...prev, open: false }))}
                type={mediaViewer.type}
                url={mediaViewer.url}
                name={mediaViewer.name}
            />

            {/* 신고 모달 */}
            <ReportModal
                open={reportModalOpen}
                onClose={() => {
                    setReportModalOpen(false);
                    setReportTargetUser(null);
                }}
                targetType={'profile' as ReportTargetType}
                targetId={reportTargetUser?.id || ''}
                targetName={reportTargetUser?.name || ''}
            />
        </>
    );
}
